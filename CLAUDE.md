# TimeSheet Reporter

Aplikacja do generowania miesięcznych raportów Time Sheet dla zleceniobiorców.

## Architektura

- **Framework:** Next.js 14 App Router + TypeScript
- **Styling:** Tailwind CSS v3 (nie v4!)
- **Backend:** Supabase — schema `timesheet` (wszystkie tabele, NIE `public`)
- **Auth:** Supabase Auth + custom JWT hook wstrzykujący rolę

## Struktura katalogów

```
app/
  (app)/            # Trasy użytkownika (auth required)
    raporty/        # Lista i podgląd raportów
    schematy/       # Zarządzanie schematami pracy
    profil/         # Profil zleceniobiorcy
  (admin)/admin/    # Panel admina (rola 'admin' wymagana)
    raporty/        # Raporty wszystkich użytkowników
    uzytkownicy/    # Zarządzanie użytkownikami
    ustawienia/     # Dane zleceniodawcy (drukowane na raportach)
  actions/          # Server Actions użytkownika
  api/              # Route Handlers (PDF, XLSX export)
components/
  generator/        # Komponenty kreatora raportu (wizard)
  report/           # Komponenty tabeli raportu (ReportTable, ReportCell...)
  schema/           # Komponenty zarządzania schematami
  layout/           # Sidebar, Breadcrumbs
  ui/               # Prymitywy UI (Button, Input, Dialog, Toast...)
lib/
  algorithm/        # ⚠️ NIE MODYFIKOWAĆ — logika podziału godzin
  export/           # Generatory PDF (toPdf.tsx) i XLSX (toXlsx.ts)
  supabase/         # Klienty Supabase (server, client, admin)
  utils/            # Formattery (currency, dates, rounding)
  auth/             # Sprawdzanie roli (getUserRole, isAdmin)
```

## Kluczowe konwencje

### Supabase
- Wszystkie tabele w schemacie `timesheet`: `.schema("timesheet").from(...)`
- Server-side: `lib/supabase/server.ts` (async, cookies)
- Client-side: `lib/supabase/client.ts` (singleton)
- Admin (omija RLS): `lib/supabase/admin.ts` (service role)

### Server Actions
- Lokalizacja: `app/actions/` (user) i `app/(admin)/actions/` (admin)
- Zawsze `"use server"` na górze
- Zwracaj `{ error?: string }` lub `{ id: string }` — nie rzucaj wyjątków

### Role użytkowników
- `'user'` — domyślna rola
- `'admin'` — dostęp do `/admin/*`
- Rola w `session.user.app_metadata.user_role` (wstrzyknięta przez DB hook)
- Sprawdzenie: `isAdmin(supabase)` z `lib/auth/roles.ts`

### Eksport
- Pojedynczy PDF: `lib/export/toPdf.tsx` → `generatePdf(report, entries)`
- Pojedynczy XLSX: `lib/export/toXlsx.ts` → `generateXlsx(report, entries)`
- Zbiorczy XLSX (admin): `generateBulkXlsx(reports)` z tego samego pliku
- Route handlery: `app/api/reports/[id]/pdf|xlsx/route.ts` i `app/api/admin/reports/export/route.ts`

### Tabela raportu
- Komponent: `components/report/ReportTable.tsx`
- Prop `readOnly={true}` — tryb podglądu (bez edycji inline)
- Prop `onUpdateEntry` — opcjonalne, no-op gdy readOnly

### Typy danych
```typescript
// Wpis raportu (używany w algorytmie i komponentach)
type EditableEntry = DayEntry & { is_manually_edited: boolean }
// DayEntry z lib/algorithm/types.ts:
// { work_date, day_of_week, week_number, work_item_id, description, category, hours, hourly_rate, line_total, sort_order }
```

## Uruchomienie

```bash
npm run dev        # development (port 3000)
npm run build      # production build
npx vitest run     # testy algorytmu
```

## Zmienne środowiskowe (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Ważne uwagi

- **NIE modyfikuj** `lib/algorithm/` — core logika podziału godzin, ma testy
- **NIE twórz** migracji SQL w kodzie — schemat zarządzany przez Supabase Dashboard
- Używaj `formatPLN()` z `lib/utils/currency.ts` do wyświetlania kwot PLN
- Używaj `formatDatePL()` z `lib/utils/dates.ts` do dat w formacie DD.MM.YYYY
- `@react-pdf/renderer` wymaga `serverComponentsExternalPackages` w `next.config.mjs`
