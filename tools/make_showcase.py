# -*- coding: utf-8 -*-
"""ywelled page HTML (bla ressources kharjiyin) bech tchouf el ashkel mta3 el wara9"""
import io, os, re
os.chdir('/home/user/rami')
css = io.open('public/style.css', encoding='utf-8').read()

# 1) les variables :root
m = re.search(r':root\{.*?\n\}', css, re.S)
root = m.group(0) if m else ''

# 2) mel 'cards' l'ekher el fichier (cards + sortbar + thèmes)
i = css.index('/* ---------------- cards ---------------- */')
cards_and_themes = css[i:]

# 3) les styles mta3 el page (bla .card, bech maykhalatch)
base = u'''
*{box-sizing:border-box}
body{margin:0;padding:26px 18px 60px;font-family:"Segoe UI",Tahoma,system-ui,"Noto Naskh Arabic",sans-serif;
  color:#f3f1ff;background:#0b0a1f;
  background-image:radial-gradient(1200px 700px at 12% -10%, #45108a 0%, transparent 60%),
    radial-gradient(900px 600px at 110% 20%, #0a5d6b 0%, transparent 55%),
    linear-gradient(160deg,#0b0a1f 0%,#160c37 55%,#0b0a1f 100%);
  min-height:100vh}
h1{text-align:center;margin:6px 0 4px;font-size:30px;letter-spacing:1px}
h1 .neon{color:#2ff3e0;text-shadow:0 0 12px rgba(47,243,224,.8)}
.sub{text-align:center;color:#b0a9d6;font-size:13.5px;margin-bottom:26px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:18px;max-width:1300px;margin:0 auto}
.panel{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:20px;padding:16px 16px 20px}
.ptitle{display:flex;align-items:baseline;gap:10px;margin-bottom:4px}
.ptitle b{font-size:17px}
.ptitle span{font-size:12px;color:#b0a9d6}
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-top:14px}
.row .card{width:62px;height:90px}
.row.labels .card{width:38px;height:54px}
.note{font-size:11.5px;color:#b0a9d6;margin-top:10px;text-align:center}
.badge{display:inline-block;font-size:11px;padding:3px 9px;border-radius:999px;background:rgba(47,243,224,.16);color:#2ff3e0}
.hero{max-width:1300px;margin:0 auto 22px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:14px 18px;font-size:13.5px;line-height:1.9;color:#cfc9ea}
.hero b{color:#ffd93d}
'''

def card(rank, suit, joker=False):
    if joker:
        return u'<div class="card joker"><div class="jk">🃏</div><div class="jkt">JOKER</div><div class="gloss"></div></div>'
    g = {'S': u'♠', 'H': u'♥', 'D': u'♦', 'C': u'♣'}[suit]
    cls = 'red' if suit in ('H', 'D') else 'black'
    return (u'<div class="card %s"><div class="corner tl"><span>%s</span><span>%s</span></div>'
            u'<div class="pip">%s</div><div class="corner br"><span>%s</span><span>%s</span></div>'
            u'<div class="gloss"></div></div>' % (cls, rank, g, g, rank, g))

def back():
    return u'<div class="card back"></div>'

THEMES = [
    ('classic', u'🂡 كلاسيكي', u'الورق البيض العادي — كما الكارطة اللي تعرفها'),
    ('neon', u'🌌 نيون', u'أسود + أزرق يلمع (vibe مta3 الليل)'),
    ('royal', u'👑 رويال', u'إطار ذهبي — كما الكازينوهات'),
    ('modern', u'🃏 مودرن', u'نقي و بسيط — شكل 2026'),
]

panels = []
for tid, name, desc in THEMES:
    hand = card('A', 'S') + card('K', 'H') + card('7', 'D') + card('Q', 'C') + card('10', 'S') + card('JOKER', None, True)
    table = card('9', 'H') + card('9', 'S') + card('JOKER', None, True) + card('5', 'C') + card('6', 'C') + card('7', 'C') + back()
    panels.append(u'''  <div class="panel" data-theme="%s">
    <div class="ptitle"><b>%s</b><span class="badge">%s</span></div>
    <div class="row labels" data-theme="%s">
      %s
    </div>
    <div class="row" data-theme="%s">%s</div>
    <div class="note">↑ هذي carte مta3 يدّك — و تحتها ورق الطاولة و ظهر الكارطة</div>
  </div>''' % (tid, name, tid, tid,
               card('A', 'S') + card('K', 'H') + card('JOKER', None, True),
               tid, hand + back()))

html = u'''<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>🃏 RAMI 51 — أشكال الورق</title>
<style>
%s
%s
%s
</style>
</head>
<body>
<h1>🃏 RAMI <span class="neon">51</span> — <span style="font-size:22px">أشكال الورق</span></h1>
<div class="sub">4 أشكال جديدة — تختار اللي يعجبك mel 🎨 fi اللعبة، و يتسجّل ليك</div>
<div class="hero">
  <b>كيفاش تبدّل الشكل؟</b> ادخل اللعبة ← كليكي 3al <b>🎨</b> فوق (جنب الصوت) ← اختار الشكل. El choix yeb9a msejjel f téléphone/PC mte3ek.
  <br><b>و ترتيب الورق بيدك:</b> fi شريط <b>«رتّب: شكل · رقم · ✋ بيدي»</b> تحت يدّك — كليكي <b>✋ بيدي</b> وبعد اسحب الورقة و حطّها فين تحب (بالماوس تنجّم تسحب مباشرة). ب <b>رقم</b> ولا <b>شكل</b> يرتّب أوتوماتيك.
</div>
<div class="grid">
%s
</div>
</body>
</html>
''' % (root, base, cards_and_themes, u'\n'.join(panels))

io.open('themes.html', 'w', encoding='utf-8').write(html)
print('themes.html maktoub | size', len(html), 'bytes')
