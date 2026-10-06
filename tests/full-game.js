'use strict';
/* Test 3 : le3ba kamla (rondat + scores + gameover) b sor3a 3alya */
const { JSDOM, VirtualConsole } = require('jsdom');
const BASE = process.env.URL_BASE || 'http://127.0.0.1:8080';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => { if (!/Not implemented/.test(e.message)) problems.push('JSDOM-ERR: ' + e.message.split('\n')[0]); });

(async () => {
  const dom = await JSDOM.fromURL(BASE + '/', { runScripts:'dangerously', resources:'usable', pretendToBeVisual:true, virtualConsole:vc });
  const win = dom.window, doc = win.document;
  await sleep(900);
  doc.querySelector('#nameInput').value = 'Tounsi';
  doc.querySelector('#createBtn').click();
  await sleep(1000);
  const so = doc.querySelector('#setOpen'); so.value = '31'; so.dispatchEvent(new win.Event('change'));
  const tg = doc.querySelector('#setTarget'); tg.value = '300'; tg.dispatchEvent(new win.Event('change'));
  await sleep(300);
  win.__addBot(); win.__addBot(); win.__addBot();
  await sleep(700);
  win.__start();
  await sleep(900);

  let roundsSeen = new Set(), nextClicked = 0, gameover = false, myDiscards = 0;
  const hist = [];
  for (let i = 0; i < 1400; i++) {
    const s = win.__state();
    if (s && s.phase === 'roundend') {
      if (!roundsSeen.has(s.round)) {
        roundsSeen.add(s.round);
        const rows = doc.querySelectorAll('#modalBox .scoretable tbody tr').length;
        hist.push('ronda ' + s.round + ': rows=' + rows + ' scores=' + s.players.map(p => p.name + ':' + p.score).join(','));
        if (rows !== 4) problems.push('roundend modal rows=' + rows);
        const nb = [...doc.querySelectorAll('#modalBox button')].find(b => b.textContent.includes('روندا جديدة'));
        if (!nb) problems.push('bouton "روندا جديدة" mch mawjoud');
        else { nb.click(); nextClicked++; }
      }
      await sleep(250);
      continue;
    }
    if (s && s.phase === 'gameover') {
      gameover = true;
      hist.push('GAMEOVER: ' + s.players.map(p => p.name + ':' + p.score).join(','));
      const html = doc.querySelector('#modalBox').innerHTML;
      if (!html.includes('👑')) problems.push('gameover modal mch mazyan');
      break;
    }
    if (s && s.canAct) {
      if (s.phase === 'draw') { const b = [...doc.querySelectorAll('#actions button')].find(x => x.textContent.includes('البوك')); if (b) b.click(); }
      else if (s.phase === 'action') {
        const cs = [...doc.querySelectorAll('#hand .card')];
        if (cs.length) cs[0].click();
        await sleep(40);
        const db = [...doc.querySelectorAll('#actions button')].find(x => x.textContent.includes('اطرد') && !x.disabled);
        if (db) { db.click(); myDiscards++; }
      }
    }
    await sleep(120);
  }
  console.log('rondat:', roundsSeen.size, '| nextClicked:', nextClicked, '| myDiscards:', myDiscards, '| gameover:', gameover);
  hist.forEach(h => console.log('  ' + h));
  const final = win.__state();
  console.log('final: phase=' + final.phase + ' round=' + final.round + ' | ' + final.players.map(p => p.name + ':' + p.score).join(' '));
  if (roundsSeen.size < 2) problems.push('ma 3malnech 3 rondat');
  if (!gameover) problems.push('el le3ba ma kmeltech (gameover)');
  console.log('\n=== NATIJA 3 ===');
  if (problems.length) { console.log('❌ ' + problems.length + ':'); problems.forEach(p => console.log('  - ' + p)); }
  else console.log('✅ le3ba kamla temchi 100%');
  win.close(); process.exit(problems.length ? 2 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
