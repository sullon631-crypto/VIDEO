# Validación de la presentación web

Verificada en Chromium con la versión final del diseño y del contenido:

- 19 pantallas con Anton e imágenes originales cargadas; sin desbordamiento vertical en escritorio.
- 15 pasos de explicación: los cinco pasos de cada formato son seleccionables mediante el cursor y el clic.
- Tres visores de registros: abrir/cerrar, ampliar, ajustar y cambiar a la vista de lectura.
- 250 celdas no vacías de los Excel originales y sus combinaciones conservadas: 73 en el Formato 2, 117 en el Formato 7 y 60 en el Formato 8.
- Cursor con espera de 0,7 segundos, opción de pausar, flechas, índice y puntero desde la página y desde el contenido.
- Modo expositor: ventana del público, notas privadas editables guardadas, sincronización de pantalla y paso. El contenido permanece visible cuando una ventana pasa a segundo plano.
- Vista táctil de 390 × 844, seis pantallas con contenido denso, desplazamiento vertical y ningún desbordamiento horizontal.
- Preferencia de movimiento reducido del sistema.
- Ningún error JavaScript ni solicitud externa de recursos durante la presentación. El HTML incorpora todos los recursos necesarios para mostrarla.

Hyperframes 0.8.142, 19 muestras: `ok=true`, `browserSkipped=false`; cero errores de lint, ejecución, diseño y contraste. Cero avisos de diseño o contraste. Los 11 avisos restantes describen transiciones CSS de las interacciones en vivo; se desactivan en la composición editable para las búsquedas deterministas.

La pantalla completa está conectada al control nativo y a F. La prueba confirmó que el botón llama a la API con activación del usuario. Este Chromium administrado deja pendiente la solicitud incluso en una página mínima, por lo que la entrada efectiva a pantalla completa no pudo verificarse aquí. No se simula una entrada exitosa.

La fuente visual landonorris.com y el visor público raw.githack.com están bloqueados por la política de red de este entorno. Se verificó la presentación por HTTP local y se publica el HTML en el repositorio público del usuario; la respuesta del visor externo no se puede verificar desde esta máquina. La descarga del HTML es la alternativa independiente del visor. La configuración de red necesaria queda guardada para revisión en los ajustes del entorno.
