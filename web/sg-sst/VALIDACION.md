# Comprobaciones de la web vertical

Las pruebas de `scripts/qa_scroll.mjs` finalizaron con código 0 en Chromium. El informe está en `qa-scroll/report.json`.

- Scroll vertical nativo con rueda, sin iframe de diapositivas ni desplazamiento horizontal.
- 19 apartados accesibles en escritorio; las imágenes originales y las fuentes Anton, Manrope y Fraunces cargaron correctamente.
- 15 pasos de lectura que actualizan su indicador al desplazarse.
- Tres visores completos: apertura y cierre con Escape, zoom con botones y rueda, ajuste y arrastre. Los enlaces de Google Sheets se conservaron.
- Lectura de 73, 117 y 60 celdas no vacías de los tres Excel, con sus combinaciones: 250 valores.
- Navegación por permanencia del cursor, opción para desactivarla, índice, flechas verticales y teclado. El scroll bajo un cursor inmóvil no dispara cambios de apartado.
- Sonido optativo, puntero de exposición y movimiento reducido.
- Notas privadas editables guardadas en el navegador, cronómetro y ventana del público sincronizada por posición.
- Todos los apartados caben sin desbordamiento horizontal en 390 px y 768 px. Los controles del visor y la lectura de celdas se probaron en ambos tamaños.
- Ningún error de JavaScript ni solicitud externa para cargar el contenido, las fuentes, los scripts y las imágenes. Las tres fotografías nuevas también están incrustadas.

El control de pantalla completa solicita la API nativa con activación real del usuario. Chromium administrado deja la solicitud pendiente incluso en una página mínima: la entrada real a pantalla completa no pudo verificarse en este entorno. No se simula pantalla completa.

La prueba completa se repitió después de sustituir las fotos ajenas al caso y finalizó con código 0. La sección de empresa conserva las dos fotografías originales del PPT. El HTML portátil y la copia de `/docs` coinciden; el ZIP se extrae íntegro y contiene ese mismo HTML. La selección anterior de cuatro fotos referenciales fue reemplazada por las tres fuentes actuales de Chinalco, Horizonte Minero y Mi Radio.

## Entrega pública

La rama `presentacion-web` se publicó en el repositorio. El HTML público de RawGithack y el ZIP de raw.githubusercontent.com devolvieron HTTP 200. Los archivos descargados coinciden con el HTML y ZIP locales; el ZIP contiene el mismo HTML y se extrae sin errores.

URL: https://raw.githack.com/sullon631-crypto/VIDEO/presentacion-web/docs/index.html

La API de GitHub Pages rechazó la activación con `403 Resource not accessible by integration`; no se afirma que GitHub Pages esté habilitado.

La comprobación del navegador sobre el enlace público también finalizó con código 0. Se aceptó mediante el botón **Open the page** el aviso inicial del servidor, y después se verificaron los 19 apartados, carga de imágenes, 60 celdas y zoom del Formato 8, y ausencia de desbordamiento a 390 px. No hubo errores de JavaScript. Resultado: `qa-scroll/public-report.json`.

## Sustitución de imágenes ajenas al caso

Se retiraron las fotografías de Lando de la portada, el abanico y los datos de imágenes de la web. La nueva selección usa las tres fuentes indicadas en `assets/case-image-sources.json`: planta de Horizonte Minero, mantenimiento de Chinalco y capacitación referencial de Mi Radio.

Las tres fotografías originales se recuperaron de respuestas HTTP reales de Chromium, tras cargar la web publicada. Se inspeccionaron visualmente; la foto de la planta coincide con la captura del usuario. Sus URL, dimensiones y hashes se registran en `assets/case-image-downloads.json`. El acceso directo con curl había devuelto CONNECT 403, pero la descarga normal del navegador sí funcionó. No se utilizaron fixtures para obtener estas fotografías.

Las tarjetas usan previews WebP; el visor abre los originales JPEG sin cambios, con resolución de 8192×4608, 1400×950 y 1280×960. Los JPEG se incrustan una sola vez en los datos del HTML portátil y se conservan en el ZIP. `qa_images.mjs` compara sus hashes con los originales descargados y verifica el zoom, los 19 apartados y el modo sin conexión. Chromium administrado bloquea la navegación a URL file; el ensayo sin conexión carga el HTML portátil exacto desde memoria con la red desactivada. Informe: `qa-scroll/image-report.json`.
