function fftshift<T extends number | [number, number]>(arr: T[]): T[] {
  const n = arr.length;
  const half = Math.floor(n / 2);
  return [...arr.slice(half), ...arr.slice(0, half)];
}

function fftfreq(n: number, frequency: number): number[] {
  return Array.from({ length: n }, (_, i) => i / (n * (1 / frequency)));
}

export { fftshift, fftfreq };
