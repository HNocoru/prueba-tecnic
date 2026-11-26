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
