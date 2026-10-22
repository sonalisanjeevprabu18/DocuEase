import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AudioPlayer from "../components/AudioPlayer.jsx";
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

describe("AudioPlayer", () => {
  it("plays plain text aloud and supports pause, resume and stop", () => {
    const controls = installSpeechSynthesis();
    render(
      <AudioPlayer
        text={"# Summary\n\n**Hello** world. - one - two"}
        language="en"
        ttsEnabled={false}
        sessionId="s1"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /play aloud/i }));
    expect(controls.speak).toHaveBeenCalledTimes(1);
    const utterance = controls.speak.mock.calls[0][0];
    expect(utterance.text).toContain("Hello world.");
    expect(utterance.text).not.toContain("#");

    fireEvent.click(screen.getByRole("button", { name: /pause/i }));
    expect(controls.pause).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /resume/i }));
    expect(controls.resume).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /stop/i }));
    expect(controls.cancel).toHaveBeenCalled();
  });

  it("never shows a fake MP3 download button when server TTS is disabled", () => {
    render(
      <AudioPlayer text="Hello" language="en" ttsEnabled={false} sessionId="s1" />,
    );
    expect(screen.queryByRole("button", { name: /download mp3/i })).not.toBeInTheDocument();
  });

  it("downloads a real file when the server generates one", async () => {
    synthesizeAudio.mockResolvedValue(new Blob(["ID3"], { type: "audio/mpeg" }));
    render(<AudioPlayer text="Hello" language="en" ttsEnabled sessionId="s1" />);

    fireEvent.click(screen.getByRole("button", { name: /download mp3/i }));

    await waitFor(() => expect(synthesizeAudio).toHaveBeenCalledWith({
      text: "Hello",
      language: "en",
      sessionId: "s1",
    }));
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
    expect(screen.queryByText(/couldn’t|could not/i)).not.toBeInTheDocument();
  });

  it("shows a clear error and no file when the MP3 service fails", async () => {
    synthesizeAudio.mockRejectedValue({
      code: "tts_unavailable",
      message: "Audio is down",
      extra: {},
    });
    render(<AudioPlayer text="Hello" language="en" ttsEnabled sessionId="s1" />);

    fireEvent.click(screen.getByRole("button", { name: /download mp3/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/audio/i);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("hides MP3 download for explanations beyond the TTS character limit", () => {
    render(
      <AudioPlayer
        text={"word ".repeat(50)}
        language="en"
        ttsEnabled
        sessionId="s1"
        maxTtsChars={100}
      />,
    );
    expect(screen.queryByRole("button", { name: /download mp3/i })).not.toBeInTheDocument();
    expect(screen.getByText(/too long for one MP3/i)).toBeInTheDocument();
  });
});
