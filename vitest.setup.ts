import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds = [0];
  private readonly callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }

  observe = vi.fn((element: Element) => {
    this.callback(
      [{ isIntersecting: true, target: element } as IntersectionObserverEntry],
      this,
    );
  });

  disconnect = vi.fn();
  unobserve = vi.fn();
  takeRecords = vi.fn().mockReturnValue([]);
}

vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

afterEach(() => {
  cleanup();
});
