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

const parseRows = z.array(z.string()).transform((lines, ctx) => {
  const rows: number[][] = [];
  let hasError = false;

  for (const [index, line] of lines.entries()) {
    const numbers = line.trim().split(/\s+/).map(Number);
    const finiteNumbers = numbers.filter(Number.isFinite);
    if (finiteNumbers.length < 2 || finiteNumbers.length % 2 !== 0) {
      ctx.addIssue({
        code: "custom",
        message: `Invalid row ${
          index + 1
        }: expected even number of finite numbers (>=2), got ${
          finiteNumbers.length
        }`,
        path: [index],
      });
      hasError = true;
      // Skip this row; continue to check others
    } else {
      rows.push(finiteNumbers);
    }
  }

  if (hasError) {
    return z.NEVER;
  }

  if (rows.length === 0) {
    ctx.addIssue({
      code: "custom",
      message: "No valid data rows found",
      path: [],
    });
    return z.NEVER;
  }

  return rows;
});

const checkUniform = z.array(z.array(z.number())).transform((rows, ctx) => {
  // Check uniformity of row lengths (only if all rows valid)
  const firstLen = rows[0]!.length;

  for (let i = 1; i < rows.length; i++) {
    const rowLength = rows[i]!.length;

    if (rowLength !== firstLen) {
      ctx.addIssue({
        code: "custom",
        message: `Row ${
          i + 1
        } has different number of columns (${rowLength}), expected ${firstLen}`,
        path: [i],
      });
      return z.NEVER;
    }
  }

  return { data: rows, numCols: firstLen };
});

const splitIntoPairs = z
  .object({
    data: z.array(z.array(z.number())),
    numCols: z.number(),
  })
  .transform((result, ctx) => {
    const { data, numCols } = result;
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

    return { rows: pairedData, numPairs, numCols };
  });

const outputSchema = z.object({
  rows: z.array(dataRowSchema),
  numPairs: z.number(),
  numCols: z.number(),
});

const dataSchema = z
  .string()
  .pipe(trimAndSplit)
  .pipe(parseRows)
  .pipe(checkUniform)
  .pipe(splitIntoPairs)
  .pipe(outputSchema);

export { dataSchema };
