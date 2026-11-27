import { DisconnectWhatsAppCallRequest_DisconnectReason } from "livekit-server-sdk";
import { describe, expect, it, vi } from "vitest";

import { LiveKitWhatsAppCallGateway, type ConnectorLike } from "./LiveKitWhatsAppCallGateway";

const SECRET = "meta-token-secreto";
const CALL_ID = "11111111-1111-4111-8111-111111111111";

function setup() {
  const connector = {
    acceptWhatsAppCall: vi.fn().mockResolvedValue({ roomName: "r" }),
    disconnectWhatsAppCall: vi.fn().mockResolvedValue({}),
  } satisfies ConnectorLike;
  const gateway = new LiveKitWhatsAppCallGateway(connector, {
    whatsappApiKey: SECRET,
    cloudApiVersion: "26.0",
    agentName: "whatsapp-agent",
  });
  return { connector, gateway };
}

describe("LiveKitWhatsAppCallGateway", () => {
  it("accept llama AcceptWhatsAppCall con la firma documentada y el call_id interno", async () => {
    const { connector, gateway } = setup();

    await gateway.accept({
      callId: CALL_ID,
      waCallId: "wacid.CALL1",
      phoneNumberId: "PN1",
      sdpOffer: "v=0 offer",
      roomName: `call-${CALL_ID}`,
    });

    const options = connector.acceptWhatsAppCall.mock.calls[0]![0];
    expect(options).toMatchObject({
      whatsappPhoneNumberId: "PN1",
      whatsappApiKey: SECRET,
      whatsappCloudApiVersion: "26.0",
      whatsappCallId: "wacid.CALL1",
      roomName: `call-${CALL_ID}`,
      participantAttributes: { call_id: CALL_ID },
      participantMetadata: JSON.stringify({ call_id: CALL_ID }),
    });
    expect(options.sdp).toMatchObject({ type: "offer", sdp: "v=0 offer" });
    expect(options.agents).toHaveLength(1);
    expect(options.agents[0]).toMatchObject({
      agentName: "whatsapp-agent",
      metadata: JSON.stringify({ call_id: CALL_ID }),
    });
  });

  it("disconnect usa USER_INITIATED porque el terminate de Meta ya cerró la llamada", async () => {
    const { connector, gateway } = setup();

    await gateway.disconnect("wacid.CALL1", "user_initiated");

    expect(connector.disconnectWhatsAppCall).toHaveBeenCalledWith(
      "wacid.CALL1",
      SECRET,
      DisconnectWhatsAppCallRequest_DisconnectReason.USER_INITIATED,
    );
  });

  it("disconnect con business_initiated usa BUSINESS_INITIATED", async () => {
    const { connector, gateway } = setup();

    await gateway.disconnect("wacid.CALL1", "business_initiated");

    expect(connector.disconnectWhatsAppCall).toHaveBeenCalledWith(
      "wacid.CALL1",
      SECRET,
      DisconnectWhatsAppCallRequest_DisconnectReason.BUSINESS_INITIATED,
    );
  });

  it("un error del Connector no filtra el token en el mensaje", async () => {
    const { connector, gateway } = setup();
    connector.acceptWhatsAppCall.mockRejectedValue(new Error(`falló con ${SECRET}`));

    const failure = gateway.accept({
      callId: CALL_ID,
      waCallId: "w",
      phoneNumberId: "p",
      sdpOffer: "s",
      roomName: "r",
    });
    await expect(failure).rejects.toThrow(/AcceptWhatsAppCall/);
    await expect(failure).rejects.not.toThrow(SECRET);
  });

  it("el código y el estado del Connector quedan en el error, sin el mensaje original", async () => {
    const { connector, gateway } = setup();
    const serverError = Object.assign(new Error(`invalid SDP ${SECRET}`), {
      name: "",
      code: "invalid_argument",
      status: 400,
    });
    connector.acceptWhatsAppCall.mockRejectedValue(serverError);

    const failure = gateway.accept({
      callId: CALL_ID,
      waCallId: "w",
      phoneNumberId: "p",
      sdpOffer: "s",
      roomName: "r",
    });
    await expect(failure).rejects.toThrow(/código invalid_argument/);
    await expect(failure).rejects.toThrow(/estado 400/);
    await expect(failure).rejects.not.toThrow(SECRET);
  });
});
