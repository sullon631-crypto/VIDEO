## Estado real — 10 de noviembre de 2026 (v39)
- Proyecto Supabase creado: **DIBISER - Control de Almacen**, referencia `afkghhioiklvnucwhylz`, región São Paulo, base activa.
- Ya se instalaron y verificaron tablas de movimientos, catálogos, integrantes autorizados y auditoría de ediciones, con RLS.
- La app contiene la URL y clave **publicable** de este proyecto; no requiere ingresar claves manualmente en cada celular.
- **IMPORTANTE:** aún hay **0 cuentas de aplicación autorizadas y 0 movimientos importados**. La sincronización solo quedará operativa después de crear una cuenta desde la app y aprobarla mediante `dibiser_team_members`.
- Registro inicial: en la app pulsa «Crear mi cuenta de DIBISER», proporciona correo y contraseña personales y confirma el mensaje recibido. El propietario debe autorizar ese usuario, por ejemplo insertando desde SQL Editor su `auth.users.id` en `public.dibiser_team_members`.
- Nunca compartir la contraseña con ChatGPT, en GitHub ni con otros operarios. Respalda primero los registros locales de cada celular y luego importa desde cada dispositivo.
- No habilites acceso indiscriminado a la tabla de movimientos, ni desactives RLS.

# DIBISER | Historial compartido entre celulares (v35)
**Estado:** integración preparada; no está activada hasta conectar un proyecto Supabase real y aplicar el SQL.

## Activar una sola base de datos
1. Crea un proyecto Supabase bajo la cuenta de la empresa (o conecta Supabase en ChatGPT para que te ayude a configurarlo).
2. En **SQL Editor**, ejecuta el contenido de [schema.sql](./supabase/schema.sql).
3. En **Authentication > Providers > Email**, configura el acceso por correo y contraseña. Deshabilita nuevos registros públicos ("Allow new users to sign up"). En **Authentication > Users**, invita/crea las cuentas de las personas autorizadas.
4. En la app, abre **Historial central DIBISER**. Configura **Project URL** (https://xxxxx.supabase.co) y la clave **publishable** (sb_publishable_...) o **anon** pública antigua. **NUNCA introduzcas una secret key, service_role ni contraseñas de administrador en la clave publicable o en el código de GitHub**.
5. Cada celular accede a la misma URL de la PWA, introduce la **misma URL y clave pública** de Supabase, y **su propio usuario autorizado**.
6. Para movimientos anteriores de cada celular, primero **Respaldar datos (JSON)**; después inicia sesión y pulsa **Subir registros locales a la nube** en *cada* dispositivo. Esta operación es idempotente por ID y no borra los datos locales. Si se repite un correlativo anterior en otro dispositivo, se reemplazará por uno central y se preservará como `guiaOriginal`.
7. Tras iniciar sesión, cada teléfono lee el mismo historial. El botón **Actualizar historial** fuerza una lectura y, con la aplicación abierta, se actualiza aproximadamente cada 20 s. Para guardar movimientos nuevos debe haber internet: los errores de conexión no se consideran un guardado exitoso.

## Datos y seguridad
- `dibiser_movements`: almacena el JSON completo de cada movimiento, incluida la foto. Para grandes volúmenes se recomienda migrar las fotos a Supabase Storage y verificar cuotas.
- `dibiser_catalog_items`: agrega catálogos. Los valores existentes se suben al importar registros antiguos.
- El correlativo `DIB-INT-000001` se asigna centralmente mediante una secuencia SQL (puede haber saltos por intentos fallidos). La vista previa no reserva un número; el definitivo se confirma al guardar.
- Acceso limitado a usuarios autenticados del proyecto; las políticas RLS impiden acceso anónimo. Todos los usuarios autenticados del mismo proyecto comparten el conjunto de registros; crea cuentas solo para empleados autorizados.
- El proyecto debe tener la inscripción pública deshabilitada. Habilita MFA si necesitas mayor control.
- Los cambios en GitHub Pages **no crean automáticamente la base de datos** ni los usuarios. Hasta configurar el backend, el modo es local y no comparte registros.
- No borres caché, almacenamiento del navegador ni desinstales la PWA antes de exportar respaldo y confirmar la migración en otro dispositivo.

## Actualización de capacidades y edición (v36)

- **Volquetes, tolvones y cisternas:** en Catálogos > Capacidades registra por placa el volumen REAL y la unidad (`m³`, `Litros` o `Galones`). La selección de **Viaje completo** rellena automáticamente la cantidad solo si existe una capacidad registrada; **Metraje manual** permite un valor diferente y **Solo contar 1 viaje** registra `1 Viaje`. Una carreta/tolvón usa su propia capacidad, no la del tractor.
- Datos iniciales declarados por DIBISER: BTN-867 = 26 m³ y T9K-863 = 17 m³. Son datos indicados por la empresa, no certificación independiente de la carrocería. Completa los demás con fichas de carrocería/tanque y verifica límites de peso.
- **Editar:** cada movimiento del historial tiene un botón Editar. Al guardar se conserva el ID, fecha original y número de guía; los demás campos se pueden corregir y opcionalmente reemplazar la fotografía. En la nube se registra la versión y auditoría de cambios, para evitar que dos ediciones simultáneas se sobrescriban.
- Si ya ejecutaste el esquema anterior de Supabase, ejecuta [migration_edicion_v36.sql](./migration_edicion_v36.sql) para habilitar las correcciones remotas. Si aún no creaste la base, usa el `schema.sql` actualizado completo.
- **Estado:** las funciones de nube requieren que el propietario configure Supabase, usuarios y el SQL. Hasta ese momento cada celular seguirá usando datos locales.
