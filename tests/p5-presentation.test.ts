import { describe, expect, it } from "vitest";

import { P5FormStatus } from "@/components/molecules/P5FormStatus";
import { P5PageHeader } from "@/components/molecules/P5PageHeader";
import { P5SectionCard } from "@/components/molecules/P5SectionCard";
import { P5StateNotice } from "@/components/molecules/P5StateNotice";
import {
  accountSummary,
  contactCountLabel,
  contactInitials,
  filterContactItems,
  languageLabel,
  mergeContactsById,
  noContactResultsTitle,
  previewText,
  relativeDay,
  sectionProgressLabel,
  voiceLabel,
} from "@/components/atoms/p5-presentation";

type Contact = { id: string; name: string; phone: string };

describe("S17 presentation helpers", () => {
  it("builds contact initials from the first two words and marks redacted contacts", () => {
    expect(contactInitials("Mariana Solís")).toBe("MS");
    expect(contactInitials("Luis Ángel Pérez")).toBe("LÁ");
    expect(contactInitials("Contacto anonimizado", true)).toBe("—");
    expect(contactInitials("")).toBe("—");
  });

  it("keeps the existing case-insensitive contact search over name and phone", () => {
    const items: Contact[] = [
      { id: "1", name: "Mariana Solís", phone: "+52 55 5550 0100" },
      { id: "2", name: "Ricardo Hernández", phone: "+52 55 5550 0117" },
    ];

    expect(filterContactItems(items, "  solís  ")).toEqual([items[0]]);
    expect(filterContactItems(items, "5550 0117")).toEqual([items[1]]);
    expect(filterContactItems(items, "")).toEqual(items);
  });

  it("merges loaded pages by id, keeping the first occurrence and its order", () => {
    const first: Contact[] = [
      { id: "1", name: "Mariana", phone: "100" },
      { id: "2", name: "Ricardo", phone: "117" },
    ];
    const second: Contact[] = [
      { id: "2", name: "Duplicado", phone: "000" },
      { id: "3", name: "Lupita", phone: "134" },
    ];

    expect(mergeContactsById(first, second).map((item) => item.id)).toEqual(["1", "2", "3"]);
    expect(mergeContactsById(first, second)[1]?.name).toBe("Ricardo");
  });

  it("formats contact counts and no-result titles in Spanish", () => {
    expect(contactCountLabel(8, 20, "")).toBe("Mostrando 8 de 20 contactos");
    expect(contactCountLabel(1, 1, "Mariana")).toBe("1 resultado para «Mariana»");
    expect(contactCountLabel(2, 2, "Solís")).toBe("2 resultados para «Solís»");
    expect(noContactResultsTitle("Lupita")).toBe("No encontramos a nadie con «Lupita»");
  });

  it("formats relative contact dates with a deterministic clock", () => {
    const now = new Date("2026-11-27T12:00:00Z");

    expect(relativeDay("2026-11-27T10:00:00Z", now)).toBe("Hoy");
    expect(relativeDay("2026-11-26T10:00:00Z", now)).toBe("Ayer");
    expect(relativeDay("2026-11-23T10:00:00Z", now)).toBe("23 nov 2026");
  });

  it("describes business progress and missing previews without inventing data", () => {
    expect(sectionProgressLabel(0, 4)).toBe("0 de 4 secciones con información");
    expect(sectionProgressLabel(2, 4)).toBe("2 de 4 secciones con información");
    expect(previewText("  Tacos El Güero  ")).toBe("Tacos El Güero");
    expect(previewText(null)).toBe("Sin capturar");
  });

  it("uses only the voice and language values accepted by the existing schema", () => {
    expect(voiceLabel("roberto")).toBe("Roberto");
    expect(voiceLabel("eduardo")).toBe("Eduardo");
    expect(languageLabel("es-MX")).toBe("Español de México");
    expect(languageLabel("es-AR")).toBe("es-AR");
  });

  it("derives account copy from real user data and never invents a display name", () => {
    expect(accountSummary("mariana@ejemplo.com", "Mariana Solís")).toEqual({
      email: "mariana@ejemplo.com",
      name: "Mariana Solís",
      initials: "MS",
    });
    expect(accountSummary("ricardo@ejemplo.com", null)).toEqual({
      email: "ricardo@ejemplo.com",
      name: "ricardo",
      initials: "R",
    });
  });
});

type ElementNode = {
  type: unknown;
  props: { children?: unknown; role?: unknown };
};

function isElementNode(value: unknown): value is ElementNode {
  return typeof value === "object" && value !== null && "type" in value && "props" in value;
}

function elementText(value: unknown): string {
  if (value == null || typeof value === "boolean") {
    return "";
  }
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(elementText).join(" ");
  }
  return isElementNode(value) ? elementText(value.props.children) : "";
}

function collectTypes(value: unknown, types: string[] = []): string[] {
  if (isElementNode(value)) {
    if (typeof value.type === "string") {
      types.push(value.type);
    } else if (typeof value.type === "function" && value.type.name) {
      types.push(value.type.name);
    }
    collectTypes(value.props.children, types);
  } else if (Array.isArray(value)) {
    for (const child of value) {
      collectTypes(child, types);
    }
  }
  return types;
}

function collectRoles(value: unknown, roles: string[] = []): string[] {
  if (isElementNode(value)) {
    if (typeof value.props.role === "string") {
      roles.push(value.props.role);
    }
    collectRoles(value.props.children, roles);
  } else if (Array.isArray(value)) {
    for (const child of value) {
      collectRoles(child, roles);
    }
  }
  return roles;
}

describe("S17 presentation components", () => {
  it("renders the hero header with display font and Spanish copy", () => {
    const header = P5PageHeader({
      title: "Contactos",
      description: "Personas que han escrito o llamado a tu negocio.",
    });

    expect(JSON.stringify(header)).toContain("bg-hero");
    expect(JSON.stringify(header)).toContain("var(--font-display)");
    expect(elementText(header)).toContain("Contactos");
    expect(elementText(header)).toContain("Personas que han escrito o llamado a tu negocio.");
  });

  it("renders error notices as alerts with icon and text", () => {
    const notice = P5StateNotice({
      tone: "error",
      title: "No pudimos cargar tus contactos",
      description: "Revisa tu conexión e inténtalo de nuevo.",
    });

    expect(collectRoles(notice)).toContain("alert");
    expect(collectTypes(notice)).toContain("P5Icon");
    expect(elementText(notice)).toContain("No pudimos cargar tus contactos");
    expect(elementText(notice)).toContain("Revisa tu conexión e inténtalo de nuevo.");
  });

  it("renders section cards with a Bricolage heading and children", () => {
    const card = P5SectionCard({
      title: "Datos generales",
      icon: "user",
      children: "Contenido de la tarjeta",
    });

    expect(JSON.stringify(card)).toContain("var(--font-display)");
    expect(elementText(card)).toContain("Datos generales");
    expect(elementText(card)).toContain("Contenido de la tarjeta");
  });

  it("renders form status with the right tone and no message when empty", () => {
    expect(P5FormStatus({ message: null, ok: true })).toBeNull();

    const ok = P5FormStatus({ message: "Guardado correctamente", ok: true });
    const error = P5FormStatus({ message: "Revisa los datos", ok: false });

    expect(collectRoles(ok)).toContain("status");
    expect(JSON.stringify(ok)).toContain("text-status-done-fg");
    expect(elementText(ok)).toContain("Guardado correctamente");
    expect(JSON.stringify(error)).toContain("text-status-cancelled-fg");
    expect(elementText(error)).toContain("Revisa los datos");
  });
});
