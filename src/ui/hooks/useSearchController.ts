/**
 * Vim-style hlsearch state for the review stream.
 *
 * The controller owns the committed query (used for highlights everywhere), the in-progress
 * draft (used by the status bar input), the enumerated matching hunks, and the active match
 * cursor that moves through them via n/N. Keeping this state outside the review controller
 * lets file filtering and search co-exist without one resetting the other.
 */
import { useCallback, useMemo, useState } from "react";
import type { DiffFile } from "../../core/types";
import {
  findNextSearchHunkIndex,
  findSearchMatches,
  type SearchHunkMatch,
  type SearchMatchSet,
} from "../lib/searchMatches";

const EMPTY_MATCH_SET: SearchMatchSet = { matchHunks: [], totalMatches: 0 };

export interface SearchController {
  query: string;
  draft: string;
  matchHunks: SearchHunkMatch[];
  totalMatches: number;
  activeIndex: number;
  activeMatch: SearchHunkMatch | null;
  setDraft: (value: string) => void;
  beginSearch: () => void;
  commitSearch: (value: string) => void;
  cancelSearchInput: () => void;
  clear: () => void;
  selectMatchAt: (
    selectedFileIndex: number,
    selectedHunkIndex: number,
    delta: 1 | -1,
  ) => SearchHunkMatch | null;
}

interface UseSearchControllerOptions {
  files: DiffFile[];
}

/** Manage search query/draft state and derive matches from the current visible files. */
export function useSearchController({ files }: UseSearchControllerOptions): SearchController {
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const { matchHunks, totalMatches } = useMemo<SearchMatchSet>(
    () => (query ? findSearchMatches(files, query) : EMPTY_MATCH_SET),
    [files, query],
  );

  const activeMatch = useMemo(() => {
    if (matchHunks.length === 0) {
      return null;
    }

    const clampedIndex = Math.max(0, Math.min(activeIndex, matchHunks.length - 1));
    return matchHunks[clampedIndex] ?? null;
  }, [activeIndex, matchHunks]);

  /** Reset the editing draft to the committed query before showing the prompt. */
  const beginSearch = useCallback(() => {
    setDraft(query);
  }, [query]);

  /** Apply the committed query and reset the active cursor to the first match. */
  const commitSearch = useCallback((value: string) => {
    setQuery(value);
    setDraft(value);
    setActiveIndex(0);
  }, []);

  /** Drop the draft without disturbing the committed query/highlight. */
  const cancelSearchInput = useCallback(() => {
    setDraft(query);
  }, [query]);

  /** Clear the committed query, draft, and active cursor in one step. */
  const clear = useCallback(() => {
    setQuery("");
    setDraft("");
    setActiveIndex(0);
  }, []);

  /** Move the active cursor by one step relative to the current selection and return the new match. */
  const selectMatchAt = useCallback(
    (
      selectedFileIndex: number,
      selectedHunkIndex: number,
      delta: 1 | -1,
    ): SearchHunkMatch | null => {
      if (matchHunks.length === 0) {
        return null;
      }

      const nextIndex = findNextSearchHunkIndex(
        matchHunks,
        selectedFileIndex,
        selectedHunkIndex,
        delta,
      );
      if (nextIndex < 0) {
        return null;
      }

      setActiveIndex(nextIndex);
      return matchHunks[nextIndex] ?? null;
    },
    [matchHunks],
  );

  return {
    query,
    draft,
    matchHunks,
    totalMatches,
    activeIndex,
    activeMatch,
    setDraft,
    beginSearch,
    commitSearch,
    cancelSearchInput,
    clear,
    selectMatchAt,
  };
}
