import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AudioStudio from "../components/AudioStudio.jsx";
import { synthesizeAudio } from "../api.js";

vi.mock("../api.js", () => ({
  synthesizeAudio: vi.fn(),
}));

function installSpeechSynthesis() {
  const controls = {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn(() => [{ name: "Test Voice", lang: "en-US" }]),
  };
  window.speechSynthesis = controls;
  window.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
      this.lang = "";
      this.rate = 1;
      this.voice = null;
    }
  };
  return controls;
}

beforeEach(() => {
  installSpeechSynthesis();
  URL.createObjectURL = vi.fn(() => "blob:fake");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  delete window.speechSynthesis;
  delete window.SpeechSynthesisUtterance;
  vi.clearAllMocks();
});

describe("AudioStudio", () => {
  it("plays plain text aloud and supports pause, resume and stop", () => {
    const controls = installSpeechSynthesis();
    render(
      <AudioStudio
        text={"# Summary\n\n**Hello** world. - one - two"}
        ttsEnabled={false}
        sessionId="s1"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /play explanation aloud/i }));
    expect(controls.speak).toHaveBeenCalledTimes(1);
    const utterance = controls.speak.mock.calls[0][0];
    expect(utterance.text).toContain("Hello world.");
    expect(utterance.text).not.toContain("#");
    expect(screen.getByText("Reading aloud")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /pause narration/i }));
    expect(controls.pause).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /resume narration/i }));
    expect(controls.resume).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /stop narration/i }));
    expect(controls.cancel).toHaveBeenCalled();
  });

  it("never shows a fake MP3 download when server TTS is disabled", () => {
    render(<AudioStudio text="Hello" ttsEnabled={false} sessionId="s1" />);
    expect(screen.queryByRole("button", { name: /download mp3/i })).not.toBeInTheDocument();
  });

  it("downloads a real file only after the server generates one", async () => {
    synthesizeAudio.mockResolvedValue(new Blob(["ID3"], { type: "audio/mpeg" }));
    render(<AudioStudio text="Hello there" ttsEnabled sessionId="s1" />);

    fireEvent.click(screen.getByRole("button", { name: /download mp3/i }));

    await waitFor(() =>
      expect(synthesizeAudio).toHaveBeenCalledWith({
        text: "Hello there",
        sessionId: "s1",
      }),
    );
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
    expect(
      await screen.findByRole("button", { name: /download again/i }),
    ).toBeInTheDocument();
  });

  it("shows a clear error and no file when the MP3 service fails", async () => {
    synthesizeAudio.mockRejectedValue({
      code: "tts_unavailable",
      message: "Audio is down",
      extra: {},
    });
    render(<AudioStudio text="Hello" ttsEnabled sessionId="s1" />);

    fireEvent.click(screen.getByRole("button", { name: /download mp3/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/audio/i);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("hides MP3 download beyond the TTS character limit", () => {
    render(
      <AudioStudio
        text={"word ".repeat(50)}
        ttsEnabled
        sessionId="s1"
        maxTtsChars={100}
      />,
    );
    expect(screen.queryByRole("button", { name: /download mp3/i })).not.toBeInTheDocument();
    expect(screen.getByText(/too long for a single MP3/i)).toBeInTheDocument();
  });

  it("explains when the browser cannot synthesize speech", () => {
    delete window.speechSynthesis;
    delete window.SpeechSynthesisUtterance;
    render(<AudioStudio text="Hello" ttsEnabled sessionId="s1" />);
    expect(screen.queryByRole("button", { name: /play explanation aloud/i })).not.toBeInTheDocument();
    expect(screen.getByText(/doesn’t support in-page speech synthesis/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download mp3/i })).toBeInTheDocument();
  });
});
