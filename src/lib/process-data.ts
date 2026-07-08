import { fft } from "fft.ts";
import { fftfreq, fftshift } from "fft.ts/utils";
import type { DataRows, ReImPair } from "#schemas";

function processData(rows: DataRows, pairIndex: number, frequency: number) {
  // biome-ignore lint/style/noNonNullAssertion: pairIndex should be passed correctly
  const signal = rows.map((row) => row[pairIndex]!);

  const realInput = signal.map((s) => s[0]);
  const imagInput = signal.map((s) => s[1]);

  const { real, imag } = fft(realInput, imagInput);

  // biome-ignore lint/style/noNonNullAssertion: real and imag are same size
  const phasors = real.map<ReImPair>((re, i) => [re, imag[i]!]);

  const shiftedPhasors = fftshift(phasors);

  const decibelMagnitude = shiftedPhasors
    .map((p) => Math.sqrt(p[0] ** 2 + p[1] ** 2))
    .map((m) => 20 * Math.log10(m + 1e-12));

  const signalLength = signal.length;
  const freqs = fftfreq(signalLength, frequency);
  const freqs_shifted = fftshift(freqs);

  return { magnitude_db: decibelMagnitude, freqs_shifted } as const;
}

export { processData };
