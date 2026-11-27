-- Tenant demo (uuid fijo; el usuario demo se crea con scripts/seed-demo-user.mts).
INSERT INTO public.tenants (id, slug, name)
VALUES ('00000000-0000-4000-8000-000000000001', 'demo', 'Negocio Demo')
ON CONFLICT (id) DO NOTHING;

-- Datos demo del negocio (sin usuarios ni secretos).
INSERT INTO public.business_profiles (tenant_id, legal_name, description, address, policies, contact_phone)
VALUES ('00000000-0000-4000-8000-000000000001', 'Negocio Demo S.A. de C.V.',
        'Tienda demo de productos y servicios para la prueba técnica.',
        'Av. Reforma 123, Ciudad de México',
        'Cambios y devoluciones dentro de 15 días con ticket.', '+525512345678')
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO public.business_hours (id, tenant_id, weekday, opens, closes)
SELECT gen_random_uuid(), '00000000-0000-4000-8000-000000000001', d, '09:00', '18:00'
FROM generate_series(1, 5) AS d
WHERE NOT EXISTS (SELECT 1 FROM public.business_hours WHERE tenant_id = '00000000-0000-4000-8000-000000000001');

INSERT INTO public.catalog_items (id, tenant_id, kind, name, description, price) VALUES
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-000000000001', 'product', 'Paquete básico', 'Producto estrella', 250.00),
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-000000000001', 'product', 'Paquete premium', 'Versión ampliada', 480.00),
  ('00000000-0000-4000-8000-0000000000c3', '00000000-0000-4000-8000-000000000001', 'service', 'Instalación a domicilio', 'Incluye visita técnica', 350.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.faqs (id, tenant_id, question, answer, position) VALUES
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-000000000001', '¿Cuál es el horario de atención?', 'De lunes a viernes de 9:00 a 18:00.', 1),
  ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-000000000001', '¿Hacen envíos?', 'Sí, a toda la Ciudad de México en 24 a 48 horas.', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.assistant_configs (tenant_id, name, tone, voice, greeting, escalation_message)
VALUES ('00000000-0000-4000-8000-000000000001', 'Asistente', 'amable y cercano', 'alloy',
        '¡Hola! Soy el asistente de Negocio Demo, ¿en qué te puedo ayudar?',
        'Voy a canalizarte con una persona del equipo para atenderte mejor.')
ON CONFLICT (tenant_id) DO NOTHING;

-- Número de WhatsApp del tenant demo (sandbox de Meta; sin secretos).
INSERT INTO public.whatsapp_numbers (tenant_id, phone_number_id, display_phone, status)
VALUES ('00000000-0000-4000-8000-000000000001', '1370925136115469', '+15551652725', 'connected')
ON CONFLICT (phone_number_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Bandeja demo S06: contactos en cada estado, conversaciones, llamadas y turnos.
-- Idempotente: ids fijos y ON CONFLICT DO NOTHING, seguro al repetir el seed.
-- ---------------------------------------------------------------------------

INSERT INTO public.contacts (id, tenant_id, wa_id, phone_e164, name, created_at) VALUES
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000001', '5215510000001', '+525510000001', 'Ana Torres', '2026-11-10T15:00:00Z'),
  ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-000000000001', '5215510000002', '+525510000002', 'Bruno Salas', '2026-11-12T16:30:00Z'),
  ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-000000000001', '5215510000003', '+525510000003', 'Carla Méndez', '2026-11-14T18:15:00Z'),
  ('00000000-0000-4000-8000-0000000000a4', '00000000-0000-4000-8000-000000000001', '5215510000004', '+525510000004', 'Diego Ramos', '2026-11-16T19:45:00Z'),
  ('00000000-0000-4000-8000-0000000000a5', '00000000-0000-4000-8000-000000000001', '5215510000005', '+525510000005', 'Elena Prado', '2026-11-18T20:00:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.conversations (id, tenant_id, contact_id, last_activity_at) VALUES
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', '2026-11-26T16:30:00Z'),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a2', '2026-11-26T15:10:00Z'),
  ('00000000-0000-4000-8000-0000000000b3', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a3', '2026-11-25T18:20:00Z'),
  ('00000000-0000-4000-8000-0000000000b4', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a4', '2026-11-24T13:05:00Z'),
  ('00000000-0000-4000-8000-0000000000b5', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a5', '2026-11-23T11:40:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.messages (id, tenant_id, conversation_id, direction, kind, body, wamid, occurred_at) VALUES
  ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000b1', 'inbound', 'text', 'Hola, ¿sigue disponible el paquete premium?', 'wamid.demo.s06.01', '2026-11-26T16:20:00Z'),
  ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000b1', 'outbound', 'text', 'Sí, Ana. Te aparto uno y te comparto el enlace de pago.', 'wamid.demo.s06.02', '2026-11-26T16:24:00Z'),
  ('00000000-0000-4000-8000-0000000000c3', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000b1', 'inbound', 'text', 'Perfecto, lo espero. Muchas gracias.', 'wamid.demo.s06.03', '2026-11-26T16:30:00Z'),
  ('00000000-0000-4000-8000-0000000000c4', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000b2', 'inbound', 'text', '¿Pueden instalarlo el sábado?', 'wamid.demo.s06.04', '2026-11-26T15:00:00Z'),
  ('00000000-0000-4000-8000-0000000000c5', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000b2', 'outbound', 'text', 'Claro, tengo espacio a las 11:00. ¿Te confirmo?', 'wamid.demo.s06.05', '2026-11-26T15:10:00Z'),
  ('00000000-0000-4000-8000-0000000000c6', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000b3', 'inbound', 'text', 'Ya recibí mi pedido, todo en orden.', 'wamid.demo.s06.06', '2026-11-25T18:10:00Z'),
  ('00000000-0000-4000-8000-0000000000c7', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000b3', 'outbound', 'text', 'Gracias por avisar, Carla. Cualquier cosa estamos aquí.', 'wamid.demo.s06.07', '2026-11-25T18:20:00Z'),
  ('00000000-0000-4000-8000-0000000000c8', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000b4', 'inbound', 'text', 'Mejor lo dejo para otra ocasión.', 'wamid.demo.s06.08', '2026-11-24T13:05:00Z'),
  ('00000000-0000-4000-8000-0000000000c9', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000b5', 'inbound', 'text', 'Solo quería preguntar por los horarios.', 'wamid.demo.s06.09', '2026-11-23T11:40:00Z')
ON CONFLICT DO NOTHING;

INSERT INTO public.requests (id, tenant_id, contact_id, title, status, amount, created_at, updated_at) VALUES
  ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'Cotización paquete premium', 'completed', 480.00, '2026-11-20T10:00:00Z', '2026-11-22T12:00:00Z'),
  ('00000000-0000-4000-8000-0000000000d2', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'Apartar paquete premium', 'pending', 480.00, '2026-11-26T16:25:00Z', '2026-11-26T16:25:00Z'),
  ('00000000-0000-4000-8000-0000000000d3', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a2', 'Instalación a domicilio', 'in_progress', 350.00, '2026-11-25T09:00:00Z', '2026-11-26T15:10:00Z'),
  ('00000000-0000-4000-8000-0000000000d4', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a3', 'Pedido entregado', 'completed', 250.00, '2026-11-21T14:00:00Z', '2026-11-25T18:20:00Z'),
  ('00000000-0000-4000-8000-0000000000d5', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a4', 'Visita técnica', 'cancelled', 350.00, '2026-11-22T11:00:00Z', '2026-11-24T13:05:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.calls (id, tenant_id, conversation_id, wa_call_id, started_at, ended_at, duration_seconds, outcome, summary) VALUES
  ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000b1', 'demo-call-s06-01', '2026-11-26T16:00:00Z', '2026-11-26T16:02:15Z', 135, 'completed', 'Ana preguntó por el paquete premium y confirmó que quiere apartarlo. Se acordó enviar el enlace de pago por WhatsApp.'),
  ('00000000-0000-4000-8000-0000000000e2', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000b4', 'demo-call-s06-02', '2026-11-22T11:00:00Z', '2026-11-22T11:00:40Z', 40, 'caller_hangup', 'Diego colgó durante la confirmación de la visita técnica.')
ON CONFLICT DO NOTHING;

INSERT INTO public.call_turns (id, tenant_id, call_id, role, text, position) VALUES
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000e1', 'assistant', 'Hola, soy el asistente de Negocio Demo. ¿En qué te puedo ayudar?', 1),
  ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000e1', 'user', 'Hola, quería saber si todavía tienen el paquete premium.', 2),
  ('00000000-0000-4000-8000-0000000000f3', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000e1', 'assistant', 'Sí, está disponible. Cuesta 480 pesos e incluye la instalación.', 3),
  ('00000000-0000-4000-8000-0000000000f4', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000e1', 'user', 'Perfecto, apártenlo por favor. Me lo envían por WhatsApp.', 4),
  ('00000000-0000-4000-8000-0000000000f5', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000e1', 'assistant', 'Listo, queda apartado. Te comparto el enlace de pago por WhatsApp.', 5)
ON CONFLICT (id) DO NOTHING;
