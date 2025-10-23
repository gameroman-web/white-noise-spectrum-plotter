import { z } from "zod";

type RealPart = number & {};
type ImaginaryPart = number & {};
export type ReImPair = [RealPart, ImaginaryPart];

const finiteNumber = z.number().refine((n) => Number.isFinite(n), {
  message: "Number must be finite",
});

const pairSchema = z.tuple([finiteNumber, finiteNumber]);

const dataRowSchema = z.array(pairSchema).nonempty();

const trimAndSplit = z.string().transform((content, ctx) => {
  const trimmed = content.trim();
  if (!trimmed) {
    ctx.addIssue({
      code: "custom",
      message: "No content provided",
      path: [],
    });
    return z.NEVER;
  }

  const lines = trimmed.split("\n").filter((line) => line.trim());
  if (lines.length === 0) {
    ctx.addIssue({
      code: "custom",
      message: "No valid data rows found",
      path: [],
    });
    return z.NEVER;
  }

  return lines;
});

const detectHeader = z.array(z.string()).transform((lines, ctx) => {
  if (lines.length === 0) {
    ctx.addIssue({
      code: "custom",
      message: "No lines provided",
      path: [],
    });
    return z.NEVER;
  }

  const firstLine = lines[0]!;
  const parts = firstLine.trim().split(/\s+/);
  const numbers = parts.map(Number);
  const allFinite = numbers.every(Number.isFinite);
  const len = numbers.length;

  let header: string[] | null = null;
  let dataLines = lines;

  if (allFinite && len >= 2 && len % 2 === 0) {
    // First line is valid data, no header
    header = null;
  } else {
    // Assume header
    header = parts;
    dataLines = lines.slice(1);
    if (dataLines.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Header present but no data rows found",
        path: [],
      });
      return z.NEVER;
    }
  }

  return { header, dataLines };
});

const parseDataRows = z
  .object({
    header: z.array(z.string()).nullable(),
    dataLines: z.array(z.string()),
  })
  .transform((input, ctx) => {
    const { header, dataLines } = input;
    const rows: number[][] = [];

    for (const [index, line] of dataLines.entries()) {
      const parts = line.trim().split(/\s+/);
      const numbers = parts.map(Number);
      const allFinite = numbers.every(Number.isFinite);
      const len = numbers.length;

      if (!allFinite || len < 2 || len % 2 !== 0) {
        ctx.addIssue({
          code: "custom",
          message: `Invalid data row ${
            index + 1
          }: must contain even number of finite numbers (>=2), found ${len} parts with non-numeric values`,
          path: ["dataLines", index],
        });
        return z.NEVER;
      } else {
        rows.push(numbers);
      }
    }

    if (rows.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "No valid data rows found",
        path: ["dataLines"],
      });
      return z.NEVER;
    }

    return { header, rows };
  });

const checkUniform = z
  .object({
    header: z.array(z.string()).nullable(),
    rows: z.array(z.array(z.number())),
  })
  .transform((input, ctx) => {
    const { header, rows } = input;
    // Check uniformity of row lengths (only if all rows valid)
    const firstLen = rows[0]!.length;

    for (let i = 1; i < rows.length; i++) {
      const rowLength = rows[i]!.length;

      if (rowLength !== firstLen) {
        ctx.addIssue({
          code: "custom",
          message: `Data row ${
            i + 1
          } has different number of columns (${rowLength}), expected ${firstLen}`,
          path: ["rows", i],
        });
        return z.NEVER;
      }
    }

    return { header, data: rows, numCols: firstLen };
  });

const splitIntoPairs = z
  .object({
    header: z.array(z.string()).nullable(),
    data: z.array(z.array(z.number())),
    numCols: z.number(),
  })
  .transform((result, ctx) => {
    const { header, data, numCols } = result;
    // Validate header length if present
    if (header && header.length !== numCols) {
      ctx.addIssue({
        code: "custom",
        message: `Header has ${header.length} titles, but data has ${numCols} columns`,
        path: ["header"],
      });
      return z.NEVER;
    }
    if (numCols % 2 !== 0) {
      ctx.addIssue({
        code: "custom",
        message: "Number of columns must be even for pairing",
        path: ["numCols"],
      });
      return z.NEVER;
    }

    const numPairs = numCols / 2;
    const pairedData: ReImPair[][] = data.map((row) => {
      const pairs: ReImPair[] = [];
      for (let i = 0; i < row.length; i += 2) {
        pairs.push([row[i]!, row[i + 1]!]);
      }
      return pairs;
    });

    return { header, rows: pairedData, numPairs, numCols };
  });

const outputSchema = z.object({
  header: z.array(z.string()).nullable(),
  rows: z.array(dataRowSchema),
  numPairs: z.number(),
  numCols: z.number(),
});

const dataSchema = z
  .string()
  .pipe(trimAndSplit)
  .pipe(detectHeader)
  .pipe(parseDataRows)
  .pipe(checkUniform)
  .pipe(splitIntoPairs)
  .pipe(outputSchema);

type Data = z.infer<typeof dataSchema>;

export { dataSchema, type Data };
