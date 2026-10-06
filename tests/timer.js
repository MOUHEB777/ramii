'use strict';
/* ============================================================
   Test : el timer 7a9i9i mta3 el dour (turn clock)
   node tests/timer.js      (serveur b TURN_LIMIT=8, SPEED=0.4)
   ============================================================ */
const WebSocket = require('ws');
const URLx = process.env.URL || 'ws://127.0.0.1:8082';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const log = (...a) => console.log(...a);

(async () => {
  const ws = new WebSocket(URLx);
  let st = null, pid = null, sawDeadline = false, sawLimit = false, autoPlayed = false, myTurns = 0;
  ws.on('error', e => { console.error('WS ERR', e.message); process.exit(1); });
  ws.on('open', () => ws.send(JSON.stringify({ t: 'hello', room: '', name: 'TimerTest' })));
  ws.on('message', d => {
    const m = JSON.parse(d.toString());
    if (m.type === 'joined') {
      pid = m.playerId;
      ws.send(JSON.stringify({ t: 'addBot' }));
      setTimeout(() => ws.send(JSON.stringify({ t: 'start' })), 400);
      return;
    }
    if (m.type !== 'state') return;
    st = m;
    if (m.turnEndsAt && m.turnLimit) sawDeadline = true;
    if (m.turnLimit === 8000) sawLimit = true;
  });
  await sleep(1200);
  log('1) limit fi el state:', sawLimit, '| turnEndsAt:', sawDeadline);
  if (!sawLimit) problems.push('turnLimit mch mawjoud fi el state');
  if (!sawDeadline) problems.push('turnEndsAt mch mawjoud');

  // ken dourna, nستنّاو bla ma nel3bou => el serveur lazem yel3ab 3lina (8 ثواني)
  for (let i = 0; i < 60; i++) {
    if (st && st.canAct) break;
    await sleep(500);
  }
  if (!(st && st.canAct)) problems.push('ma jach dourna bech njarrabou');
  else {
    log('2) dourna ja — nستنّاو bla ma nel3bou (lazem el serveur yel3ab 3lina ba3d ~8s)');
    const myTurnAt = Date.now();
    const before = st.hand.length;
    const turnIdBefore = st.turnId;
    let played = false;
    for (let i = 0; i < 40; i++) {
      await sleep(500);
      if (st && st.turnId !== turnIdBefore) { played = true; break; }
    }
    const took = Math.round((Date.now() - myTurnAt) / 1000);
    log('3) el dour t3ada wa7dou?' , played, '| ba3d', took, 'ثانية | yed 9bal:', before, 'ba3d:', st.hand.length);
    if (!played) problems.push('el serveur ma لعبش 3lina (timer ma khdemch)');
    if (played && took > 16) problems.push('el timer tarda bezzef (' + took + 's)');
  }

  // nchoufou el clock yنقص 3al joueur el bechri (nafsna) : nستنّاو dourna w n9issou
  let saw = [];
  for (let i = 0; i < 80; i++) {
    if (st && st.canAct && st.turnEndsAt) { saw.push(Math.ceil((st.turnEndsAt - Date.now()) / 1000)); if (saw.length > 6) break; }
    await sleep(400);
  }
  log('4) el clock yنقص:', JSON.stringify(saw));
  const decreasing = saw.length >= 2 ? saw[0] >= saw[saw.length - 1] : false;
  if (!decreasing) problems.push('el clock ma yنقصش');

  log('\n=== NATIJA (timer) ===');
  if (problems.length) { console.log('❌ ' + problems.length + ':'); problems.forEach(p => console.log('  - ' + p)); }
  else console.log('✅ el timer 7a9i9i yekhdem : el serveur yel3ab 3al joueur elli y9a3ed');
  ws.close();
  process.exit(problems.length ? 2 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
