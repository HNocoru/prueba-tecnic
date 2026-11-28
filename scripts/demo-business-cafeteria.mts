// Datos FICTICIOS de "Café Marimba" (Tuxtla Gutiérrez, Chiapas) para la cuenta de entrega.
// Nada aquí es real: dirección inventada, teléfono en el rango ficticio 961 555 01XX.
// tests/demo-business-cafeteria.test.ts valida todo con los esquemas de modules/business.

export const CAFETERIA_PROFILE = {
  legalName: "Café Marimba",
  description:
    "Café Marimba es una cafetería de Tuxtla Gutiérrez que sirve café de altura chiapaneco, desayunos caseros y pan de la casa horneado cada mañana. Un lugar tranquilo para desayunar, trabajar o platicar con calma.",
  address: "Calle de los Tulipanes 214, Col. Las Palmas, 29000 Tuxtla Gutiérrez, Chiapas",
  timezone: "America/Mexico_City",
  policies:
    "Los pasteles por encargo se piden con 24 horas de anticipación y requieren anticipo del 50 %. Aceptamos cambios o devoluciones el mismo día si el producto llegó en mal estado. La propina es voluntaria, nunca obligatoria. Las mascotas son bienvenidas en la terraza.",
  contactPhone: "961 555 0142",
};

// weekday: 0 = domingo … 6 = sábado (misma convención que GetCallContext).
export const CAFETERIA_HOURS = [
  { weekday: 0, opens: "08:00", closes: "15:00" },
  { weekday: 1, opens: "07:00", closes: "21:00" },
  { weekday: 2, opens: "07:00", closes: "21:00" },
  { weekday: 3, opens: "07:00", closes: "21:00" },
  { weekday: 4, opens: "07:00", closes: "21:00" },
  { weekday: 5, opens: "07:00", closes: "21:00" },
  { weekday: 6, opens: "07:00", closes: "21:00" },
];

type Item = {
  kind: "product" | "service";
  name: string;
  description: string | null;
  price: number | null;
  currency: string;
  active: boolean;
};

const item = (
  kind: Item["kind"],
  name: string,
  price: number | null,
  description: string,
): Item => ({ kind, name, description, price, currency: "MXN", active: true });

export const CAFETERIA_CATALOG: Item[] = [
  item("product", "Café americano", 38, "Café de altura de Chiapas, 12 oz."),
  item("product", "Capuchino", 52, "Espresso con leche vaporizada y espuma, 12 oz."),
  item("product", "Latte", 55, "Espresso con leche cremosa; opción de leche de avena (+$8)."),
  item("product", "Café de olla", 40, "Con piloncillo y canela, servido en jarro de barro."),
  item("product", "Frappé de moka", 68, "Café, chocolate y hielo frapeado con crema."),
  item("product", "Limonada mineral", 45, "Limón recién exprimido con agua mineral."),
  item("product", "Pan de elote", 35, "Rebanada de pan de elote horneado en casa."),
  item("product", "Concha", 22, "Pan dulce tradicional, vainilla o chocolate."),
  item("product", "Croissant de mantequilla", 38, "Hojaldrado, horneado cada mañana."),
  item("product", "Chilaquiles verdes", 95, "Con pollo deshebrado, crema, queso y frijoles."),
  item("product", "Molletes", 78, "Bolillo con frijoles, queso gratinado y pico de gallo."),
  item("product", "Huevos al gusto", 85, "Revueltos, estrellados o a la mexicana, con frijoles."),
  item(
    "service",
    "Pastel por encargo",
    480,
    "Pastel de 8 porciones, sabores de vainilla, chocolate o zanahoria. Pedir con 24 h de anticipación; anticipo del 50 %.",
  ),
  item(
    "service",
    "Café para eventos",
    null,
    "Servicio de café y pan para reuniones y eventos. Precio por cotización según el número de personas.",
  ),
];

export const CAFETERIA_FAQS = [
  {
    question: "¿Dónde están ubicados y cómo llego?",
    answer:
      "Estamos en Calle de los Tulipanes 214, colonia Las Palmas, en Tuxtla Gutiérrez. Se llega fácil en taxi o en auto; la entrada es por la calle principal, junto a la terraza.",
  },
  {
    question: "¿Cuál es su horario?",
    answer: "Abrimos de lunes a sábado de 7:00 a 21:00 y los domingos de 8:00 a 15:00.",
  },
  {
    question: "¿Tienen wifi?",
    answer: "Sí, tenemos wifi gratis para clientes. Pide la clave en caja.",
  },
  {
    question: "¿Aceptan tarjeta?",
    answer: "Sí, aceptamos tarjetas de crédito y débito, además de efectivo.",
  },
  {
    question: "¿Tienen opciones sin gluten o veganas?",
    answer:
      "Tenemos leche de avena para cualquier café y un par de opciones veganas. Por ahora no manejamos productos certificados sin gluten porque horneamos en la misma cocina.",
  },
  {
    question: "¿Hacen entregas a domicilio?",
    answer:
      "Por ahora no tenemos reparto a domicilio. Puedes pedir por WhatsApp y pasar a recoger tu pedido al local.",
  },
  {
    question: "¿Cómo hago un pedido por WhatsApp?",
    answer:
      "Escríbenos por WhatsApp con lo que quieres y a qué hora pasas por él. Te confirmamos disponibilidad y el total.",
  },
  {
    question: "¿Con cuánto tiempo debo pedir un pastel por encargo?",
    answer:
      "Con 24 horas de anticipación. Pedimos un anticipo del 50 % para apartarlo y el resto se paga al recogerlo.",
  },
  {
    question: "¿Hay estacionamiento?",
    answer:
      "Hay lugar para unos cuatro autos frente al local y, si se llena, se puede estacionar sobre la calle.",
  },
].map((faq, position) => ({ ...faq, position }));

export const CAFETERIA_ASSISTANT = {
  name: "Marimba",
  tone: "Cálido, amable y breve, en español de México",
  voice: "roberto" as const,
  language: "es-MX",
  greeting: "¡Hola! Soy Marimba, la asistente de Café Marimba. ¿En qué te puedo ayudar?",
  escalationMessage:
    "Con gusto te comunico con una persona del equipo para ayudarte con eso. Un momento, por favor.",
};
