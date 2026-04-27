/**
 * Style = the preparation-method family a drink belongs to.
 * Subsumes the old `coffeeVsNon` binary (a tea-based drink has style='tea-based').
 * Maps 1:1 to Drink.family — the facet the user picks is the drink attribute we match against.
 */
export type Style = 'espresso-based' | 'brewed' | 'cold-brewed' | 'tea-based';

export type Temperature = 'hot' | 'iced';
export type Strength = 'light' | 'medium' | 'bold' | 'extra-bold';
export type Milk = 'black' | 'whole' | '2%' | 'oat' | 'almond' | 'soy';
export type Sweetness = 'none' | 'touch' | 'sweet' | 'indulgent';
export type FlavorNote =
  | 'fruity' | 'floral' | 'chocolate' | 'nutty' | 'caramel' | 'spicy' | 'earthy';
export type Roast = 'light' | 'medium' | 'dark';

export interface FacetState {
  style: Style;
  temperature: Temperature;
  strength: Strength;
  milk: Milk;
  sweetness: Sweetness;
  flavorNote: FlavorNote;
  roast: Roast;
}

export type MilkMode = 'black' | 'milk-optional' | 'dairy-required';

export interface Drink {
  id: string;
  name: string;
  family: Style;               // the drink's inherent preparation family
  temperatures: Temperature[];
  typicalStrength: Strength[];
  milkMode: MilkMode;
  typicalSweetness: Sweetness[];
  compatibleFlavors: FlavorNote[];
}

export interface Archetype {
  id: string;        // matches drink.id
  slug: string;      // for discount code (UPPERCASE-HYPHEN form)
  name: string;
  descriptor: string;
}

export interface DrinkEnrichment {
  bean: string;
  roast: Roast;
  notes: string;
}

export interface Recommendation {
  drink: Drink;
  archetype: Archetype;
  enrichment: DrinkEnrichment;
  state: FacetState;
}

export interface Answer {
  text: string;
  mutations: Partial<FacetState>;
  /**
   * Optional branching: if set, after this answer is selected, the quiz
   * presents the follow-up question before advancing to the next main
   * question. Used for multi-flavor Q3 answers that need disambiguation.
   */
  followUp?: Question;
}

export interface Question {
  id: string;
  prompt: string;
  chapter: string;     // short label shown above the prompt
  answers: Answer[];
}
