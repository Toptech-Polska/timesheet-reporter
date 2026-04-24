import { describe, expect, it } from "vitest";
import {
  filterActiveWorkItems,
  getWorkingDaysInMonth,
  roundToHalf,
} from "../helpers";
import { runAlgorithm } from "../generator";
import type { AlgorithmInput, WorkItem } from "../types";

// ── Fixtures ──────────────────────────────────────────────────────────────

function makeItem(
  id: string,
  rate: number,
  proportion: number,
  overrides: Partial<WorkItem> = {}
): WorkItem {
  return {
    id,
    description: `Item ${id}`,
    category: "Test",
    hourly_rate: rate,
    proportion,
    active_from: null,
    active_until: null,
    ...overrides,
  };
}

// March 2026: 22 working days (Mon–Fri)
const MARCH_2026_DAYS = getWorkingDaysInMonth(2026, 3, [1, 2, 3, 4, 5]);

// First 20 working days of March 2026
const MARCH_20_DAYS = MARCH_2026_DAYS.slice(0, 20);

// First 13 working days of March 2026 (gives capacity 13×8=104 h ≥ 100 h)
const MARCH_13_DAYS = MARCH_2026_DAYS.slice(0, 13);

// ── TEST 1 — Podstawowy podział ───────────────────────────────────────────

describe("TEST 1 — podstawowy podział", () => {
  const input: AlgorithmInput = {
    target_amount: 10000,
    work_items: [makeItem("a", 300, 1), makeItem("b", 500, 1)],
    working_days: MARCH_20_DAYS,
    max_hours_per_day: 8,
  };

  it("calculated_amount jest w przedziale ±50 PLN od celu", () => {
    const result = runAlgorithm(input);
    expect(Math.abs(result.calculated_amount - 10000)).toBeLessThanOrEqual(50);
  });

  it("zwraca dwie propozycje dla dwóch pozycji", () => {
    const result = runAlgorithm(input);
    expect(result.proposals).toHaveLength(2);
  });

  it("żaden wpis dzienny nie przekracza max_hours_per_day", () => {
    const result = runAlgorithm(input);
    result.entries.forEach((e) =>
      expect(e.hours).toBeLessThanOrEqual(input.max_hours_per_day)
    );
  });
});

// ── TEST 2 — Proporcje nierówne ───────────────────────────────────────────

describe("TEST 2 — proporcje nierówne (prop:1 vs prop:2)", () => {
  const input: AlgorithmInput = {
    target_amount: 10000,
    work_items: [makeItem("a", 300, 1), makeItem("b", 500, 2)],
    working_days: MARCH_20_DAYS,
    max_hours_per_day: 8,
  };

  it("pozycja z prop:2 ma ~2× więcej godzin niż prop:1 (tolerancja ±0.5 h)", () => {
    const result = runAlgorithm(input);
    const propA = result.proposals.find((p) => p.work_item_id === "a")!;
    const propB = result.proposals.find((p) => p.work_item_id === "b")!;
    expect(Math.abs(propB.hours_total - 2 * propA.hours_total)).toBeLessThanOrEqual(0.5);
  });
});

// ── TEST 3 — Limit dzienny ────────────────────────────────────────────────
//
// 13 dni roboczych × 8 h = 104 h pojemność ≥ 100 h wymaganych.
// Przy adaptacyjnym podziale żaden dzień nie przekroczy 8 h.

describe("TEST 3 — limit dzienny", () => {
  const input: AlgorithmInput = {
    target_amount: 50000,
    work_items: [makeItem("a", 500, 1)],
    working_days: MARCH_13_DAYS,
    max_hours_per_day: 8,
  };

  it("proposals[0].hours_total = 100 (50000/500)", () => {
    const result = runAlgorithm(input);
    expect(result.proposals[0].hours_total).toBe(100);
  });

  it("żaden wpis dzienny nie przekracza 8 h", () => {
    const result = runAlgorithm(input);
    result.entries.forEach((e) => expect(e.hours).toBeLessThanOrEqual(8));
  });

  it("łączne godziny w entries = 100", () => {
    const result = runAlgorithm(input);
    expect(result.total_hours).toBe(100);
  });
});

// ── TEST 4 — Filtrowanie aktywnych pozycji ────────────────────────────────

describe("TEST 4 — filtrowanie aktywnych pozycji", () => {
  it("pozycja z active_until w poprzednim miesiącu jest odfiltrowana", () => {
    const items: WorkItem[] = [
      makeItem("1", 300, 1),
      makeItem("2", 400, 1, { active_from: "2026-01-01" }),
      // expired: active_until before March 2026
      makeItem("3", 500, 1, { active_until: "2026-02-28" }),
    ];
    const active = filterActiveWorkItems(items, 2026, 3);
    expect(active).toHaveLength(2);
    expect(active.map((i) => i.id)).not.toContain("3");
  });

  it("pozycja z active_from w następnym miesiącu jest odfiltrowana", () => {
    const items: WorkItem[] = [
      makeItem("1", 300, 1),
      makeItem("2", 400, 1, { active_from: "2026-04-01" }), // starts in April
    ];
    const active = filterActiveWorkItems(items, 2026, 3);
    expect(active).toHaveLength(1);
  });

  it("pozycja aktywna od połowy miesiąca jest uwzględniona", () => {
    const items: WorkItem[] = [
      makeItem("1", 300, 1, { active_from: "2026-03-15" }),
    ];
    const active = filterActiveWorkItems(items, 2026, 3);
    expect(active).toHaveLength(1);
  });
});

// ── TEST 5 — getWorkingDaysInMonth ────────────────────────────────────────

describe("TEST 5 — getWorkingDaysInMonth", () => {
  it("marzec 2026 (pon–pt) = 22 dni roboczych", () => {
    const days = getWorkingDaysInMonth(2026, 3, [1, 2, 3, 4, 5]);
    expect(days).toHaveLength(22);
  });

  it("wszystkie daty są w marcu 2026", () => {
    const days = getWorkingDaysInMonth(2026, 3, [1, 2, 3, 4, 5]);
    days.forEach((d) => expect(d).toMatch(/^2026-03-\d{2}$/));
  });

  it("luty 2026 (pon–pt) = 20 dni roboczych", () => {
    const days = getWorkingDaysInMonth(2026, 2, [1, 2, 3, 4, 5]);
    expect(days).toHaveLength(20);
  });
});

// ── TEST 6 — Zaokrąglenia nie gubią godzin ────────────────────────────────

describe("TEST 6 — zaokrąglenia nie gubią godzin", () => {
  it("suma godzin w entries ≈ hours_total z proposals (tolerancja ±0.5 h na pozycję)", () => {
    const input: AlgorithmInput = {
      target_amount: 15000,
      work_items: [
        makeItem("a", 300, 1),
        makeItem("b", 400, 2),
        makeItem("c", 500, 1),
      ],
      working_days: MARCH_2026_DAYS,
      max_hours_per_day: 8,
    };

    const result = runAlgorithm(input);

    for (const proposal of result.proposals) {
      const entryHours = result.entries
        .filter((e) => e.work_item_id === proposal.work_item_id)
        .reduce((s, e) => s + e.hours, 0);

      expect(
        Math.abs(entryHours - proposal.hours_total)
      ).toBeLessThanOrEqual(0.5);
    }
  });
});

// ── TEST 7 — Edge cases ───────────────────────────────────────────────────

describe("TEST 7 — edge cases", () => {
  it("target_amount <= 0 rzuca błąd", () => {
    expect(() =>
      runAlgorithm({
        target_amount: 0,
        work_items: [makeItem("a", 500, 1)],
        working_days: MARCH_2026_DAYS,
        max_hours_per_day: 8,
      })
    ).toThrow("Kwota docelowa musi być większa od 0");
  });

  it("pusta lista dni roboczych rzuca błąd", () => {
    expect(() =>
      runAlgorithm({
        target_amount: 10000,
        work_items: [makeItem("a", 500, 1)],
        working_days: [],
        max_hours_per_day: 8,
      })
    ).toThrow("Lista dni roboczych jest pusta");
  });

  it("brak aktywnych pozycji rzuca błąd PL", () => {
    const items: WorkItem[] = [
      makeItem("a", 500, 1, { active_until: "2026-02-28" }),
    ];
    expect(() =>
      runAlgorithm({
        target_amount: 10000,
        work_items: items,
        working_days: MARCH_2026_DAYS,
        max_hours_per_day: 8,
      })
    ).toThrow("Brak aktywnych pozycji pracy");
  });
});

// ── TEST 8 — Weryfikacja końcowa ──────────────────────────────────────────

describe("TEST 8 — weryfikacja końcowa z zadania", () => {
  it("runAlgorithm z 1 pozycją 500/h, 20 dni, target=10000 → calculated ∈ [9900; 10100]", () => {
    const result = runAlgorithm({
      target_amount: 10000,
      work_items: [makeItem("x", 500, 1)],
      working_days: MARCH_20_DAYS,
      max_hours_per_day: 8,
    });
    expect(result.calculated_amount).toBeGreaterThanOrEqual(9900);
    expect(result.calculated_amount).toBeLessThanOrEqual(10100);
  });
});

// ── TEST 9 — roundToHalf ─────────────────────────────────────────────────

describe("roundToHalf", () => {
  it.each([
    [0.0, 0.0],
    [0.24, 0.0],
    [0.25, 0.5],
    [0.5, 0.5],
    [0.74, 0.5],
    [0.75, 1.0],
    [1.0, 1.0],
    [7.25, 7.5],
    [7.74, 7.5],
    [7.75, 8.0],
  ])("roundToHalf(%f) = %f", (input, expected) => {
    expect(roundToHalf(input)).toBe(expected);
  });
});
