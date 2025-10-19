import { createSignal } from "solid-js";
import { Chart, registerables } from "chart.js/auto";

import { transform as fft } from "fft.ts/nayuki";

import { dataSchema, type ReImPair } from "~/schemas";
import { fftfreq, fftshift } from "~/lib/fft-utils";

Chart.register(...registerables);

function processData(rows: ReImPair[][], pairIndex: number) {
  const signal: ReImPair[] = rows.map((row) => row[pairIndex]!);

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
  const signalLength = signal.length;
  return { magnitude_db, signalLength };
}

function App() {
  const [fileContent, setFileContent] = createSignal("");
  const [frequencyInput] = createSignal("1");
  const [getFrequency, setFrequency] = createSignal(1.0);
  const [getPairIndex, setPairIndex] = createSignal(0);
  const [getChart, setChart] = createSignal<Chart<"line", number[], number>>();
  const [canvasEl, setCanvasEl] = createSignal<HTMLCanvasElement>();

  const plot = () => {
    const content = fileContent();
    const pairIndex = getPairIndex();
    const frequency = getFrequency();

    if (!content) return;

    const { rows, numPairs } = dataSchema.parse(content);

    if (numPairs <= pairIndex) throw new Error();

    const { magnitude_db, signalLength } = processData(rows, pairIndex);

    // Frequencies
    const freqs = fftfreq(signalLength, frequency);
    const freqs_shifted = fftshift(freqs);

    // Update chart
    const ctx = canvasEl();

    if (!ctx) return;

    const chart = getChart();

    if (chart) {
      // Update existing chart data
      chart.data.labels = freqs_shifted;
      chart.data.datasets[0]!.data = magnitude_db;
      chart.update("none"); // 'none' skips animation for instant redraw
      return;
    }

    // Create new chart on first run
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
        animation: false,
        elements: { point: { radius: 0, hoverRadius: 0, hitRadius: 0 } },
        responsive: false,
        interaction: { intersect: false },
        scales: {
          x: { title: { display: true, text: "Frequency (Hz)" } },
          y: { title: { display: true, text: "Amplitude (dB)" } },
        },
        plugins: { tooltip: { enabled: false } },
      },
    });
    setChart(newChart);
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
                setFrequency(parseFloat(val) || 1.0);
              }}
              class="border rounded px-2 py-1"
            />
          </div>

          <div>
            <label for="type" class="block mb-2">
              Type (0 or 1):
            </label>
            <input
              id="type"
              type="number"
              min="0"
              max="1"
              step="1"
              value={getPairIndex()}
              onChange={(e) => setPairIndex(parseInt(e.target.value))}
              class="border rounded px-2 py-1"
            />
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

        <div class="h-200">
          <canvas class="h-200" ref={setCanvasEl} />
        </div>
      </div>
    </main>
  );
}

export default App;
