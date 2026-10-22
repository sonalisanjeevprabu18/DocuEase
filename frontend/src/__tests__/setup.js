import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// jsdom does not implement scrolling or download navigation.
Element.prototype.scrollIntoView = vi.fn();
window.scrollTo = vi.fn();
HTMLAnchorElement.prototype.click = vi.fn();

// Deterministic clipboard for copy behaviour (tests may override).
Object.defineProperty(navigator, "clipboard", {
  configurable: true,
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
});
