# Registrar es prevenir · Web vertical del Grupo 1

Exposición interactiva de 19 apartados basada en el nuevo PPT «Presentación Casos SG-SST grupo 1» y el informe. El recorrido usa el scroll vertical nativo, apariciones graduales con GSAP ScrollTrigger, titulares Anton, texto Manrope y acentos editoriales Fraunces. La paleta combina crema, azul, verde, lavanda y coral; el naranja ya no domina.

## Abrir y exponer

`index.html` es una página portátil con fotografías del PPT, documentos, fuentes, scripts y sonido incluidos. Las nuevas imágenes de Chinalco, Horizonte Minero y Mi Radio se cargan desde sus fuentes con internet; si alguna no responde, se muestra una fotografía pertinente del PPT. Puede abrirse directamente en Chrome, Edge o Firefox, o alojarse en cualquier servidor estático. `Presentacion-SG-SST.zip` contiene este archivo y las instrucciones. Google Sheets y las normas enlazadas necesitan internet.

- Rueda del ratón, trackpad o gesto vertical: recorrer el contenido. Los documentos se mantienen a la vista en escritorio mientras aparecen sus cinco pasos de lectura.
- Flechas ↑/↓ inferiores o del teclado: ir al apartado anterior o siguiente. La navegación es vertical.
- Mantener el cursor 0,7 segundos sobre enlaces del menú, el índice, las tarjetas o los pasos: entrar. Se puede desactivar en las opciones.
- Pulsar las fotografías o los registros: abrir el visor. Rueda o +/−: zoom hasta 1000 %. Arrastrar: mover. Doble clic: ampliar. Pellizco en pantalla táctil: zoom. Ajustar: encuadrar. Esc: cerrar.
- Los tres registros permiten alternar imagen original y lectura de todas sus celdas, conservando combinaciones y enlaces exactos a Google Sheets.
- F: pantalla completa. I: índice. L: puntero para señalar. P: notas privadas del expositor y cronómetro.
- Desde el panel del expositor se abre una ventana del público, sincronizada por posición de scroll y visor. Requiere el mismo origen y permisos del navegador para ventanas emergentes. Las notas no se envían a esa ventana.
- Las notas editadas se guardan en el navegador. El sonido comienza silenciado y se activa con ♪. Las opciones incluyen movimiento reducido; se respeta la preferencia del sistema.

## Contenido y fotografías

El nuevo PPT determina la portada, los cinco integrantes, las referencias y la fecha académica del 9 de octubre de 2026. El Formato 7 utiliza **20 participantes**, conforme al PPT y la tabla del informe. Las fechas y los estados pertenecen al caso académico; las acciones pendientes no se presentan como realizadas.

Los registros 2, 7 y 8 conservan 73, 117 y 60 celdas no vacías, respectivamente: **250 valores originales**, además de sus combinaciones. La página no modifica los Google Sheets. Las imágenes del PPT se conservan y se pueden ampliar completas.

La portada y el abanico ya no utilizan imágenes de Lando Norris. `assets/case-image-sources.json` registra las tres fuentes elegidas por el usuario: la imagen oficial de mantenimiento de Chinalco, la capacitación en extintores de Mi Radio y el artículo de Horizonte Minero. La web consulta la imagen destacada del artículo mediante la API pública de WordPress y carga las otras dos imágenes por sus URL directas. Estas fotos son de contexto; la capacitación de Mi Radio se identifica como referencial y no se presenta como evidencia de una actividad de Chinalco.

Los tres dominios de origen devuelven CONNECT 403 desde el entorno, por lo que sus fotografías no pudieron descargarse ni verificarse aquí. La carga con éxito se probó con respuestas interceptadas y fotografías del PPT como fixtures; también se probó el fallo de las fuentes. La web conserva las fotos del PPT como respaldo durante la carga, si ocurre un error y al usar el ZIP sin internet. No se afirma que las fotografías nuevas estén incrustadas en el ZIP.

Anton, Manrope y Fraunces se incluyen con sus licencias SIL Open Font License. Las dependencias GSAP se incluyen localmente.

## Editar, construir y comprobar

Desde `/workspace/VIDEO`:

```bash
python3 web/sg-sst/scripts/build_site.py
python3 -m http.server 8082 --bind 127.0.0.1 --directory /workspace/VIDEO/web/sg-sst
```

En otra terminal:

```bash
SG_SITE_URL=http://127.0.0.1:8082/ node web/sg-sst/scripts/qa_scroll.mjs
```

- `scripts/content.py`: contenido académico y notas.
- `scripts/build_site.py`: estructura vertical, generación del HTML portátil, ZIP y `docs/index.html` para GitHub Pages.
- `site.css` y `site.js`: diseño e interacciones.
- `site.html`: versión editable que carga los archivos locales.
- `workbooks.json`: celdas y combinaciones de los Excel.
- `qa-scroll/report.json`: comprobación completa de las funciones de exposición de la versión actual.
- `node web/sg-sst/scripts/qa_images.mjs`: prueba la selección temática, los tres visores y el respaldo; resultado en `qa-scroll/image-report.json`. La carga remota exitosa se prueba mediante fixtures, sin afirmar acceso real a las fuentes bloqueadas.

La web actual es un sitio convencional con scroll; los archivos `composition/`, `composition.*`, `wrapper.*` y `scripts/build.py` conservan la versión anterior del pase de diapositivas. Ese constructor no genera la nueva web vertical. Los videos anteriores permanecen conservados.

La web pública está en https://raw.githack.com/sullon631-crypto/VIDEO/presentacion-web/docs/index.html . El ZIP público se descarga desde https://raw.githubusercontent.com/sullon631-crypto/VIDEO/presentacion-web/docs/Presentacion-SG-SST.zip . Se comprobaron las respuestas HTTP 200 y la coincidencia de ambas entregas con los archivos locales. En la primera visita, el servidor muestra un aviso de contenido externo: pulsa **Open the page**. Después se verificaron los 19 apartados, la lectura y zoom del Formato 8 y la vista móvil en el enlace público.

La carpeta `/docs` está preparada para GitHub Pages. Su activación mediante API fue rechazada con `403 Resource not accessible by integration`; GitHub Pages no está habilitado. El enlace RawGithack de esta versión sí respondió correctamente. No se necesita compilación remota para cargar la presentación.
