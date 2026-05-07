import type { DiffFile } from "../../core/types";

/**
 * A single occurrence of the search query within the visible diff.
 *
 * Match enumeration is layout-agnostic: context lines are counted once using the addition-side
 * line index as canonical so toggling between split and stack mode does not double-count the
 * unchanged lines that show on both sides.
 */
export interface SearchMatch {
  fileId: string;
  fileIndex: number;
  hunkIndex: number;
  side: "addition" | "deletion" | "context";
  /** Index into `metadata.additionLines` (for addition/context) or `metadata.deletionLines` (for deletion). */
  lineIndex: number;
  /** Char offset within the cleaned line text. */
  startColumn: number;
  length: number;
}

/** Count case-insensitive substring occurrences in one line and emit them as match records. */
function collectLineMatches(
  text: string,
  needle: string,
  emit: (startColumn: number, length: number) => void,
) {
  if (!text || !needle) {
    return;
  }

  const lowered = text.toLowerCase();
  let pos = 0;
  while (true) {
    const at = lowered.indexOf(needle, pos);
    if (at === -1) {
      return;
    }

    emit(at, needle.length);
    pos = at + needle.length;
  }
}

/**
 * Enumerate every individual search match across the visible review stream in display order.
 * The returned list is what `n`/`N` walks through; the index inside it is also what the status
 * bar shows as the "current" cursor position.
 */
export function findSearchMatches(files: DiffFile[], query: string): SearchMatch[] {
  if (!query) {
    return [];
  }

  const needle = query.toLowerCase();
  const matches: SearchMatch[] = [];

  files.forEach((file, fileIndex) => {
    const additionLines = file.metadata.additionLines;
    const deletionLines = file.metadata.deletionLines;

    file.metadata.hunks.forEach((hunk, hunkIndex) => {
      let deletionLineIndex = hunk.deletionLineIndex;
      let additionLineIndex = hunk.additionLineIndex;

      for (const content of hunk.hunkContent) {
        if (content.type === "context") {
          for (let offset = 0; offset < content.lines; offset += 1) {
            const lineIdx = additionLineIndex + offset;
            collectLineMatches(additionLines[lineIdx] ?? "", needle, (startColumn, length) => {
              matches.push({
                fileId: file.id,
                fileIndex,
                hunkIndex,
                side: "context",
                lineIndex: lineIdx,
                startColumn,
                length,
              });
            });
          }
          deletionLineIndex += content.lines;
          additionLineIndex += content.lines;
          continue;
        }

        for (let offset = 0; offset < content.deletions; offset += 1) {
          const lineIdx = deletionLineIndex + offset;
          collectLineMatches(deletionLines[lineIdx] ?? "", needle, (startColumn, length) => {
            matches.push({
              fileId: file.id,
              fileIndex,
              hunkIndex,
              side: "deletion",
              lineIndex: lineIdx,
              startColumn,
              length,
            });
          });
        }
        for (let offset = 0; offset < content.additions; offset += 1) {
          const lineIdx = additionLineIndex + offset;
          collectLineMatches(additionLines[lineIdx] ?? "", needle, (startColumn, length) => {
            matches.push({
              fileId: file.id,
              fileIndex,
              hunkIndex,
              side: "addition",
              lineIndex: lineIdx,
              startColumn,
              length,
            });
          });
        }

        deletionLineIndex += content.deletions;
        additionLineIndex += content.additions;
      }
    });
  });

  return matches;
}

/** Wrap-around cursor step through the enumerated match list. */
export function nextMatchIndex(matchCount: number, currentIndex: number, delta: 1 | -1): number {
  if (matchCount <= 0) {
    return -1;
  }

  const safeCurrent = currentIndex < 0 ? (delta > 0 ? -1 : 0) : currentIndex;
  return (((safeCurrent + delta) % matchCount) + matchCount) % matchCount;
}
