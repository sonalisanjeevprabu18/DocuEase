import { beforeEach, describe, expect, it } from "vitest";
import {
  baseName,
  countWords,
  formatBytes,
  getOrCreateSessionId,
  resetSessionId,
  SESSION_KEY,
  toPlainText,
  validateFileClientSide,
} from "../utils.js";

describe("toPlainText", () => {
  it("strips markdown syntax for speech and .txt export", () => {
    const markdown = [
      "# Heading",
      "",
      "**Bold** and *italic* and `code`.",
      "",
      "- First item",
      "- Second item",
      "",
      "> A quote",
      "",
      "| A | B |",
      "|---|---|",
      "| 1 | 2 |",
    ].join("\n");

    const plain = toPlainText(markdown);
    expect(plain).not.toContain("#");
    expect(plain).not.toContain("**");
    expect(plain).not.toContain("|");
    expect(plain).toContain("Heading");
    expect(plain).toContain("Bold and italic and code.");
    expect(plain).toContain("First item");
    expect(plain).toContain("A quote");
  });

  it("handles empty input", () => {
    expect(toPlainText("")).toBe("");
    expect(toPlainText(undefined)).toBe("");
  });
});

describe("formatBytes / countWords / baseName", () => {
  it("formats sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatBytes(-1)).toBe("—");
  });

  it("counts words", () => {
    expect(countWords("one two  three\nfour")).toBe(4);
    expect(countWords("   ")).toBe(0);
    expect(countWords("")).toBe(0);
  });

  it("makes safe download base names", () => {
    expect(baseName("Quarterly Report (final).pdf")).toBe("Quarterly Report final");
    expect(baseName("")).toBe("document");
    expect(baseName("../../etc/passwd")).not.toContain("/");
  });
});

describe("validateFileClientSide", () => {
  const file = (name, size = 100, type = "text/plain") => ({
    name,
    size,
    type,
  });

  it("accepts supported documents", () => {
    expect(validateFileClientSide(file("a.pdf"))).toBeNull();
    expect(validateFileClientSide(file("a.docx"))).toBeNull();
    expect(validateFileClientSide(file("a.txt"))).toBeNull();
  });

  it("rejects unsupported extensions", () => {
    expect(validateFileClientSide(file("a.exe"))).toMatch(/isn't supported/);
  });

  it("rejects oversized and empty files", () => {
    expect(validateFileClientSide(file("a.pdf", 6 * 1024 * 1024))).toMatch(/limit/);
    expect(validateFileClientSide(file("a.txt", 0))).toMatch(/empty/);
    expect(validateFileClientSide(null)).toMatch(/Choose a document/);
  });
});

describe("session ids", () => {
  beforeEach(() => localStorage.clear());

  it("persists a session id in localStorage", () => {
    const first = getOrCreateSessionId();
    expect(first.length).toBeGreaterThanOrEqual(8);
    expect(localStorage.getItem(SESSION_KEY)).toBe(first);
    expect(getOrCreateSessionId()).toBe(first);
  });

  it("resetSessionId creates a new id", () => {
    const first = getOrCreateSessionId();
    const second = resetSessionId();
    expect(second).not.toBe(first);
    expect(localStorage.getItem(SESSION_KEY)).toBe(second);
  });
});
