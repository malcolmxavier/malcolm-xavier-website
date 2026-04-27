import type { Question } from '../types';

// Locked in /_design/REQUIREMENTS.md (lesson 2.2 + 2.3 updates)
export const questions: Question[] = [
  {
    id: 'q1',
    chapter: 'Strength',
    prompt: 'Your coffee should wake you up like…',
    answers: [
      { text: 'A gentle nudge from a friend',  mutations: { strength: 'light' } },
      { text: 'A good playlist',               mutations: { strength: 'medium' } },
      { text: 'An alarm clock',                mutations: { strength: 'bold' } },
      { text: 'A cold plunge',                 mutations: { strength: 'extra-bold' } },
    ],
  },
  {
    id: 'q2',
    chapter: 'Temperature',
    prompt: "You're packing for a long weekend to…",
    answers: [
      { text: 'Reykjavík in January',                                   mutations: { temperature: 'hot' } },
      { text: 'A cabin on the Olympic Peninsula, rain in the forecast', mutations: { temperature: 'hot' } },
      { text: 'Palm Springs in July',                                   mutations: { temperature: 'iced' } },
      { text: 'A rooftop bar in Lisbon in August',                      mutations: { temperature: 'iced' } },
    ],
  },
  {
    // Q3 branches via followUp when the answer carries a two-flavor sensation,
    // so the full 7-note flavor space is reachable without widening Q3 itself.
    id: 'q3',
    chapter: 'Flavor',
    prompt: 'Step into a room. The air smells like…',
    answers: [
      {
        text: 'Citrus peel + white blossoms',
        mutations: {},
        followUp: {
          id: 'q3-1',
          chapter: 'Flavor',
          prompt: 'Which half of that pulls you in?',
          answers: [
            { text: 'The bolder side',  mutations: { flavorNote: 'fruity' } },
            { text: 'The softer side',  mutations: { flavorNote: 'floral' } },
          ],
        },
      },
      {
        text: 'Warm cocoa + toasted almonds',
        mutations: {},
        followUp: {
          id: 'q3-2',
          chapter: 'Flavor',
          prompt: 'Which half of that pulls you in?',
          answers: [
            { text: 'The bolder side',  mutations: { flavorNote: 'chocolate' } },
            { text: 'The softer side',  mutations: { flavorNote: 'nutty' } },
          ],
        },
      },
      {
        text: 'Cinnamon + caramelized sugar',
        mutations: {},
        followUp: {
          id: 'q3-3',
          chapter: 'Flavor',
          prompt: 'Which half of that pulls you in?',
          answers: [
            { text: 'The bolder side',  mutations: { flavorNote: 'spicy' } },
            { text: 'The softer side',  mutations: { flavorNote: 'caramel' } },
          ],
        },
      },
      {
        text: 'Cedar, campfire, old leather',
        mutations: { flavorNote: 'earthy' },
      },
    ],
  },
  {
    id: 'q4',
    chapter: 'Milk',
    prompt: "What's on the plate next to your drink?",
    answers: [
      { text: 'A square of 85% dark chocolate with almonds', mutations: { milk: 'black' } },
      { text: 'A warm blueberry scone with butter',          mutations: { milk: 'whole' } },
      { text: 'Almond butter on toast with banana',          mutations: { milk: 'almond' } },
      { text: 'Avocado toast on sourdough',                  mutations: { milk: 'oat' } },
    ],
  },
  {
    // Q5 probes Style (preparation-method) obliquely via actual rituals —
    // each answer is a real ritual whose pace + feel maps to a family,
    // without naming brewing mechanics. The ritual framing is the payoff
    // moment for the "Find your ritual" brand tagline.
    id: 'q5',
    chapter: 'Style',
    prompt: 'Which ritual draws you in?',
    answers: [
      { text: 'Striking a match',       mutations: { style: 'espresso-based' } },
      { text: 'Opening the curtains',   mutations: { style: 'brewed' } },
      { text: 'Drawing a bath',         mutations: { style: 'cold-brewed' } },
      { text: 'Lighting incense',       mutations: { style: 'tea-based' } },
    ],
  },
  {
    id: 'q6',
    chapter: 'Sweetness',
    prompt: 'Sweet is…',
    answers: [
      { text: 'A flavor I earned — no thanks',  mutations: { sweetness: 'none' } },
      { text: 'A quiet accent, nothing loud',   mutations: { sweetness: 'touch' } },
      { text: 'My happy place',                 mutations: { sweetness: 'sweet' } },
      { text: 'Dessert mode, activated',        mutations: { sweetness: 'indulgent' } },
    ],
  },
];
