import { describe, expect, test } from "bun:test";
import { createTestDiffFile } from "../../../test/helpers/diff-helpers";
import { findNextSearchHunkIndex, findSearchMatches } from "./searchMatches";

function createSingleHunkFile(id: string, before: string, after: string) {
  return createTestDiffFile({
    after,
    agent: false,
    before,
    context: 1,
    id,
    path: `${id}.ts`,
  });
}

describe("findSearchMatches", () => {
  test("returns an empty result for a blank query", () => {
    const file = createSingleHunkFile("alpha", "const a = 1;\n", "const a = 2;\n");
    const result = findSearchMatches([file], "");

    expect(result.totalMatches).toBe(0);
    expect(result.matchHunks).toEqual([]);
  });

  test("counts case-insensitive substring occurrences inside hunks", () => {
    const file = createSingleHunkFile(
      "alpha",
      "const ALPHA = 1;\nconst other = 0;\n",
      "const Alpha = 2;\nconst alpha2 = 3;\n",
    );
    const result = findSearchMatches([file], "alpha");

    expect(result.totalMatches).toBeGreaterThan(0);
    expect(result.matchHunks).toHaveLength(1);
    expect(result.matchHunks[0]).toMatchObject({
      fileId: "alpha",
      fileIndex: 0,
      hunkIndex: 0,
    });
  });

  test("excludes hunks with no occurrences", () => {
    const file = createSingleHunkFile("beta", "const beta = 1;\n", "const beta = 2;\n");
    const result = findSearchMatches([file], "alpha");

    expect(result.matchHunks).toEqual([]);
    expect(result.totalMatches).toBe(0);
  });
});

describe("findNextSearchHunkIndex", () => {
  const matchHunks = [
    { fileId: "a", fileIndex: 0, hunkIndex: 0, occurrenceCount: 1 },
    { fileId: "a", fileIndex: 0, hunkIndex: 2, occurrenceCount: 1 },
    { fileId: "b", fileIndex: 1, hunkIndex: 1, occurrenceCount: 1 },
  ];

  test("returns -1 when there are no matches", () => {
    expect(findNextSearchHunkIndex([], 0, 0, 1)).toBe(-1);
    expect(findNextSearchHunkIndex([], 0, 0, -1)).toBe(-1);
  });

  test("walks forward from the current selection", () => {
    expect(findNextSearchHunkIndex(matchHunks, 0, 0, 1)).toBe(1);
    expect(findNextSearchHunkIndex(matchHunks, 0, 1, 1)).toBe(1);
    expect(findNextSearchHunkIndex(matchHunks, 0, 2, 1)).toBe(2);
  });

  test("wraps from the last match to the first when stepping forward", () => {
    expect(findNextSearchHunkIndex(matchHunks, 1, 1, 1)).toBe(0);
    expect(findNextSearchHunkIndex(matchHunks, 5, 0, 1)).toBe(0);
  });

  test("walks backward from the current selection", () => {
    expect(findNextSearchHunkIndex(matchHunks, 1, 1, -1)).toBe(1);
    expect(findNextSearchHunkIndex(matchHunks, 0, 2, -1)).toBe(0);
  });

  test("wraps from the first match to the last when stepping backward", () => {
    expect(findNextSearchHunkIndex(matchHunks, 0, 0, -1)).toBe(2);
    expect(findNextSearchHunkIndex(matchHunks, -1, 0, -1)).toBe(2);
  });
});
