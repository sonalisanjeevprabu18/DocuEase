import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ReadingView from "../components/ReadingView.jsx";

const RESULT = {
  output:
    "An opening line.\n\n## First idea\n\nBody one with **bold**.\n\n## Second idea\n\nBody two.",
  format: "detailed_summary",
  provider: "fake",
  model: "fake-1",
};

function renderView(overrides = {}) {
  return render(
    <ReadingView
      result={RESULT}
      formatLabel="Detailed Breakdown"
      docName="notes.txt"
      usage={{ used: 1, limit: 3, remaining: 2 }}
      sessionId="s1"
      ttsEnabled={false}
      onRegenerate={vi.fn()}
      onNewDocument={vi.fn()}
      canRegenerate
      {...overrides}
    />,
  );
}

describe("ReadingView", () => {
  it("renders the explanation with distinct section disclosures", () => {
    const { container } = renderView();
    expect(screen.getByText("First idea")).toBeInTheDocument();
    expect(screen.getByText("Second idea")).toBeInTheDocument();
    expect(screen.getByText(/An opening line\./)).toBeInTheDocument();

    const details = container.querySelectorAll("details.section-disclosure");
    expect(details).toHaveLength(2);
    expect(details[0].open).toBe(true);
  });

  it("collapses and expands all sections", () => {
    const { container } = renderView();
    fireEvent.click(screen.getByRole("button", { name: /collapse sections/i }));

    const collapsed = container.querySelectorAll("details.section-disclosure");
    expect(collapsed[0].open).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: /expand all sections/i }));
    expect(
      container.querySelectorAll("details.section-disclosure")[0].open,
    ).toBe(true);
  });

  it("shows the demo badge without an AI model claim", () => {
    renderView({
      result: { ...RESULT, provider: "demo", model: "none (no AI call)" },
    });
    expect(screen.getByText(/Demo sample · no AI call/)).toBeInTheDocument();
    expect(screen.queryByText(/AI · fake-1/)).not.toBeInTheDocument();
  });

  it("offers download and regeneration actions", () => {
    renderView();
    expect(screen.getByRole("button", { name: /markdown/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /txt/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /regenerate/i })).toBeEnabled();
  });

  it("disables regeneration when no credits remain", () => {
    renderView({ canRegenerate: false });
    expect(screen.getByRole("button", { name: /regenerate/i })).toBeDisabled();
  });
});
