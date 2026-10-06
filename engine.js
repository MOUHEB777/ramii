'use strict';
/* ============================================================
   RAMI 51 — moteur mta3 el jeu (pure logic, no dependencies)
   Yehdem fi Node (require) w fi el navigateur (window.E)
   ============================================================ */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.E = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  const SUITS = ['S', 'H', 'D', 'C'];
  const SUIT_ORDER = { S: 0, H: 1, C: 2, D: 3 };
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const DECKS = 2;          // 2 jeux mta3 52
  const JOKERS = 2;         // + 2 jokers  => 106 cartes
  const OPEN_MIN = 51;      // lazema 51 point bech t7ell
  const DEAL = 14;          // kol joueur ye5ou 14 carte
  const MAX_JOKER_MELD = 2; // 2 jokers maximum fi combinaison

  /* ---------- points ---------- */
  function rankNum(r) {
    if (r === 'A') return 1;
    if (r === 'J') return 11;
    if (r === 'Q') return 12;
    if (r === 'K') return 13;
    return parseInt(r, 10);
  }
  // 9ima fel yed (penalty)
  function rankValue(r) {
    if (r === 'JOKER') return 15;
    if (r === 'A') return 1;
    if (r === 'J' || r === 'Q' || r === 'K') return 10;
    return parseInt(r, 10);
  }
  function slotValue(slot) { // 9ima carte elli ybadelha el joker
    if (slot === 1 || slot === 14) return 1;
    if (slot >= 11) return 10;
    return slot;
  }

  /* ---------- deck ---------- */
  let SEQ = 0;
  function makeDeck() {
    const cards = [];
    for (let d = 0; d < DECKS; d++) {
      for (const s of SUITS) for (const r of RANKS) cards.push({ id: 'c' + (++SEQ), r, s, d });
    }
    for (let j = 0; j < JOKERS; j++) cards.push({ id: 'c' + (++SEQ), r: 'JOKER', s: null, d: j });
    return cards;
  }
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function sortHand(cards) {
    return cards.slice().sort((a, b) => {
      if (a.r === 'JOKER' && b.r === 'JOKER') return 0;
      if (a.r === 'JOKER') return 1;
      if (b.r === 'JOKER') return -1;
      if (a.s !== b.s) return SUIT_ORDER[a.s] - SUIT_ORDER[b.s];
      return rankNum(a.r) - rankNum(b.r);
    });
  }

  /* ============================================================
     T7a99o9 mta3 combinaison (meld)
     Natija: {ok:true, type:'run'|'set', ordered:[...], points:n}
             wela {ok:false, reason:'...'}
     ============================================================ */
  function arrangeMeld(cards) {
    if (!Array.isArray(cards) || cards.length < 3) return { ok: false, reason: 'Lazem 3 cartes 3al a9all' };
    if (cards.length > 14) return { ok: false, reason: 'Bezzef cartes' };
    const nat = cards.filter(c => c.r !== 'JOKER');
    const jok = cards.filter(c => c.r === 'JOKER');
    if (jok.length > MAX_JOKER_MELD) return { ok: false, reason: '2 jokers maximum' };
    if (nat.length < 2) return { ok: false, reason: 'Lazem 2 cartes 7a9i9iyin 3al a9all' };

    const asSet = trySet(cards, nat, jok);
    if (asSet) return asSet;
    const asRun = tryRun(cards, nat, jok);
    if (asRun) return asRun;
    return { ok: false, reason: 'Ma thabbech : la couleur w la suite' };
  }

  function trySet(cards, nat, jok) {
    if (jok.length > 1) return null;
    if (cards.length > 4) return null;
    const rank = nat[0].r;
    if (!nat.every(c => c.r === rank)) return null;
    if (new Set(nat.map(c => c.s)).size !== nat.length) return null;
    const ordered = nat.slice().sort((a, b) => SUIT_ORDER[a.s] - SUIT_ORDER[b.s]).concat(jok);
    return { ok: true, type: 'set', suit: null, rank, ordered, points: rankValue(rank) * ordered.length };
  }

  function tryRun(cards, nat, jok) {
    if (new Set(nat.map(c => c.s)).size !== 1) return null;
    const len = cards.length;
    for (const mode of [1, 14]) {                 // As = 1 wela As = 14
      const nums = nat.map(c => (c.r === 'A' ? mode : rankNum(c.r)));
      if (new Set(nums).size !== nums.length) continue;
      const min = Math.min.apply(null, nums), max = Math.max.apply(null, nums);
      const byNum = {};
      nat.forEach((c, i) => { byNum[nums[i]] = c; });
      const from = Math.max(1, max - len + 1);
      const to = Math.min(min, 14 - len + 1);
      let bestArr = null;
      for (let s = from; s <= to; s++) {
        const ordered = [];
        let ji = 0, ok = true;
        for (let slot = s; slot <= s + len - 1; slot++) {
          if (byNum[slot]) ordered.push(byNum[slot]);
          else if (ji < jok.length) ordered.push(jok[ji++]);
          else { ok = false; break; }
        }
        if (!ok) continue;
        let points = 0;
        ordered.forEach((c, k) => { points += c.r === 'JOKER' ? slotValue(s + k) : rankValue(c.r); });
        // n7afdou a7sen tartib (el joker dima 7sen 9ima)
        if (!bestArr || points > bestArr.points) {
          bestArr = { ok: true, type: 'run', suit: nat[0].s, rank: null, ordered, points };
        }
      }
      if (bestArr) return bestArr;
    }
    return null;
  }

  function meldPoints(meld) {
    if (!meld) return 0;
    if (typeof meld.points === 'number') return meld.points;
    const a = arrangeMeld(meld.cards || meld.ordered || []);
    return a.ok ? a.points : 0;
  }
  function handPoints(hand) {
    return (hand || []).reduce((s, c) => s + rankValue(c.r), 0);
  }

  /* ============================================================
     Mou3awin : el7a kol el combinaisons el moumkinah mel yed
     (mosta3mla mel bot + mel hint)
     ============================================================ */
  function allMelds(hand) {
    const res = [];
    const n = hand.length;
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        for (let k = j + 1; k < n; k++) {
          const base = [hand[i], hand[j], hand[k]];
          const a3 = arrangeMeld(base);
          if (a3.ok) res.push({ ids: base.map(c => c.id), cards: base.slice(), type: a3.type, points: a3.points });
          for (let l = k + 1; l < n; l++) {
            const b4 = base.concat([hand[l]]);
            const a4 = arrangeMeld(b4);
            if (a4.ok) res.push({ ids: b4.map(c => c.id), cards: b4.slice(), type: a4.type, points: a4.points });
            for (let m = l + 1; m < n; m++) {
              const b5 = b4.concat([hand[m]]);
              const a5 = arrangeMeld(b5);
              if (a5.ok) res.push({ ids: b5.map(c => c.id), cards: b5.slice(), type: a5.type, points: a5.points });
            }
          }
        }
    // n7aydou el doublons (nafs set mta3 ids)
    const seen = new Set(), out = [];
    for (const m of res.slice().sort((a, b) => b.points - a.points)) {
      const key = m.ids.slice().sort().join(',');
      if (seen.has(key)) continue;
      seen.add(key); out.push(m);
    }
    return out;
  }

  return {
    SUITS, RANKS, SUIT_ORDER, DECKS, JOKERS, OPEN_MIN, DEAL, MAX_JOKER_MELD,
    rankNum, rankValue, slotValue, makeDeck, shuffle, sortHand,
    arrangeMeld, meldPoints, handPoints, allMelds,
  };
});
