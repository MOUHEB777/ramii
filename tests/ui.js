'use strict';
/* ============================================================
   Test 2 : robot yel3ab mel UI (meld, add, undo, discard, hint)
   + les modals + le lobby
   ============================================================ */
const { JSDOM, VirtualConsole } = require('jsdom');
const BOT = require('../bot');
const E = require('../engine');
const BASE = process.env.URL_BASE || 'http://127.0.0.1:8080';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => { if (!/Not implemented/.test(e.message)) problems.push('JSDOM-ERR: ' + e.message.split('\n')[0]); });

let win, doc;
const cards = () => [...doc.querySelectorAll('#hand .card')];
const btn = (txt) => [...doc.querySelectorAll('#actions button')].find(b => b.textContent.includes(txt));
function clearSel() { const b = btn('امسح'); if (b) b.click(); }
async function selectIds(ids) {
  clearSel(); await sleep(60);
  for (const el of cards()) if (ids.includes(el.dataset.id)) { el.click(); await sleep(35); }
  await sleep(90);
}

(async () => {
  const dom = await JSDOM.fromURL(BASE + '/', { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc });
  win = dom.window; doc = win.document;
  const toasts = [];
  setInterval(() => { const t = doc.querySelector('#toast'); if (t && t.classList.contains('show') && t.textContent.trim() && !toasts.includes(t.textContent)) toasts.push(t.textContent); }, 200);
  win.__toasts = toasts;
  await sleep(1000);

  /* ---------- LOBBY ---------- */
  doc.querySelector('#nameInput').value = 'Tounsi';
  doc.querySelector('#createBtn').click();
  await sleep(1200);
  const code = win.__state().code;
  const html = doc.querySelector('#modalBox').innerHTML;
  console.log('✔ code=' + code + ' | invite=' + html.includes('?r=' + code) + ' | settings=' + html.includes('setOpen'));
  if (!html.includes('?r=' + code)) problems.push('invite link mch mawjoud');

  doc.querySelector('#setOpen').value = '31';
  doc.querySelector('#setOpen').dispatchEvent(new win.Event('change'));
  await sleep(300);
  if (win.__state().openMin !== 31) problems.push('settings ma khdemouch');
  win.__addBot(); win.__addBot(); win.__addBot();
  await sleep(800);
  win.__start();
  await sleep(1200);
  console.log('✔ bdet | players=' + win.__state().players.map(p => p.name + (p.bot ? '🤖' : '')).join(' '));

  /* ---------- LE3BA ---------- */
  const fl = { meld: 0, add: 0, undo: 0, discard: 0, hint: 0, open: false };
  let turns = 0;
  for (let i = 0; i < 260; i++) {
    const s = win.__state();
    if (!s || !s.canAct) { await sleep(600); continue; }
    if (s.phase === 'roundend' || s.phase === 'gameover') break;

    if (s.phase === 'draw') {
      const b = btn('البوك') || btn('الديفوس');
      if (b) b.click();
      await sleep(650);
      continue;
    }

    // phase action : plan b BOT
    const room = {
      stock: new Array(s.stockCount).fill({ r: '2', s: 'S', id: 'x' }),
      discard: s.discard.slice(),
      table: s.table.map(t => ({ id: t.id, type: t.type, ordered: t.ordered || t.cards })),
      openMin: s.openMin,
    };
    const plan = BOT.planTurn(room, { hand: s.hand, opened: s.opened });
    turns++;

    // 1) melds
    for (const ids of plan.melds) {
      await selectIds(ids);
      const b = btn('نزّل الكومبيناسيون');
      if (!b || b.disabled) { break; } // plan mabni 3al pioche el motawa9a3a -> normal
      const before = win.__state().table.length;
      b.click(); await sleep(750);
      const after = win.__state().table.length;
      if (after <= before) problems.push('meld ma wselch lel serveur');
      else { fl.meld++; }
      // undo test (awwel meld barka, w ken ma 7ellniech)
      if (!fl.undo && !win.__state().opened && win.__state().pendingPts > 0) {
        const ub = btn('رجّع');
        if (ub) {
          const b4 = win.__state().table.length, h4 = win.__state().hand.length;
          ub.click(); await sleep(700);
          const af = win.__state().table.length, hf = win.__state().hand.length;
          fl.undo++;
          console.log('  UNDO: table ' + b4 + '->' + af + ' | yed ' + h4 + '->' + hf);
          if (af >= b4 || hf <= h4) problems.push('undo ma rja3ch el cartes');
          // n3awdou ndezzou
          await selectIds(ids);
          const b2 = btn('نزّل الكومبيناسيون');
          if (b2 && !b2.disabled) { b2.click(); await sleep(700); }
        }
      }
    }
    // 2) adds
    for (const a of (plan.adds || [])) {
      const row = [...doc.querySelectorAll('#melds .meldrow')].find(r => {
        const idx = win.__state().table.findIndex(m => m.id === a.meldId);
        return [...doc.querySelectorAll('#melds .meldrow')].indexOf(r) === idx;
      });
      if (!row) continue;
      row.querySelector('.mown').click(); await sleep(120);
      await selectIds(a.cardIds);
      const b = btn('زيّد');
      if (b && !b.disabled) {
        const before = win.__state().table.reduce((x, m) => x + (m.ordered || m.cards).length, 0);
        b.click(); await sleep(700);
        const after = win.__state().table.reduce((x, m) => x + (m.ordered || m.cards).length, 0);
        if (after > before) fl.add++;
        else problems.push('add ma wselch');
      }
    }
    // 3) hint marra wa7da
    if (!fl.hint) { const hb = btn('اقتراح'); if (hb) { hb.click(); fl.hint++; await sleep(400); } }
    // 4) discard
    clearSel(); await sleep(80);
    const s2 = win.__state();
    const card = s2.hand.find(c => c.id === plan.discardId) || s2.hand[s2.hand.length - 1];
    const el = cards().find(x => x.dataset.id === card.id);
    if (el) {
      el.click(); await sleep(120);
      const db = btn('اطرد');
      if (!db || db.disabled) {
        const d = win.eval('JSON.stringify({sel:[...S.sel].length, selMeld:S.selMeld, canAct:S.state.canAct, phase:S.state.phase, isMineTurn:(S.state.turnId===S.state.youAre), clickable:document.querySelectorAll("#hand .card.clickable").length, hand:document.querySelectorAll("#hand .card").length})');
        problems.push('bouton "اطرد" disabled m3a carte wa7da | ' + d);
      }
      else {
        db.click(); await sleep(700);
        fl.discard++;
        const st3 = win.__state();
        const seen = (st3.discard || []).some(c => c.id === card.id);
        const cnt = (st3.discardCount || st3.discard.length);
        if (!seen && !(cnt > 0 && st3.discard.length === 3)) problems.push('el carte ma wseltech lel défausse (discard=' + JSON.stringify((st3.discard || []).map(c => c.r + c.s)) + ')');
      }
    }
    if (win.__state().opened && !fl.open) { fl.open = true; console.log('  ✔ Tounsi 7ELL el table !'); }
    if (turns >= 14) break;
  }
  console.log('✔ flows:', JSON.stringify(fl), '| turns=' + turns);
  const st = win.__state();
  const seBadge = doc.querySelectorAll('#seats .sbadge.ok').length;
  console.log('  state: phase=' + st.phase + ' opened=' + st.opened + ' yed=' + st.hand.length + ' table=' + st.table.length + ' opened-seats=' + seBadge);
  const domHand = doc.querySelectorAll('#hand .card').length, domMelds = doc.querySelectorAll('#melds .meldrow').length;
  console.log('  DOM: yed=' + domHand + '/' + st.hand.length + ' melds=' + domMelds + '/' + st.table.length + ' seats=' + doc.querySelectorAll('#seats .seat').length);
  if (domHand !== st.hand.length) problems.push('hand DOM mismatch');
  if (domMelds !== st.table.length) problems.push('melds DOM mismatch');
  if (st.opened && doc.querySelector('#nameTag').style.display === 'none') problems.push('nametag mkhabbi');

  /* ---------- MODALS ---------- */
  const fake = JSON.parse(JSON.stringify(st));
  fake.phase = 'roundend'; fake.winnerId = fake.players[0].id;
  fake.roundDetail = fake.players.map((p, i) => ({ id: p.id, pts: i * 12, total: i * 40, hand: st.hand.slice(0, 4) }));
  fake.lastAction = { type: 'roundend' };
  try {
    win.eval('renderModals(' + JSON.stringify(fake) + ')');
    const rows = doc.querySelectorAll('#modalBox .scoretable tbody tr').length;
    console.log('  modal roundend: rows=' + rows + ' | minicards=' + doc.querySelectorAll('#modalBox .minicards .card').length);
    if (rows !== fake.players.length) problems.push('modal roundend rows=' + rows);
  } catch (e) { problems.push('modal roundend crash: ' + e.message); }
  fake.phase = 'gameover';
  try {
    win.eval('renderModals(' + JSON.stringify(fake) + ')');
    if (!doc.querySelector('#modalBox').innerHTML.includes('👑')) problems.push('modal gameover');
    console.log('  modal gameover ok');
  } catch (e) { problems.push('modal gameover crash: ' + e.message); }
  fake.phase = 'lobby';
  try { win.eval('renderModals(' + JSON.stringify(fake) + ')'); console.log('  modal lobby re-render ok'); }
  catch (e) { problems.push('modal lobby crash: ' + e.message); }

  doc.querySelector('#rulesBtn2').click(); await sleep(150);
  if (doc.querySelector('#rules').classList.contains('hidden')) problems.push('rules');
  console.log('  rules ok');

  const ts = win.__toasts.filter(x => !/تنسخ|أنت باهي|راقب/.test(x));
  console.log('  server errors/toasts:', ts.length ? JSON.stringify(ts) : 'walo ✓');
  if (ts.length) problems.push('toasts mta3 erreur: ' + ts.join(' | '));
  console.log('\n=== NATIJA 2 ===');
  if (problems.length) { console.log('❌ ' + problems.length + ':'); problems.forEach(p => console.log('  - ' + p)); }
  else console.log('✅ kol chay b7al b7al');
  win.close();
  process.exit(problems.length ? 2 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
