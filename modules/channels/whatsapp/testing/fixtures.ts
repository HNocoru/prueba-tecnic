/** Fixtures de payloads de Meta para pruebas. */
export const PHONE_NUMBER_ID = "1370925136115469";

function payload(message: Record<string, unknown>): Record<string, unknown> {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "WABA",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: { display_phone_number: "15551652725", phone_number_id: PHONE_NUMBER_ID },
              contacts: [{ profile: { name: "Ana" }, wa_id: "5215512345678" }],
              messages: [{ from: "5215512345678", timestamp: "1767225600", ...message }],
            },
          },
        ],
      },
    ],
  };
}

export const textPayload = (wamid = "wamid.TEXT1") =>
  payload({ id: wamid, type: "text", text: { body: "Hola, ¿tienen paquete premium?" } });

export const audioPayload = (wamid = "wamid.AUDIO1") =>
  payload({ id: wamid, type: "audio", audio: { id: "MEDIA123", mime_type: "audio/ogg" } });

/** Meta lo envía al suscribir la app (campo account_update), no es un mensaje. */
export const accountUpdatePayload = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "WABA",
      time: 1767225600,
      changes: [
        {
          field: "account_update",
          value: {
            messaging_product: "whatsapp",
            event: "WEBHOOK_CONFIG_UPDATED",
          },
        },
      ],
    },
  ],
};

export const statusPayload = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "WABA",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "15551652725", phone_number_id: PHONE_NUMBER_ID },
            statuses: [{ id: "wamid.OUT1", status: "delivered", recipient_id: "5215512345678" }],
          },
        },
      ],
    },
  ],
};
