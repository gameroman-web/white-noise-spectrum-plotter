import { createSignal } from "solid-js";
import { Chart, registerables } from "chart.js/auto";

import { transform as fft } from "fft.ts/nayuki";

import { dataSchema, type ReImPair, type Data } from "~/schemas";
import { fftfreq, fftshift } from "~/lib/fft-utils";

Chart.register(...registerables);

function processData(rows: ReImPair[][], pairIndex: number) {
  const signal: ReImPair[] = rows.map((row) => row[pairIndex]!);

  const realInput = signal.map((s) => s[0]);
  const imagInput = signal.map((s) => s[1]);

  fft(realInput, imagInput);

  const phasors: ReImPair[] = realInput.map((re, i) => [re, imagInput[i]!]);

  const phasors_shifted = fftshift(phasors);

  const magnitude_db = phasors_shifted
    .map((p) => Math.sqrt(p[0] ** 2 + p[1] ** 2))
    .map((m) => 20 * Math.log10(m + 1e-12));
  const signalLength = signal.length;
  return { magnitude_db, signalLength };
}

function App() {
  const [parsedData, setParsedData] = createSignal<Data | null>(null);
  const [status, setStatus] = createSignal<(string & {}) | "Idle">("Idle");
  const [error, setError] = createSignal<string | null>(null);
  const [frequencyInput] = createSignal("1");
  const [getFrequency, setFrequency] = createSignal(1.0);
  const [pairIndexInput] = createSignal("1");
  const [getPairIndex, setPairIndex] = createSignal(0);
  const [getChart, setChart] = createSignal<Chart<"line", number[], number>>();
  const [canvasEl, setCanvasEl] = createSignal<HTMLCanvasElement>();

  const clearError = () => setError(null);
  const updateStatus = (newStatus: string) => {
    setStatus(newStatus);
    clearError();
  };

  const plot = () => {
    const data = parsedData();
    const pairIndex = getPairIndex();
    const frequency = getFrequency();

    if (!data) {
      setError("No data loaded. Please upload a file first.");
      setStatus("Idle");
      return;
    }

    if (pairIndex < 0 || pairIndex >= data.numPairs) {
      setError(
        `Invalid pair index: ${pairIndex + 1}. Must be between 1 and ${
          data.numPairs
        }.`
      );
      setStatus("Idle");
      return;
    }

    try {
      updateStatus("Processing data...");
      const { magnitude_db, signalLength } = processData(data.rows, pairIndex);

      const freqs = fftfreq(signalLength, frequency);
      const freqs_shifted = fftshift(freqs);

      const ctx = canvasEl();

      if (!ctx) {
        setError("Canvas not available. Please refresh the page.");
        setStatus("Idle");
        return;
      }

      const chart = getChart();

      updateStatus("Plotting...");
      if (chart) {
        chart.data.labels = freqs_shifted;
        chart.data.datasets[0]!.data = magnitude_db;
        chart.update("none");
        return;
      }

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
      setStatus("Idle");
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while plotting.";
      setError(`Plotting error: ${errorMsg}`);
      setStatus("Idle");
    }
  };

  return (
    <main class="container mx-auto p-4">
      <h1 class="text-2xl font-bold mb-4">Signal Spectrum Analyzer</h1>

      {status() !== "Idle" && (
        <div class="mb-4 p-3 bg-blue-100 border border-blue-300 rounded text-blue-800">
          {status()}
        </div>
      )}

      {error() && (
        <div class="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-800">
          {error()}
          <button
            onClick={clearError}
            class="ml-4 text-red-600 hover:text-red-800 underline"
          >
            Dismiss
          </button>
        </div>
      )}

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
              const file = event.target.files?.[0];
              if (file) {
                updateStatus("Parsing file data...");
                const reader = new FileReader();
                reader.onload = (e) => {
                  const content = e.target?.result as string;
                  if (!content) {
                    setError("Failed to read file content.");
                    setStatus("Idle");
                    return;
                  }
                  try {
                    const parsed = dataSchema.parse(content);
                    setParsedData(parsed);
                    setStatus("Idle");
                  } catch (err) {
                    const errorMsg =
                      err instanceof Error
                        ? err.message
                        : "Invalid file format.";
                    setError(`Parse error: ${errorMsg}`);
                    setStatus("Idle");
                    setParsedData(null);
                  }
                };
                reader.onerror = () => {
                  setError("Failed to read file.");
                  setStatus("Idle");
                };
                reader.readAsText(file);
              }
            }}
            class="block w-full text-sm text-gray-500 cursor-pointer file:cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <div class="flex space-x-4">
          <div>
            <label for="frequency" class="block mb-2">
              Sampling frequency (hertz)
            </label>
            <input
              id="frequency"
              type="number"
              step="1"
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
              {parsedData()?.numPairs
                ? `Column pair (1-${parsedData()?.numPairs})`
                : "Column pair"}
            </label>
            <input
              id="type"
              type="number"
              min="1"
              max={parsedData()?.numPairs || 2}
              step="1"
              value={pairIndexInput()}
              onChange={(e) => {
                const val = e.target.value;
                const index = (parseInt(val) || 1) - 1;
                setPairIndex(Math.max(0, index));
              }}
              class="border rounded px-2 py-1"
            />
          </div>
        </div>

        <div>
          <button
            onClick={plot}
            class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={!parsedData()}
          >
            Plot Spectrum
          </button>
        </div>

        <div class="h-200">
          <canvas class="h-200 w-full" ref={setCanvasEl} />
        </div>
      </div>
    </main>
  );
}

export default App;
