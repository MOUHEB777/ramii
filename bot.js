'use strict';
/* ============================================================
   Bot mta3 Rami 51 — ye5dem 3al serveur
   ============================================================ */
const E = require('./engine');

/* 9ima carte fi yed el bot */
function cardUsefulness(card, hand) {
  if (card.r === 'JOKER') return 100;
  let score = E.rankValue(card.r);
  const same = hand.filter(c => c.r === card.r && c.id !== card.id);
  score += same.length * 5;
  const suit = hand.filter(c => c.s === card.s && c.r !== 'JOKER' && c.id !== card.id);
  const n = E.rankNum(card.r);
  for (const c of suit) {
    const m = E.rankNum(c.r);
    const d = Math.min(Math.abs(m - n), Math.abs(m - n));
    if (d === 1) score += 6;
    else if (d === 2) score += 2;
  }
  if ((card.r === 'J' || card.r === 'Q' || card.r === 'K' || card.r === '10') && suit.length === 0 && same.length === 0) score -= 2;
  return score;
}

/* A7sen combinaisons (mch mote9assmin) mel yed */
function bestMelds(hand, needOpen) {
  const cands = E.allMelds(hand);
  let best = { melds: [], points: 0 };
  for (let t = 0; t < 6; t++) {
    const pool = t === 0 ? cands : E.shuffle(cands.slice());
    const used = new Set();
    const picked = [];
    let pts = 0;
    for (const m of pool) {
      if (m.ids.some(id => used.has(id))) continue;
      if (hand.length - (used.size + m.ids.length) < 1) continue; // lazema carte bech tedfa3
      picked.push(m); m.ids.forEach(id => used.add(id)); pts += m.points;
      if (needOpen && pts >= E.OPEN_MIN) break;
    }
    if (pts > best.points) best = { melds: picked, points: pts };
  }
  return best;
}

/* Yekhtar carte bech yedfa3ha */
function chooseDiscard(hand) {
  if (!hand.length) return null;
  const scored = hand.map(c => ({ c, s: cardUsefulness(c, hand) })).sort((a, b) => a.s - b.s);
  const nonJoker = scored.filter(x => x.c.r !== 'JOKER');
  return (nonJoker[0] || scored[0]).c;
}

/* Menin yekhdh el bot (pioche wela défausse) */
function chooseDrawSource(room, me) {
  const top = room.discard[room.discard.length - 1];
  if (!top) return 'stock';
  const withNew = me.hand.concat([top]);
  const melds = E.allMelds(withNew).filter(m => m.ids.includes(top.id));
  if (melds.length && (!me.opened || melds.some(m => m.points >= 12))) return 'discard';
  for (const m of room.table) {
    const a = E.arrangeMeld(m.ordered.concat([top]));
    if (a.ok && a.type === m.type && me.opened) return 'discard';
  }
  if (me.hand.filter(c => c.r === top.r && c.id !== top.id).length >= 2) return 'discard';
  return 'stock';
}

/* Plan kamel mta3 dour : {draw, melds:[[ids]], adds:[{meldId,cardIds}], discardId} */
function planTurn(room, me) {
  const draw = chooseDrawSource(room, me);
  let hand = me.hand.slice();
  if (draw === 'discard') {
    const top = room.discard[room.discard.length - 1];
    if (top) hand.push(top);
  } else {
    const top = room.stock[room.stock.length - 1];
    if (top) hand.push(top);
  }

  const used = new Set();
  const melds = [];
  const adds = [];

  if (!me.opened) {
    const b = bestMelds(hand, true);
    if (b.points >= room.openMin) b.melds.forEach(m => { melds.push(m.ids); m.ids.forEach(id => used.add(id)); });
  } else {
    for (const tbl of room.table) {
      const tblCards = tbl.ordered || tbl.cards || [];
      if (tbl.type === 'set' && tblCards.length >= 4) continue;
      let cur = { type: tbl.type, ordered: tblCards.slice() };
      let changed = true;
      while (changed) {
        changed = false;
        for (const c of hand) {
          if (used.has(c.id)) continue;
          if (hand.length - (used.size + 1) < 1) break;   // lazema carte bech tedfa3
          const a = E.arrangeMeld(cur.ordered.concat([c]));
          if (a.ok && a.type === cur.type) {
            adds.push({ meldId: tbl.id, cardIds: [c.id] });
            used.add(c.id); cur = { type: a.type, ordered: a.ordered }; changed = true;
          }
        }
      }
    }
    const rest = hand.filter(c => !used.has(c.id));
    const b = bestMelds(rest, false);
    for (const m of b.melds) {
      if (hand.length - (used.size + m.ids.length) < 1) continue;
      melds.push(m.ids); m.ids.forEach(id => used.add(id));
    }
  }

  let left = hand.filter(c => !used.has(c.id));
  if (!left.length) {                    // lazema carte wa7da bech tedfa3
    const popped = melds.pop();
    if (popped) popped.forEach(id => used.delete(id));
    else if (adds.length) { const a = adds.pop(); a.cardIds.forEach(id => used.delete(id)); }
    left = hand.filter(c => !used.has(c.id));
  }
  const discard = chooseDiscard(left.length ? left : me.hand);
  return { draw, melds, adds, discardId: discard ? discard.id : null };
}

module.exports = { planTurn, chooseDiscard, chooseDrawSource, cardUsefulness, bestMelds };
