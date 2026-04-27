import type { FacetState } from './types';
import { recommend } from './recommender';
import { questions } from './data/questions';
import { flavorProfiles } from './data/mappings';

export interface DrinkCoverage {
  drinkId: string;
  drinkName: string;
  count: number;
  /** Share of total enumerated paths, in [0, 1]. */
  share: number;
}

export interface CoverageReport {
  totalPaths: number;
  perDrink: DrinkCoverage[];
}

function enumerateStates(): FacetState[] {
  const out: FacetState[] = [];
  function walk(qIdx: number, acc: Partial<FacetState>): void {
    if (qIdx >= questions.length) {
      const flavorNote = acc.flavorNote!;
      out.push({ ...acc, roast: flavorProfiles[flavorNote].defaultRoast } as FacetState);
      return;
    }
    for (const answer of questions[qIdx].answers) {
      const merged = { ...acc, ...answer.mutations };
      if (answer.followUp) {
        for (const fu of answer.followUp.answers) {
          walk(qIdx + 1, { ...merged, ...fu.mutations });
        }
      } else {
        walk(qIdx + 1, merged);
      }
    }
  }
  walk(0, {});
  return out;
}

/**
 * Enumerates every quiz answer path, runs the recommender on each, and
 * reports how often each drink wins. Pure and deterministic.
 */
export function computeCoverage(): CoverageReport {
  const states = enumerateStates();
  const counts = new Map<string, { name: string; count: number }>();
  for (const state of states) {
    const { drink } = recommend(state);
    const entry = counts.get(drink.id);
    if (entry) entry.count += 1;
    else counts.set(drink.id, { name: drink.name, count: 1 });
  }
  const total = states.length;
  const perDrink: DrinkCoverage[] = Array.from(counts.entries())
    .map(([drinkId, { name, count }]) => ({
      drinkId,
      drinkName: name,
      count,
      share: count / total,
    }))
    .sort((a, b) => b.count - a.count);
  return { totalPaths: total, perDrink };
}
