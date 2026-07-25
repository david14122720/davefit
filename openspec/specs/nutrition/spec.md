# Nutrition Specification

## Purpose

Recipe catalog page displaying meals from the `recetas` table with search, filtering, difficulty/time controls, category tabs, daily tips, and subscription CTA.

## Requirements

### Requirement: Recipe Catalog Display

The system MUST render a paginated grid of recipe cards sourced from `recetas` table.

#### Scenario: Catalog loads on mount

- GIVEN the user navigates to `/nutricion`
- WHEN the page mounts
- THEN a GET request to `recetas` table fetches all rows with public RLS
- AND cards render in a responsive grid (1 col mobile, 2 col tablet, 3 col desktop)

#### Scenario: Empty catalog

- GIVEN the `recetas` table returns zero rows
- WHEN the page renders
- THEN an empty state with "No hay recetas disponibles" message and illustration is shown

### Requirement: Search and Filter

The system SHALL provide real-time search across recipe `nombre` and `descripcion`, plus filter controls.

#### Scenario: Text search narrows results

- GIVEN the catalog has loaded with recipes
- WHEN the user types in the search bar
- THEN results filter client-side to match `nombre` or `descripcion` (case-insensitive)
- AND a result count indicator updates

#### Scenario: Category tabs filter by meal type

- GIVEN recipes exist in the catalog
- WHEN the user clicks a category tab (Desayuno/Almuerzo/Cena/Snacks Proteicos/Vegano)
- THEN results filter to matching `categoria` field
- AND active tab highlights with green (#13ec5b) accent

#### Scenario: Difficulty/time filters

- GIVEN recipes are displayed
- WHEN the user selects difficulty (`facil`, `intermedio`, `dificil`) or max prep time
- THEN the grid filters accordingly
- AND multiple filters compose (AND logic)

### Requirement: Recipe Card Display

Each recipe card MUST show: image, title, short description, calories, prep time, bookmark icon.

#### Scenario: Card renders all fields

- GIVEN a recipe with all fields populated
- WHEN it renders in the grid
- THEN `imagen_url` shows as cover, `nombre` as title, `descripcion` truncated (2 lines), `calorias` and `tiempo_preparacion` as metadata badges
- AND a bookmark button exists (local storage, no backend)

#### Scenario: Missing image fallback

- GIVEN a recipe with null `imagen_url`
- WHEN the card renders
- THEN a gradient placeholder with food icon is shown

### Requirement: Tip del Día Widget

The system SHALL display one random daily tip on the nutrition page.

#### Scenario: Tip renders from static pool

- GIVEN the nutrition page loads
- THEN one tip from a predefined array of nutrition tips is selected pseudo-randomly by date seed
- AND it renders as a styled card with icon, title, and description

### Requirement: Subscription CTA

The system SHALL display a subscription call-to-action banner.

#### Scenario: CTA visible for all users

- GIVEN the nutrition page has loaded
- THEN a "Nutrición Premium" banner with feature list and "Prueba Gratis" button is visible below the tip widget
- AND clicking the button opens a subscription modal or links to /register

### Requirement: Data Source

The `recetas` table MUST already exist in InsForge with public SELECT RLS policy.

#### Scenario: Schema verified

- GIVEN the `recetas` table exists (confirmed in InsForge schema)
- THEN the NutritionPage queries `.from('recetas').select('*').order('created_at', { ascending: false })`
- AND the response includes: id, nombre, descripcion, ingredientes, instrucciones, tiempo_preparacion, dificultad, calorias, proteinas, carbos, grasas, imagen_url, categoria
