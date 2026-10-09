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
- Ningún error de JavaScript. El contenido, las fuentes, los scripts y las fotos del PPT cargan localmente; las nuevas fotos de contexto solo solicitan los tres dominios indicados por el usuario. Los fallos de esas fuentes opcionales quedan registrados por separado y conservan las imágenes del PPT.

El control de pantalla completa solicita la API nativa con activación real del usuario. Chromium administrado deja la solicitud pendiente incluso en una página mínima: la entrada real a pantalla completa no pudo verificarse en este entorno. No se simula pantalla completa.

La prueba completa se repitió después de sustituir las fotos ajenas al caso y finalizó con código 0. La sección de empresa conserva las dos fotografías originales del PPT. El HTML portátil y la copia de `/docs` coinciden; el ZIP se extrae íntegro y contiene ese mismo HTML. La selección anterior de cuatro fotos referenciales fue reemplazada por las tres fuentes actuales de Chinalco, Horizonte Minero y Mi Radio.

## Entrega pública

La rama `presentacion-web` se publicó en el repositorio. El HTML público de RawGithack y el ZIP de raw.githubusercontent.com devolvieron HTTP 200. Los archivos descargados coinciden con el HTML y ZIP locales; el ZIP contiene el mismo HTML y se extrae sin errores.

URL: https://raw.githack.com/sullon631-crypto/VIDEO/presentacion-web/docs/index.html

La API de GitHub Pages rechazó la activación con `403 Resource not accessible by integration`; no se afirma que GitHub Pages esté habilitado.

La comprobación del navegador sobre el enlace público también finalizó con código 0. Se aceptó mediante el botón **Open the page** el aviso inicial del servidor, y después se verificaron los 19 apartados, carga de imágenes, 60 celdas y zoom del Formato 8, y ausencia de desbordamiento a 390 px. No hubo errores de JavaScript. Resultado: `qa-scroll/public-report.json`.

## Sustitución de imágenes ajenas al caso

Se retiraron las fotografías de Lando de la portada, el abanico y los datos de imágenes de la web. La nueva selección usa las tres fuentes indicadas en `assets/case-image-sources.json`, con carga progresiva y fotos del PPT como respaldo.

`qa_images.mjs` finalizó con código 0. Se verificaron los 19 apartados, ausencia de imágenes o enlaces de Lando, carga de los respaldos tras fallar las fuentes, actualización de la portada/tarjetas/visor en el escenario exitoso con respuestas interceptadas, zoom y ausencia de desbordamiento en escritorio y móvil. No hubo errores de JavaScript. Las imágenes utilizadas en las respuestas interceptadas son fixtures del PPT; no se confunden con fotos descargadas de las fuentes nuevas.

El acceso real a las tres fuentes devuelve CONNECT 403 en el proxy del entorno. Las nuevas imágenes están enlazadas para cargarse en el navegador con internet; no se verificó aquí la descarga de sus originales. El ZIP conserva las fotos del PPT cuando esas fuentes no están disponibles. Informe: `qa-scroll/image-report.json`.
