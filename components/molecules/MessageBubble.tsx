import { formatTime } from "@/components/format";
import type { Direction, MessageKind } from "@/modules/conversations";

export interface MessageBubbleData {
  id: string;
  direction: Direction;
  messageKind: MessageKind;
  body: string | null;
  mediaPath: string | null;
  transcript: string | null;
  at: string;
}

const KIND_LABEL: Record<MessageKind, string> = {
  text: "Texto",
  audio: "Audio",
  image: "Imagen",
  document: "Documento",
};

/**
 * Burbuja de mensaje: entrante a la izquierda y saliente a la derecha.
 * Solo se muestra texto: el audio se representa con su transcripción, y las
 * imágenes o documentos solo con su etiqueta, sin descargar multimedia.
 */
export function MessageBubble({ message }: { message: MessageBubbleData }) {
  const outbound = message.direction === "outbound";
  const text = message.body ?? message.transcript ?? null;
  const kindHint = message.messageKind !== "text" ? KIND_LABEL[message.messageKind] : null;

  return (
    <li className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm sm:max-w-[68%] ${
          outbound
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md bg-muted text-foreground"
        }`}
      >
        <p className="sr-only">{outbound ? "Mensaje enviado:" : "Mensaje recibido:"}</p>
        {kindHint ? (
          <p
            className={`mb-1 text-[11px] font-medium ${
              outbound ? "text-primary-foreground/70" : "text-muted-foreground"
            }`}
          >
            {kindHint}
          </p>
        ) : null}
        <p className="break-words whitespace-pre-wrap">
          {text ?? `Sin contenido de ${KIND_LABEL[message.messageKind].toLowerCase()}.`}
        </p>
        <time
          dateTime={message.at}
          className={`mt-1 block text-right text-[11px] ${
            outbound ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}
        >
          {formatTime(message.at)}
        </time>
      </div>
    </li>
  );
}
