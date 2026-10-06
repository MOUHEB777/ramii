'use strict';
/* ============================================================
   Simulation : client WebSocket wa7dek yel3ab contre 3 bots
   node test_sim.js    (lazem server.js ykoun khaddem)
   Env: URL=ws://...  V=0 (bla logs)  ROUNDS=n
   ============================================================ */
const WebSocket = require('ws');
const E = require('../engine');
const BOT = require('../bot');

const URLx = process.env.URL || 'ws://127.0.0.1:8080';
const VERBOSE = process.env.V !== '0';
const MAX_ROUNDS = parseInt(process.env.ROUNDS || '6', 10);
const STEP = parseInt(process.env.STEP || '400', 10);

const ws = new WebSocket(URLx);
let myId = null, busy = false, lastDrawKey = '', rounds = 0, errors = 0, steps = 0, cur = null;
const log = (...a) => VERBOSE && console.log(...a);
function send(o) { ws.send(JSON.stringify(o)); }

ws.on('open', () => send({ t: 'hello', room: '', name: 'SimPlayer' }));

ws.on('message', (raw) => {
  let m; try { m = JSON.parse(raw.toString()); } catch (e) { return; }
  if (m.type === 'joined') {
    myId = m.playerId;
    setTimeout(() => send({ t: 'addBot' }), 60);
    setTimeout(() => send({ t: 'addBot' }), 120);
    setTimeout(() => send({ t: 'addBot' }), 180);
    setTimeout(() => send({ t: 'mode', openMin: 31, target: 300 }), 240);
    setTimeout(() => send({ t: 'start' }), 320);
    return;
  }
  if (m.type === 'error') { errors++; log('❗', m.msg); return; }
  if (m.type !== 'state') return;

  if (m.phase === 'roundend') {
    rounds++;
    log(`\n🏁 Ronda ${m.round} khlet | ` + m.players.map(p => `${p.name}=${p.score}`).join('  '));
    const d = m.roundDetail || [];
    const sum = d.reduce((a, x) => a + x.pts, 0);
    log(`   total points hedhi ronda = ${sum}` + (d.some(x => x.pts === 0) ? ' (fama wa7ed 3andou 0 ✓)' : ' (kol wa7ed 3andou wara9!)'));
    if (rounds >= MAX_ROUNDS) { finish('kifaya rounds'); return; }
    if (m.players.find(p => p.id === myId)?.isHost) setTimeout(() => send({ t: 'nextRound' }), 200);
    return;
  }
  if (m.phase === 'gameover') {
    log('\n👑 GAME OVER — ' + m.players.map(p => `${p.name}: ${p.score}`).join(' | '));
    finish('gameover');
    return;
  }
  cur = m;
  if (m.phase !== 'draw' && m.phase !== 'action') return;
  if (!m.canAct || busy) return;

  const me = m.players.find(p => p.id === myId) || { name: 'Me' };

  if (m.phase === 'draw') {
    const key = m.round + ':' + m.seq;
    if (lastDrawKey === key) return;
    lastDrawKey = key;
    const src = BOT.chooseDrawSource({ stock: new Array(m.stockCount).fill({ r: '2', s: 'S', id: 'x' }), discard: m.discard.slice(), table: m.table.map(t => ({ id: t.id, type: t.type, ordered: t.cards })), openMin: m.openMin }, { hand: m.hand, opened: m.opened });
    log(`🎴 [${me.name}] khdh mel ${src} (yed ${m.hand.length})`);
    send({ t: 'draw', source: src });
    return;
  }

  // phase action : plan 3al yed el7a9i9i
  busy = true;
  const plan = BOT.planTurn({
    stock: new Array(m.stockCount).fill({ r: '2', s: 'S', id: 'x' }),
    discard: m.discard.slice(),
    table: m.table.map(t => ({ id: t.id, type: t.type, ordered: t.cards })),
    openMin: m.openMin,
  }, { hand: m.hand, opened: m.opened });

  const queue = plan.melds.map(ids => ({ kind: 'meld', ids }))
    .concat((plan.adds || []).map(a => ({ kind: 'add', meldId: a.meldId, ids: a.cardIds })));

  const step = () => {
    // ken el dour tbadal, nsaktou
    if (!cur || !cur.canAct || (cur.phase !== 'action' && cur.phase !== 'draw')) { busy = false; return; }
    const hand = cur.hand || [];
    const it = queue.shift();
    if (it) {
      const ids = it.ids.filter(id => hand.some(c => c.id === id));
      if (!ids.length) return setTimeout(step, 10);
      steps++;
      if (it.kind === 'meld') { log(`⬇️  [${me.name}] meld ${ids.length} cartes`); send({ t: 'meld', ids }); }
      else { log(`➕ [${me.name}] zid 3al table`); send({ t: 'add', meldId: it.meldId, ids }); }
      return setTimeout(step, STEP);
    }
    const card = hand.find(c => c.id === plan.discardId) || BOT.chooseDiscard(hand);
    if (!card) { busy = false; return; }
    log(`🗑️  [${me.name}] tared ${card.r}${card.s || ''}`);
    send({ t: 'discard', id: card.id });
    busy = false;
  };
  step();
});

function finish(why) {
  console.log(`\n=== KHALAS (${why}) — ${rounds} ronda, ${steps} action, ${errors} error ===`);
  try { ws.close(); } catch (e) { }
  setTimeout(() => process.exit(errors ? 2 : 0), 300);
}

ws.on('error', e => { console.error('WS ERROR', e.message); process.exit(1); });
setTimeout(() => finish('timeout'), 240000);
