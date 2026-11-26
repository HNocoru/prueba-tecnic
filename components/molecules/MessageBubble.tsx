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

/** Burbuja de mensaje: a la derecha lo enviado por el negocio, a la izquierda lo recibido. */
export function MessageBubble({ message }: { message: MessageBubbleData }) {
  const outbound = message.direction === "outbound";

  return (
    <li className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm break-words ${
          outbound ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        }`}
      >
        {message.messageKind === "audio" && message.mediaPath ? (
          <>
            <audio
              controls
              src={message.mediaPath}
              aria-label={`Audio ${outbound ? "enviado por el negocio" : "recibido"} a las ${formatTime(message.at)}`}
              className="w-full min-w-[14rem]"
            />
            {message.transcript ? (
              <p className="mt-2 whitespace-pre-wrap">{message.transcript}</p>
            ) : null}
          </>
        ) : (
          <p className="whitespace-pre-wrap">{message.body ?? message.messageKind}</p>
        )}
        <time
          dateTime={message.at}
          className={`mt-1 block text-xs ${outbound ? "text-primary-foreground/80" : "text-muted-foreground"}`}
        >
          {formatTime(message.at)}
        </time>
      </div>
    </li>
  );
}
