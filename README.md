# 🃏 RAMI 51 — لعبة الورق التونسية أونلاين

لعبة **رامي** كاملة (برووم، بوتات و أونلاين مع أصحابك) — serveur Node.js + WebSocket + interface web wa7ed el page، bla 7atta dépendance kbira.

---

## 🎮 Kifech tel3ab

### 1) 3andek (local)
```bash
cd rami
npm install          # lazema marra wa7da (yrawwa7 ws)
npm start            # wala: node server.js
```
Men ba3d 7ell: **http://localhost:8080**

- **🎮 لعبة سريعة مع البوتات** → tebda dour direct m3a 3 bots (bla ma testanna 7atta wa7ed).
- **🏠 افتح روم** → yet3tik koud (مثلا `K7PQ`)، tnassakh el lien w teb3athou l'as7abek.
- **🔑 ادخل** → kteb el koud elli 3tak sa7bek.

### 2) L'as7abek yel3bou m3ak
- **Fi nafs el Wifi (local network):** echouf el adresse IP mta3 el PC (`ipconfig` fi Windows / `ifconfig` fi Mac-Linux) w el as7abek ydakhlou: `http://192.168.1.xx:8080`.
- **3al internet (bla serveur payant) — asra3 tari9a:** [ngrok](https://ngrok.com) wala Cloudflare Tunnel:
  ```bash
  npx ngrok http 8080     # yet3tik lien public https://xxx.ngrok-free.app
  ```
- **Deploy 3al cloud (chaque fois khaddem):** [Render](https://render.com)، [Railway](https://railway.app)، [Fly.io](https://fly.io)، wala ay VPS. L'commande: `npm start` (el serveur yekhdem 3al port `PORT` ken mawjoud fi l'environnement).
- **Telegram / WhatsApp:** el lien ykoun fih el koud (`?r=K7PQ`) → l'joueur ydkhol direct.

---

## 🎯 Kifech tel3ab el Rami (قواعد مختصرة)

| حاجة | تفصيل |
|---|---|
| **الورق** | 2 jeux mta3 52 + 2 jokers = **106 carte** |
| **كل لاعب** | 14 carte + 1 carte 3al défausse |
| **كولور (Set)** | نفس الرقم، شكل مختلف: `K♠ K♥ K♦` (أقصى 4) |
| **سويت (Run)** | نفس الشكل و متتاليين: `5♥6♥7♥` من 3 ورقات وطلع. الآس: `A-2-3` ولا `Q-K-A` |
| **الجوكر** | يعوّض أي ورقة (2 أقصى في الكومبيناسيون). في اليد = **15 نقطة** |
| **الحلّ (51)** | أول كومبيناسيون لازم تجمع **51 نقطة** في نفس الدور. الجوكر يحسب بقيمة الورقة اللي عوّضها |
| **الطرد** | كولور = قيمة الرقم · سويت = قيمة أكبر ورقة (الملك10، الآس 1 ولا 11) · جوكر = 15 |
| **النقاط** | اللي يفضّي يدّو ياخذ **0**، الباقي يحسبو الورق اللي في يدّهم. **اللي يوصل للهدف (500) يخسر — الأقل نقاط يربح** |
| **الوقت** | 30 ثانية للدور — آكén، البوت يلعب عليك (بش يتبدّل بـ `TURN_LIMIT`) |
| **ممنوع** | ما تنجّمش تاخذ ورق من كومبيناسيونات الطاولة (تنجّم تزيد بس) |

### 🪵 El table 3a9liya (design jdid) — Jdid !
El layout walla **table 3a9liya** (kima el jeux de cartes 3al net) :
- **Table mta3 khechba** (wood 7a9i9i) + **felt akhal** fi el wast, b texture w défausse fi el marge.
- **Kol joueur 7awel el table** : avatar + smiya + 3adad el wara9 (CARDS) + badge «حلّ ✓» / «BOT» — w **el wara9 mfarrcha (fan)** 7adih.
- **El dour** bayen : el plaque mte3 el joueur yedha yemchi + **clock دائري** fi el wast (24 ثانية).
- **Score sheet** mta3 wara9 3ati9 3al yassar (SCORES) — mrattba mel a9al lel a3la + click «–» bech tsaghra.
- **Signboard « JBOUD 51 »** fi el wast + « HBOUT JDID 0/51 » = ta9addom mte3ek fi el 7ell.
- **Name tag** mte3ek (smiya + score) ta7t el table, w el **buttons** kima el reference (💬 chat · 🔊 son · 🎨 wara9 · 📜 règles · ⛶ fullscreen · 🚪 اخرج).
- **El wara9** walla 3andou wajh 7a9i9i : valeur + couleur fi el coins, lettres kbir fi el wast, w **les cartes 7achmiyin (J/Q/K) 3andhom «court»** b nafs el style mte3 el wara9 el 3adi. Dhahr el carte = **damask a7mar**.

### 🎨 Formes mta3 el wara9 (4 styles) — Jdid !
Kليكي **🎨** fi el topbar ← اختار :
| الشكل | الوصف |
|---|---|
| 🂡 **كلاسيكي** | ورق بيض عادي كما الكارطة اللي تعرفها |
| 🌌 **نيون** | أسود + أزرق/بينك يلمع — vibe مta3 الليل |
| 👑 **رويال** | إطار ذهبي — كما الكازينوهات |
| 🃏 **مودرن** | نقي و بسيط — شكل 2026 |

- El choix **ytesjjel lyou** (localStorage) — kol ma t7ell el jeu, ykoun kifkif.
- Chnouf el 4 formes 9bal : 7ell **`themes.html`** (page spéciale bla serveur).
- El forme tebdel **3andek brk** — as7abek ychoufou el wara9 kima 3andhom 😉

### ✋ Tartib el wara9 bidek — Jdid !
Fi **شريط «رتّب»** ta7t el wara9 mte3ek :
- **شكل** → يرتّب أوتوماتيك باللون (♠→♥→♦→♣)
- **رقم** → يرتّب أوتوماتيك بالرقم (A→K)
- **✋ بيدي** → **تسحب الورقة و تحطّها فين تحب** :
  - 💻 **بالماوس** : kbere 3al carte w اسحب (شادّها) — yekhdem dima
  - 📱 **بالصبّع** : اختار **✋ بيدي** (bech el touch yekhdem)، ba3d اسحب الورقة
  - El wara9 wa9t tsa7bou ytetla3 w yeb9a fi blasetou — w **el tartib yeb9a** 7atta ba3d ma tel3ab dour jdid
  - Ki tkoun fi mode **بيدي** w t7eb tarja3 : kбес **رقم** wala **شكل** (wala **🔄 رتّب أوتوماتيك** mel 🎨)

### خصائص اللعبة
- ✅ **نزّل و رجّع**: يكén ما جبتش 51، الورق يرجع ليك وقتلي تطرد (كرة كاملة فما).
- ✅ **زيد على الطاولة**: بعد ما تحلّ، تنجّم تزيد ورق على كومبيناسيونات الكل (حتى متاع أصحابك).
- ✅ **طرد ورقة إجبارية** باش تكمل الدورك.
- ✅ **Hints 💡**: يوريك أهبط كومبيناسيون ممكنة.
- ✅ **Chkoun edha?**: اللي يوصل 0 ورق يربح الروندا، و اللي يوصل للهدف يخسر اللعبة.

---

## ⚠️ Mهم : ki trawwa7 lel projet
`node_modules` **mch persista** fi snapshots mta3 had el workspace — ki t7ell el projet men jdid :
```bash
cd rami && npm install && npm start
```
(zouze commands, 5 ثواني).

## ⚙️ El options fi el room

- **31 / 41 / 51** نقطة باش تحلّ (افتراضي **51**).
- **300 / 500 / 1000** نقطة هدف el partie (افتراضي **500**).
- 2 → 4 لاعبين (بشريين و/أو بوتات).

---

## 🗂️ Structure mta3 el projet

```
rami/
├── server.js            # HTTP + WebSocket + rooms + bots + zones
├── engine.js            # moteur el jeu (les règles 100% — pure JS, ye5dem fi Node w fi navigateur)
├── bot.js               # DHCP el bot (plan kamel mta3 dour)
├── public/
│   ├── index.html       # el page (RTL) : table + seats + score sheet
│   ├── style.css        # felt/wood + wara9 + 4 thèmes + responsive
│   ├── app.js           # client WebSocket + seats + clock + drag&drop
│   └── assets/          # wood.jpg · cardback.jpg (textures générées)
├── themes.html          # page mta3 l'aperçu mta3 el 4 formes (bla serveur)
├── tools/make_showcase.py  # ywelled themes.html mel CSS 7a9i9i
└── tests/
    ├── engine.test.js   # tests mta3 les règles
    ├── sim.js           # simulation kamla mta3 partie fiha 3 bots
    ├── ui.js            # robot jsdom yel3ab mel interface (meld/undo/add/discard)
    ├── sort-theme.js    # robot jsdom : drag&drop + les 4 thèmes
    ├── timer.js         # el clock mta3 el dour (auto-play ki y9a3ed)
    └── full-game.js     # partie kamla (rondat + scores + game over)
```

### Tester
```bash
npm test                       # moteur/règles
node tests/sim.js              # (serveur khaddem) partie kamla b bots
npm i -D jsdom && node tests/ui.js   # robot el interface
node tests/sort-theme.js       # (serveur khaddem) tartib bidi + thèmes
node tests/timer.js            # (serveur b TURN_LIMIT=8) el clock mta3 el dour
SPEED=0.1 node server.js       # serveur saree3 bech tjarreb esr3
```

### Variables d'environnement
| Var | Ma3néha | Defaut |
|---|---|---|
| `PORT` | port el serveur | `8080` |
| `HOST` | adresse list n | `0.0.0.0` |
| `SPEED` | vitesse mta3 el bots (1 = 3adi, 0.1 = test saree3) | `1` |
| `TURN_LIMIT` | 3adad el ثواني lel dour (0 = bla limite) | `30` |

---

## 🧠 Notes techniques

- **Bla database**: kol chay fi el mémoire (rooms). Ken el serveur y3awed yebda, les parties tsa9tou.
- **Reconnection**: ki y3amel refresh el joueur, yel9a yedou (token mahfouth fi localStorage + `?r=CODE` fi lien).
- **Spectateurs**: ken el room 3amer (4 joueurs)، el 5ames ychouf barka.
- **AFK**: ken el joueur yokhrej wala ma yel3abch، el bot yel3ab 3lih (mors 12s).

## 🧩 Chnowa najjem nzid (9olli w n3mlou)
- **Skins mta3 el table** : khechba, r5am, zre3 (felt akhdar/azra9) — b نفس el principe mta3 el 🎨.
- **Animation mta3 el wara9** : el carte temchi mel yed lel table b animation (FLIP) ki tدfa3.
- **Voix / réactions** : "ya3tek el sa77a!" ki t7ell، w emojis katrin.
- **Turki (بنك el scores)** : bouton «قائد el table» + historique mta3 les parties.
- **Mode tournoi** : 4 joueurs، table finale، tableau mta3 el résultats.

## 🚀 Idees lel 3am jey (ken t7eb)
- Comptes + base données (parties mahfouthin).
- Modes: 2 joueurs 1v1، تورناي.
- Voix fi el room، emojis katrin، zeda ashkel jdad mta3 el tables (fond).
- Khaznet el conteur : "أحسن dour" wala tartib automatique ذكي (يجمّع الورق اللي يمشي مع بعضها).
- App mobile (PWA) bech tnzél 3al telephone.

---
Sna3tha b ❤️ lel tunisyen elli y7ebbu el wara9 🃏 — Rabbi m3ak, w rababe3 el karta!
