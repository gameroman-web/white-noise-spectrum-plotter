import { describe, expect, it } from "bun:test";
import { parseContent } from "#lib/parse-content";

describe("parseContent", () => {
  it("should parse content with a header and a single pair of columns", () => {
    const content = "real imag\n1 0\n2 0";

    const result = parseContent(content);

    expect(result).toEqual({
      header: ["real", "imag"],
      rows: [[[1, 0]], [[2, 0]]],
      numPairs: 1,
      numCols: 2,
    });
  });

  it("should parse content with multiple column pairs per row", () => {
    const content = "re1 im1 re2 im2\n1 0 -1 0";

    const result = parseContent(content);

    expect(result).toEqual({
      header: ["re1", "im1", "re2", "im2"],
      rows: [
        [
          [1, 0],
          [-1, 0],
        ],
      ],
      numPairs: 2,
      numCols: 4,
    });
  });

  it("should parse content without a header when the first line is valid data", () => {
    const content = "1 0\n2 0";

    const result = parseContent(content);

    expect(result).toEqual({
      header: null,
      rows: [[[1, 0]], [[2, 0]]],
      numPairs: 1,
      numCols: 2,
    });
  });

  it("should handle negative, decimal and scientific-notation numbers", () => {
    const content = "-1 -0.5\n2e3 1e-1";

    const result = parseContent(content);

    expect(result).toEqual({
      header: null,
      rows: [[[-1, -0.5]], [[2000, 0.1]]],
      numPairs: 1,
      numCols: 2,
    });
  });

  it("should trim surrounding whitespace and ignore blank lines", () => {
    const content = "  \n  re im  \n\n  0   1  \n  10  2  \n\n";

    const result = parseContent(content);

    expect(result).toEqual({
      header: ["re", "im"],
      rows: [[[0, 1]], [[10, 2]]],
      numPairs: 1,
      numCols: 2,
    });
  });

  describe("error handling", () => {
    it("should throw for empty content", () => {
      expect(() => parseContent("")).toThrow("No content provided");
    });

    it("should throw for whitespace-only content", () => {
      expect(() => parseContent("   \n  \n  ")).toThrow("No content provided");
    });

    it("should throw when a data row has an odd number of columns", () => {
      const content = "real imag\n1 0 3";

      expect(() => parseContent(content)).toThrow(
        "must contain even number of finite numbers",
      );
    });

    it("should throw when a data row contains non-numeric values", () => {
      const content = "real imag\n1 0\nfoo bar";

      expect(() => parseContent(content)).toThrow(
        "must contain even number of finite numbers",
      );
    });

    it("should throw when rows have a different number of columns", () => {
      const content = "real imag\n1 0\n1 0 2 0";

      expect(() => parseContent(content)).toThrow(
        "has different number of columns",
      );
    });

    it("should throw when the header length does not match the column count", () => {
      const content = "freq real imag\n1 0\n2 0";

      expect(() => parseContent(content)).toThrow(
        "Header has 3 titles, but data has 2 columns",
      );
    });

    it("should throw when a header is present but no data rows follow", () => {
      const content = "freq real imag";

      expect(() => parseContent(content)).toThrow(
        "Header present but no data rows found",
      );
    });
  });
});
