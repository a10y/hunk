/**
 * Vim-style hlsearch state for the review stream.
 *
 * The controller owns the committed query (used for highlights everywhere), the in-progress
 * draft (used by the status bar input), the enumerated per-occurrence matches, and the active
 * cursor that walks them via n/N. Keeping this state outside the review controller lets file
 * filtering and search co-exist without one resetting the other.
 */
import { useCallback, useMemo, useState } from "react";
import type { DiffFile } from "../../core/types";
import { findSearchMatches, nextMatchIndex, type SearchMatch } from "../lib/searchMatches";

const EMPTY_MATCHES: SearchMatch[] = [];

export interface SearchController {
  query: string;
  draft: string;
  matches: SearchMatch[];
  totalMatches: number;
  activeIndex: number;
  activeMatch: SearchMatch | null;
  setDraft: (value: string) => void;
  beginSearch: () => void;
  commitSearch: (value: string) => void;
  cancelSearchInput: () => void;
  clear: () => void;
  selectMatch: (delta: 1 | -1) => SearchMatch | null;
}

interface UseSearchControllerOptions {
  files: DiffFile[];
}

/** Manage search query/draft state and derive matches from the current visible files. */
export function useSearchController({ files }: UseSearchControllerOptions): SearchController {
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const matches = useMemo<SearchMatch[]>(
    () => (query ? findSearchMatches(files, query) : EMPTY_MATCHES),
    [files, query],
  );

  const activeMatch = useMemo(() => {
    if (matches.length === 0) {
      return null;
    }

    const clampedIndex = Math.max(0, Math.min(activeIndex, matches.length - 1));
    return matches[clampedIndex] ?? null;
  }, [activeIndex, matches]);

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

  /** Step the active cursor by one match (with wrap-around) and return the new active match. */
  const selectMatch = useCallback(
    (delta: 1 | -1): SearchMatch | null => {
      if (matches.length === 0) {
        return null;
      }

      const next = nextMatchIndex(matches.length, activeIndex, delta);
      if (next < 0) {
        return null;
      }

      setActiveIndex(next);
      return matches[next] ?? null;
    },
    [activeIndex, matches],
  );

  return {
    query,
    draft,
    matches,
    totalMatches: matches.length,
    activeIndex,
    activeMatch,
    setDraft,
    beginSearch,
    commitSearch,
    cancelSearchInput,
    clear,
    selectMatch,
  };
}
