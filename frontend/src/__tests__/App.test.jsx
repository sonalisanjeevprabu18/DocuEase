import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App.jsx";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const FORMATS = [
  { id: "short_summary", label: "Quick Summary", description: "The essentials in a few sentences." },
  { id: "beginner", label: "Explain Like I'm New", description: "Plain language, no assumed knowledge." },
  { id: "detailed_summary", label: "Detailed Breakdown", description: "A thorough look at the whole document." },
  { id: "study_notes", label: "Study Notes", description: "Revision-ready notes and takeaways." },
  { id: "concepts", label: "Key Concepts", description: "Important terms, defined clearly." },
  { id: "qa", label: "Ask and Answer", description: "The questions this document answers." },
  { id: "bullet_points", label: "Bullet-Point Highlights", description: "The key ideas as scannable points." },
  { id: "section_wise", label: "Section-by-Section", description: "Each part explained in its own place." },
];

const CONFIG = {
  app_name: "DocuEase AI",
  formats: FORMATS,
  limits: {
    max_upload_mb: 5,
    max_extracted_chars: 20000,
    max_generations_per_session: 3,
    generation_cooldown_seconds: 0,
    max_output_tokens: 1000,
    rate_limit_per_minute: 30,
    tts_max_chars: 4000,
  },
  provider: { kind: "local", name: "ollama", model: "qwen2.5:1.5b" },
  privacy: { external_provider: false, text: "Local processing only, no external AI." },
  demo_enabled: true,
  tts_enabled: true,
  sample: { filename: "sample-photosynthesis.txt", text: "Sample text about plants." },
};

const EXTRACTED = {
  filename: "notes.txt",
  size_bytes: 9,
  word_count: 2,
  char_count: 9,
  text: "hello doc",
  headings: [],
  table_count: 0,
  page_count: null,
  warnings: [],
  status: "processed",
};

function setupFetch(overrides = {}) {
  const calls = [];
  const mock = vi.fn(async (url, options = {}) => {
    const path = String(url);
    calls.push({ path, options });

    if (path.endsWith("/api/config")) {
      if (overrides.config) {
        return typeof overrides.config === "function" ? overrides.config() : overrides.config;
      }
      return json(CONFIG);
    }
    if (path.endsWith("/api/documents/extract")) {
      if (overrides.extract) {
        return typeof overrides.extract === "function" ? overrides.extract() : overrides.extract;
      }
      return json(EXTRACTED);
    }
    if (path.endsWith("/api/demo/generate")) {
      return json({
        output: "Demo output about plants.",
        format: "short_summary",
        provider: "demo",
        model: "none (no AI call)",
        usage: { used: 0, limit: 3, remaining: 3, cooldown_seconds: 0, generation_in_progress: false },
      });
    }
    if (path.endsWith("/api/generate")) {
      if (overrides.generate) {
        return typeof overrides.generate === "function" ? overrides.generate() : overrides.generate;
      }
      const payload = JSON.parse(options.body || "{}");
      return json({
        output: "## Explanation\n\nThe document says hello.",
        format: payload.format || "short_summary",
        provider: "fake",
        model: "fake-1",
        usage: { used: 1, limit: 3, remaining: 2, cooldown_seconds: 0, generation_in_progress: false },
      });
    }
    return json({ error: { code: "not_found", message: "nope" } }, 404);
  });
  vi.stubGlobal("fetch", mock);
  return calls;
}

function uploadTextFile(container) {
  const input = container.querySelector("#document-input");
  fireEvent.change(input, {
    target: { files: [new File(["hello doc"], "notes.txt", { type: "text/plain" })] },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DocuEase app", () => {
  it("renders the editorial landing page without a language selector", async () => {
    setupFetch();
    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: /big documents\. small explanations\./i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /choose file/i })).toBeInTheDocument();
    expect(await screen.findByText(/Local processing only/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/language/i)).not.toBeInTheDocument();
  });

  it("uploads a document, opens the workspace and generates an explanation", async () => {
    setupFetch();
    const { container } = render(<App />);
    await screen.findByText(/Local processing only/);

    uploadTextFile(container);

    expect((await screen.findAllByText("notes.txt")).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("radio")).toHaveLength(8);
    expect(screen.getAllByText(/2 words/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /simplify this document/i }));

    expect(await screen.findByText("The document says hello.")).toBeInTheDocument();
    expect(screen.getByLabelText(/2 of 3 free explanations remaining/)).toBeInTheDocument();
    expect(screen.getByText(/1 of 3 AI explanations used/)).toBeInTheDocument();
    expect(screen.getByText(/AI · fake-1/)).toBeInTheDocument();
  });

  it("sends the selected format to the backend", async () => {
    const calls = setupFetch();
    const { container } = render(<App />);
    await screen.findByText(/Local processing only/);
    uploadTextFile(container);
    await screen.findAllByText("notes.txt");

    fireEvent.click(screen.getByRole("radio", { name: /ask and answer/i }));
    fireEvent.click(screen.getByRole("button", { name: /simplify this document/i }));
    await screen.findByText("The document says hello.");

    const generateCall = calls.find((call) => call.path.endsWith("/api/generate"));
    const payload = JSON.parse(generateCall.options.body);
    expect(payload.format).toBe("qa");
    expect(payload).not.toHaveProperty("language");
  });

  it("runs the pre-written demo without consuming a generation", async () => {
    setupFetch();
    render(<App />);
    await screen.findByText(/Local processing only/);

    fireEvent.click(screen.getByRole("button", { name: /try a sample/i }));

    expect(await screen.findByText("Demo output about plants.")).toBeInTheDocument();
    expect(screen.getByText(/Demo sample · no AI call/)).toBeInTheDocument();
    expect(screen.getAllByText(/sample-photosynthesis.txt/).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/3 of 3 free explanations remaining/)).toBeInTheDocument();
  });

  it("shows the usage-limit state and disables further explanations", async () => {
    setupFetch({
      generate: () =>
        json(
          {
            error: {
              code: "usage_limit_exceeded",
              message: "You have used all 3 free AI generations for this session.",
              used: 3,
              limit: 3,
            },
          },
          429,
        ),
    });
    const { container } = render(<App />);
    await screen.findByText(/Local processing only/);
    uploadTextFile(container);
    await screen.findAllByText("notes.txt");

    fireEvent.click(screen.getByRole("button", { name: /simplify this document/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/used all 3 free AI generations/i);
    expect(screen.getByLabelText(/0 of 3 free explanations remaining/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /simplify this document/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /start a new session/i })).toBeInTheDocument();
  });

  it("copies the explanation with confirmation", async () => {
    setupFetch();
    const { container } = render(<App />);
    await screen.findByText(/Local processing only/);
    uploadTextFile(container);
    await screen.findAllByText("notes.txt");
    fireEvent.click(screen.getByRole("button", { name: /simplify this document/i }));
    await screen.findByText("The document says hello.");

    fireEvent.click(screen.getByRole("button", { name: /^copy$/i }));

    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining("The document says hello."),
      ),
    );
    expect(await screen.findByRole("button", { name: /copied/i })).toBeInTheDocument();
  });

  it("returns to the landing page from the workspace", async () => {
    setupFetch();
    const { container } = render(<App />);
    await screen.findByText(/Local processing only/);
    uploadTextFile(container);
    await screen.findAllByText("notes.txt");

    fireEvent.click(screen.getByRole("button", { name: /start a new document/i }));

    expect(
      await screen.findByRole("heading", { level: 1, name: /big documents/i }),
    ).toBeInTheDocument();
    expect(within(document.body).queryByText("notes.txt")).not.toBeInTheDocument();
  });

  it("warns when the backend is unreachable", async () => {
    setupFetch({ config: () => Promise.reject(new TypeError("offline")) });
    render(<App />);
    const banner = await screen.findByRole("status");
    expect(banner).toHaveTextContent(/reach the DocuEase API/i);
  });
});
