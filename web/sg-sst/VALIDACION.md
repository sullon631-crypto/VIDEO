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
- Ningún error de navegador ni solicitud externa para cargar contenido, fuentes, imágenes o scripts.

El control de pantalla completa solicita la API nativa con activación real del usuario. Chromium administrado deja la solicitud pendiente incluso en una página mínima: la entrada real a pantalla completa no pudo verificarse en este entorno. No se simula pantalla completa.

Después de la prueba completa se incorporó una segunda fotografía original del PPT a la sección de empresa. Se comprobó su carga, apertura en el visor y ausencia de desbordamiento en escritorio y móvil. El HTML portátil y la copia de `/docs` coinciden; el ZIP se extrae íntegro y contiene ese mismo HTML.

Los cuatro sitios de las nuevas fotos referenciales devuelven CONNECT 403 desde el proxy de red. La configuración necesaria se guardó como borrador; la incorporación de esas cuatro imágenes está pendiente de que se guarde y publique el entorno. Las fotos originales del PPT y las de Lando Norris sí se incluyen.
