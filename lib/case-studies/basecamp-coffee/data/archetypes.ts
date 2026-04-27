import type { Archetype } from '../types';

// Locked in /_design/REQUIREMENTS.md (lesson 2.2)
export const archetypes: Archetype[] = [
  {
    id: 'espresso',
    slug: 'PURIST',
    name: 'The Purist',
    descriptor: 'Knows what they want before they walk in. No frills — just the shot, black and brilliant.',
  },
  {
    id: 'macchiato',
    slug: 'MARGIN-NOTE',
    name: 'The Margin Note',
    descriptor: 'Adds one small, perfect touch to everything. Quietly opinionated.',
  },
  {
    id: 'cortado',
    slug: 'EVEN-KEEL',
    name: 'The Even Keel',
    descriptor: 'Thrives in balance. Equal parts, steady hands, steady taste.',
  },
  {
    id: 'cappuccino',
    slug: 'OLD-SOUL',
    name: 'The Old Soul',
    descriptor: 'Classics for a reason. Reads paper books. Knows the baristas by name.',
  },
  {
    id: 'latte',
    slug: 'STEADY',
    name: 'The Steady',
    descriptor: 'Reliable, warm, daily. The friend who shows up.',
  },
  {
    id: 'mocha',
    slug: 'WARM-THROWS',
    name: 'Warm Throws',
    descriptor: 'Comfort in a cup. Rainy afternoons, deep couches, chocolate that actually tastes like chocolate.',
  },
  {
    id: 'americano',
    slug: 'LONG-WALK',
    name: 'The Long Walk',
    descriptor: 'Space to think. Wide open drinks, wide open hours.',
  },
  {
    id: 'drip',
    slug: 'REGULAR',
    name: 'The Regular',
    descriptor: 'First one in, last to leave. The heartbeat of the shop.',
  },
  {
    id: 'pour-over',
    slug: 'RITUALIST',
    name: 'The Ritualist',
    descriptor: 'Slow pours, careful counts, patient eyes. The drink is half the point; the moment is the other half.',
  },
  {
    id: 'red-eye',
    slug: 'SECOND-WIND',
    name: 'Second Wind',
    descriptor: 'Mission mode. Double-shot determination. Catches the sunrise on the way home sometimes.',
  },
  {
    id: 'cold-brew',
    slug: 'SLOW-BURN',
    name: 'The Slow Burn',
    descriptor: "Quiet energy. Doesn't peak — just holds, all day long.",
  },
  {
    id: 'nitro-cold-brew',
    slug: 'VELVET',
    name: 'The Velvet',
    descriptor: "Smooth before it's ordered. Creamy texture, cool confidence.",
  },
  {
    id: 'cold-brew-tonic',
    slug: 'SUN-SEASON',
    name: 'Sun Season',
    descriptor: 'Windows down, patio found. Citrusy, bubbly, a little unexpected.',
  },
  {
    id: 'matcha-latte',
    slug: 'STILL-WATER',
    name: 'Still Water',
    descriptor: 'Grounded in ceremony. Mornings begin slow, green, and mindful.',
  },
  {
    id: 'chai-latte',
    slug: 'SPICE-KEEPER',
    name: 'Spice Keeper',
    descriptor: 'Warm-hearted, globally-rooted. Cardamom on their hands, stories in their bag.',
  },
  {
    id: 'affogato',
    slug: 'SWEET-CEREMONY',
    name: 'Sweet Ceremony',
    descriptor: 'Dessert is a discipline. Special occasions on regular Tuesdays.',
  },
];

export function archetypeById(id: string): Archetype | undefined {
  return archetypes.find((a) => a.id === id);
}
