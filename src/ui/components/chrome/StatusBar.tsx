import { isEscapeKey } from "../../lib/keyboard";
import type { AppTheme } from "../../themes";

/**
 * Render the persistent bottom-of-app status bar.
 *
 * Three modes share this row: editing the file filter, editing the search query, and a passive
 * summary line that surfaces the active filter, search match count, or transient notice text.
 */
export function StatusBar({
  filter,
  filterFocused,
  searchDraft,
  searchQuery,
  searchFocused,
  searchMatchCount,
  searchActiveIndex,
  noticeText,
  terminalWidth,
  theme,
  onCloseMenu,
  onFilterInput,
  onFilterSubmit,
  onSearchInput,
  onSearchSubmit,
  onSearchCancel,
}: {
  filter: string;
  filterFocused: boolean;
  searchDraft: string;
  searchQuery: string;
  searchFocused: boolean;
  searchMatchCount: number;
  searchActiveIndex: number;
  noticeText?: string;
  terminalWidth: number;
  theme: AppTheme;
  onCloseMenu: () => void;
  onFilterInput: (value: string) => void;
  onFilterSubmit: () => void;
  onSearchInput: (value: string) => void;
  onSearchSubmit: () => void;
  onSearchCancel: () => void;
}) {
  // Filter and search summaries take precedence over the transient update notice. When neither
  // is set the notice line shows up so users still see release information at a glance.
  const summaryParts: string[] = [];
  if (filter.length > 0) {
    summaryParts.push(`filter=${filter}`);
  }
  if (searchQuery.length > 0) {
    if (searchMatchCount === 0) {
      summaryParts.push(`/${searchQuery} (no matches)`);
    } else {
      summaryParts.push(`/${searchQuery} ${searchActiveIndex + 1}/${searchMatchCount}`);
    }
  }
  const summaryText = summaryParts.length > 0 ? summaryParts.join("  ") : (noticeText ?? "");

  return (
    <box
      style={{
        height: 1,
        backgroundColor: theme.panelAlt,
        paddingLeft: 1,
        paddingRight: 1,
        alignItems: "center",
        flexDirection: "row",
      }}
      onMouseUp={onCloseMenu}
    >
      {filterFocused ? (
        <>
          <text fg={theme.badgeNeutral}>filter:</text>
          <box style={{ width: 1, height: 1 }}>
            <text fg={theme.muted}> </text>
          </box>
          <input
            width={Math.max(12, terminalWidth - 11)}
            value={filter}
            placeholder="type to filter files"
            focused={true}
            onInput={onFilterInput}
            onSubmit={onFilterSubmit}
            onKeyDown={(key) => {
              if (!isEscapeKey(key)) {
                return;
              }

              key.preventDefault();
              key.stopPropagation();

              if (filter.length > 0) {
                onFilterInput("");
                return;
              }

              onFilterSubmit();
            }}
          />
        </>
      ) : searchFocused ? (
        <>
          <text fg={theme.badgeNeutral}>/</text>
          <input
            width={Math.max(12, terminalWidth - 5)}
            value={searchDraft}
            placeholder="search within diff"
            focused={true}
            onInput={onSearchInput}
            onSubmit={onSearchSubmit}
            onKeyDown={(key) => {
              if (!isEscapeKey(key)) {
                return;
              }

              key.preventDefault();
              key.stopPropagation();
              onSearchCancel();
            }}
          />
        </>
      ) : (
        <text fg={theme.muted}>{summaryText}</text>
      )}
    </box>
  );
}
