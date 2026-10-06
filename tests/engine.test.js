const E = require('../engine');
const c = (r,s) => ({ r, s: s||null, id: r+(s||'')+Math.random().toString(36).slice(2,6) });
function t(name, res, expectOk, expectPts){
  const ok = res.ok === expectOk && (!expectOk || expectPts === undefined || res.points === expectPts);
  console.log((ok?'✅':'❌')+' '+name+' -> '+(res.ok?('ok '+res.type+' pts='+res.points):('KO '+res.reason)));
}
t('couleur K♠K♥K♦', E.arrangeMeld([c('K','S'),c('K','H'),c('K','D')]), true, 30);
t('couleur 3 as', E.arrangeMeld([c('A','S'),c('A','H'),c('A','D')]), true, 3);
t('couleur 4 memes', E.arrangeMeld([c('7','S'),c('7','S'),c('7','H'),c('7','D')]), false);
t('couple+1 = 2 cartes', E.arrangeMeld([c('K','S'),c('K','H')]), false);
t('couleur 5 cartes', E.arrangeMeld([c('K','S'),c('K','H'),c('K','D'),c('K','C'),c('K','S')]), false);
t('suite 5,6,7 ♥', E.arrangeMeld([c('5','H'),c('6','H'),c('7','H')]), true, 18);
t('suite 10,J,Q,K ♠', E.arrangeMeld([c('10','S'),c('J','S'),c('Q','S'),c('K','S')]), true, 40);
t('suite Q,K,A ♠', E.arrangeMeld([c('Q','S'),c('K','S'),c('A','S')]), true, 21);
t('suite A,2,3 ♠', E.arrangeMeld([c('A','S'),c('2','S'),c('3','S')]), true, 6);
t('suite mech ordonnée 9,8,10 ♦', E.arrangeMeld([c('9','D'),c('8','D'),c('10','D')]), true, 27);
t('suite couleurs mélangées', E.arrangeMeld([c('5','H'),c('6','S'),c('7','H')]), false);
t('suite avec trou', E.arrangeMeld([c('5','H'),c('6','H'),c('8','H')]), false);
t('suite joker 5,6,JOKER ♣', E.arrangeMeld([c('5','C'),c('6','C'),c('JOKER')]), true, 5+6+7);
t('couleur joker 9♠9♥JOKER', E.arrangeMeld([c('9','S'),c('9','H'),c('JOKER')]), true, 27);
t('2 jokers + 1 carte', E.arrangeMeld([c('9','S'),c('JOKER'),c('JOKER')]), false);
// total 51
const open1 = E.arrangeMeld([c('10','S'),c('J','S'),c('Q','S'),c('K','S')]);
const open2 = E.arrangeMeld([c('9','H'),c('9','D'),c('9','C')]);
console.log('7ell test total:', open1.points+open2.points, '(>=51 ?', open1.points+open2.points>=51, ')');
// deck
const d = E.makeDeck();
console.log('deck size (lazem 106):', d.length, '| unique ids:', new Set(d.map(x=>x.id)).size);
// allMelds perf
const hand = E.shuffle(E.makeDeck()).slice(0,14);
const t0 = Date.now(); const ms = E.allMelds(hand); console.log('allMelds:', ms.length, 'combis fi', Date.now()-t0, 'ms');
