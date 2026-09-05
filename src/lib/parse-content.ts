export type ReImPair = [number, number];
export type DataRow = ReImPair[];

export type Data = {
  header: string[] | null;
  rows: readonly DataRow[];
  numPairs: number;
  numCols: number;
};

function parseContent(content: string): Data {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("No content provided");
  }

  const lines = trimmed.split("\n").filter((line) => line.trim());
  if (lines.length === 0) {
    throw new Error("No valid data rows found");
  }

  const firstLine = lines[0];
  if (!firstLine) {
    throw new Error("No lines provided");
  }
  const firstParts = firstLine.trim().split(/\s+/);
  const firstNumbers = firstParts.map(Number);
  const firstAllFinite = firstNumbers.every(Number.isFinite);
  const firstLen = firstNumbers.length;

  let header: string[] | null = null;
  let dataLines = lines;

  if (firstAllFinite && firstLen >= 2 && firstLen % 2 === 0) {
    header = null;
  } else {
    header = firstParts;
    dataLines = lines.slice(1);
    if (dataLines.length === 0) {
      throw new Error("Header present but no data rows found");
    }
  }

  const rows: number[][] = [];
  for (const [index, line] of dataLines.entries()) {
    const parts = line.trim().split(/\s+/);
    const numbers = parts.map(Number);
    const allFinite = numbers.every(Number.isFinite);
    const len = numbers.length;

    if (!allFinite || len < 2 || len % 2 !== 0) {
      throw new Error(
        `Invalid data row ${index + 1}: must contain even number of finite numbers (>=2), found ${len} parts with non-numeric values`,
      );
    }
    rows.push(numbers);
  }

  const firstRow = rows[0];
  if (!firstRow) {
    throw new Error("No valid data rows found");
  }
  const firstRowLen = firstRow.length;
  for (let i = 1; i < rows.length; i++) {
    const rowLength = rows[i]?.length;
    if (rowLength !== firstRowLen) {
      throw new Error(
        `Data row ${i + 1} has different number of columns (${rowLength}), expected ${firstRowLen}`,
      );
    }
  }

  if (header && header.length !== firstRowLen) {
    throw new Error(
      `Header has ${header.length} titles, but data has ${firstRowLen} columns`,
    );
  }

  if (firstRowLen % 2 !== 0) {
    throw new Error("Number of columns must be even for pairing");
  }

  const numPairs = firstRowLen / 2;
  const pairedData: DataRow[] = rows.map((row) => {
    const pairs: DataRow = [];
    for (let i = 0; i < row.length; i += 2) {
      const real = row[i];
      const imag = row[i + 1];
      if (real === undefined || imag === undefined) {
        throw new Error("Number of columns must be even for pairing");
      }
      pairs.push([real, imag]);
    }
    return pairs;
  });

  return { header, rows: pairedData, numPairs, numCols: firstRowLen };
}

export { parseContent };
