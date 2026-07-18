import { describe, expect, it } from "vitest";
import { getWorkingDaysInMonth } from "../helpers";
import {
  runMultiSchemaAlgorithm,
  schemaAvgRate,
  roundAmountToHundred,
} from "../multi";
import type {
  MultiAlgorithmInput,
  SchemaSelection,
  WorkItem,
} from "../types";

// ── Fixtures ──────────────────────────────────────────────────────────────

function makeItem(
  id: string,
  rate: number,
  proportion = 1,
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

function makeSchema(
  id: string,
  items: WorkItem[],
  days: string[],
  weight?: number
): SchemaSelection {
  return {
    schema_id: id,
    schema_name: `Schemat ${id}`,
    work_items: items,
    working_days: days,
    weight,
  };
}

// Marzec 2026: 22 dni pon–pt, 4 soboty
const WEEKDAYS = getWorkingDaysInMonth(2026, 3, [1, 2, 3, 4, 5]); // 22
const SATURDAYS = getWorkingDaysInMonth(2026, 3, [6]); // 4
const DAYS_20 = WEEKDAYS.slice(0, 20);

function dayTotals(entries: { work_date: string; hours: number }[]) {
  const map = new Map<string, number>();
  for (const e of entries) {
    map.set(e.work_date, (map.get(e.work_date) ?? 0) + e.hours);
  }
  return map;
}

// ── KASKADA ───────────────────────────────────────────────────────────────

describe("KASKADA — kwota mieści się w schemacie 1", () => {
  // 20 dni × 8 h = 160 h pojemności; potrzeba 10000/500 = 20 h
  const input: MultiAlgorithmInput = {
    target_amount: 10000,
    mode: "cascade",
    schemas: [
      makeSchema("s1", [makeItem("a", 500)], DAYS_20),
      makeSchema("s2", [makeItem("b", 300)], DAYS_20),
    ],
    max_hours_per_day: 8,
  };

  it("schemat 2 w ogóle nie jest użyty", () => {
    const r = runMultiSchemaAlgorithm(input);
    const s2 = r.schema_allocations.find((a) => a.schema_id === "s2")!;
    expect(s2.hours_total).toBe(0);
    expect(r.entries.every((e) => e.schema_id === "s1")).toBe(true);
  });

  it("calculated_amount ∈ [9900; 10100], brak ostrzeżeń", () => {
    const r = runMultiSchemaAlgorithm(input);
    expect(r.calculated_amount).toBeGreaterThanOrEqual(9900);
    expect(r.calculated_amount).toBeLessThanOrEqual(10100);
    expect(r.warnings).toHaveLength(0);
  });
});

describe("KASKADA — przelanie na schemat 2 (inne dni robocze)", () => {
  // Schemat 1: pon–pt (20 dni × 8 h = 160 h × 100 zł = 16 000 zł max)
  // Schemat 2: soboty (4 dni × 8 h = 32 h × 200 zł = 6 400 zł max)
  const input: MultiAlgorithmInput = {
    target_amount: 20000,
    mode: "cascade",
    schemas: [
      makeSchema("s1", [makeItem("a", 100)], DAYS_20),
      makeSchema("s2", [makeItem("b", 200)], SATURDAYS),
    ],
    max_hours_per_day: 8,
  };

  it("schemat 1 dobity do pełna (160 h), schemat 2 dopełnia ~4000 zł", () => {
    const r = runMultiSchemaAlgorithm(input);
    const a1 = r.schema_allocations.find((a) => a.schema_id === "s1")!;
    const a2 = r.schema_allocations.find((a) => a.schema_id === "s2")!;
    expect(a1.hours_total).toBe(160);
    expect(a1.amount_total).toBe(16000);
    // pozostałe 4000 zł / 200 zł/h = 20 h na sobotach
    expect(a2.hours_total).toBe(20);
    expect(r.calculated_amount).toBe(20000);
    expect(r.warnings).toHaveLength(0);
  });

  it("wpisy schematu 2 tylko w soboty", () => {
    const r = runMultiSchemaAlgorithm(input);
    r.entries
      .filter((e) => e.schema_id === "s2")
      .forEach((e) => expect(SATURDAYS).toContain(e.work_date));
  });
});

describe("KASKADA — wspólne dni: schemat 2 nie ma miejsca, ostrzeżenie", () => {
  // Oba schematy na tych samych 20 dniach; pojemność 160 h.
  // Cel 30 000 przy 150 zł/h = 200 h > 160 h → schemat 1 bierze wszystko,
  // schemat 2 nie ma wolnych dni → ostrzeżenie o brakującej kwocie.
  const input: MultiAlgorithmInput = {
    target_amount: 30000,
    mode: "cascade",
    schemas: [
      makeSchema("s1", [makeItem("a", 150)], DAYS_20),
      makeSchema("s2", [makeItem("b", 120)], DAYS_20),
    ],
    max_hours_per_day: 8,
  };

  it("schemat 1 = 160 h, schemat 2 = 0 h, jest ostrzeżenie", () => {
    const r = runMultiSchemaAlgorithm(input);
    const a1 = r.schema_allocations.find((a) => a.schema_id === "s1")!;
    const a2 = r.schema_allocations.find((a) => a.schema_id === "s2")!;
    expect(a1.hours_total).toBe(160);
    expect(a2.hours_total).toBe(0);
    expect(r.calculated_amount).toBe(24000);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe("KASKADA — jeden schemat zachowuje się jak dotychczasowy algorytm", () => {
  const input: MultiAlgorithmInput = {
    target_amount: 10000,
    mode: "cascade",
    schemas: [
      makeSchema("s1", [makeItem("a", 300), makeItem("b", 500)], DAYS_20),
    ],
    max_hours_per_day: 8,
  };

  it("calculated ∈ [9900; 10100], limit dzienny zachowany", () => {
    const r = runMultiSchemaAlgorithm(input);
    expect(Math.abs(r.calculated_amount - 10000)).toBeLessThanOrEqual(100);
    Array.from(dayTotals(r.entries).values()).forEach((total) => {
      expect(total).toBeLessThanOrEqual(8);
    });
  });

  it("proporcje pozycji zachowane (~50/50 godzin przy prop 1:1)", () => {
    const r = runMultiSchemaAlgorithm(input);
    const pa = r.proposals.find((p) => p.work_item_id === "a")!;
    const pb = r.proposals.find((p) => p.work_item_id === "b")!;
    expect(Math.abs(pa.hours_total - pb.hours_total)).toBeLessThanOrEqual(0.5);
  });
});

// ── WAGI PROCENTOWE ───────────────────────────────────────────────────────

describe("WAGI — 50/25/25 na wspólnych dniach", () => {
  // effRate = 0.5×150 + 0.25×120 + 0.25×100 = 130 zł/h
  // totalHours = 30000/130 ≈ 230,5 h; pojemność 22 dni × 12 h = 264 h — starcza
  const ALL_22 = WEEKDAYS;
  const input: MultiAlgorithmInput = {
    target_amount: 30000,
    mode: "weights",
    schemas: [
      makeSchema("s1", [makeItem("a", 150)], ALL_22, 50),
      makeSchema("s2", [makeItem("b", 120)], ALL_22, 25),
      makeSchema("s3", [makeItem("c", 100)], ALL_22, 25),
    ],
    max_hours_per_day: 12,
  };

  it("podział godzin ~50/25/25 (tolerancja 1 h)", () => {
    const r = runMultiSchemaAlgorithm(input);
    const [a1, a2, a3] = ["s1", "s2", "s3"].map(
      (id) => r.schema_allocations.find((a) => a.schema_id === id)!
    );
    expect(Math.abs(a1.hours_total - r.total_hours * 0.5)).toBeLessThanOrEqual(1);
    expect(Math.abs(a2.hours_total - r.total_hours * 0.25)).toBeLessThanOrEqual(1);
    expect(Math.abs(a3.hours_total - r.total_hours * 0.25)).toBeLessThanOrEqual(1);
  });

  it("kwota blisko celu (±150 zł ze względu na siatkę 0,5 h i 3 stawki)", () => {
    const r = runMultiSchemaAlgorithm(input);
    expect(Math.abs(r.calculated_amount - 30000)).toBeLessThanOrEqual(150);
  });

  it("mieszanie schematów w ramach jednego dnia występuje", () => {
    const r = runMultiSchemaAlgorithm(input);
    const schemasPerDay = new Map<string, Set<string>>();
    for (const e of r.entries) {
      const set = schemasPerDay.get(e.work_date) ?? new Set();
      set.add(e.schema_id!);
      schemasPerDay.set(e.work_date, set);
    }
    const mixedDays = Array.from(schemasPerDay.values()).filter(
      (s) => s.size > 1
    );
    expect(mixedDays.length).toBeGreaterThan(0);
  });

  it("limit dzienny nigdy nie przekroczony", () => {
    const r = runMultiSchemaAlgorithm(input);
    Array.from(dayTotals(r.entries).values()).forEach((total) => {
      expect(total).toBeLessThanOrEqual(12);
    });
  });
});

describe("WAGI — nadwyżka przelewana na pozostałe schematy", () => {
  // Schemat 1: tylko soboty (4 dni × 8 h = 32 h pojemności), waga 50%
  // totalHours: effRate = 0.5×100 + 0.5×100 = 100 → 16000/100 = 160 h
  // s1 powinien dostać 80 h, mieści 32 h → 48 h przelane do s2
  const input: MultiAlgorithmInput = {
    target_amount: 16000,
    mode: "weights",
    schemas: [
      makeSchema("s1", [makeItem("a", 100)], SATURDAYS, 50),
      makeSchema("s2", [makeItem("b", 100)], DAYS_20, 50),
    ],
    max_hours_per_day: 8,
  };

  it("s1 = 32 h (full pojemność), s2 = 128 h (80 + przelane 48)", () => {
    const r = runMultiSchemaAlgorithm(input);
    const a1 = r.schema_allocations.find((a) => a.schema_id === "s1")!;
    const a2 = r.schema_allocations.find((a) => a.schema_id === "s2")!;
    expect(a1.hours_total).toBe(32);
    expect(a2.hours_total).toBe(128);
    expect(r.calculated_amount).toBe(16000);
    expect(r.warnings).toHaveLength(0);
  });
});

describe("WAGI — pojemność całkowicie wyczerpana → ostrzeżenie", () => {
  // 5 dni × 8 h = 40 h pojemności łącznej, potrzeba 100 h
  const FIVE_DAYS = WEEKDAYS.slice(0, 5);
  const input: MultiAlgorithmInput = {
    target_amount: 10000, // 100 zł/h → 100 h
    mode: "weights",
    schemas: [
      makeSchema("s1", [makeItem("a", 100)], FIVE_DAYS, 60),
      makeSchema("s2", [makeItem("b", 100)], FIVE_DAYS, 40),
    ],
    max_hours_per_day: 8,
  };

  it("układa 40 h, reszta w ostrzeżeniu", () => {
    const r = runMultiSchemaAlgorithm(input);
    expect(r.total_hours).toBe(40);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe("WAGI — walidacja sumy 100%", () => {
  it("suma ≠ 100 rzuca błąd", () => {
    expect(() =>
      runMultiSchemaAlgorithm({
        target_amount: 10000,
        mode: "weights",
        schemas: [
          makeSchema("s1", [makeItem("a", 100)], DAYS_20, 60),
          makeSchema("s2", [makeItem("b", 100)], DAYS_20, 30),
        ],
        max_hours_per_day: 8,
      })
    ).toThrow("Suma wag");
  });
});

// ── NIEZMIENNIKI WSPÓLNE ──────────────────────────────────────────────────

describe("Niezmienniki — siatka 0,5 h i etykiety schematów", () => {
  const input: MultiAlgorithmInput = {
    target_amount: 25000,
    mode: "weights",
    schemas: [
      makeSchema("s1", [makeItem("a", 300, 2), makeItem("b", 500, 1)], DAYS_20, 70),
      makeSchema("s2", [makeItem("c", 200)], SATURDAYS.concat(DAYS_20.slice(0, 5)), 30),
    ],
    max_hours_per_day: 8,
  };

  it("wszystkie godziny wpisów są wielokrotnością 0,5", () => {
    const r = runMultiSchemaAlgorithm(input);
    r.entries.forEach((e) => expect((e.hours * 2) % 1).toBe(0));
  });

  it("każdy wpis ma schema_id i schema_name", () => {
    const r = runMultiSchemaAlgorithm(input);
    r.entries.forEach((e) => {
      expect(e.schema_id).toBeTruthy();
      expect(e.schema_name).toBeTruthy();
    });
  });

  it("wpisy schematu lądują wyłącznie na jego dniach roboczych", () => {
    const r = runMultiSchemaAlgorithm(input);
    const dayMap = new Map(
      input.schemas.map((s) => [s.schema_id, new Set(s.working_days)])
    );
    r.entries.forEach((e) => {
      expect(dayMap.get(e.schema_id!)!.has(e.work_date)).toBe(true);
    });
  });

  it("suma godzin per schemat = suma z allocations", () => {
    const r = runMultiSchemaAlgorithm(input);
    for (const alloc of r.schema_allocations) {
      const entrySum = r.entries
        .filter((e) => e.schema_id === alloc.schema_id)
        .reduce((s, e) => s + e.hours, 0);
      expect(Math.round(entrySum * 2) / 2).toBe(alloc.hours_total);
    }
  });
});

// ── Edge cases i helpery ──────────────────────────────────────────────────

describe("Edge cases", () => {
  it("target <= 0 rzuca błąd", () => {
    expect(() =>
      runMultiSchemaAlgorithm({
        target_amount: 0,
        mode: "cascade",
        schemas: [makeSchema("s1", [makeItem("a", 100)], DAYS_20)],
        max_hours_per_day: 8,
      })
    ).toThrow("Kwota docelowa");
  });

  it("brak schematów rzuca błąd", () => {
    expect(() =>
      runMultiSchemaAlgorithm({
        target_amount: 1000,
        mode: "cascade",
        schemas: [],
        max_hours_per_day: 8,
      })
    ).toThrow("co najmniej jeden schemat");
  });

  it("puste dni robocze rzucają błąd", () => {
    expect(() =>
      runMultiSchemaAlgorithm({
        target_amount: 1000,
        mode: "cascade",
        schemas: [makeSchema("s1", [makeItem("a", 100)], [])],
        max_hours_per_day: 8,
      })
    ).toThrow("dni roboczych");
  });
});

describe("Helpery", () => {
  it("schemaAvgRate liczy średnią ważoną proporcjami", () => {
    const s = makeSchema(
      "s",
      [makeItem("a", 100, 1), makeItem("b", 400, 3)],
      DAYS_20
    );
    // (1×100 + 3×400) / 4 = 325
    expect(schemaAvgRate(s)).toBe(325);
  });

  it.each([
    [7483, 7500],
    [7550, 7600],
    [7449, 7400],
    [100, 100],
    [49, 0],
  ])("roundAmountToHundred(%i) = %i", (input, expected) => {
    expect(roundAmountToHundred(input)).toBe(expected);
  });
});
