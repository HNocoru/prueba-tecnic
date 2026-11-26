import { describe, expect, it } from "vitest";

import { RecordWorkerHeartbeat } from "./RecordWorkerHeartbeat";

describe("RecordWorkerHeartbeat", () => {
  it("acepta el latido del contrato", () => {
    expect(
      new RecordWorkerHeartbeat().execute({
        worker_id: "worker-1",
        active_calls: 2,
        version: "0.1.0",
      }),
    ).toEqual({
      ok: true,
      heartbeat: { workerId: "worker-1", activeCalls: 2, version: "0.1.0" },
    });
  });

  it("rechaza latidos incompletos o con tipos incorrectos", () => {
    expect(new RecordWorkerHeartbeat().execute({ worker_id: "worker-1" }).ok).toBe(false);
    expect(
      new RecordWorkerHeartbeat().execute({
        worker_id: "worker-1",
        active_calls: -1,
        version: "0.1.0",
      }).ok,
    ).toBe(false);
  });
});
