# Workout Practice Specification

> New capability spec for change `workout-practice-descripcion`. All requirements are ADDED (no prior spec exists).

## Purpose

Defines the workout practice player (`/rutinas/practicar/:rutinaId`) render contract for `ejercicios.descripcion`: the exercise overview MUST be visible inline (clamped) during practice and in full in the "Guía de Operación" modal, with explicit absent-description behavior.

## Non-Goals

- No `RoutinesPage` change (preview `select` stays lean)
- No backend, query, or state changes (`select('*')` already returns the field)
- No media/visual changes
- No changes to `instrucciones` rendering or its "Sin instrucciones adicionales" fallback

## Requirements

### Requirement: R1 — Inline Description in Media Overlay

The practice player MUST render the current exercise's `descripcion` inside the media bottom-gradient overlay, below the muscle-group badge, clamped to a maximum of two lines, whenever `descripcion` is a non-empty string.

#### Scenario: Description present

- GIVEN an exercise whose `descripcion` is a non-empty string
- WHEN the practice player renders the media overlay
- THEN the description text appears below the muscle-group badge
- AND the text is visually clamped to a maximum of 2 lines

#### Scenario: Description absent

- GIVEN an exercise whose `descripcion` is null or an empty string
- WHEN the practice player renders the media overlay
- THEN no description element renders — no empty block or whitespace

### Requirement: R2 — Full Description in Guide Modal

The practice player MUST render the full `descripcion` at the top of the "Guía de Operación" modal, before the numbered `instrucciones` steps, whenever `descripcion` is a non-empty string.

#### Scenario: Description present

- GIVEN an exercise whose `descripcion` is a non-empty string
- WHEN the user opens the Info modal
- THEN the full, unclamped description renders above the numbered steps
- AND the numbered steps continue to render below it

#### Scenario: Description absent

- GIVEN an exercise whose `descripcion` is null or an empty string
- WHEN the user opens the Info modal
- THEN no description block renders
- AND the numbered steps (or the "Sin instrucciones adicionales" fallback) remain unchanged

### Requirement: R3 — Automated Test Coverage

The change MUST add `WorkoutPracticePage.test.tsx` covering description-present and description-absent rendering, and the full unit suite MUST stay green.

#### Scenario: Present-description test

- GIVEN an exercise with a non-empty `descripcion`
- WHEN the test renders the practice player
- THEN it asserts the description appears in the overlay and in the Info modal

#### Scenario: Absent-description test

- GIVEN an exercise with null or empty `descripcion`
- WHEN the test renders the practice player
- THEN it asserts no description element renders in the overlay or the Info modal

#### Scenario: Full suite stays green

- GIVEN the new test file and the existing suite
- WHEN `npx vitest run` executes
- THEN all tests pass with no regressions
