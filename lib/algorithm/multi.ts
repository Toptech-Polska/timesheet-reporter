import type {
  DayEntry,
  MultiAlgorithmInput,
  MultiAlgorithmResult,
  ProportionProposal,
  SchemaAllocation,
  SchemaSelection,
  WorkItem,
} from "./types";
import {
  filterActiveWorkItems,
  getDayName,
  getISOWeekNumber,
  getWorkingDaysInMonth,
  roundToHalf,
} from "./helpers";

/**
 * Buduje SchemaSelection[] dla silnika z danych kreatora:
 * - pozycje pracy filtrowane do aktywnych w danym miesiącu,
 * - dni robocze schematu = (dni z wzorca schematu) ∩ (dni zaznaczone przez użytkownika).
 */
export function buildSchemaSelections(
  picks: {
    schema_id: string;
    schema_name: string;
    working_days_of_week: number[];
    work_items: WorkItem[];
    weight?: number | null;
  }[],
  year: number,
  month: number,
  selectedDays: string[]
): SchemaSelection[] {
  const selected = new Set(selectedDays);
  return picks.map((p) => ({
    schema_id: p.schema_id,
    schema_name: p.schema_name,
    work_items: filterActiveWorkItems(p.work_items, year, month),
    working_days: getWorkingDaysInMonth(
      year,
      month,
      p.working_days_of_week
    ).filter((d) => selected.has(d)),
    weight: p.weight ?? undefined,
  }));
}

/**
 * Silnik wieloschematowy generatora raportu.
 *
 * Tryby:
 * - "cascade": schematy wypełniają raport wg priorytetu (kolejności na liście).
 *   Kolejny schemat wchodzi dopiero, gdy poprzedni wyczerpał pojemność swoich
 *   dni, a kwota docelowa nadal nie jest osiągnięta.
 * - "weights": łączne godziny raportu dzielone między schematy wg wag
 *   procentowych (suma = 100%). Nadwyżka ponad pojemność schematu przelewana
 *   proporcjonalnie do wag na pozostałe schematy z wolną pojemnością.
 *
 * Zasady wspólne:
 * - Jeden globalny limit godzin/dzień (max_hours_per_day) dla wszystkich
 *   schematów — w jednym dniu mogą mieszać się godziny z wielu schematów.
 * - Godziny zawsze w wielokrotnościach 0,5 h.
 * - Kwoty cząstkowe (cele per schemat) zaokrąglane do pełnych 100 zł.
 */

/** Zaokrąglenie kwoty do najbliższych pełnych 100 zł. */
export function roundAmountToHundred(n: number): number {
  return Math.round(n / 100) * 100;
}

/** Zaokrąglenie w dół do siatki 0,5 h (do przycinania przez pojemność). */
function floorToHalf(n: number): number {
  return Math.floor(n * 2 + 1e-9) / 2;
}

/** Średnia ważona stawka schematu (wagi = proporcje pozycji). */
export function schemaAvgRate(schema: SchemaSelection): number {
  const totalProp = schema.work_items.reduce((s, i) => s + i.proportion, 0);
  if (totalProp <= 0) return 0;
  return (
    schema.work_items.reduce((s, i) => s + i.proportion * i.hourly_rate, 0) /
    totalProp
  );
}

/** Mapa: data → wolne godziny (współdzielona między schematami). */
type FreeCapacity = Map<string, number>;

/** Klucz komórki przydziału: `${schemaIdx}|${workItemId}`. */
type CellKey = string;

interface PlacementState {
  /** date → cellKey → hours */
  byDate: Map<string, Map<CellKey, number>>;
  freeCap: FreeCapacity;
}

function initPlacement(
  allDays: string[],
  maxHoursPerDay: number
): PlacementState {
  const freeCap: FreeCapacity = new Map();
  for (const d of allDays) freeCap.set(d, maxHoursPerDay);
  return { byDate: new Map(), freeCap };
}

function addHours(
  state: PlacementState,
  date: string,
  cell: CellKey,
  hours: number
) {
  if (hours <= 0) return;
  let day = state.byDate.get(date);
  if (!day) {
    day = new Map();
    state.byDate.set(date, day);
  }
  day.set(cell, Math.round(((day.get(cell) ?? 0) + hours) * 2) / 2);
  state.freeCap.set(
    date,
    Math.round(((state.freeCap.get(date) ?? 0) - hours) * 2) / 2
  );
}

/** Suma wolnej pojemności na wskazanych dniach. */
function freeOn(state: PlacementState, days: string[]): number {
  return days.reduce((s, d) => s + (state.freeCap.get(d) ?? 0), 0);
}

/**
 * Rozkłada `hoursTotal` godzin danego schematu na jego dni robocze,
 * respektując wolną pojemność dni. Godziny dzielone między pozycje pracy
 * proporcjonalnie do ich `proportion`, każda pozycja rozprowadzana
 * równomiernie (adaptacyjnie) po dniach.
 *
 * Zwraca liczbę faktycznie ułożonych godzin (≤ hoursTotal).
 */
function placeSchemaHours(
  state: PlacementState,
  schema: SchemaSelection,
  schemaIdx: number,
  hoursTotal: number
): number {
  if (hoursTotal <= 0 || schema.working_days.length === 0) return 0;

  const days = [...schema.working_days].sort();
  const totalProp = schema.work_items.reduce((s, i) => s + i.proportion, 0);
  if (totalProp <= 0) return 0;

  // Cel godzinowy per pozycja (0,5-godzinna siatka)
  const itemTargets = schema.work_items.map((item) =>
    roundToHalf(hoursTotal * (item.proportion / totalProp))
  );

  let placedTotal = 0;

  for (let i = 0; i < schema.work_items.length; i++) {
    const item = schema.work_items[i];
    const cell: CellKey = `${schemaIdx}|${item.id}`;
    let remaining = itemTargets[i];

    // Przebieg 1: równomierny rozkład adaptacyjny z limitem pojemności dnia
    for (let d = 0; d < days.length && remaining > 0; d++) {
      const date = days[d];
      const daysLeft = days.length - d;
      const ideal = roundToHalf(remaining / daysLeft);
      const cap = floorToHalf(state.freeCap.get(date) ?? 0);
      const assign = Math.min(ideal, cap, remaining);
      if (assign > 0) {
        addHours(state, date, cell, assign);
        remaining = Math.round((remaining - assign) * 2) / 2;
        placedTotal += assign;
      }
    }

    // Przebieg 2: resztki (gdy wcześniejsze dni były zajęte) — dosypuj po 0,5 h
    // wszędzie tam, gdzie na dniach schematu została pojemność.
    while (remaining > 0) {
      let placed = false;
      for (const date of days) {
        if (remaining <= 0) break;
        if ((state.freeCap.get(date) ?? 0) >= 0.5) {
          addHours(state, date, cell, 0.5);
          remaining = Math.round((remaining - 0.5) * 2) / 2;
          placedTotal += 0.5;
          placed = true;
        }
      }
      if (!placed) break; // brak pojemności — resztka wraca do wołającego
    }
  }

  return Math.round(placedTotal * 2) / 2;
}

/** Buduje finalne DayEntry[] + proposals + allocations z PlacementState. */
function buildOutputs(
  state: PlacementState,
  schemas: SchemaSelection[]
): {
  entries: DayEntry[];
  proposals: ProportionProposal[];
  allocations: SchemaAllocation[];
} {
  // hours per (schemaIdx, itemId) — do proposals/allocations
  const cellHours = new Map<CellKey, number>();
  state.byDate.forEach((dayMap) => {
    dayMap.forEach((hours, cell) => {
      cellHours.set(cell, Math.round(((cellHours.get(cell) ?? 0) + hours) * 2) / 2);
    });
  });

  const entries: DayEntry[] = [];
  const dates = Array.from(state.byDate.keys()).sort();

  for (const date of dates) {
    const dayMap = state.byDate.get(date)!;
    // deterministyczna kolejność: schemat wg priorytetu, pozycja wg sort w schemacie
    const cells = Array.from(dayMap.keys()).sort((a, b) => {
      const [sa, ia] = splitCell(a, schemas);
      const [sb, ib] = splitCell(b, schemas);
      return sa - sb || ia - ib;
    });

    for (const cell of cells) {
      const hours = dayMap.get(cell)!;
      if (hours <= 0) continue;
      const [schemaIdx, itemIdx] = splitCell(cell, schemas);
      const schema = schemas[schemaIdx];
      const item = schema.work_items[itemIdx];
      entries.push({
        work_date: date,
        day_of_week: getDayName(date),
        week_number: getISOWeekNumber(date),
        work_item_id: item.id,
        description: item.description,
        category: item.category,
        hours,
        hourly_rate: item.hourly_rate,
        line_total: Math.round(hours * item.hourly_rate * 100) / 100,
        sort_order: schemaIdx * 100 + itemIdx,
        schema_id: schema.schema_id,
        schema_name: schema.schema_name,
      });
    }
  }

  const proposals: ProportionProposal[] = [];
  const allocations: SchemaAllocation[] = [];

  schemas.forEach((schema, schemaIdx) => {
    let schemaHours = 0;
    let schemaAmount = 0;
    schema.work_items.forEach((item) => {
      const hours = cellHours.get(`${schemaIdx}|${item.id}`) ?? 0;
      if (hours <= 0) return;
      const amount = Math.round(hours * item.hourly_rate * 100) / 100;
      schemaHours = Math.round((schemaHours + hours) * 2) / 2;
      schemaAmount = Math.round((schemaAmount + amount) * 100) / 100;
      proposals.push({
        work_item_id: item.id,
        description: item.description,
        category: item.category,
        hourly_rate: item.hourly_rate,
        proportion: item.proportion,
        hours_total: hours,
        amount_total: amount,
        schema_id: schema.schema_id,
        schema_name: schema.schema_name,
      });
    });
    allocations.push({
      schema_id: schema.schema_id,
      schema_name: schema.schema_name,
      hours_total: schemaHours,
      amount_total: schemaAmount,
      weight: schema.weight,
    });
  });

  return { entries, proposals, allocations };
}

function splitCell(cell: CellKey, schemas: SchemaSelection[]): [number, number] {
  const sep = cell.indexOf("|");
  const schemaIdx = Number(cell.slice(0, sep));
  const itemId = cell.slice(sep + 1);
  const itemIdx = schemas[schemaIdx].work_items.findIndex((i) => i.id === itemId);
  return [schemaIdx, itemIdx];
}

function validateInput(input: MultiAlgorithmInput) {
  if (input.target_amount <= 0) {
    throw new Error("Kwota docelowa musi być większa od 0");
  }
  if (input.schemas.length === 0) {
    throw new Error("Wybierz co najmniej jeden schemat");
  }
  const allDays = new Set(input.schemas.flatMap((s) => s.working_days));
  if (allDays.size === 0) {
    throw new Error("Lista dni roboczych jest pusta");
  }
  for (const s of input.schemas) {
    if (s.work_items.length === 0) {
      throw new Error(
        `Brak aktywnych pozycji pracy dla wybranego miesiąca (schemat: ${s.schema_name})`
      );
    }
  }
  if (input.mode === "weights") {
    const sum = input.schemas.reduce((s, x) => s + (x.weight ?? 0), 0);
    if (Math.round(sum) !== 100) {
      throw new Error("Suma wag procentowych schematów musi wynosić 100%");
    }
  }
}

/**
 * Tryb kaskady: schemat po schemacie wg priorytetu, dopóki kwota docelowa
 * nie zostanie osiągnięta lub pojemność się nie wyczerpie.
 */
function runCascade(
  input: MultiAlgorithmInput,
  state: PlacementState,
  warnings: string[]
) {
  let amountRemaining = input.target_amount;

  for (let s = 0; s < input.schemas.length; s++) {
    const schema = input.schemas[s];
    const avgRate = schemaAvgRate(schema);
    if (avgRate <= 0) continue;

    // Cel kwotowy dla tego schematu: pozostała kwota, zaokrąglona do 100 zł
    // (dla pierwszego schematu = pełna kwota docelowa raportu).
    const amountGoal =
      s === 0 ? amountRemaining : roundAmountToHundred(amountRemaining);
    if (amountGoal <= 0) break;

    const hoursNeeded = roundToHalf(amountGoal / avgRate);
    if (hoursNeeded <= 0) break;

    const capacity = freeOn(state, schema.working_days);
    const hoursToPlace = Math.min(hoursNeeded, floorToHalf(capacity));
    if (hoursToPlace <= 0) continue;

    placeSchemaHours(state, schema, s, hoursToPlace);

    // Faktyczna kwota po ułożeniu (liczona z komórek tego schematu)
    const placedAmount = amountOfSchema(state, s, schema);
    amountRemaining =
      Math.round((input.target_amount - totalAmount(state, input.schemas)) * 100) /
      100;
    void placedAmount;

    if (amountRemaining <= 0) break;
  }

  if (amountRemaining > 50) {
    warnings.push(
      `Wybrane schematy nie pokrywają pełnej kwoty — brakuje ok. ${amountRemaining.toFixed(
        2
      )} zł. Dodaj schemat, zwiększ liczbę dni lub limit godzin dziennie.`
    );
  }
}

function amountOfSchema(
  state: PlacementState,
  schemaIdx: number,
  schema: SchemaSelection
): number {
  let sum = 0;
  state.byDate.forEach((dayMap) => {
    dayMap.forEach((hours, cell) => {
      if (!cell.startsWith(`${schemaIdx}|`)) return;
      const itemId = cell.slice(cell.indexOf("|") + 1);
      const item = schema.work_items.find((i) => i.id === itemId);
      if (item) sum += hours * item.hourly_rate;
    });
  });
  return Math.round(sum * 100) / 100;
}

function totalAmount(
  state: PlacementState,
  schemas: SchemaSelection[]
): number {
  let sum = 0;
  schemas.forEach((schema, idx) => {
    sum += amountOfSchema(state, idx, schema);
  });
  return Math.round(sum * 100) / 100;
}

/**
 * Tryb wag procentowych: łączne godziny dzielone wg wag; nadwyżki ponad
 * pojemność schematu przelewane proporcjonalnie do wag pozostałych.
 */
function runWeights(
  input: MultiAlgorithmInput,
  state: PlacementState,
  warnings: string[]
) {
  const { schemas } = input;
  const fractions = schemas.map((s) => (s.weight ?? 0) / 100);

  // Efektywna stawka raportu = Σ (waga × śr. stawka schematu)
  const effRate = schemas.reduce(
    (sum, s, i) => sum + fractions[i] * schemaAvgRate(s),
    0
  );
  if (effRate <= 0) {
    throw new Error("Nie można wyliczyć stawki — sprawdź pozycje schematów");
  }

  const totalHours = roundToHalf(input.target_amount / effRate);

  // Godziny do ułożenia per schemat (0,5-godzinna siatka)
  const pending = schemas.map((_, i) => roundToHalf(fractions[i] * totalHours));

  const MAX_PASSES = 12;
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    // Ułóż, ile się da, w kolejności priorytetu
    for (let i = 0; i < schemas.length; i++) {
      if (pending[i] <= 0) continue;
      const placed = placeSchemaHours(state, schemas[i], i, pending[i]);
      pending[i] = Math.round((pending[i] - placed) * 2) / 2;
    }

    const stuckTotal = pending.reduce((s, p) => s + Math.max(p, 0), 0);
    if (stuckTotal <= 0) break;

    // Odbiorcy nadwyżki: schematy z wolną pojemnością na swoich dniach
    const recipients = schemas
      .map((s, i) => ({ i, free: freeOn(state, s.working_days) }))
      .filter((r) => r.free >= 0.5 && pending[r.i] <= 0);

    if (recipients.length === 0) {
      warnings.push(
        `Nie udało się rozłożyć ${stuckTotal} h — pojemność wybranych schematów wyczerpana. ` +
          `Dodaj dni robocze, schemat lub zwiększ limit godzin dziennie.`
      );
      break;
    }

    // Przelej nadwyżkę proporcjonalnie do wag odbiorców
    const weightSum = recipients.reduce(
      (s, r) => s + (schemas[r.i].weight ?? 0),
      0
    );
    let leftToGive = stuckTotal;
    recipients.forEach((r, idx) => {
      const share =
        idx === recipients.length - 1
          ? leftToGive // ostatni bierze resztę (domyka siatkę 0,5)
          : roundToHalf(stuckTotal * ((schemas[r.i].weight ?? 0) / weightSum));
      const grant = Math.min(share, leftToGive);
      pending[r.i] = Math.round((pending[r.i] + grant) * 2) / 2;
      leftToGive = Math.round((leftToGive - grant) * 2) / 2;
    });

    // Wyzeruj "utknięte" (ich godziny właśnie przelaliśmy)
    for (let i = 0; i < schemas.length; i++) {
      if (!recipients.some((r) => r.i === i)) pending[i] = 0;
    }
  }
}

/** Pełny przebieg silnika wieloschematowego. */
export function runMultiSchemaAlgorithm(
  input: MultiAlgorithmInput
): MultiAlgorithmResult {
  validateInput(input);

  const allDays = Array.from(
    new Set(input.schemas.flatMap((s) => s.working_days))
  ).sort();

  const state = initPlacement(allDays, input.max_hours_per_day);
  const warnings: string[] = [];

  if (input.mode === "weights" && input.schemas.length > 1) {
    runWeights(input, state, warnings);
  } else {
    runCascade(input, state, warnings);
  }

  const { entries, proposals, allocations } = buildOutputs(state, input.schemas);

  const calculated_amount =
    Math.round(entries.reduce((s, e) => s + e.line_total, 0) * 100) / 100;
  const total_hours =
    Math.round(entries.reduce((s, e) => s + e.hours, 0) * 2) / 2;

  return {
    mode: input.mode,
    proposals,
    entries,
    calculated_amount,
    target_amount: input.target_amount,
    amount_difference:
      Math.round((input.target_amount - calculated_amount) * 100) / 100,
    total_hours,
    schema_allocations: allocations,
    warnings,
  };
}
