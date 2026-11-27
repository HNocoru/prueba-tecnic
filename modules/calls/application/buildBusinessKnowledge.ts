import type { BusinessContext } from "@/modules/business";

/** Tope del texto de conocimiento que se manda a la voz (business.faq del contrato). */
export const MAX_KNOWLEDGE_CHARS = 6000;

/**
 * Arma el texto de business.faq: el worker lo usa como conocimiento del negocio, así que
 * incluye secciones claras sin cambiar las claves del contrato. Se acota cortando por
 * elementos completos, nunca a mitad de un renglón.
 */
export function buildBusinessKnowledge(context: BusinessContext): string {
  const sections: { title: string; items: string[] }[] = [
    {
      title: "SOBRE EL NEGOCIO",
      items: [
        ...(context.description ? [context.description] : []),
        ...(context.contactPhone ? [`Teléfono de contacto: ${context.contactPhone}`] : []),
      ],
    },
    { title: "DIRECCIÓN", items: context.address ? [context.address] : [] },
    { title: "POLÍTICAS", items: context.policies ? [context.policies] : [] },
    {
      title: "PRODUCTOS Y SERVICIOS",
      items: context.catalog.map((item) => {
        const price =
          item.price === null ? "precio no disponible" : `${item.price} ${item.currency}`;
        const description = item.description ? `: ${item.description}` : "";
        return `- ${item.name}${description} (${price})`;
      }),
    },
    {
      title: "PREGUNTAS FRECUENTES",
      items: context.faqs.map((f) => `P: ${f.question}\nR: ${f.answer}`),
    },
  ];

  let output = "";
  for (const section of sections) {
    let started = false;
    for (const item of section.items) {
      const heading = started ? "" : `${output ? "\n\n" : ""}${section.title}`;
      const piece = `${heading}\n${item}`;
      if (output.length + piece.length > MAX_KNOWLEDGE_CHARS) break;
      output += piece;
      started = true;
    }
  }
  return output;
}
