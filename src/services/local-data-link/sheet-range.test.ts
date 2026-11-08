import { describe, expect, it } from "vitest";
import { MAX_DATA_LINK_SCAN_ROWS } from "@/services/local-data-link/constants";
import { parseCsv } from "@/services/local-data-link/parse-csv";
import {
  gridToTsv,
  parseSheetRange,
  sliceSheetGrid,
} from "@/services/local-data-link/sheet-range";

const GRID = [
  ["name", "value", "note"],
  ["a", 1, "x"],
  ["b", 0, "y"],
  ["c", "", "z"],
  ["", "", ""],
  ["d", 1, "q"],
];

describe("parseSheetRange", () => {
  it("reads a sheet rectangle", () => {
    expect(parseSheetRange("Sheet1!A3:C10")).toEqual({
      sheet: "Sheet1",
      startCol: 1,
      startRow: 3,
      endCol: 3,
      endRow: 10,
    });
  });

  it("reads a csv range and a quoted sheet", () => {
    expect(parseSheetRange("A3:C10")?.sheet).toBeNull();
    expect(parseSheetRange("'My Sheet'!B2:B2")).toMatchObject({
      sheet: "My Sheet",
      startCol: 2,
      startRow: 2,
      endCol: 2,
      endRow: 2,
    });
    expect(parseSheetRange("'O''Brien'!A1")?.sheet).toBe("O'Brien");
  });

  it("rejects a broken range", () => {
    expect(parseSheetRange("Sheet1!")).toBeNull();
    expect(parseSheetRange("A0:B2")).toBeNull();
  });
});

describe("sliceSheetGrid", () => {
  it("keeps the exact rectangle, including an inner blank cell", () => {
    expect(sliceSheetGrid(GRID, parseSheetRange("A2:C3")!, false)).toEqual([
      ["a", "1", "x"],
      ["b", "0", "y"],
    ]);
  });

  it("stops before the end when the next row is empty in every column", () => {
    expect(sliceSheetGrid(GRID, parseSheetRange("A2:C10")!, true)).toEqual([
      ["a", "1", "x"],
      ["b", "0", "y"],
      ["c", "", "z"],
    ]);
  });

  it("continues past the end row until a fully empty row", () => {
    expect(sliceSheetGrid(GRID, parseSheetRange("A2:C3")!, true)).toEqual([
      ["a", "1", "x"],
      ["b", "0", "y"],
      ["c", "", "z"],
    ]);
  });

  it("treats zero as a value and caps the scan", () => {
    const longGrid = Array.from({ length: MAX_DATA_LINK_SCAN_ROWS + 5 }, (_, index) => [
      String(index + 1),
    ]);
    const sliced = sliceSheetGrid(longGrid, parseSheetRange("A1:A2")!, true);
    expect(sliced).toHaveLength(MAX_DATA_LINK_SCAN_ROWS);
    expect(sliced[1]?.[0]).toBe("2");
  });
});

describe("parseCsv", () => {
  it("keeps quoted commas and escaped quotes", () => {
    const rows = parseCsv('name,note\n"a,b","say ""hi"""\n');
    expect(rows).toEqual([
      ["name", "note"],
      ["a,b", 'say "hi"'],
    ]);
    const range = parseSheetRange("A2:B2");
    expect(range).not.toBeNull();
    expect(gridToTsv(sliceSheetGrid(rows, range!, false))).toBe('a,b\tsay "hi"');
  });

  it("reads a semicolon file", () => {
    expect(parseCsv("name;value\nalpha;1\n")).toEqual([
      ["name", "value"],
      ["alpha", "1"],
    ]);
  });
});
