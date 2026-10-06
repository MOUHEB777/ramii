'use strict';
/* ============================================================
   RAMI 51 — serveur : HTTP + WebSocket + rooms + bots
   node server.js   ->  http://localhost:8080
   ============================================================ */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer } = require('ws');
const E = require('./engine');
const BOT = require('./bot');

const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;
const TARGET_DEFAULT = 500;
const SPEED = Math.max(0.05, parseFloat(process.env.SPEED || '1')); // 1 = 3adi, 0.2 = test saree3
const TURN_MS = Math.max(0, parseInt(process.env.TURN_LIMIT || '30', 10)) * 1000; // 0 = bla limite
const ms = v => Math.max(20, Math.round(v * SPEED));
const BOT_NAMES = ['Rim', 'Sami', 'Nour', 'Karim', 'Yassine', 'Amira', 'Mehdi', 'Ibtissem', 'Walid', 'Faten'];
const AVATARS = ['🦊', '🐼', '🐯', '🐸', '🦁', '🐵', '🐧', '🐨', '🐙', '🦄'];

/* ---------------- helpers ---------------- */
const rid = () => crypto.randomBytes(8).toString('hex');
const rcode = () => {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)];
  return s;
};
const strip = (c) => ({ id: c.id, r: c.r, s: c.s });

/* ============================================================
   ROOM
   ============================================================ */
class Room {
  constructor(code) {
    this.code = code;
    this.players = [];       // {id,token,name,avatar,bot,ws,connected,ready,isHost,hand,opened,pending,pendingPts,score}
    this.watchers = [];
    this.phase = 'lobby';    // lobby | draw | action | roundend | gameover
    this.stock = [];
    this.discard = [];
    this.table = [];
    this.turnIdx = 0;
    this.round = 0;
    this.target = TARGET_DEFAULT;
    this.openMin = E.OPEN_MIN;
    this.seq = 0;
    this.lastAction = null;
    this.log = [];
    this.chat = [];
    this.botTimer = null;
    this.afkTimer = null;
    this.turnTimer = null;
    this.turnSeq = 0;
    this.turnEndsAt = null;
    this.touched = Date.now();
    this.meldSeq = 0;
  }

  /* --- players --- */
  addPlayer({ name, bot = false, ws = null, isHost = false }) {
    const used = new Set(this.players.map(p => p.avatar));
    const avatar = AVATARS.find(a => !used.has(a)) || AVATARS[this.players.length % AVATARS.length];
    const p = {
      id: 'p' + rid(), token: rid(), name: (name || 'Joueur').slice(0, 14), avatar,
      bot, ws, connected: !bot, ready: bot, isHost: this.players.length === 0 || isHost,
      hand: [], opened: false, pending: [], pendingPts: 0, score: 0,
    };
    this.players.push(p);
    return p;
  }
  humanCount() { return this.players.filter(p => !p.bot).length; }
  find(id) { return this.players.find(p => p.id === id); }
  findByToken(token) { return this.players.find(p => p.token === token); }
  current() { return this.players[this.turnIdx] || null; }
  push(kind, text) {
    this.log.push({ kind, text, t: Date.now() }); if (this.log.length > 60) this.log.shift();
  }
  act(obj) { this.seq++; this.lastAction = Object.assign({ seq: this.seq }, obj); }

  /* --- round --- */
  startRound() {
    this.round++;
    this.phase = 'draw';
    this.stock = E.shuffle(E.makeDeck());
    this.discard = [];
    this.table = [];
    this.meldSeq = 0;
    this.players.forEach(p => { p.hand = []; p.opened = false; p.pending = []; p.pendingPts = 0; });
    for (let i = 0; i < E.DEAL; i++) this.players.forEach(p => p.hand.push(this.stock.pop()));
    this.players.forEach(p => { p.hand = E.sortHand(p.hand); });
    this.discard.push(this.stock.pop());
    this.turnIdx = (this.round - 1) % this.players.length;
    this.turnSeq++;
    this.turnEndsAt = TURN_MS ? Date.now() + TURN_MS : null;
    this.act({ type: 'deal', playerId: null });
    this.push('round', `🃏 Ronda ${this.round} bdet — ${this.current().name} yebda`);
    this.push('sys', `Lazem ${this.openMin} point bech t7ell el table`);
    this.pump();
  }

  nextTurn() {
    if (this.phase === 'roundend' || this.phase === 'gameover') return;
    let guard = 0;
    do { this.turnIdx = (this.turnIdx + 1) % this.players.length; guard++; }
    while (this.players[this.turnIdx].out && guard < 10);
    this.phase = 'draw';
    this.turnSeq++;
    this.turnEndsAt = TURN_MS ? Date.now() + TURN_MS : null;
    this.pump();
  }

  pump() {
    clearTimeout(this.botTimer); clearTimeout(this.afkTimer);
    const cur = this.current();
    if (!cur || this.phase === 'roundend' || this.phase === 'gameover' || this.phase === 'lobby') { clearTimeout(this.turnTimer); return; }
    if (cur.bot) {
      this.botTimer = setTimeout(() => botTurn(this, cur), ms(700 + Math.random() * 500));
    } else if (!cur.connected) {
      this.afkTimer = setTimeout(() => autoTurn(this, cur), ms(12000));
    }
    // el clock : ken el wa9t 3da, el bot yel3ab 3al joueur
    if (TURN_MS && !cur.bot && this.turnTimerSeq !== this.turnSeq) {
      this.turnTimerSeq = this.turnSeq;
      clearTimeout(this.turnTimer);
      const left = Math.max(300, (this.turnEndsAt || Date.now() + TURN_MS) - Date.now());
      this.turnTimer = setTimeout(() => {
        if (this.current() !== cur || this.phase === 'roundend' || this.phase === 'gameover') return;
        this.push('sys', `⏰ ${cur.name} khela el wa9t — el jeu l3ab 3lih`);
        autoTurn(this, cur);
      }, left + 200);
    }
  }

  /* --- actions --- */
  reshuffleFromDiscard() {
    if (this.discard.length <= 1) return false;
    const top = this.discard.pop();
    this.stock = E.shuffle(this.discard);
    this.discard = [top];
    return this.stock.length > 0;
  }

  draw(p, source) {
    if (this.phase !== 'draw') return 'Mch wa9t el pioche';
    if (this.current() !== p) return 'Mch dour mte3ek';
    if (source === 'discard') {
      if (!this.discard.length) return 'El défausse khawya';
      p.hand.push(this.discard.pop());
      p.hand = E.sortHand(p.hand);
      this.act({ type: 'draw', playerId: p.id, source, card: strip(p.hand[p.hand.length - 1]) });
      this.push('play', `${p.name} khedh mel défausse`);
    } else {
      if (!this.stock.length && !this.reshuffleFromDiscard()) return 'El pioche khawya';
      p.hand.push(this.stock.pop());
      p.hand = E.sortHand(p.hand);
      this.act({ type: 'draw', playerId: p.id, source: 'stock' });
      this.push('play', `${p.name} khedh mel pioche`);
    }
    this.phase = 'action';
    this.pump();
    return null;
  }

  meld(p, ids) {
    if (this.phase !== 'action') return 'El wa9t mta3 el défausse walla el pioche';
    if (this.current() !== p) return 'Mch dour mte3ek';
    const cards = ids.map(id => p.hand.find(c => c.id === id));
    if (cards.some(c => !c)) return 'Fama carte ghalta';
    if (cards.length >= p.hand.length) return 'Lazem t7alli carte bech tedfa3ha';
    const a = E.arrangeMeld(cards);
    if (!a.ok) return a.reason;
    // el9a3da: meld jdid
    const meld = { id: 'm' + (++this.meldSeq), type: a.type, suit: a.suit || null, ordered: a.ordered, points: a.points, ownerId: p.id };
    this.table.push(meld);
    p.hand = p.hand.filter(c => !ids.includes(c.id));
    if (!p.opened && !p.pending.includes(meld.id)) {
      p.pending.push(meld.id); p.pendingPts += a.points;
      if (p.pendingPts >= this.openMin) {
        p.opened = true;
        p.pending = []; p.pendingPts = 0;
        this.push('open', `🎉 ${p.name} 7ELL b ${a.points} point !`);
        this.act({ type: 'open', playerId: p.id });
      } else {
        this.push('play', `${p.name} 7att ${cards.length} carte 3al table (${p.pendingPts}/${this.openMin})`);
      }
    } else {
      this.push('play', `${p.name} 7att combinaison jdida`);
    }
    this.act({ type: 'meld', playerId: p.id, meldId: meld.id, cards: cards.map(strip), points: a.points, type: a.type });
    return null;
  }

  addTo(p, meldId, ids) {
    if (this.phase !== 'action') return 'Mch wa9t el pose';
    if (this.current() !== p) return 'Mch dour mte3ek';
    if (!p.opened) return `Lazem ${this.openMin} point bech t7ell 9bal ma tzid 3al table`;
    const meld = this.table.find(m => m.id === meldId);
    if (!meld) return 'El combinaison mahich mawjouda';
    const cards = ids.map(id => p.hand.find(c => c.id === id));
    if (cards.some(c => !c)) return 'Fama carte ghalta';
    if (cards.length >= p.hand.length) return 'Lazem t7alli carte bech tedfa3ha';
    const a = E.arrangeMeld(meld.ordered.concat(cards));
    if (!a.ok || a.type !== meld.type) return 'Ma tnejjemch tzid hedha 3la hedhi';
    meld.ordered = a.ordered; meld.points = a.points;
    p.hand = p.hand.filter(c => !ids.includes(c.id));
    this.push('play', `${p.name} zed ${cards.length} carte 3al table`);
    this.act({ type: 'add', playerId: p.id, meldId: meld.id, cards: cards.map(strip), points: a.points });
    return null;
  }

  discardCard(p, id) {
    if (this.phase !== 'action') return 'Mch wa9t el défausse';
    if (this.current() !== p) return 'Mch dour mte3ek';
    const card = p.hand.find(c => c.id === id);
    if (!card) return 'Fama carte ghalta';
    p.hand = p.hand.filter(c => c.id !== id);
    this.discard.push(card);
    // ken ma 7ellich w jme3 9al mch 51 -> narja3ou el cartes
    if (!p.opened && p.pending.length && p.pendingPts < this.openMin) {
      const back = [];
      this.table = this.table.filter(m => {
        if (m.ownerId === p.id && p.pending.includes(m.id)) { back.push(...m.ordered); return false; }
        return true;
      });
      p.hand = E.sortHand(p.hand.concat(back));
      p.pending = []; p.pendingPts = 0;
      this.push('sys', `↩️ ${p.name} ma kmelch ${this.openMin} : rja3ou el cartes lel yed`);
    }
    this.act({ type: 'discard', playerId: p.id, card: strip(card) });
    if (p.hand.length === 0) { this.endRound(p); return null; }
    this.nextTurn();
    return null;
  }

  undoPending(p) {
    if (this.phase !== 'action') return 'Ma tnajjemch';
    if (!p.pending.length) return 'Ma fama chay bech tarja3';
    const back = [];
    this.table = this.table.filter(m => {
      if (m.ownerId === p.id && p.pending.includes(m.id)) { back.push(...m.ordered); return false; }
      return true;
    });
    p.hand = E.sortHand(p.hand.concat(back));
    p.pending = []; p.pendingPts = 0;
    this.act({ type: 'undo', playerId: p.id, cards: back.map(strip) });
    this.push('sys', `${p.name} rja3 el cartes lel yed`);
    return null;
  }

  endRound(winner) {
    if (this.phase === 'roundend' || this.phase === 'gameover') return;
    this.phase = 'roundend';
    clearTimeout(this.botTimer); clearTimeout(this.afkTimer);
    const detail = [];
    for (const p of this.players) {
      const pts = (winner && p.id === winner.id) ? 0 : E.handPoints(p.hand);
      p.score += pts;
      detail.push({ id: p.id, pts, total: p.score, hand: p.hand.map(strip) });
    }
    this.act({ type: 'roundend', winnerId: winner ? winner.id : null });
    if (winner) this.push('win', `🏆 ${winner.name} reb7 el ronda ! (0 point)`);
    else this.push('sys', '🧊 El ronda khlat — kol wa7ed y7seb cartes mte3ou');
    const over = this.players.some(p => p.score >= this.target);
    if (over) {
      this.phase = 'gameover';
      const best = this.players.slice().sort((a, b) => a.score - b.score)[0];
      this.push('win', `👑 El champion : ${best.name} b ${best.score} point !`);
    }
    this.roundDetail = detail;
    this.pump();
  }

  validTableFor(id) { return this.table.filter(m => m.ownerId === id || !m.ownerId); }

  /* --- state bech nab3athou lel client --- */
  stateFor(p) {
    const cur = this.current();
    const iAmCur = !!p && cur && cur.id === p.id;
    return {
      type: 'state',
      code: this.code,
      phase: this.phase,
      round: this.round,
      target: this.target,
      openMin: this.openMin,
      turnId: cur ? cur.id : null,
      youAre: p ? p.id : null,
      spectator: !p,
      canAct: !!p && iAmCur && !p.bot,
      phaseLabel: this.phase,
      hand: p ? p.hand.map(strip) : [],
      opened: p ? p.opened : false,
      pendingPts: p ? p.pendingPts : 0,
      players: this.players.map(x => ({
        id: x.id, name: x.name, avatar: x.avatar, bot: x.bot, connected: x.connected,
        ready: x.ready, isHost: x.isHost, handCount: x.hand.length, score: x.score,
        opened: x.opened, isTurn: !!cur && cur.id === x.id,
      })),
      table: this.table.map(m => ({ id: m.id, type: m.type, suit: m.suit, points: m.points, ownerId: m.ownerId, cards: m.ordered.map(strip) })),
      discard: this.discard.slice(-3).map(strip),
      discardCount: this.discard.length,
      stockCount: this.stock.length,
      seq: this.seq,
      turnEndsAt: this.turnEndsAt,
      turnLimit: TURN_MS,
      turnIsHuman: cur ? !cur.bot : false,
      lastAction: this.lastAction,
      log: this.log.slice(-14),
      chat: this.chat.slice(-30),
      roundDetail: this.phase === 'roundend' || this.phase === 'gameover' ? (this.roundDetail || null) : null,
    };
  }
}

/* ============================================================
   BOT / AFK
   ============================================================ */
function botTurn(room, p) {
  try { return botTurnInner(room, p); } catch (e) { console.error('botTurn error:', e.message); try { autoTurn(room, p); } catch (_) { } }
}
function botTurnInner(room, p) {
  if (room.phase === 'roundend' || room.phase === 'gameover') return;
  if (room.current() !== p) return;
  if (room.phase === 'draw') {
    const plan = BOT.planTurn(room, p);
    p._plan = plan;
    const e = room.draw(p, plan.draw);
    if (e) room.draw(p, 'stock');
    broadcast(room);
    room.botTimer = setTimeout(() => botAct(room, p), ms(620));
    return;
  }
  if (room.phase === 'action') botAct(room, p);
}

function botAct(room, p) {
  if (room.current() !== p || room.phase !== 'action') return;
  const plan = p._plan || { melds: [], adds: [], discardId: null };
  p._plan = null;
  const queue = plan.melds.map(ids => ({ kind: 'meld', ids }))
    .concat((plan.adds || []).map(a => ({ kind: 'add', meldId: a.meldId, ids: a.cardIds })));

  const finish = () => {
    if (room.current() !== p || room.phase !== 'action') return;
    if (!p.hand.length) return;
    const card = p.hand.find(c => c.id === plan.discardId) || BOT.chooseDiscard(p.hand);
    if (!card) return;
    room.discardCard(p, card.id);
    broadcast(room);
  };

  const step = () => {
    if (room.current() !== p || room.phase !== 'action') return;
    const it = queue.shift();
    if (!it) return finish();
    const ids = it.ids.filter(id => p.hand.some(c => c.id === id));
    if (ids.length) {
      if (it.kind === 'meld') room.meld(p, ids);
      else room.addTo(p, it.meldId, ids);
      broadcast(room);
    }
    room.botTimer = setTimeout(step, ms(600));
  };
  step();
}

function autoTurn(room, p) {
  if (room.current() !== p) return;
  if (room.phase === 'draw') { room.draw(p, 'stock'); broadcast(room); }
  setTimeout(() => {
    if (room.current() !== p || room.phase !== 'action') return;
    // ken najjem, yحell el table 9bal ma yedfa3
    try {
      const plan = BOT.planTurn({ stock: room.stock, discard: room.discard, table: room.table, openMin: room.openMin }, p);
      for (const ids of plan.melds) room.meld(p, ids);
      broadcast(room);
    } catch (e) { }
    setTimeout(() => {
      if (room.current() !== p || room.phase !== 'action') return;
      if (p.hand.length) { room.discardCard(p, BOT.chooseDiscard(p.hand).id); broadcast(room); }
    }, ms(350));
  }, ms(500));
}

/* ============================================================
   HTTP + WS
   ============================================================ */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const url = new URL(req.url, 'http://x');
  let file = url.pathname === '/' ? '/index.html' : url.pathname;
  if (url.pathname === '/healthz') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ ok: true, rooms: rooms.size, uptime: process.uptime() })); }
  if (file === '/engine.js' || file === '/bot.js') {
    const f = path.join(__dirname, file.slice(1));
    res.writeHead(200, { 'Content-Type': MIME['.js'] }); return res.end(fs.readFileSync(f));
  }
  const full = path.join(PUBLIC_DIR, path.normalize(file).replace(/^(\.\.[/\\])+/, ''));
  if (!full.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end('nope'); }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(full)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });
const rooms = new Map();

function send(ws, obj) { if (ws && ws.readyState === 1) { try { ws.send(JSON.stringify(obj)); } catch (e) { } } }
function broadcast(room) {
  room.touched = Date.now();
  for (const p of room.players) if (!p.bot && p.ws) send(p.ws, room.stateFor(p));
  for (const w of room.watchers) send(w.ws, room.stateFor(null));
}
function err(ws, msg) { send(ws, { type: 'error', msg }); }
function findRoomFor(p) { return rooms.get(p.roomCode); }
function roomOfPlayer(client) {
  if (client.roomCode && rooms.has(client.roomCode)) return rooms.get(client.roomCode);
  return null;
}
function maybeDelete(room) {
  const humans = room.players.filter(p => !p.bot && p.connected);
  if (!humans.length && Date.now() - room.touched > 10 * 60 * 1000) rooms.delete(room.code);
}

wss.on('connection', (ws) => {
  const client = { roomCode: null, playerId: null, token: null, name: 'Joueur' };

  ws.on('message', (raw) => {
    let m; try { m = JSON.parse(raw.toString()); } catch (e) { return; }
    if (!m) return;
    if (typeof m.t !== 'string') m.t = m.type;
    if (typeof m.t !== 'string') return;
    try { handle(ws, client, m); } catch (e) { console.error('handle error', e); err(ws, 'Fama erreur, 3awed jarreb'); }
  });

  ws.on('close', () => {
    const room = roomOfPlayer(client);
    if (!room) return;
    const p = room.find(client.playerId);
    if (p) {
      p.connected = false; p.ws = null;
      room.push('sys', `${p.name} khraj / t9at3et (${room.phase === 'lobby' ? 'lobby' : 'fi le3ba'})`);
      if (room.phase === 'lobby') {
        room.players = room.players.filter(x => x.id !== p.id);
        if (room.players.length && !room.players.some(x => x.isHost)) room.players[0].isHost = true;
      } else {
        room.pump();
      }
      broadcast(room);
      maybeDelete(room);
    }
    room.watchers = room.watchers.filter(w => w.ws !== ws);
    broadcast(room);
  });
});

function handle(ws, client, m) {
  /* ---------------- hello : create / join ---------------- */
  if (m.t === 'hello') {
    const wanted = (m.room || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
    let room = rooms.get(wanted);
    if (!room) { room = new Room(wanted || rcode()); rooms.set(room.code, room); }
    client.roomCode = room.code;
    client.name = (m.name || 'Joueur').toString().slice(0, 14);

    // rejoin b token
    if (m.token) {
      const ex = room.findByToken(m.token);
      if (ex) {
        ex.ws = ws; ex.connected = true; client.playerId = ex.id; client.token = ex.token;
        room.push('sys', `${ex.name} rja3 lel table 👋`);
        broadcast(room); room.pump();
        return send(ws, { type: 'joined', room: room.code, playerId: ex.id, token: ex.token, host: ex.isHost });
      }
    }
    // nakbar fi lobby wala ken fama blasa
    if (room.phase === 'lobby' && room.players.length < MAX_PLAYERS) {
      const p = room.addPlayer({ name: client.name, ws });
      client.playerId = p.id; client.token = p.token;
      room.push('sys', `${p.name} dkhel lel room 🎮`);
      if (!room.players.some(x => x.isHost)) p.isHost = true;
      broadcast(room);
      return send(ws, { type: 'joined', room: room.code, playerId: p.id, token: p.token, host: p.isHost });
    }
    // sinon : spectateur
    room.watchers.push({ ws, name: client.name });
    send(ws, { type: 'joined', room: room.code, spectator: true, host: false });
    return send(ws, room.stateFor(null));
  }

  const room = roomOfPlayer(client);
  if (!room) return err(ws, 'El room mch mawjoud');
  const me = client.playerId ? room.find(client.playerId) : null;
  if (me && me.ws !== ws) { me.ws = ws; me.connected = true; }

  switch (m.t) {
    case 'ready': {
      if (!me) return;
      me.ready = !!m.v;
      broadcast(room);
      break;
    }
    case 'avatar': {
      if (!me || room.phase !== 'lobby') return;
      if (typeof m.a === 'string' && m.a.length <= 4) me.avatar = m.a;
      broadcast(room);
      break;
    }
    case 'name': {
      if (!me) return;
      if (m.name) me.name = m.name.toString().slice(0, 14);
      broadcast(room);
      break;
    }
    case 'mode': {
      if (!me || !me.isHost || room.phase !== 'lobby') return;
      room.openMin = [31, 41, 51].includes(+m.openMin) ? +m.openMin : 51;
      room.target = [300, 500, 1000].includes(+m.target) ? +m.target : 500;
      room.push('sys', `⚙️ Mode : ${room.openMin} point bech t7ell / ${room.target} point el partie`);
      broadcast(room);
      break;
    }
    case 'addBot': {
      if (!me || !me.isHost || room.phase !== 'lobby') return;
      if (room.players.length >= MAX_PLAYERS) return err(ws, 'El table 3amra (4)');
      const used = new Set(room.players.map(p => p.name));
      const nm = BOT_NAMES.find(n => !used.has(n)) || 'Bot' + Math.floor(Math.random() * 99);
      room.addPlayer({ name: nm, bot: true });
      room.push('sys', `🤖 Bot ${nm} dkhel`);
      broadcast(room);
      break;
    }
    case 'kick': {
      if (!me || !me.isHost || room.phase !== 'lobby') return;
      const t = room.find(m.id);
      if (!t) return;
      if (t.bot || !t.connected) { room.players = room.players.filter(p => p.id !== t.id); room.push('sys', `${t.name} khraj`); }
      else err(ws, 'Ma tnajjemch tkharej joueur mou9im');
      broadcast(room);
      break;
    }
    case 'start': {
      if (!me || !me.isHost || room.phase !== 'lobby') return;
      if (room.players.length < MIN_PLAYERS) return err(ws, 'Lazem 2 joueurs 3al a9all');
      if (!room.players.every(p => p.ready || p.isHost)) return err(ws, 'Fama joueur mech prêt');
      room.startRound();
      broadcast(room);
      break;
    }
    case 'draw': {
      if (!me) return;
      const e = room.draw(me, m.source === 'discard' ? 'discard' : 'stock');
      if (e) return err(ws, e);
      broadcast(room); room.pump();
      break;
    }
    case 'meld': {
      if (!me || !Array.isArray(m.ids)) return;
      const e = room.meld(me, m.ids.slice(0, 14));
      if (e) return err(ws, e);
      broadcast(room);
      break;
    }
    case 'add': {
      if (!me || !Array.isArray(m.ids)) return;
      const e = room.addTo(me, m.meldId, m.ids.slice(0, 14));
      if (e) return err(ws, e);
      broadcast(room);
      break;
    }
    case 'discard': {
      if (!me) return;
      const e = room.discardCard(me, m.id);
      if (e) return err(ws, e);
      broadcast(room);
      break;
    }
    case 'undo': {
      if (!me) return;
      const e = room.undoPending(me);
      if (e) return err(ws, e);
      broadcast(room);
      break;
    }
    case 'hint': {
      if (!me || !me.hand.length) return;
      const cands = E.allMelds(me.hand).slice(0, 6).map(c => ({ ids: c.ids, type: c.type, points: c.points }));
      const best = BOT.bestMelds(me.hand, !me.opened);
      send(ws, { type: 'hint', cands, best: best.melds.map(x => x.ids), points: best.points, need: room.openMin, opened: me.opened });
      break;
    }
    case 'chat': {
      if (!me) return;
      const text = (m.text || '').toString().slice(0, 140);
      if (!text.trim()) return;
      room.chat.push({ name: me.name, avatar: me.avatar, text, t: Date.now() });
      if (room.chat.length > 60) room.chat.shift();
      broadcast(room);
      break;
    }
    case 'nextRound': {
      if (!me || !me.isHost) return;
      if (room.phase === 'gameover') { room.players.forEach(p => p.score = 0); room.round = 0; }
      if (room.phase === 'roundend' || room.phase === 'gameover') {
        if (room.players.filter(p => !p.bot).length + room.players.filter(p => p.bot).length < MIN_PLAYERS) return err(ws, 'Lazem 2 joueurs');
        room.startRound();
        broadcast(room);
      }
      break;
    }
    case 'leave': {
      if (!me) return;
      room.players = room.players.filter(p => p.id !== me.id);
      room.watchers = room.watchers.filter(w => w.ws !== ws);
      if (room.players.length && !room.players.some(p => p.isHost)) room.players[0].isHost = true;
      room.push('sys', `${me.name} khraj mel table`);
      client.playerId = null; client.roomCode = null;
      broadcast(room);
      send(ws, { type: 'left' });
      maybeDelete(room);
      break;
    }
    case 'ping': send(ws, { type: 'pong', t: Date.now() }); break;
  }
}

process.on('uncaughtException', (e) => { console.error('⚠️ uncaughtException:', e && e.stack || e); });
process.on('unhandledRejection', (e) => { console.error('⚠️ unhandledRejection:', e && e.stack || e); });

server.listen(PORT, HOST, () => {
  console.log(`🃏 Rami 51 server  ->  http://${HOST}:${PORT}`);
});

setInterval(() => { for (const r of rooms.values()) maybeDelete(r); }, 60000).unref?.();
