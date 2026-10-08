"""Build the editable Hyperframes composition and a fully portable public HTML."""
import base64
import html
import json
import mimetypes
import re
from pathlib import Path
from content import SLIDES, FORMATS, LINKS

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'

def data_url(path):
    mime = mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
    return f'data:{mime};base64,' + base64.b64encode(path.read_bytes()).decode()

def safe_json(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')

def inline_js(path):
    return re.sub(r'</script', r'<\\/script', path.read_text(), flags=re.I)

manifest = {'slides': [], 'slideSequences': []}
for i, s in enumerate(SLIDES):
    item = {'sceneId': s['id'], 'notes': s['notes']}
    if s['format']:
        item['fragments'] = [round(i * 10 + .8 + n * .8, 2) for n in range(5)]
    manifest['slides'].append(item)

image_names = sorted(p.stem for p in ASSETS.glob('*.webp'))
formats = {n: {**f, 'link': LINKS[n]} for n, f in FORMATS.items()}
payload = {'slides': [{k:v for k,v in s.items() if k not in ('body','notes')} for s in SLIDES],
           'formats': formats, 'workbooks': json.loads((ROOT / 'workbooks.json').read_text()),
           'images': {n:f'../assets/{n}.webp' for n in image_names}}
frames = ''.join(f'<section id="{s["id"]}" class="scene-frame" data-composition-id="{s["id"]}" data-start="{i*10}" data-duration="10" data-width="1920" data-height="1080" data-label="{html.escape(s["title"])}" aria-label="{html.escape(s["title"])}"><div class="scene-inner"><div class="scene-content">{s["body"]}</div></div></section>' for i,s in enumerate(SLIDES))

viewer = '''<dialog id="viewer" aria-labelledby="viewer-title"><div class="viewer-shell">
  <div class="viewer-header"><h2 id="viewer-title">Registro original</h2><button id="viewer-close" class="viewer-close" aria-label="Cerrar ampliación (Esc)">×</button></div>
  <div class="viewer-toolbar"><div id="viewer-tabs" class="viewer-tabs"><button id="view-original" class="is-active">Imagen original</button><button id="view-cells">Leer celdas</button></div>
  <div class="zoom-tools"><button id="zoom-out" aria-label="Reducir zoom">−</button><output id="zoom-level" aria-label="Nivel de zoom">100%</output><button id="zoom-in" aria-label="Ampliar zoom">+</button><button id="zoom-fit">Ajustar</button></div></div>
  <div id="viewer-stage" class="viewer-stage" aria-label="Área ampliable. Arrastra para mover y usa la rueda para ampliar."><div id="viewer-world" class="viewer-world"></div></div>
  <div class="viewer-bottom"><span>Rueda: zoom · Arrastra: mover · Doble clic: ampliar · Esc: cerrar</span><a id="viewer-sheet-link" target="_blank" rel="noopener noreferrer">Abrir Google Sheets ↗</a></div>
</div></dialog><div id="laser" aria-hidden="true"></div>'''

def composition(portable=False):
    css = (ROOT/'composition.css').read_text()
    body = frames
    arrow = '<svg class="inline-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    body = body.replace('↗', arrow)
    data = dict(payload)
    if portable:
        data['images'] = {n:data_url(ASSETS/(n+'.webp')) for n in image_names}
        for n, url in data['images'].items():
            body = body.replace(f'../assets/{n}.webp', url)
        for name in ('Anton-Regular.ttf','Manrope.ttf'):
            css = css.replace(f'../assets/{name}', data_url(ASSETS/name))
        gsap = '<script>'+inline_js(ASSETS/'gsap.min.js')+'</script>'
        runtime = '<!-- Standalone slideshow harness: hyperframe.runtime.iife.js is used in the editable CLI composition; this portable entry drives the paused root clock directly. -->'
    else:
        gsap = '<script src="../assets/gsap.min.js"></script>'
        runtime = '<script src="../assets/hyperframe.runtime.iife.js"></script>'
    source = f'''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SG-SST · Grupo 1</title><style>{css}</style>{gsap}</head><body class="theme-orange">
<script type="application/hyperframes-slideshow+json">{safe_json(manifest)}</script>
<div id="background" data-composition-id="root" data-start="0" data-duration="190" data-width="1920" data-height="1080" aria-hidden="true"><div class="bg-grid"></div><div class="bg-circle" data-layout-allow-overflow></div><div class="bg-corner" data-layout-allow-overflow></div></div>
{body}{viewer}<script id="deck-data" type="application/json">{safe_json(data)}</script><script>{(ROOT/'composition.js').read_text()}</script>{runtime}</body></html>'''
    return source if portable else source.replace('../assets/', 'assets/')

(ROOT/'composition').mkdir(exist_ok=True)
if not (ROOT/'composition'/'assets').exists():
    (ROOT/'composition'/'assets').symlink_to('../assets', target_is_directory=True)
(ROOT/'composition'/'index.html').write_text(composition(), encoding='utf-8')
(ROOT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')

nav = ''.join(f'<button data-jump="{i}" aria-label="Ir a {label}">{label}</button>' for i,label in [(0,'Inicio'),(2,'Normas'),(4,'Caso 1'),(7,'Caso 6'),(10,'Caso 7'),(14,'Cierre')])
index = ''.join(f'<button data-jump="{i}"><span>{i+1:02d}</span>{html.escape(s["title"])}</button>' for i,s in enumerate(SLIDES))
wrapper_css = (ROOT/'wrapper.css').read_text()
for name in ('Anton-Regular.ttf','Manrope.ttf'):
    wrapper_css=wrapper_css.replace(f'assets/{name}',data_url(ASSETS/name))
font_licenses = safe_json({name: (ASSETS / f'{name}-OFL.txt').read_text() for name in ['Anton','Manrope']})
favicon = 'data:image/svg+xml;base64,' + base64.b64encode(b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#FF762F"/><text x="32" y="43" text-anchor="middle" font-size="32" font-weight="900" font-family="Arial" fill="#142341">SG</text></svg>').decode()
player_js = inline_js(ASSETS/'hyperframes-player.global.js')
slideshow_js = inline_js(ASSETS/'hyperframes-slideshow.global.js')
page = f'''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#FF762F"><meta name="description" content="Presentación interactiva del Grupo 1: casos 1, 6 y 7 y registros del SG-SST de Minera Chinalco Perú."><title>Registrar es prevenir · SG-SST · Grupo 1</title><link rel="icon" href="{favicon}"><style>{wrapper_css}</style><script>{player_js}</script><script>{slideshow_js}</script></head><body>
<hyperframes-slideshow id="deck" tabindex="0" sound notes-storage-key="sg-sst-grupo1-notas-v1">
  <header class="site-header"><button class="brand" data-jump="0" aria-label="Ir al inicio"><span class="brand-mark">SG</span><span class="brand-label">SG-SST<small>GRUPO 1 / CHINALCO</small></span></button>
  <nav class="chapter-nav" aria-label="Apartados de la exposición">{nav}</nav>
  <div class="header-actions"><button id="cursor-button" class="header-button cursor-button" aria-pressed="true" title="Mantén el cursor 0,7 segundos sobre un apartado para entrar"><span class="cursor-label">CURSOR</span><span id="cursor-status">ACTIVO</span></button><button id="open-index" class="header-button" aria-label="Abrir índice (I)">ÍNDICE <span>≡</span></button><button id="open-tools" class="header-button icon-only" aria-label="Abrir herramientas" title="Herramientas">⚙</button></div>
  <div id="progress" class="header-progress" role="progressbar" aria-label="Avance de la presentación" aria-valuemin="1" aria-valuemax="19" aria-valuenow="1"><span id="progress-fill"></span></div></header>
  <hyperframes-player id="player" interactive width="1920" height="1080"></hyperframes-player>
  <script id="manifest" type="application/hyperframes-slideshow+json">{safe_json(manifest)}</script>
  <div class="deck-footer"><span class="footer-dot"></span><span id="scene-label">01 / 19</span><span>·</span><span>← → AVANZAR</span></div>
</hyperframes-slideshow>
<dialog id="index-dialog" class="pro-dialog" aria-labelledby="index-title"><div class="dialog-head"><h2 id="index-title">ELIGE UN APARTADO.</h2><button class="close-dialog" data-close-dialog aria-label="Cerrar índice">×</button></div><div class="dialog-scroll"><p class="dialog-description">Haz clic o mantén el cursor sobre la tarjeta para entrar. Puedes volver a cualquier caso durante las preguntas.</p><div id="scene-index" class="scene-index">{index}</div></div></dialog>
<dialog id="tools-dialog" class="pro-dialog tools-dialog" aria-labelledby="tools-title"><div class="dialog-head"><h2 id="tools-title">HERRAMIENTAS.</h2><button class="close-dialog" data-close-dialog aria-label="Cerrar herramientas">×</button></div><div class="dialog-scroll">
<p class="dialog-description">Ajusta la presentación a tu forma de exponer.</p>
<label class="setting-row"><span>Navegación con el cursor<small>Entra a apartados y pasos al mantener el cursor durante 0,7 segundos.</small></span><input type="checkbox" data-setting="cursor" checked></label>
<label class="setting-row"><span>Puntero de exposición<small>Resalta la zona que explicas con un aro amarillo. Atajo: L.</small></span><input type="checkbox" data-setting="laser"></label>
<label class="setting-row"><span>Reducir movimiento<small>Presenta el contenido con transiciones mínimas.</small></span><input type="checkbox" data-setting="reduced"></label>
<button id="restart" class="tool-action">Reiniciar la exposición <span>↺</span></button>
<a class="tool-link" href="index.html" download="Presentacion-SG-SST-Grupo1.html">Guardar para usar sin internet <span>↓</span></a>
<div class="shortcut-grid"><span><kbd>← →</kbd> Recorrer</span><span><kbd>F</kbd> Pantalla completa</span><span><kbd>P</kbd> Notas privadas</span><span><kbd>I</kbd> Índice</span><span><kbd>L</kbd> Puntero</span><span><kbd>Esc</kbd> Cerrar</span></div>
<p class="tool-tip">El botón de modo expositor abre una ventana para el público y deja tus notas en esta ventana. Las notas se pueden editar. Activa el sonido en los controles inferiores para acompañar los cambios.</p>
</div></dialog>
<div id="loading" class="loading-brand"><strong>REGISTRAR ES PREVENIR.</strong><span>19 PANTALLAS<br>3 CASOS · 3 REGISTROS</span></div>
<div id="error-surface" class="error-surface" hidden><div><h1>VOLVAMOS A INTENTAR.</h1><p>Recarga la página para iniciar la presentación.</p><a href="index.html" download="Presentacion-SG-SST-Grupo1.html">Descargar la versión sin internet</a></div></div>
<noscript>Activa JavaScript para usar la presentación interactiva.</noscript>
<script id="font-licenses" type="application/json">{font_licenses}</script>
<script id="click-audio" type="text/plain">{data_url(ASSETS/'click-soft.mp3')}</script>
<script id="composition-source" type="application/json">{safe_json(composition(True))}</script>
<script>{(ROOT/'wrapper.js').read_text()}</script>
</body></html>'''
(ROOT/'index.html').write_text(page,encoding='utf-8')
print(f'Built {len(SLIDES)} screens, 15 guided format steps, {len(image_names)} images; portable HTML {len(page.encode()):,} bytes.')
