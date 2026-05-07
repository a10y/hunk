import type { DiffFile } from "../../core/types";

/** One hunk that contains at least one search match, with the match count. */
export interface SearchHunkMatch {
  fileId: string;
  fileIndex: number;
  hunkIndex: number;
  occurrenceCount: number;
}

export interface SearchMatchSet {
  matchHunks: SearchHunkMatch[];
  totalMatches: number;
}

const EMPTY_MATCH_SET: SearchMatchSet = { matchHunks: [], totalMatches: 0 };

/** Count case-insensitive substring occurrences in one line. */
function countOccurrences(text: string, needle: string) {
  if (!text || !needle) {
    return 0;
  }

  let count = 0;
  let pos = 0;
  while (true) {
    const at = text.indexOf(needle, pos);
    if (at === -1) {
      return count;
    }

    count += 1;
    pos = at + needle.length;
  }
}

/**
 * Enumerate hunks across the visible review stream that contain a case-insensitive substring match.
 * The visible-files list defines display order; n/N navigation walks this list in that order.
 */
export function findSearchMatches(files: DiffFile[], query: string): SearchMatchSet {
  if (!query) {
    return EMPTY_MATCH_SET;
  }

  const needle = query.toLowerCase();
  const matchHunks: SearchHunkMatch[] = [];
  let totalMatches = 0;

  files.forEach((file, fileIndex) => {
    const additionLines = file.metadata.additionLines;
    const deletionLines = file.metadata.deletionLines;

    file.metadata.hunks.forEach((hunk, hunkIndex) => {
      let count = 0;
      let deletionLineIndex = hunk.deletionLineIndex;
      let additionLineIndex = hunk.additionLineIndex;

      for (const content of hunk.hunkContent) {
        if (content.type === "context") {
          // Context lines render once even in split view, so count them once here.
          for (let offset = 0; offset < content.lines; offset += 1) {
            const line = (additionLines[additionLineIndex + offset] ?? "").toLowerCase();
            count += countOccurrences(line, needle);
          }
          deletionLineIndex += content.lines;
          additionLineIndex += content.lines;
          continue;
        }

        for (let offset = 0; offset < content.deletions; offset += 1) {
          const line = (deletionLines[deletionLineIndex + offset] ?? "").toLowerCase();
          count += countOccurrences(line, needle);
        }
        for (let offset = 0; offset < content.additions; offset += 1) {
          const line = (additionLines[additionLineIndex + offset] ?? "").toLowerCase();
          count += countOccurrences(line, needle);
        }

        deletionLineIndex += content.deletions;
        additionLineIndex += content.additions;
      }

      if (count > 0) {
        matchHunks.push({
          fileId: file.id,
          fileIndex,
          hunkIndex,
          occurrenceCount: count,
        });
        totalMatches += count;
      }
    });
  });

  return { matchHunks, totalMatches };
}

/**
 * Pick the next search match relative to the current selection, wrapping at the ends.
 * The selection cursor is described by file index + hunk index so callers can pass selections
 * that do not themselves contain matches.
 */
export function findNextSearchHunkIndex(
  matchHunks: SearchHunkMatch[],
  selectedFileIndex: number,
  selectedHunkIndex: number,
  delta: 1 | -1,
): number {
  if (matchHunks.length === 0) {
    return -1;
  }

  if (selectedFileIndex < 0) {
    return delta > 0 ? 0 : matchHunks.length - 1;
  }

  if (delta > 0) {
    for (let index = 0; index < matchHunks.length; index += 1) {
      const candidate = matchHunks[index]!;
      if (
        candidate.fileIndex > selectedFileIndex ||
        (candidate.fileIndex === selectedFileIndex && candidate.hunkIndex > selectedHunkIndex)
      ) {
        return index;
      }
    }
    return 0;
  }

  for (let index = matchHunks.length - 1; index >= 0; index -= 1) {
    const candidate = matchHunks[index]!;
    if (
      candidate.fileIndex < selectedFileIndex ||
      (candidate.fileIndex === selectedFileIndex && candidate.hunkIndex < selectedHunkIndex)
    ) {
      return index;
    }
  }
  return matchHunks.length - 1;
}
