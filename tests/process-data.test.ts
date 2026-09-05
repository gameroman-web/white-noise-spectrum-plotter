import { describe, expect, it } from "bun:test";
import type { DataRow } from "#lib/parse-content";
import { processData } from "#lib/process-data";

describe("processData", () => {
  it("should correctly compute and shift magnitudes and frequencies for real DC signals", () => {
    // A constant DC signal of 4 samples: [1+0j, 1+0j, 1+0j, 1+0j]
    const mockSignal: DataRow = [
      [1, 0],
      [1, 0],
      [1, 0],
      [1, 0],
    ];
    const samplingFreq = 1000; // 1000 Hz

    const result = processData(mockSignal, samplingFreq);

    expect(result).toEqual({
      freqs_shifted: [-500, -250, 0, 250],
      magnitude_db: [-240, -240, 12.041199826561419, -240],
    });
  });

  it("should correctly isolate a high-frequency Nyquist signal at the spectrum edges", () => {
    // Alternating signal representing the highest possible digital frequency (Nyquist)
    const mockSignal: DataRow = [
      [1, 0],
      [-1, 0],
      [1, 0],
      [-1, 0],
    ];
    const samplingFreq = 1000;

    const result = processData(mockSignal, samplingFreq);

    expect(result).toEqual({
      freqs_shifted: [-500, -250, 0, 250],
      magnitude_db: [12.041199826561419, -240, -240, -240],
    });
  });

  it("should correctly handle complex inputs with non-zero imaginary parts", () => {
    // A complex exponential signal rotating clockwise at Fs/4 (250 Hz)
    // Points on the complex unit circle: [1+0j, 0+1j, -1+0j, 0-1j]
    const mockSignal: DataRow = [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ];
    const samplingFreq = 1000;

    const result = processData(mockSignal, samplingFreq);

    expect(result).toEqual({
      freqs_shifted: [-500, -250, 0, 250],
      magnitude_db: [-240, -239.99893635043412, -240, 12.041199826561419],
    });
  });
});
