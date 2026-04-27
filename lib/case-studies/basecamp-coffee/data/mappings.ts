import type { FlavorNote, Roast } from '../types';

/**
 * Flavor note → (bean family, default roast, tasting-notes copy).
 * The roast here is the *default* when the user hasn't explicitly
 * overridden roast in the post-quiz editor.
 *
 * Locked in /_design/REQUIREMENTS.md (lesson 2.2).
 */
interface FlavorProfile {
  bean: string;
  defaultRoast: Roast;
  notes: string;
}

export const flavorProfiles: Record<FlavorNote, FlavorProfile> = {
  fruity: {
    bean: 'Ethiopian Yirgacheffe',
    defaultRoast: 'light',
    notes: 'Citrus, berry, tea-like brightness',
  },
  floral: {
    bean: 'Kenyan AA',
    defaultRoast: 'light',
    notes: 'Jasmine, honeysuckle, stone fruit',
  },
  chocolate: {
    bean: 'Brazilian Cerrado',
    defaultRoast: 'medium',
    notes: 'Cocoa, dark chocolate, smooth finish',
  },
  nutty: {
    bean: 'Colombian Supremo',
    defaultRoast: 'medium',
    notes: 'Almond, hazelnut, toasted caramel',
  },
  caramel: {
    bean: 'Guatemala Antigua',
    defaultRoast: 'medium',
    notes: 'Brown sugar, molasses, maple',
  },
  spicy: {
    bean: 'House chai blend',
    defaultRoast: 'dark',
    notes: 'Cardamom, cinnamon, ginger, clove',
  },
  earthy: {
    bean: 'Sumatran Mandheling',
    defaultRoast: 'dark',
    notes: 'Cedar, tobacco, dark woods',
  },
};

/**
 * Tea-specific overrides for the bean/leaf display on tea-based drinks.
 * For matcha + chai, the "bean" field shows a tea-appropriate phrasing.
 */
export function leafForTea(drinkId: string): string | null {
  if (drinkId === 'matcha-latte') return 'Ceremonial-grade matcha';
  if (drinkId === 'chai-latte') return 'House chai blend (cardamom-forward)';
  return null;
}
