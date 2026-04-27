import type {
  Drink,
  FacetState,
  Recommendation,
  Strength,
  Sweetness,
} from './types';
import { menu, drinkById } from './data/menu';
import { archetypes, archetypeById } from './data/archetypes';
import { flavorProfiles, leafForTea } from './data/mappings';

/**
 * Pure function. Given a full FacetState, returns the recommended
 * drink, its archetype, and enriched display metadata.
 *
 * Architectural promise from /_design/REQUIREMENTS.md:
 *   "Single source of truth = the facet state object. Quiz answers
 *    mutate it. User edits mutate it. Both routes → same recommender."
 *
 * Pure: no React, no DOM, no network. Fully testable.
 */
export function recommend(state: FacetState): Recommendation {
  const scored = menu
    .map((drink) => ({ drink, score: scoreDrink(drink, state) }))
    .sort((a, b) => b.score - a.score);

  const winner = scored[0].drink;

  const archetype =
    archetypeById(winner.id) ??
    // Defensive — every drink in menu.ts has a matching archetype by id.
    archetypes[0];

  const enrichment = enrich(winner, state);

  return { drink: winner, archetype, enrichment, state };
}

// ── Scoring ───────────────────────────────────────────────

const STRENGTH_ORDER: Strength[] = ['light', 'medium', 'bold', 'extra-bold'];
const SWEETNESS_ORDER: Sweetness[] = ['none', 'touch', 'sweet', 'indulgent'];

function scoreDrink(drink: Drink, state: FacetState): number {
  let score = 0;

  // 1. Style (preparation-method family) — the primary category match.
  //    Subsumes the old binary coffee-vs-tea check because tea-based style
  //    implies a non-coffee drink. High weight + hard penalty on mismatch.
  if (drink.family === state.style) score += 12;
  else score -= 30;

  // 2. Temperature — must support
  if (drink.temperatures.includes(state.temperature)) score += 6;
  else score -= 12;

  // 3. Strength — exact or adjacent
  if (drink.typicalStrength.includes(state.strength)) {
    score += 5;
  } else {
    const reqIdx = STRENGTH_ORDER.indexOf(state.strength);
    const adjacent = drink.typicalStrength.some(
      (s) => Math.abs(STRENGTH_ORDER.indexOf(s) - reqIdx) === 1,
    );
    if (adjacent) score += 2;
  }

  // 4. Milk compatibility
  if (state.milk === 'black') {
    if (drink.milkMode === 'black') score += 6;
    else if (drink.milkMode === 'milk-optional') score += 3;
    else score -= 4; // dairy-required drink, wants black
  } else {
    if (drink.milkMode === 'dairy-required') score += 6;
    else if (drink.milkMode === 'milk-optional') score += 4;
    else score -= 3; // black-only drink, wants milk
  }

  // 5. Sweetness — exact or adjacent
  if (drink.typicalSweetness.includes(state.sweetness)) {
    score += 4;
  } else {
    const reqIdx = SWEETNESS_ORDER.indexOf(state.sweetness);
    const adjacent = drink.typicalSweetness.some(
      (s) => Math.abs(SWEETNESS_ORDER.indexOf(s) - reqIdx) === 1,
    );
    if (adjacent) score += 1;
  }

  // 6. Flavor note — compatible or not
  if (drink.compatibleFlavors.includes(state.flavorNote)) score += 4;

  return score;
}

// ── Enrichment ────────────────────────────────────────────

function enrich(drink: Drink, state: FacetState) {
  // Tea-based drinks use a leaf descriptor instead of a bean/roast.
  const leaf = leafForTea(drink.id);
  if (leaf) {
    return {
      bean: leaf,
      roast: state.roast, // respected but not semantically used for tea
      notes: flavorProfiles[state.flavorNote].notes,
    };
  }

  const profile = flavorProfiles[state.flavorNote];
  return {
    bean: profile.bean,
    // User's explicit roast choice wins; the quiz seeds it from flavor default.
    roast: state.roast,
    notes: profile.notes,
  };
}

// Re-export small helpers that the UI will want
export { drinkById, archetypeById };
