"""Assemble the vertical website, including a portable offline HTML copy."""
import base64
import html
import json
import mimetypes
import re
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from content import SLIDES, FORMATS, LINKS

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
def safe(value):
    return json.dumps(value,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
def uri(path):
    return 'data:'+(mimetypes.guess_type(path.name)[0] or 'application/octet-stream')+';base64,'+base64.b64encode(path.read_bytes()).decode()
def js(path):
    source='\n'.join(line.rstrip() for line in path.read_text().splitlines())
    return re.sub('</script',r'<\\/script',source,flags=re.I)
ARROW='<svg class="arrow-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 19 14-14M5 5h14v14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
def picture(name,alt,cls='',caption=''):
    return f'<button class="evidence {cls}" data-image="{name}" data-title="{html.escape(alt)}" aria-label="Ampliar: {html.escape(alt)}"><img src="assets/{name}.webp" alt="{html.escape(alt)}" draggable="false"><span class="zoom-corner">{ARROW}</span>{f"<span class=image-label>{caption}</span>" if caption else ""}</button>'

hero=f'''<div class="hero-contours" aria-hidden="true"></div><div class="hero-disc" aria-hidden="true"><span>ACTUAR ANTES / CUIDAR SIEMPRE</span></div>
<div class="hero-copy"><p class="eyebrow" data-anim>GRUPO 1 · SEGURIDAD INDUSTRIAL</p><h1><span class="hero-line">LA PREVENCIÓN</span><span class="hero-line">EMPIEZA</span><span class="hero-line hero-emphasis">ANTES.</span></h1><p class="hero-sub" data-anim>La evidencia también protege.<br>Tres casos del SG-SST, una forma de actuar.</p><a class="button primary" href="#ruta" data-anim>Explorar la presentación <span>↓</span></a><div class="hero-meta" data-anim><span>MINERA CHINALCO PERÚ S.A.</span><span>PIURA / 09.10.2026</span></div></div>
<div class="hero-visual"><div class="hero-orbit" aria-hidden="true"></div><button class="hero-portrait" data-image="lando-helmet" data-title="Lando Norris con casco · fotografía de landonorris.com" aria-label="Ampliar fotografía de Lando Norris"><img class="hero-person" src="assets/lando-helmet.webp" alt="Lando Norris con casco de protección, fotografía de landonorris.com"></button><span class="hero-image-credit">FOTOGRAFÍA EDITORIAL · LANDO NORRIS</span><div class="hero-ticket"><span>REGISTRAR ES</span><strong>prevenir.</strong><small>R.M. N.° 050-2013-TR</small></div></div><a class="scroll-hint" href="#ruta"><span>DESLIZA PARA DESCUBRIR</span><i>↓</i></a>'''

def format_section(number):
    f=FORMATS[number]
    nav=''.join(f'<a href="#f{number}-paso-{i}" class="format-step-link" data-format-step="{number}:{i}" aria-label="Ir al paso {i+1}: {s["label"]}">{i+1:02d}</a>' for i,s in enumerate(f['steps']))
    articles=''
    for i,s in enumerate(f['steps']):
        fields=''.join(f'<div class="reading-field"><dt>{html.escape(a)}</dt><dd>{html.escape(b)}</dd></div>' for a,b in s['fields'])
        articles+=f'<article id="f{number}-paso-{i}" class="reading-step" data-step-index="{i}"><div data-anim><p class="step-kicker"><span>{i+1:02d} / 05</span>{s["label"]}</p><h3>{s["title"]}</h3><dl>{fields}</dl><p class="reading-why">{s["why"]}</p></div></article>'
    return f'''<div class="section-heading" data-anim><p class="eyebrow">CASO {f['case']} / EL REGISTRO RESUELTO</p><h2>FORMATO <em>{number:02d}</em></h2><p class="lead">{f['name']}</p></div><div class="format-scroll" data-format="{number}"><aside class="format-sticky"><div class="format-paper"><div class="document-top"><span>{f['code']}</span><span>REGISTRO 001</span></div>{picture(f['image'],f'Registro original del Formato {number}','document-image')}<div class="document-actions"><button class="button primary" data-view="{number}">Explorar registro {ARROW}</button><a class="button outline" href="{html.escape(LINKS[number])}" target="_blank" rel="noopener noreferrer">Google Sheets {ARROW}</a></div></div><div class="format-route"><span>LECTURA GUIADA</span><nav aria-label="Pasos del Formato {number}">{nav}</nav></div><p class="format-hint">Desplázate para recorrer los cinco pasos.<br>Pulsa el documento para ampliarlo.</p></aside><div class="reading-steps">{articles}</div></div>'''

themes=['cream','cream','olive','cream','blue','cream','sand','mint','cream','ice','olive','cream','lavender','navy','rose','cream','olive','cream','cream']
sections=[]
for i,s in enumerate(SLIDES):
    body=hero if i==0 else format_section(s['format']) if s['format'] else s['body']
    if i!=0:
        body=body.replace('<h1>','<h2>').replace('</h1>','</h2>')
        body=body.replace('src="../assets/','src="assets/').replace('↗',ARROW)
        body=body.replace('Recorre los pasos con el cursor o con las flechas →','Desplázate hacia abajo para recorrer los pasos.')
        if i==3:
            detail=picture('hero','Personal y equipos de la minera, imagen incluida en el PPT','company-detail','Imagen del PPT · En operación')
            body=body.replace('</div><div class="company-data"',detail+'</div><div class="company-data"')
        if i==1:
            fan=f'<div class="photo-fan" aria-label="Fotografías editoriales de Lando Norris"><div class="fan-card fan-left">{picture("lando-training","Lando Norris entrenando, fotografía de landonorris.com")}</div><div class="fan-card fan-center">{picture("lando-camera","Lando Norris con una cámara, fotografía de landonorris.com")}</div><div class="fan-card fan-right">{picture("lando-golf","Lando Norris practicando golf, fotografía de landonorris.com")}</div><span class="fan-caption">ATENCIÓN. PREPARACIÓN. CUIDADO.</span></div>'
            body=body.replace('<div class="agenda-grid">',fan+'<div class="agenda-grid">')
    sections.append(f'<section id="{s["id"]}" class="web-section theme-{themes[i]} {"hero" if i==0 else ""} {"format-section" if s["format"] else ""}" data-section-index="{i}" aria-label="{html.escape(s["title"])}"><div class="section-inner">{body}</div><span class="section-number" aria-hidden="true">{i+1:02d}</span></section>')

chapters=[('ruta','Recorrido'),('normas','Normas'),('empresa','Empresa'),('caso-1','Caso 1'),('caso-6','Caso 6'),('caso-7','Caso 7'),('resumen','Cierre')]
nav=''.join(f'<a href="#{id}">{label}</a>' for id,label in chapters)
index=''.join(f'<a href="#{s["id"]}" data-index-link><span>{i+1:02d}</span><strong>{s["title"]}</strong>{ARROW}</a>' for i,s in enumerate(SLIDES))
dots=''.join(f'<a href="#{s["id"]}" aria-label="Ir a {html.escape(s["title"])}" data-section-dot="{i}"><span>{html.escape(s["title"])}</span></a>' for i,s in enumerate(SLIDES))
data={'sections':[{k:v for k,v in s.items() if k not in ['body','theme']} for s in SLIDES],'formats':{n:{**f,'link':LINKS[n]} for n,f in FORMATS.items()},'workbooks':json.loads((ROOT/'workbooks.json').read_text()),'images':{p.stem:'assets/'+p.name for p in ASSETS.glob('*.webp')}}
css=(ROOT/'site.css').read_text()
javascript=(ROOT/'site.js').read_text()
template=f'''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#eeece3"><meta name="description" content="Una exposición interactiva de los casos 1, 6 y 7 del SG-SST: exámenes médicos, capacitación y auditorías."><title>Registrar es prevenir · Una exposición en movimiento</title><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='18' fill='%232d3727'/%3E%3Ctext x='32' y='44' text-anchor='middle' font-size='32' font-family='Arial' font-weight='900' fill='%23e2edaf'%3ESG%3C/text%3E%3C/svg%3E"><link rel="stylesheet" href="site.css"></head><body>
<a class="skip-link" href="#ruta">Saltar al contenido</a><header class="site-header"><a class="brand" href="#portada"><span class="brand-mark">SG</span><span>SG-SST<small>GRUPO 1 / CHINALCO</small></span></a><nav class="main-nav" aria-label="Apartados">{nav}</nav><div class="header-actions"><button id="present-button" class="pill" aria-pressed="false">EXPOSITOR {ARROW}</button><button id="index-button" class="menu-button" aria-label="Abrir índice (I)"><span></span><span></span></button></div><div id="scroll-progress" role="progressbar" aria-label="Recorrido de la presentación" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div></header>
<main id="presentation">{''.join(sections)}</main>
<footer class="site-footer"><a class="brand" href="#portada"><span class="brand-mark">SG</span><span>REGISTRAR ES PREVENIR.</span></a><p>GRUPO 1 · PIURA, 2026</p><div><a href="https://landonorris.com/" target="_blank" rel="noopener noreferrer">Fotografías editoriales: landonorris.com</a><a href="#portada">Volver arriba ↑</a></div></footer>
<nav class="section-dots" aria-label="Recorrido vertical">{dots}</nav><div class="reading-position"><span id="current-section">01</span><span>/ 19</span><span id="current-title">Inicio</span></div>
<div class="floating-controls"><button id="previous-section" aria-label="Apartado anterior">↑</button><button id="next-section" aria-label="Apartado siguiente">↓</button><button id="sound-button" aria-label="Activar sonido" aria-pressed="false">♪</button><button id="fullscreen-button" aria-label="Pantalla completa (F)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" fill="none" stroke="currentColor" stroke-width="1.7"/></svg></button><button id="tools-button" aria-label="Opciones de presentación">⋯</button></div>
<dialog id="index-dialog" class="index-dialog" aria-labelledby="index-title"><div class="dialog-head"><div><span>EL RECORRIDO</span><h2 id="index-title">¿Por dónde seguimos?</h2></div><button data-close-dialog class="close-button" aria-label="Cerrar índice">×</button></div><div class="index-grid">{index}</div><p class="dialog-foot">Haz clic para entrar. Activa el acceso con el cursor en las opciones.</p></dialog>
<dialog id="tools-dialog" class="tools-dialog" aria-labelledby="tools-title"><div class="dialog-head"><h2 id="tools-title">A tu ritmo.</h2><button data-close-dialog class="close-button" aria-label="Cerrar opciones">×</button></div><label class="setting"><span>Entrar con el cursor<small>Mantén el cursor 0,7 segundos sobre un apartado.</small></span><input type="checkbox" data-setting="hover" checked></label><label class="setting"><span>Puntero de exposición<small>Señala la zona que estás explicando. Atajo: L.</small></span><input type="checkbox" data-setting="laser"></label><label class="setting"><span>Reducir movimiento<small>Lectura con animaciones mínimas.</small></span><input type="checkbox" data-setting="reduced"></label><a class="tool-download" href="index.html" download="Presentacion-SG-SST.html">Guardar la web para usar sin internet ↓</a><div class="shortcuts"><span>↑ ↓ Apartados</span><span>F Pantalla completa</span><span>P Expositor</span><span>I Índice</span><span>L Puntero</span><span>Esc Cerrar</span></div></dialog>
<aside id="presenter-panel" class="presenter-panel" hidden aria-label="Notas privadas del expositor"><div class="presenter-head"><span>EXPOSITOR · NOTAS PRIVADAS</span><button id="close-presenter" aria-label="Cerrar modo expositor">×</button></div><h2 id="notes-title"></h2><p id="presenter-clock">00:00</p><label for="speaker-notes">TU GUÍA PARA ESTA SECCIÓN</label><textarea id="speaker-notes" spellcheck="true"></textarea><div class="notes-next"><span>A CONTINUACIÓN</span><p id="notes-next-title"></p></div><button id="audience-button" class="button primary">Abrir ventana del público {ARROW}</button><p class="presenter-tip">Muestra la ventana del público al compartir pantalla. Esta ventana conserva tus notas.</p></aside>
<dialog id="viewer" aria-labelledby="viewer-title"><div class="viewer-shell"><div class="viewer-header"><div><span>EXPLORAR LA EVIDENCIA</span><h2 id="viewer-title"></h2></div><button id="viewer-close" class="close-button" aria-label="Cerrar ampliación">×</button></div><div class="viewer-toolbar"><div id="viewer-tabs"><button id="view-original" class="is-active">Imagen original</button><button id="view-cells">Leer celdas</button></div><div class="zoom-tools"><button id="zoom-out" aria-label="Reducir zoom">−</button><output id="zoom-level">100%</output><button id="zoom-in" aria-label="Ampliar zoom">+</button><button id="zoom-fit">Ajustar</button></div></div><div id="viewer-stage"><div id="viewer-world"></div></div><div class="viewer-bottom"><span>Rueda: zoom · Arrastra: mover · Doble clic: ampliar</span><a id="viewer-sheet-link" target="_blank" rel="noopener noreferrer">Abrir Google Sheets {ARROW}</a></div></div></dialog>
<div id="image-cursor" aria-hidden="true">VER</div><div id="laser" aria-hidden="true"></div><div id="toast" role="status"></div>
<script id="site-data" type="application/json">{safe(data)}</script><script src="assets/gsap.min.js"></script><script src="assets/ScrollTrigger.min.js"></script><script src="site.js"></script></body></html>'''
(ROOT/'site.html').write_text(template)
portable=template.replace('<link rel="stylesheet" href="site.css">','<style>'+css+'</style>')
for name in ['Anton-Regular.ttf','Manrope.ttf','Fraunces-Italic.ttf']:
    portable=portable.replace('assets/'+name,uri(ASSETS/name))
for name in ['gsap.min.js','ScrollTrigger.min.js']:
    portable=portable.replace(f'<script src="assets/{name}"></script>','<script>'+js(ASSETS/name)+'</script>')
portable=portable.replace('<script src="site.js"></script>','<script>'+javascript+'</script>')
# Only embed referenced images; the rest of the old project is preserved on disk.
for p in ASSETS.glob('*.webp'):
    portable=portable.replace('assets/'+p.name,uri(p))
portable=portable.replace('assets/click-soft.mp3',uri(ASSETS/'click-soft.mp3'))
licenses={name:(ASSETS/(name+'-OFL.txt')).read_text() for name in ['Anton','Manrope','Fraunces']}
portable=portable.replace('</body>',f'<script type="application/json" id="font-licenses">{safe(licenses)}</script></body>')
(ROOT/'index.html').write_text(portable)
with ZipFile(ROOT/'Presentacion-SG-SST.zip','w',ZIP_DEFLATED,compresslevel=9) as z:
    z.writestr('index.html',portable)
    z.writestr('LEEME.txt','PRESENTACIÓN SG-SST · WEB VERTICAL\n\nExtrae el ZIP y abre index.html con Chrome, Edge o Firefox. Recorre la presentación con la rueda del ratón. Pulsa las imágenes para ampliar. F: pantalla completa; I: índice; P: expositor; L: puntero.\n\nLas fotografías, fuentes y contenido están incluidos. Google Sheets y los enlaces a las normas requieren internet.\n')
docs=ROOT.parents[1]/'docs'
docs.mkdir(exist_ok=True)
(docs/'index.html').write_text(portable)
(docs/'.nojekyll').write_text('')
(docs/'Presentacion-SG-SST.zip').write_bytes((ROOT/'Presentacion-SG-SST.zip').read_bytes())
print(f'Built vertical website: {len(SLIDES)} sections, 15 guided steps; portable HTML {len(portable.encode()):,} bytes.')
