import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App.jsx";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const CONFIG = {
  app_name: "DocuEase",
  formats: [
    { id: "short_summary", label: "Short summary", description: "Concise overview." },
    { id: "qa", label: "Question-and-answer format", description: "Questions and answers." },
  ],
  languages: [
    { code: "en", label: "English" },
    { code: "hi", label: "Hindi (हिन्दी)" },
  ],
  limits: {
    max_upload_mb: 5,
    max_extracted_chars: 20000,
    max_generations_per_session: 3,
    generation_cooldown_seconds: 0,
    max_output_tokens: 1000,
    rate_limit_per_minute: 30,
    tts_max_chars: 4000,
  },
  provider: { kind: "local", name: "ollama", model: "qwen3:4b" },
  privacy: { external_provider: false, text: "Local processing only, no external AI." },
  demo_enabled: true,
  tts_enabled: true,
  sample: { filename: "sample.txt", text: "Sample text about plants." },
};

function setupFetch(overrides = {}) {
  const calls = [];
  const mock = vi.fn(async (url, options = {}) => {
    const path = String(url);
    calls.push({ path, options });
    if (overrides.config && path.endsWith("/api/config")) {
      return typeof overrides.config === "function" ? overrides.config() : overrides.config;
    }
    if (path.endsWith("/api/config")) return json(CONFIG);
    if (path.endsWith("/api/documents/extract")) {
      return overrides.extract
        ? typeof overrides.extract === "function" ? overrides.extract() : overrides.extract
        : json({
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
          });
    }
    if (path.endsWith("/api/demo/generate")) {
      return json({
        output: "Demo output about plants.",
        format: "short_summary",
        language: "en",
        provider: "demo",
        model: "none (no AI call)",
        usage: { used: 0, limit: 3, remaining: 3, cooldown_seconds: 0, generation_in_progress: false },
      });
    }
    if (path.endsWith("/api/generate")) {
      if (overrides.generate) {
        return typeof overrides.generate === "function" ? overrides.generate() : overrides.generate;
      }
      return json({
        output: "## Explanation\n\nThe document says hello.",
        format: "short_summary",
        language: "en",
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
  const input = container.querySelector('input[type="file"]');
  fireEvent.change(input, {
    target: { files: [new File(["hello doc"], "notes.txt", { type: "text/plain" })] },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("App integration", () => {
  it("loads config, uploads a document, generates and updates usage", async () => {
    setupFetch();
    const { container } = render(<App />);

    await screen.findByText(/Local processing only/);

    uploadTextFile(container);
    await screen.findByText("notes.txt");
    expect(screen.getByText(/2 words/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /generate explanation/i }));

    expect(await screen.findByText("The document says hello.")).toBeInTheDocument();
    expect(screen.getByText("1 / 3 used")).toBeInTheDocument();
    expect(screen.getByText(/2 generations left/)).toBeInTheDocument();
  });

  it("sends the chosen language to the backend", async () => {
    const calls = setupFetch();
    const { container } = render(<App />);
    await screen.findByText(/Local processing only/);

    uploadTextFile(container);
    await screen.findByText("notes.txt");
    fireEvent.change(screen.getByLabelText(/output language/i), {
      target: { value: "hi" },
    });
    fireEvent.click(screen.getByRole("button", { name: /generate explanation/i }));
    await screen.findByText("The document says hello.");

    const generateCall = calls.find((call) => call.path.endsWith("/api/generate"));
    expect(JSON.parse(generateCall.options.body).language).toBe("hi");
  });

  it("shows the usage-limit error and disables generation at zero", async () => {
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
    await screen.findByText("notes.txt");

    fireEvent.click(screen.getByRole("button", { name: /generate explanation/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/used all 3 free AI generations/i);
    expect(screen.getByText("3 / 3 used")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generate explanation/i })).toBeDisabled();
  });

  it("runs demo mode without consuming AI generations", async () => {
    setupFetch();
    render(<App />);
    await screen.findByText(/Local processing only/);

    fireEvent.click(screen.getByRole("button", { name: /try demo/i }));

    expect(await screen.findByText("Demo output about plants.")).toBeInTheDocument();
    expect(screen.getByText(/Demo sample · no AI call/)).toBeInTheDocument();
    expect(screen.getByText("0 / 3 used")).toBeInTheDocument();
    expect(screen.getByText(/Sample document loaded/)).toBeInTheDocument();
  });

  it("copies the explanation to the clipboard", async () => {
    setupFetch();
    const { container } = render(<App />);
    await screen.findByText(/Local processing only/);
    uploadTextFile(container);
    await screen.findByText("notes.txt");
    fireEvent.click(screen.getByRole("button", { name: /generate explanation/i }));
    await screen.findByText("The document says hello.");

    fireEvent.click(screen.getByRole("button", { name: /^copy$/i }));

    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining("The document says hello."),
      ),
    );
    expect(await screen.findByRole("button", { name: /copied/i })).toBeInTheDocument();
  });

  it("warns when the backend is unreachable", async () => {
    setupFetch({ config: () => Promise.reject(new TypeError("offline")) });
    render(<App />);
    const banner = await screen.findByRole("status");
    expect(banner).toHaveTextContent(/reach the DocuEase API/i);
  });
});
