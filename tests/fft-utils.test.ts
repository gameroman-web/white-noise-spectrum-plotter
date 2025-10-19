import { describe, it, expect } from "bun:test";

import { fftfreq, fftshift } from "~/lib/fft-utils";

describe("fft-utils", () => {
  it("Should match numpy behaviour", () => {
    expect(fftfreq(5, 100)).toEqual([0, 20, 40, -40, -20]);
    expect(fftshift(fftfreq(5, 100))).toEqual([-40, -20, 0, 20, 40]);
  });

  it("Should match numpy behaviour", () => {
    expect(fftfreq(10, 50)).toEqual([0, 5, 10, 15, 20, -25, -20, -15, -10, -5]);
    expect(fftshift(fftfreq(10, 50))).toEqual([
      -25, -20, -15, -10, -5, 0, 5, 10, 15, 20,
    ]);
  });
});
