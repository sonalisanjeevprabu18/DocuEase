import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UploadPanel from "../components/UploadPanel.jsx";

function fileInput(container) {
  return container.querySelector('input[type="file"]');
}

describe("UploadPanel", () => {
  it("rejects unsupported extensions before hitting the server", () => {
    const onFile = vi.fn();
    const onError = vi.fn();
    const { container } = render(
      <UploadPanel onFile={onFile} onError={onError} busy={null} maxMb={5} />,
    );

    fireEvent.change(fileInput(container), {
      target: {
        files: [new File(["MZ"], "virus.exe", { type: "application/x-msdownload" })],
      },
    });

    expect(onFile).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/isn't supported/) }),
    );
  });

  it("rejects files over the size limit", () => {
    const onFile = vi.fn();
    const onError = vi.fn();
    const { container } = render(
      <UploadPanel onFile={onFile} onError={onError} busy={null} maxMb={5} />,
    );

    const big = new File(["x"], "big.pdf", { type: "application/pdf" });
    Object.defineProperty(big, "size", { value: 6 * 1024 * 1024 });
    fireEvent.change(fileInput(container), { target: { files: [big] } });

    expect(onFile).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/limit/) }),
    );
  });

  it("passes valid documents to the caller", () => {
    const onFile = vi.fn();
    const { container } = render(
      <UploadPanel onFile={onFile} onError={vi.fn()} busy={null} maxMb={5} />,
    );

    const doc = new File(["hello world"], "notes.txt", { type: "text/plain" });
    fireEvent.change(fileInput(container), { target: { files: [doc] } });

    expect(onFile).toHaveBeenCalledWith(doc);
  });

  it("disables upload while a document is being processed", () => {
    const { container } = render(
      <UploadPanel onFile={vi.fn()} onError={vi.fn()} busy="extracting" maxMb={5} />,
    );
    expect(fileInput(container)).toBeDisabled();
    expect(screen.getByText(/Reading your document/)).toBeInTheDocument();
  });

  it("offers the pre-written sample without uploading", () => {
    const onSample = vi.fn();
    render(
      <UploadPanel
        onFile={vi.fn()}
        onError={vi.fn()}
        busy={null}
        maxMb={5}
        onSample={onSample}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /try a sample/i }));
    expect(onSample).toHaveBeenCalledTimes(1);
  });
});
