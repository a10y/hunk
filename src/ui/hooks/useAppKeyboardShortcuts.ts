import type { KeyEvent } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useRef } from "react";
import type { LayoutMode } from "../../core/types";
import type { MenuId } from "../components/chrome/menu";
import {
  isEscapeKey,
  isHalfPageDownKey,
  isHalfPageUpKey,
  isPageDownKey,
  isPageUpKey,
  isShiftSpacePageUpKey,
  isStepDownKey,
  isStepUpKey,
} from "../lib/keyboard";

type FocusArea = "files" | "filter" | "search";
type ScrollUnit = "step" | "viewport" | "content" | "half";

const FAST_CODE_HORIZONTAL_SCROLL_COLUMNS = 8;

export interface UseAppKeyboardShortcutsOptions {
  activeMenuId: MenuId | null;
  activateCurrentMenuItem: () => void;
  canRefreshCurrentInput: boolean;
  clearSearch: () => void;
  closeHelp: () => void;
  closeMenu: () => void;
  cycleTheme: () => void;
  focusArea: FocusArea;
  focusFilter: () => void;
  focusSearch: () => void;
  hasSearchQuery: boolean;
  moveToAnnotatedHunk: (delta: number) => void;
  moveToHunk: (delta: number) => void;
  moveMenuItem: (delta: number) => void;
  moveToNextSearchMatch: (delta: 1 | -1) => void;
  openMenu: (menuId: MenuId) => void;
  pagerMode: boolean;
  requestQuit: () => void;
  scrollCodeHorizontally: (delta: number) => void;
  scrollDiff: (delta: number, unit: ScrollUnit) => void;
  selectLayoutMode: (mode: LayoutMode) => void;
  showHelp: boolean;
  switchMenu: (delta: number) => void;
  toggleAgentNotes: () => void;
  toggleFocusArea: () => void;
  toggleHelp: () => void;
  toggleHunkHeaders: () => void;
  toggleLineNumbers: () => void;
  toggleLineWrap: () => void;
  toggleSidebar: () => void;
  triggerRefreshCurrentInput: () => void;
}

/** Register the app's scoped keyboard handling while keeping mode precedence explicit. */
export function useAppKeyboardShortcuts({
  activeMenuId,
  activateCurrentMenuItem,
  canRefreshCurrentInput,
  clearSearch,
  closeHelp,
  closeMenu,
  cycleTheme,
  focusArea,
  focusFilter,
  focusSearch,
  hasSearchQuery,
  moveToAnnotatedHunk,
  moveToHunk,
  moveMenuItem,
  moveToNextSearchMatch,
  openMenu,
  pagerMode,
  requestQuit,
  scrollCodeHorizontally,
  scrollDiff,
  selectLayoutMode,
  showHelp,
  switchMenu,
  toggleAgentNotes,
  toggleFocusArea,
  toggleHelp,
  toggleHunkHeaders,
  toggleLineNumbers,
  toggleLineWrap,
  toggleSidebar,
  triggerRefreshCurrentInput,
}: UseAppKeyboardShortcutsOptions) {
  const activeMenuIdRef = useRef(activeMenuId);
  const focusAreaRef = useRef(focusArea);
  const pagerModeRef = useRef(pagerMode);
  const showHelpRef = useRef(showHelp);
  const hasSearchQueryRef = useRef(hasSearchQuery);

  activeMenuIdRef.current = activeMenuId;
  focusAreaRef.current = focusArea;
  pagerModeRef.current = pagerMode;
  showHelpRef.current = showHelp;
  hasSearchQueryRef.current = hasSearchQuery;

  const runAndCloseMenu = (action: () => void) => {
    action();
    closeMenu();
  };

  const handleMenuToggleShortcut = (key: KeyEvent) => {
    if (key.name !== "f10") {
      return false;
    }

    if (pagerModeRef.current) {
      return true;
    }

    if (activeMenuIdRef.current) {
      closeMenu();
    } else {
      openMenu("file");
    }

    return true;
  };

  const handlePagerShortcut = (key: KeyEvent) => {
    if (key.name === "q" || isEscapeKey(key)) {
      requestQuit();
      return;
    }

    if (isPageDownKey(key)) {
      scrollDiff(1, "viewport");
      return;
    }

    if (isPageUpKey(key) || isShiftSpacePageUpKey(key)) {
      scrollDiff(-1, "viewport");
      return;
    }

    if (isHalfPageDownKey(key)) {
      scrollDiff(1, "half");
      return;
    }

    if (isHalfPageUpKey(key)) {
      scrollDiff(-1, "half");
      return;
    }

    if (isStepDownKey(key)) {
      scrollDiff(1, "step");
      return;
    }

    if (isStepUpKey(key)) {
      scrollDiff(-1, "step");
      return;
    }

    if (key.name === "left") {
      scrollCodeHorizontally(key.shift ? -FAST_CODE_HORIZONTAL_SCROLL_COLUMNS : -1);
      return;
    }

    if (key.name === "right") {
      scrollCodeHorizontally(key.shift ? FAST_CODE_HORIZONTAL_SCROLL_COLUMNS : 1);
      return;
    }

    if (key.name === "home") {
      scrollDiff(-1, "content");
      return;
    }

    if (key.name === "end") {
      scrollDiff(1, "content");
      return;
    }

    if (key.name === "w" || key.sequence === "w") {
      toggleLineWrap();
    }
  };

  const handleHelpShortcut = (key: KeyEvent) => {
    if (!showHelpRef.current || !isEscapeKey(key)) {
      return false;
    }

    closeHelp();
    return true;
  };

  const handleMenuShortcut = (key: KeyEvent) => {
    if (!activeMenuIdRef.current) {
      return false;
    }

    if (isEscapeKey(key)) {
      closeMenu();
      return true;
    }

    if (key.name === "left") {
      switchMenu(-1);
      return true;
    }

    if (key.name === "right" || key.name === "tab") {
      switchMenu(1);
      return true;
    }

    if (key.name === "up") {
      moveMenuItem(-1);
      return true;
    }

    if (key.name === "down") {
      moveMenuItem(1);
      return true;
    }

    if (key.name === "return" || key.name === "enter") {
      activateCurrentMenuItem();
      return true;
    }

    return false;
  };

  const handleFilterShortcut = (key: KeyEvent) => {
    if (focusAreaRef.current !== "filter") {
      return false;
    }

    if (key.name === "tab") {
      toggleFocusArea();
      return true;
    }

    // Let the focused input own filter editing and escape handling.
    return true;
  };

  const handleSearchInputShortcut = () => {
    if (focusAreaRef.current !== "search") {
      return false;
    }

    // Let the focused <input> in the StatusBar own all editing, submit, and escape behavior so
    // the global keyboard handler does not intercept while a search is being typed.
    return true;
  };

  const handleAppShortcut = (key: KeyEvent) => {
    if (key.name === "q") {
      requestQuit();
      return;
    }

    if (key.name === "?" || key.sequence === "?") {
      toggleHelp();
      closeMenu();
      return;
    }

    if (isEscapeKey(key)) {
      // Vim-style: Escape clears active hlsearch highlights before quitting the app.
      if (hasSearchQueryRef.current) {
        clearSearch();
        return;
      }
      requestQuit();
      return;
    }

    if (key.name === "tab") {
      toggleFocusArea();
      return;
    }

    if (key.name === "/") {
      focusSearch();
      return;
    }

    if (key.name === "\\" || key.sequence === "\\") {
      focusFilter();
      return;
    }

    if (hasSearchQueryRef.current) {
      if (key.sequence === "n") {
        moveToNextSearchMatch(1);
        return;
      }

      if (key.sequence === "N") {
        moveToNextSearchMatch(-1);
        return;
      }
    }

    if (isPageDownKey(key)) {
      scrollDiff(1, "viewport");
      return;
    }

    if (isPageUpKey(key) || isShiftSpacePageUpKey(key)) {
      scrollDiff(-1, "viewport");
      return;
    }

    if (isHalfPageDownKey(key)) {
      scrollDiff(1, "half");
      return;
    }

    if (isHalfPageUpKey(key)) {
      scrollDiff(-1, "half");
      return;
    }

    if (key.name === "home") {
      scrollDiff(-1, "content");
      return;
    }

    if (key.name === "end") {
      scrollDiff(1, "content");
      return;
    }

    if (isStepUpKey(key)) {
      scrollDiff(-1, "step");
      return;
    }

    if (isStepDownKey(key)) {
      scrollDiff(1, "step");
      return;
    }

    if (key.name === "left") {
      scrollCodeHorizontally(key.shift ? -FAST_CODE_HORIZONTAL_SCROLL_COLUMNS : -1);
      return;
    }

    if (key.name === "right") {
      scrollCodeHorizontally(key.shift ? FAST_CODE_HORIZONTAL_SCROLL_COLUMNS : 1);
      return;
    }

    if (key.name === "1") {
      runAndCloseMenu(() => selectLayoutMode("split"));
      return;
    }

    if (key.name === "2") {
      runAndCloseMenu(() => selectLayoutMode("stack"));
      return;
    }

    if (key.name === "0") {
      runAndCloseMenu(() => selectLayoutMode("auto"));
      return;
    }

    if (key.name === "s") {
      runAndCloseMenu(toggleSidebar);
      return;
    }

    if ((key.name === "r" || key.sequence === "r") && canRefreshCurrentInput) {
      runAndCloseMenu(triggerRefreshCurrentInput);
      return;
    }

    if (key.name === "t") {
      runAndCloseMenu(cycleTheme);
      return;
    }

    if (key.name === "a") {
      runAndCloseMenu(toggleAgentNotes);
      return;
    }

    if (key.name === "l" || key.sequence === "l") {
      runAndCloseMenu(toggleLineNumbers);
      return;
    }

    if (key.name === "w" || key.sequence === "w") {
      runAndCloseMenu(toggleLineWrap);
      return;
    }

    if (key.name === "m" || key.sequence === "m") {
      runAndCloseMenu(toggleHunkHeaders);
      return;
    }

    if (key.name === "[") {
      runAndCloseMenu(() => moveToHunk(-1));
      return;
    }

    if (key.name === "]") {
      runAndCloseMenu(() => moveToHunk(1));
      return;
    }

    if (key.sequence === "{") {
      runAndCloseMenu(() => moveToAnnotatedHunk(-1));
      return;
    }

    if (key.sequence === "}") {
      runAndCloseMenu(() => moveToAnnotatedHunk(1));
    }
  };

  useKeyboard((key: KeyEvent) => {
    if (handleMenuToggleShortcut(key)) {
      return;
    }

    if (pagerModeRef.current) {
      handlePagerShortcut(key);
      return;
    }

    if (handleHelpShortcut(key)) {
      return;
    }

    if (handleMenuShortcut(key)) {
      return;
    }

    if (handleFilterShortcut(key)) {
      return;
    }

    if (handleSearchInputShortcut()) {
      return;
    }

    handleAppShortcut(key);
  });
}
