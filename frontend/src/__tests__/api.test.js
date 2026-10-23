import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  extractDocument,
  generateDemo,
  generateExplanation,
  getConfig,
  synthesizeAudio,
} from "../api.js";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api client", () => {
  it("returns parsed JSON on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ status: "ok" })));
    await expect(getConfig()).resolves.toEqual({ status: "ok" });
  });

  it("throws a typed ApiError with the backend code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            error: {
              code: "usage_limit_exceeded",
              message: "No generations left.",
              used: 3,
              limit: 3,
            },
          },
          429,
        ),
      ),
    );
    await expect(generateExplanation({ text: "x", format: "qa", sessionId: "s" }))
      .rejects.toMatchObject({
        name: "ApiError",
        code: "usage_limit_exceeded",
        status: 429,
      });
  });

  it("maps network failures to network_error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("failed")));
    await expect(getConfig()).rejects.toMatchObject({ code: "network_error" });
  });

  it("sends multipart uploads and JSON generations", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(jsonResponse({ output: "ok" })),
    );
    vi.stubGlobal("fetch", fetchMock);

    await extractDocument(new File(["hello"], "doc.txt", { type: "text/plain" }));
    expect(fetchMock.mock.calls[0][1].body).toBeInstanceOf(FormData);

    await generateDemo({ format: "qa", sessionId: "s1" });
    const secondCall = fetchMock.mock.calls[1];
    expect(secondCall[0]).toContain("/api/demo/generate");
    expect(JSON.parse(secondCall[1].body)).toEqual({
      format: "qa",
      session_id: "s1",
    });
  });

  it("returns a blob for audio and surfaces typed TTS errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(new Blob([new Uint8Array([1, 2, 3])], { type: "audio/mpeg" }), {
          status: 200,
          headers: { "Content-Type": "audio/mpeg" },
        }),
      ),
    );
    const blob = await synthesizeAudio({ text: "hi", sessionId: "s" });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
    expect(blob.type).toBe("audio/mpeg");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ error: { code: "tts_unavailable", message: "down" } }, 503),
      ),
    );
    await expect(
      synthesizeAudio({ text: "hi", sessionId: "s" }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
