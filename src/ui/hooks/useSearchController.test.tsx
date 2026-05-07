import { describe, expect, test } from "bun:test";
import { testRender } from "@opentui/react/test-utils";
import { act, useEffect } from "react";
import type { DiffFile } from "../../core/types";
import { createTestDiffFile, lines } from "../../../test/helpers/diff-helpers";
import { useSearchController, type SearchController } from "./useSearchController";

function createNumberedLines(start: number, count: number, valueOffset = 0) {
  return Array.from({ length: count }, (_, index) => {
    const lineNumber = start + index;
    return `export const item${String(lineNumber).padStart(2, "0")} = ${lineNumber + valueOffset};`;
  });
}

/** Build a fixture with two files and several hunks each so n/N navigation has somewhere to go. */
function createMultiHunkFiles(): DiffFile[] {
  const firstBefore = lines(...createNumberedLines(1, 12));
  const firstAfter = lines(
    ...createNumberedLines(1, 12).map((line, index) =>
      index === 0 || index === 11 ? line.replace(/= \d+;/, "= 9999;") : line,
    ),
  );
  const secondBefore = lines(...createNumberedLines(13, 12));
  const secondAfter = lines(
    ...createNumberedLines(13, 12).map((line, index) =>
      index === 0 || index === 11 ? line.replace(/= \d+;/, "= 4242;") : line,
    ),
  );

  return [
    createTestDiffFile({
      after: firstAfter,
      before: firstBefore,
      context: 1,
      id: "first",
      path: "first.ts",
    }),
    createTestDiffFile({
      after: secondAfter,
      before: secondBefore,
      context: 1,
      id: "second",
      path: "second.ts",
    }),
  ];
}

async function flush(setup: Awaited<ReturnType<typeof testRender>>) {
  await act(async () => {
    await setup.renderOnce();
    await Bun.sleep(0);
    await setup.renderOnce();
  });
}

function SearchControllerHarness({
  files,
  onController,
}: {
  files: DiffFile[];
  onController: (controller: SearchController) => void;
}) {
  const controller = useSearchController({ files });

  useEffect(() => {
    onController(controller);
  }, [controller, onController]);

  return null;
}

describe("useSearchController", () => {
  test("starts with an empty query and no matches", async () => {
    const ref: { current: SearchController | null } = { current: null };
    const setup = await testRender(
      <SearchControllerHarness
        files={createMultiHunkFiles()}
        onController={(controller) => {
          ref.current = controller;
        }}
      />,
      { width: 80, height: 4 },
    );

    try {
      await flush(setup);
      expect(ref.current?.query).toBe("");
      expect(ref.current?.draft).toBe("");
      expect(ref.current?.matches).toEqual([]);
      expect(ref.current?.totalMatches).toBe(0);
      expect(ref.current?.activeMatch).toBeNull();
    } finally {
      await act(async () => {
        setup.renderer.destroy();
      });
    }
  });

  test("commitSearch enumerates per-occurrence matches and points at the first one", async () => {
    const ref: { current: SearchController | null } = { current: null };
    const setup = await testRender(
      <SearchControllerHarness
        files={createMultiHunkFiles()}
        onController={(controller) => {
          ref.current = controller;
        }}
      />,
      { width: 80, height: 4 },
    );

    try {
      await flush(setup);

      await act(async () => {
        ref.current?.commitSearch("9999");
      });
      await flush(setup);

      expect(ref.current?.query).toBe("9999");
      expect(ref.current?.totalMatches).toBeGreaterThan(0);
      expect(ref.current?.activeIndex).toBe(0);
      expect(ref.current?.activeMatch?.fileId).toBe("first");
    } finally {
      await act(async () => {
        setup.renderer.destroy();
      });
    }
  });

  test("selectMatch walks every occurrence forward and wraps", async () => {
    const ref: { current: SearchController | null } = { current: null };
    const setup = await testRender(
      <SearchControllerHarness
        files={createMultiHunkFiles()}
        onController={(controller) => {
          ref.current = controller;
        }}
      />,
      { width: 80, height: 4 },
    );

    try {
      await flush(setup);

      await act(async () => {
        ref.current?.commitSearch("export const item");
      });
      await flush(setup);

      const total = ref.current?.totalMatches ?? 0;
      expect(total).toBeGreaterThan(2);

      // Walk every match forward; after `total` steps we should be back on index 0.
      for (let step = 0; step < total; step += 1) {
        await act(async () => {
          ref.current?.selectMatch(1);
        });
        await flush(setup);
      }

      expect(ref.current?.activeIndex).toBe(0);
    } finally {
      await act(async () => {
        setup.renderer.destroy();
      });
    }
  });

  test("clear drops the committed query so highlights disappear", async () => {
    const ref: { current: SearchController | null } = { current: null };
    const setup = await testRender(
      <SearchControllerHarness
        files={createMultiHunkFiles()}
        onController={(controller) => {
          ref.current = controller;
        }}
      />,
      { width: 80, height: 4 },
    );

    try {
      await flush(setup);

      await act(async () => {
        ref.current?.commitSearch("4242");
      });
      await flush(setup);
      expect(ref.current?.totalMatches).toBeGreaterThan(0);

      await act(async () => {
        ref.current?.clear();
      });
      await flush(setup);

      expect(ref.current?.query).toBe("");
      expect(ref.current?.totalMatches).toBe(0);
      expect(ref.current?.activeMatch).toBeNull();
    } finally {
      await act(async () => {
        setup.renderer.destroy();
      });
    }
  });
});
