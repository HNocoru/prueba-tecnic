# Despliegue

## Cuenta de entrega para los evaluadores

Los evaluadores llaman y escriben al número de prueba de Meta (+1 555 165 2725,
`phone_number_id` 1370925136115469). Para que caigan en un negocio vacío, el Supabase remoto
necesita una cuenta de entrega: usuario con contraseña, negocio sin datos y el número ya ligado
en estado `connected`. El teléfono de los evaluadores (+52 961 286 4799) NO se configura: se crea
solo como contacto en su primera llamada o mensaje.

**Orden:** primero aplica las migraciones en el Supabase remoto; después corre el script.

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
EVALUATOR_EMAIL=... EVALUATOR_PASSWORD=... \
[EVALUATOR_BUSINESS_NAME=...] [WHATSAPP_PHONE_NUMBER_ID=...] [WHATSAPP_DISPLAY_PHONE=...] \
pnpm db:seed-evaluator
```

- Es idempotente: repetirlo no duplica usuario, negocio ni número, y no borra ni pisa datos.
- Si el número ya pertenece a otro negocio, falla con un mensaje claro y no lo mueve.
- No imprime la contraseña ni la llave de servicio. Ejecútalo solo desde tu máquina.

**Webhook de Meta:** Meta admite UNA sola URL de webhook por app. Debe apuntar a la URL pública
de la app (Vercel) para los evaluadores; nunca el túnel local y Vercel a la vez.
