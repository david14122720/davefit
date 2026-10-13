# Data Access Security Specification

> New capability spec for change `hardening-seguridad`. Full spec (no prior main spec). Closes the verified PII leak: RLS policies `anon_read_leaderboard_perfiles`, `perfiles_read_authenticated`, `anon_read_leaderboard_stats` and `"Users can read all stats"` (SELECT `qual=true`) exposed ALL columns of `perfiles`/`user_stats` (email, fecha_nacimiento, peso_actual, weekly_score…) to anon and any authenticated user.

## Purpose

Restrict column-level exposure of `perfiles` and `user_stats` via public views + an owner policy, while keeping the public leaderboard (`/app/comunidad`), the landing stats, and the Dashboard working. RLS is row-level only — restricting column access requires views (Approach A, per exploration).

## Requirements

### Requirement: DAS-1 — Restricted Public Views

The system MUST create views exposing only the leaderboard columns, with SELECT granted to `anon` and `authenticated`:

| View | Columns (exactly) |
|------|-------------------|
| `perfiles_public` | `id`, `nombre_completo`, `avatar_url` |
| `user_stats_public` | `user_id`, `xp_total`, `total_workouts`, `dias_racha` |

The views MUST NOT expose `email`, `fecha_nacimiento`, `peso_actual` (perfiles) nor `weekly_score`, `monthly_score`, `ultimo_entreno`, `longest_streak`, `racha_bonus`, `nivel` (user_stats).

#### Scenario: View column sets are minimal

- GIVEN the migration applied
- WHEN listing `information_schema.columns` for both views
- THEN column sets match the table exactly

#### Scenario: Anon reads leaderboard columns via view

- GIVEN the public anon key
- WHEN selecting `*` from `perfiles_public` and `user_stats_public`
- THEN rows return containing only the public columns

### Requirement: DAS-2 — Broad Policies Dropped, Owner Policy Created

The SAME migration MUST drop the four broad policies and create the owner policy:

- DROP `anon_read_leaderboard_perfiles` and `perfiles_read_authenticated` on `perfiles`
- DROP `anon_read_leaderboard_stats` and `"Users can read all stats"` on `user_stats`
- CREATE policy `user_stats_owner` ON `user_stats` FOR SELECT USING (`user_id = auth.uid()`)

(Owner access to `perfiles` stays covered by existing `perfiles_owner_all_v3`; admin role checks `EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')` still read only the own row.)

#### Scenario: Owner reads own full stats row

- GIVEN authenticated user U with a `user_stats` row (`user_id` = U)
- WHEN selecting `*` from `user_stats` with U's token
- THEN the full row (including `weekly_score`, `nivel`) returns

#### Scenario: Cross-user stats read returns zero rows

- GIVEN authenticated user U1
- WHEN selecting `user_stats` rows where `user_id` = U2 (≠ U1)
- THEN 0 rows return, no error

#### Scenario: Admin role subqueries still pass

- GIVEN an admin (`rol='admin'`) logged in
- WHEN any RLS policy evaluates `EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')`
- THEN the check passes (own-row read covered by owner policy)

### Requirement: DAS-3 — Public Leaderboard Keeps Working

`ComunidadPage` MUST query `perfiles_public` (`id, nombre_completo, avatar_url`) and `user_stats_public` (`user_id, xp_total, total_workouts, dias_racha`) instead of the base tables. Reading `dias_racha` for the streak is mandatory (the view exposes only that column — this opportunistically fixes the dead `streak_days` reference).

#### Scenario: Anonymous leaderboard loads

- GIVEN a visitor without session on `/app/comunidad`
- WHEN the leaderboard queries run against the views
- THEN rank, username, avatar, score and workouts render; no error state

#### Scenario: Streak comes from the view column

- GIVEN `user_stats_public.dias_racha` = 5
- WHEN ComunidadPage builds the leaderboard row
- THEN the streak shows 5 (previously always 0 via dead `streak_days`)

### Requirement: DAS-4 — Dashboard Reads Own Row

After the migration, `getUserStats` MUST keep returning the current user's stats via `user_stats_owner`.

#### Scenario: Dashboard stats load after migration

- GIVEN a logged-in user with stats
- WHEN the Dashboard requests the user's stats row
- THEN stats render with no permission-denied error

### Requirement: DAS-5 — Anonymous MUST NOT Read PII

The anon role MUST NOT read `email` or any sensitive column of `perfiles`/`user_stats`, neither via the base tables nor via the views.

#### Scenario: Direct table select of email is denied

- GIVEN the anon key
- WHEN selecting `email` from `perfiles`
- THEN PostgREST returns no rows/permission denied; no email bytes leak

#### Scenario: View has no email column

- GIVEN the anon key
- WHEN selecting `email` from `perfiles_public`
- THEN the query errors: column does not exist

### Requirement: DAS-6 — Authenticated MUST NOT Read Others' PII

An authenticated user MUST NOT read another user's `email`/PII from `perfiles` (own row remains readable via `perfiles_owner_all_v3`).

#### Scenario: Cross-user email probe returns nothing

- GIVEN authenticated U1 and a profile of U2 (≠ U1)
- WHEN selecting `email` from `perfiles` with U1's token
- THEN only U1's own row is visible; U2's email is never returned

### Requirement: DAS-7 — Landing Stats Count via View

`src/pages/api/stats.ts` MUST count users against `perfiles_public` (not `perfiles`).

#### Scenario: /api/stats still reports users

- GIVEN the migration applied
- WHEN GET `/api/stats` with the anon client
- THEN `users` equals the profile count (from the view) and the endpoint returns 200

### Requirement: DAS-8 — Accepted Risks Documented

The change MUST document (spec + verify trace, replacing `auditoria_seguridad.md`, which is deleted): rate-limit client-side accepted (5 intentos/10 min, localStorage, eludible — real defense requires platform-level or Astro-proxy rate limiting, out of scope) and isAdmin UI-only accepted (UI hiding only; data access enforced server-side by `verifyAdmin()` per request).

#### Scenario: Both tradeoffs are traceable

- GIVEN the archived change
- WHEN reading the spec and verify report
- THEN both accepted risks appear with their mitigations

## Non-Goals

- REVOKE per-column (`email`): row-independent, would break the owner's own-row reads — rejected in exploration
- RPC `get_leaderboard` (SECURITY DEFINER): valid alternative, more code — not chosen
- Rate-limit server-side / Astro auth proxy; isAdmin client-side enforcement (accepted risks, DAS-8)
- `streak_days` refactor beyond the view-driven rename (DAS-3)
