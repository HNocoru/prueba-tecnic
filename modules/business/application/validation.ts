/**
 * Reglas de dominio del negocio: validación con Zod y mensajes en español.
 */
import { z } from "zod";

const weekdaySchema = z.number().int().min(0).max(6, "El día de la semana debe estar entre 0 y 6.");

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const timeSchema = z.string().regex(timeRegex, "La hora debe tener formato HH:MM (24 horas).");

export const businessHoursInputSchema = z
  .object({
    weekday: weekdaySchema,
    opens: timeSchema,
    closes: timeSchema,
  })
  .refine((value) => value.opens < value.closes, {
    message: "La hora de apertura debe ser menor que la de cierre.",
    path: ["closes"],
  });

export type BusinessHoursInput = z.infer<typeof businessHoursInputSchema>;

export const businessHoursListSchema = z
  .array(businessHoursInputSchema)
  .superRefine((hours, ctx) => {
    const byDay = new Map<number, BusinessHoursInput[]>();
    for (const h of hours) {
      const list = byDay.get(h.weekday) ?? [];
      list.push(h);
      byDay.set(h.weekday, list);
    }
    for (const [weekday, list] of byDay) {
      const sorted = list.slice().sort((a, b) => a.opens.localeCompare(b.opens));
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        if (curr && prev && curr.opens < prev.closes) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Los horarios del día ${weekday} se traslapan.`,
          });
          return;
        }
      }
    }
  });

const ianaTimezoneSchema = z
  .string()
  .min(1, "El huso horario es obligatorio.")
  .refine((value) => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "El huso horario debe ser una zona IANA válida.");

export const businessProfileInputSchema = z.object({
  legalName: z.string().max(200, "El nombre legal no puede superar 200 caracteres.").nullable(),
  description: z.string().max(2000, "La descripción no puede superar 2000 caracteres.").nullable(),
  address: z.string().max(500, "La dirección no puede superar 500 caracteres.").nullable(),
  timezone: ianaTimezoneSchema,
  policies: z.string().max(5000, "Las políticas no pueden superar 5000 caracteres.").nullable(),
  contactPhone: z
    .string()
    .max(50, "El teléfono de contacto no puede superar 50 caracteres.")
    .nullable(),
});

export type BusinessProfileInput = z.infer<typeof businessProfileInputSchema>;

export const catalogItemInputSchema = z.object({
  kind: z.enum(["product", "service"], {
    message: "El tipo debe ser producto o servicio.",
  }),
  name: z
    .string()
    .min(1, "El nombre es obligatorio.")
    .max(200, "El nombre no puede superar 200 caracteres."),
  description: z.string().max(2000, "La descripción no puede superar 2000 caracteres.").nullable(),
  price: z.number().min(0, "El precio no puede ser menor que 0.").nullable(),
  currency: z.string().min(1, "La moneda es obligatoria.").max(10, "La moneda no es válida."),
  active: z.boolean(),
});

export type CatalogItemInput = z.infer<typeof catalogItemInputSchema>;

export const faqInputSchema = z.object({
  question: z
    .string()
    .min(1, "La pregunta es obligatoria.")
    .max(500, "La pregunta no puede superar 500 caracteres."),
  answer: z
    .string()
    .min(1, "La respuesta es obligatoria.")
    .max(5000, "La respuesta no puede superar 5000 caracteres."),
  position: z.number().int().min(0).default(0),
});

export type FaqInput = z.infer<typeof faqInputSchema>;

export const assistantConfigInputSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre del asistente es obligatorio.")
    .max(100, "El nombre del asistente no puede superar 100 caracteres."),
  tone: z.string().max(200, "El tono no puede superar 200 caracteres.").nullable(),
  voice: z.enum(["roberto", "eduardo"], { message: "La voz debe ser Roberto o Eduardo." }),
  language: z.string().min(1, "El idioma es obligatorio."),
  greeting: z.string().max(2000, "El saludo no puede superar 2000 caracteres.").nullable(),
  escalationMessage: z
    .string()
    .max(2000, "El mensaje de escalamiento no puede superar 2000 caracteres.")
    .nullable(),
});

export type AssistantConfigInput = z.infer<typeof assistantConfigInputSchema>;
