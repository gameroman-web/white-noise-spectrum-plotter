import { createSignal } from "solid-js";
import { Chart, registerables } from "chart.js/auto";

import { transform as fft } from "fft.ts/nayuki";

Chart.register(...registerables);

type RealPart = number & {};
type ImaginaryPart = number & {};
type ReImPair = [RealPart, ImaginaryPart];
type DataRow = [...ReImPair, ...ReImPair];

function fftshift<T extends number | ReImPair>(arr: T[]): T[] {
  const n = arr.length;
  const half = Math.floor(n / 2);
  return [...arr.slice(half), ...arr.slice(0, half)];
}

function fftfreq(n: number, frequency: number): number[] {
  return Array.from({ length: n }, (_, i) => i / (n * (1 / frequency)));
}

function App() {
  const [fileContent, setFileContent] = createSignal("");
  const [frequencyInput, setFrequencyInput] = createSignal("1");
  const [frequency, setFrequency] = createSignal(1.0);
  const [type, setType] = createSignal(0);
  const [chart, setChart] = createSignal<Chart<"line", number[], number>>();
  const [canvasEl, setCanvasEl] = createSignal<HTMLCanvasElement>();

  const plot = () => {
    const content = fileContent();
    if (!content) return;

    const lines = content
      .trim()
      .split("\n")
      .filter((line) => line.trim());
    const data: [DataRow, ...DataRow[]] = lines
      .map((line) => line.trim().split(/\s+/).map(Number).filter(isFinite))
      .filter((row) => row.length > 0);

    if (data.length === 0) throw new Error();

    // Assume all rows have same number of columns
    const numCols = data[0].length;
    if (numCols < 2) throw new Error();

    const selectedCols = type() === 0 ? ([0, 1] as const) : ([2, 3] as const);
    if (numCols <= Math.max(...selectedCols)) throw new Error();

    const signal = data.map(
      (row) => [row[selectedCols[0]], row[selectedCols[1]]] as const
    );

    const N = signal.length;

    // Prepare input arrays for FFT
    const realInput = signal.map((s) => s[0]);
    const imagInput = signal.map((s) => s[1]);

    // Compute FFT using nayuki
    fft(realInput, imagInput);

    // Convert to array of [re, im] pairs
    const phasors: ReImPair[] = realInput.map((re, i) => [re, imagInput[i]!]);

    const phasors_shifted = fftshift(phasors);

    // Magnitude in dB
    const magnitude = phasors_shifted.map((p) =>
      Math.sqrt(p[0] ** 2 + p[1] ** 2)
    );
    const magnitude_db = magnitude.map((m) => 20 * Math.log10(m + 1e-12));

    // Frequencies
    const freqs = fftfreq(N, frequency());
    const freqs_shifted = fftshift(freqs);

    // Update chart
    const ctx = canvasEl();

    if (ctx && chart()) {
      chart()!.destroy();
    }

    if (ctx) {
      const newChart = new Chart(ctx, {
        type: "line",
        data: {
          labels: freqs_shifted,
          datasets: [
            {
              label: "Magnitude (dB)",
              data: magnitude_db,
              borderColor: "blue",
              backgroundColor: "blue",
              fill: false,
              pointRadius: 0,
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          scales: {
            x: { title: { display: true, text: "Frequency (Hz)" } },
            y: { title: { display: true, text: "Amplitude (dB)" } },
          },
          plugins: {
            tooltip: { enabled: false },
            title: { display: true, text: "Амплитудный спектр сигнала" },
          },
        },
      });
      setChart(newChart);
    }
  };

  return (
    <main class="container mx-auto p-4">
      <h1 class="text-2xl font-bold mb-4">Signal Spectrum Analyzer</h1>

      <div class="space-y-4">
        <div>
          <label for="file-upload" class="block mb-2">
            Upload data file:
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".txt,.dat,.log"
            onChange={(event) => {
              const file = event.target.files![0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                  setFileContent(e.target!.result as string);
                };
                reader.readAsText(file);
              }
            }}
            class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <div class="flex space-x-4">
          <div>
            <label for="frequency" class="block mb-2">
              Sampling frequency (frequency):
            </label>
            <input
              id="frequency"
              type="number"
              step="0.01"
              value={frequencyInput()}
              onInput={(e) => {
                const val = e.target.value;
                setFrequencyInput(val);
                setFrequency(parseFloat(val) || 1.0);
              }}
              class="border rounded px-2 py-1"
            />
          </div>

          <div>
            <label for="type" class="block mb-2">
              Type (0 or 1):
            </label>
            <select
              id="type"
              value={type()}
              onChange={(e) => setType(parseInt(e.target.value))}
              class="border rounded px-2 py-1"
            >
              <option value={0}>0</option>
              <option value={1}>1</option>
            </select>
          </div>
        </div>

        <div>
          <button
            onClick={plot}
            class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer"
            disabled={!fileContent()}
          >
            Plot Spectrum
          </button>
        </div>

        <div class="h-96">
          <canvas ref={setCanvasEl} />
        </div>
      </div>
    </main>
  );
}

export default App;
