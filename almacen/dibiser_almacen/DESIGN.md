# DIBISER · Sistema visual

Aplicación operativa de vigilancia y almacén, destinada a laptop y celular.
Identidad: logo original, azul marino #112e46, acción principal #075f73,
superficies claras para lectura en campo. Inter local en pesos 400, 600 y 700;
Inter regular y negrita incorporadas en PDF. Fuente distribuida bajo OFL.
Formulario agrupado por operación, vehículo, documentación y evidencias.
Controles de al menos 44 px; entradas de 16 px para lectura en móvil.
Navegación con estado activo, foco visible y soporte de movimiento reducido.
Reportes A4 horizontal, encabezado repetido y paginación; datos reales sin
mezclar unidades. Evidencias vinculadas al código y número del movimiento.
Las fuentes y bibliotecas se sirven localmente para funcionamiento sin red.

## Motion · edición 4

Implementación con CSS y Web Animations API; sin dependencias de animación.
Tokens en motion.css: presión 160 ms, controles 200 ms, paneles 240 ms,
cámara 280 ms, entrada 400 ms. Curva de salida cubic-bezier(.23,1,.32,1).
Entrada: cabecera 0 ms / 400 ms; navegación 60 ms / 320 ms; vista inicial
100 ms / 400 ms. El logo rota suavemente hasta asentarse en 500 ms.
Las vistas se solapan al cambiar, con salida de 200 ms y entrada de 240 ms;
la vista saliente deja de aceptar foco y clics inmediatamente. Cada nueva
acción cancela la animación anterior sin dejar paneles visibles residuales.
Los títulos inferiores se revelan una vez al entrar en pantalla; no se ocultan
campos para esperar al scroll. Las imágenes entran con intervalos de 40 ms,
limitados a 80 ms, sin escalonar largas tablas operativas.
Teclado y movimiento reducido omiten desplazamientos y esperas decorativas.
Hover y perspectiva del logo solo en dispositivos con puntero preciso.
El logotipo es una imagen con perspectiva CSS, no un modelo 3D.
Estados de carga conectados a tareas reales: guardado, consultas, PDF,
CSV, respaldo, importación y preparación de cámara. En movimiento reducido
se conserva el indicador estático. Las fotografías nuevas se limitan a una;
las evidencias históricas e importadas se conservan.

Validación: tests/motion.cjs (desde la raíz del repositorio) cubre interrupción,
teclado, cámara simulada, permiso tardío, foto única, doble guardado,
indicadores, movimiento reducido y anchos 390/768/1366. Requiere Playwright,
Chromium y FFmpeg para grabación. Las pruebas con CPU/navegador de escritorio
no certifican 60 fps en hardware móvil real; revisar en los equipos de uso.
