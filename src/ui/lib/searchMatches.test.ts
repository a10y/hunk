import { describe, expect, test } from "bun:test";
import { createTestDiffFile } from "../../../test/helpers/diff-helpers";
import { findSearchMatches, nextMatchIndex } from "./searchMatches";

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
    expect(findSearchMatches([file], "")).toEqual([]);
  });

  test("emits one entry per case-insensitive substring occurrence", () => {
    const file = createSingleHunkFile(
      "alpha",
      "const ALPHA = 1;\nconst other = 0;\n",
      "const Alpha = 2;\nconst alpha2 = 3;\n",
    );
    const matches = findSearchMatches([file], "alpha");

    // Two source lines change, plus the addition of "alpha2" line — so we expect at least one
    // deletion-side and several addition-side matches.
    expect(matches.length).toBeGreaterThanOrEqual(2);
    for (const match of matches) {
      expect(match.fileId).toBe("alpha");
      expect(match.length).toBe("alpha".length);
      expect(match.startColumn).toBeGreaterThanOrEqual(0);
    }
    expect(matches.some((match) => match.side === "addition")).toBe(true);
    expect(matches.some((match) => match.side === "deletion")).toBe(true);
  });

  test("uses addition-side line index for context matches so split toggling stays stable", () => {
    const file = createSingleHunkFile(
      "ctx",
      "const top = 1;\nconst bottom = 2;\n",
      "const top = 1;\nconst middle = 99;\nconst bottom = 2;\n",
    );
    const matches = findSearchMatches([file], "top");
    const contextMatches = matches.filter((match) => match.side === "context");

    expect(contextMatches.length).toBe(1);
  });

  test("excludes hunks with no occurrences", () => {
    const file = createSingleHunkFile("beta", "const beta = 1;\n", "const beta = 2;\n");
    expect(findSearchMatches([file], "alpha")).toEqual([]);
  });
});

describe("nextMatchIndex", () => {
  test("returns -1 when there are no matches", () => {
    expect(nextMatchIndex(0, 0, 1)).toBe(-1);
    expect(nextMatchIndex(0, 0, -1)).toBe(-1);
  });

  test("walks forward and wraps at the end", () => {
    expect(nextMatchIndex(3, 0, 1)).toBe(1);
    expect(nextMatchIndex(3, 1, 1)).toBe(2);
    expect(nextMatchIndex(3, 2, 1)).toBe(0);
  });

  test("walks backward and wraps at the start", () => {
    expect(nextMatchIndex(3, 2, -1)).toBe(1);
    expect(nextMatchIndex(3, 0, -1)).toBe(2);
  });
});
