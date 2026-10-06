'use strict';
/* ============================================================
   Test : tartib el wara9 bidi (drag&drop) + les themes
   node tests/sort-theme.js    (lazem server.js khaddem)
   ============================================================ */
const { JSDOM, VirtualConsole } = require('jsdom');
const BASE = process.env.URL_BASE || 'http://127.0.0.1:8080';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const nl = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => { if (!/Not implemented/.test(e.message)) problems.push('JSDOM-ERR: ' + e.message.split('\n')[0]); });

(async () => {
  const dom = await JSDOM.fromURL(BASE + '/', { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc });
  const win = dom.window, doc = win.document;
  await sleep(1000);
  const note = (ok, txt, extra) => { nl.push((ok ? '✅ ' : '❌ ') + txt + (extra ? ' | ' + extra : '')); if (!ok) problems.push(txt); };
  const ids = () => [...doc.querySelectorAll('#hand .card')].map(c => c.dataset.id);
  const state = () => win.__state();

  /* ---------- 1) el thèmes ---------- */
  doc.querySelector('#nameInput').value = 'Tounsi';
  doc.querySelector('#quickBtn').click();
  await sleep(3000);
  note(!!state() && state().phase !== 'lobby', 'el le3ba bdet lel test');

  doc.querySelector('#themeBtn').click();
  await sleep(400);
  const rows = [...doc.querySelectorAll('#modalBox .themerow')];
  note(rows.length === 4, '4 formes de cartes fi picker', 'rows=' + rows.length);
  const previews = doc.querySelectorAll('#modalBox .thcards .card').length;
  note(previews === 12, 'kol theme 3andou preview (3 cartes × 4)', 'cards=' + previews);
  note((doc.querySelector('#modalBox').innerHTML.match(/data-theme="/g) || []).length >= 4, 'preview b data-theme');

  const themeResults = [];
  for (const t of ['neon', 'royal', 'modern', 'classic']) {
    const row = [...doc.querySelectorAll('#modalBox .themerow')].find(r => r.dataset.pick === t);
    if (!row) { note(false, 'row ' + t + ' mch mawjoud'); continue; }
    row.click();
    await sleep(300);
    const applied = doc.body.dataset.theme === t;
    const saved = win.localStorage.getItem('rami_theme') === t;
    const checked = [...doc.querySelectorAll('#modalBox .themerow')].some(r => r.dataset.pick === t && r.className.includes('act'));
    // colours CSS : nsifto el style w nchoufou el règles
    const css = [...doc.styleSheets].map(sh => { try { return [...sh.cssRules].map(r => r.cssText).join('\n'); } catch (e) { return ''; } }).join('\n');
    const hasCss = css.includes('[data-theme="' + t + '"]');
    themeResults.push(t + ':' + (applied ? '✓' : '✗') + (saved ? '💾' : '') + (checked ? '☑' : '') + (hasCss ? '🎨' : '❌css'));
    if (!applied) note(false, 'theme ' + t + ' ma tبدلش fi body');
    if (!saved) note(false, 'theme ' + t + ' ma tsejjelch fi localStorage');
    if (!hasCss) note(false, 'CSS mta3 theme ' + t + ' mch mawjouda');
  }
  note(themeResults.every(x => x.includes('✓') && !x.includes('✗')), '4 thèmes yetbedlou w yetsejjelou', themeResults.join(' '));
  win.__closeModal();
  await sleep(300);
  note(doc.querySelector('#modal').classList.contains('hidden'), 'el modal tsakkar b "تمام"');

  /* ---------- 2) boutons de tri ---------- */
  const beforeAuto = ids();
  win.__resetSort();
  await sleep(300);
  const autoSuit = ids();
  const st = state();
  const bySuit = autoSuit.every((id, i) => {
    if (i === 0) return true;
    const a = st.hand.find(c => c.id === autoSuit[i - 1]), b = st.hand.find(c => c.id === id);
    const sa = a.r === 'JOKER' ? 9 : win.E.SUIT_ORDER[a.s], sb = b.r === 'JOKER' ? 9 : win.E.SUIT_ORDER[b.s];
    const ra = a.r === 'JOKER' ? 99 : win.E.rankNum(a.r), rb = b.r === 'JOKER' ? 99 : win.E.rankNum(b.r);
    return sa < sb || (sa === sb && ra <= rb);
  });
  note(bySuit, 'tri "شكل" (suit) mرتّب b dabet', autoSuit.slice(0, 3).join(','));

  doc.querySelector('#sortBar button[data-sort="num"]').click();
  await sleep(300);
  const autoNum = ids();
  const st2 = state();
  const byNum = autoNum.every((id, i) => {
    if (i === 0) return true;
    const a = st2.hand.find(c => c.id === autoNum[i - 1]), b = st2.hand.find(c => c.id === id);
    const ra = a.r === 'JOKER' ? 99 : win.E.rankNum(a.r), rb = b.r === 'JOKER' ? 99 : win.E.rankNum(b.r);
    return ra < rb || (ra === rb);
  });
  note(byNum, 'tri "رقم" (rank) mرتّب b dabet', autoNum.slice(0, 3).join(','));
  note(win.localStorage.getItem('rami_sort').includes('"kind":"num"'), 'el mode mta3 el tri msejjel fi localStorage');

  /* ---------- 3) TARTIB BIDI (drag & drop) ---------- */
  doc.querySelector('#sortBar button[data-sort="manual"]').click();
  await sleep(250);
  note(win.eval('S.sortMode') === 'manual', 'mode "بيدي" mfa33al');
  note(doc.querySelector('#sortBar button[data-sort="manual"]').className.includes('act'), 'el bouton "بيدي" bayen actif');

  // nsifto dourna bech ykoun el drag mumkin
  for (let i = 0; i < 40 && !(state() && state().canAct && state().phase === 'action'); i++) {
    if (state() && state().canAct && state().phase === 'draw') {
      const b = [...doc.querySelectorAll('#actions button')].find(x => x.textContent.includes('البوك'));
      if (b) b.click();
    }
    await sleep(500);
  }
  const canDragNow = state().canAct && state().phase === 'action';
  note(canDragNow, 'dourna w e7na fi phase action', 'phase=' + state().phase);

  const hand = doc.querySelector('#hand');
  const cards = [...doc.querySelectorAll('#hand .card')];
  note(cards.length >= 5, 'fama wara9 bech nsahbou', 'n=' + cards.length);

  // --- drag : el carte 0 -> el blasa mta3 el carte 3
  const dragId = cards[0].dataset.id;
  const before = ids();
  const box = hand.getBoundingClientRect();
  const fire = (el, type, x, y) => {
    const ev = new win.MouseEvent(type, { bubbles: true, clientX: x, clientY: y });
    Object.defineProperty(ev, 'pointerId', { value: 1 });
    Object.defineProperty(ev, 'pointerType', { value: 'mouse' });
    el.dispatchEvent(ev);
  };
  // target mta3 el pointermove : nstubّiw elementFromPoint bech ychedd el carte 3
  const target3 = cards[3];
  win.document.elementFromPoint = () => target3;
  fire(cards[0], 'pointerdown', 10, 10);
  fire(hand, 'pointermove', 60, 10);
  await sleep(120);
  const lifted = doc.querySelectorAll('#hand .card.lifting').length;
  note(lifted === 1, 'el carte tnadhdhet (lifting) ki bdet el sa7ba', 'lifting=' + lifted);
  note(doc.querySelector('#hand').className.includes('issorting'), 'el classe issorting mzeda');
  fire(hand, 'pointermove', 999, 10);   // ychedd el carte 3 (el stub)
  await sleep(120);
  fire(hand, 'pointerup', 999, 10);
  await sleep(300);
  const after = ids();
  note(after.length === before.length && after.join() !== before.join(), 'el tartib tbadel ba3d el sa7ba', before.slice(0, 4).join(',') + '  ->  ' + after.slice(0, 4).join(','));
  const movedIdx = after.indexOf(dragId);
  note(movedIdx > 0, 'el carte elli sna7ebna hiya wa7da okhra (' + dragId + ' index ' + movedIdx + ')');
  note(win.eval('S.sortMode') === 'manual' && win.eval('S.handOrder.length') === after.length, 'el tartib msejjel fi S.handOrder');
  note(win.localStorage.getItem('rami_sort').includes('manual'), 'el mode "بيدي" msejjel fi localStorage');

  // --- el tartib yeb9a ba3d update mel serveur (defausse)
  const nowIds = ids();
  const c0 = doc.querySelector('#hand .card');
  fire(c0, 'pointerdown', 10, 10); fire(c0, 'pointerup', 10, 10);
  await sleep(200);
  const discardBtn = [...doc.querySelectorAll('#actions button')].find(b => b.textContent.includes('اطرد') && !b.disabled);
  if (discardBtn) {
    const kept = nowIds.filter(id => id !== c0.dataset.id);
    discardBtn.click();
    await sleep(1200);
    for (let i = 0; i < 30 && !(state().canAct && state().phase === 'action'); i++) {
      if (state().canAct && state().phase === 'draw') { const b = [...doc.querySelectorAll('#actions button')].find(x => x.textContent.includes('البوك')); if (b) b.click(); }
      await sleep(400);
    }
    const afterIds = ids().filter(id => kept.includes(id));
    const keptOrder = afterIds.filter(id => kept.includes(id));
    const expected = kept.filter(id => afterIds.includes(id));
    const orderOk = keptOrder.join() === expected.join();
    note(orderOk, 'el tartib elli 3meltou ba9i kifkif ba3d ma let3ab dour jdid', keptOrder.slice(0, 4).join(',') + ' vs ' + expected.slice(0, 4).join(','));
  } else {
    note(false, 'ma l9inech el bouton "اطرد" (ma najjamnech nverifiw el persistance)');
  }

  // --- click m3a el drag mode : yeshty selection
  const one = doc.querySelector('#hand .card');
  fire(one, 'pointerdown', 5, 5); fire(one, 'pointerup', 5, 5);
  await sleep(200);
  note(win.eval('S.sel.size') === 1, 'click 3al carte (bla sa7ba) => selection', 'sel=' + win.eval('S.sel.size'));
  fire(one, 'pointerdown', 5, 5); fire(one, 'pointerup', 5, 5);
  await sleep(200);
  note(win.eval('S.sel.size') === 0, 'click marra okhra => deselection');

  // --- reset el tartib
  win.__resetSort();
  await sleep(300);
  note(win.eval('S.sortMode') === 'auto', 'el bouton "رتّب أوتوماتيك" rja3 el mode auto');

  /* ---------- 4) el thème yetحفظ ba3d refresh ---------- */
  applyCheck: {
    win.eval('applyTheme("royal")');
    await sleep(100);
    const dom2 = await JSDOM.fromURL(BASE + '/', {
      runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
      beforeParse(w) { w.localStorage.setItem('rami_theme', 'royal'); },
    });
    await sleep(1200);
    const ok = dom2.window.document.body.dataset.theme === 'royal';
    note(ok, 'el thème msejjel ykoun appliqué mel bdaya (refresh)', 'body=' + dom2.window.document.body.dataset.theme);
    dom2.window.close();
  }

  console.log(nl.join('\n'));
  console.log('\n=== NATIJA (tartib + thèmes) ===');
  if (problems.length) { console.log('❌ ' + problems.length + ':'); problems.forEach(p => console.log('  - ' + p)); }
  else console.log('✅ kol chay b7al b7al — el tartib bidi w 4 formes de cartes ye5dmou');
  win.close();
  process.exit(problems.length ? 2 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
