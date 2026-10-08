# Registrar es prevenir · Presentación web del Grupo 1

Presentación interactiva de 19 pantallas basada en el nuevo PPT «Presentación Casos SG-SST grupo 1» y en el informe entregado. Usa Anton, Manrope, una paleta naranja/azul oscuro/crema/rojo/amarillo y las fotografías y registros originales del PPT.

## Abrir y exponer

`index.html` contiene las fuentes, imágenes, reproductor, animaciones y sonido. Se puede descargar y abrir directamente en un navegador actual, o alojar en cualquier servidor estático. Los enlaces externos a Google Sheets y a las normas necesitan internet.

- Flechas del teclado o controles inferiores: avanzar y retroceder. En los formatos, avanzar recorre los cinco pasos antes de pasar a la siguiente pantalla.
- Mantener el cursor 0,7 segundos sobre un apartado, tarjeta del índice o paso: entrar. La opción CURSOR permite pausar esta navegación.
- F: pantalla completa. P o el botón de expositor: ventana para el público, notas privadas editables en la ventana actual. Las dos ventanas comparten pantalla y paso mediante BroadcastChannel; necesitan el mismo origen y un navegador que permita ventanas nuevas.
- I: índice. L: puntero de exposición. Herramientas: reducir movimiento y reiniciar.
- Imágenes: pulsar para ampliar. Explorar registro: imagen completa o lectura de las celdas. Rueda o +/−: zoom hasta 800 %. Arrastrar: mover. Doble clic: ampliar. Ajustar: encuadrar. Esc: cerrar.
- El sonido empieza silenciado; el control inferior lo activa. No hay avance automático ni límite de tiempo: el expositor controla el ritmo.
- En móvil se conserva una composición estrecha; las pantallas con más contenido permiten desplazamiento vertical.

## Fuentes y contenido

El nuevo PPT prevalece cuando cambia la portada, los cinco integrantes y las referencias. El Formato 7 tiene **20 participantes**, conforme a la tabla del informe y al nuevo PPT; el párrafo anterior que dice 18 no se usa. Las fechas y estados corresponden al caso académico, sin afirmar que las acciones pendientes ya se ejecutaron.

Los Formatos 2, 7 y 8 conservan los enlaces exactos de Google Sheets entregados por el usuario. La vista de lectura usa las celdas y combinaciones de los tres Excel del repositorio: 73, 117 y 60 celdas no vacías. Incluye los 250 valores; no consulta datos nuevos ni modifica Google Sheets. La imagen original permanece disponible para verificar firmas y formato.

## Editar y reconstruir

- `scripts/content.py`: texto, cinco pasos por formato y notas de cada pantalla.
- `composition.css` / `composition.js`: diseño, animaciones y exploración de los documentos.
- `wrapper.css` / `wrapper.js`: navegación, herramientas y presentación.
- `assets/`: recursos originales optimizados y componentes Hyperframes 0.8.142.
- `python3 scripts/build.py`: recompone el HTML portátil y `composition/index.html`.

La composición para CLI mantiene las escenas como elementos hermanos. El fondo incluye el reloj de 190 segundos; no envuelve las escenas. Esta duración describe posiciones de navegación, no la duración de la exposición. El HTML portátil usa el harness de presentación independiente con `window.__timelines.root`; la composición editable utiliza el runtime de Hyperframes. No exportar esta presentación interactiva como un MP4.

Para probar: desde `/workspace/VIDEO`, iniciar `python3 -m http.server 8080 --bind 127.0.0.1`; desde esta carpeta ejecutar `node scripts/qa.mjs`. Usa Puppeteer y Chromium ya instalados en el entorno. El script comprueba todas las pantallas, los 15 pasos, las celdas de Excel, zoom, navegación, pantalla completa, notas y la vista móvil. Para validar Hyperframes: `npx --yes hyperframes@0.8.142 check composition --samples 19 --json`, con las variables de navegador y caché indicadas en la configuración del entorno.

Las licencias SIL Open Font License de Anton y Manrope se conservan en `assets/`. Las animaciones siguen la preferencia de movimiento reducido del sistema.
