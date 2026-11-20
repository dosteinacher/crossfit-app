/**
 * Phase 4 "Start from: A template" — a small, hard-coded set of quick starts.
 * Each builds a real Part[] for the guided editor (not raw notation text),
 * so choosing one behaves exactly like building the same part by hand.
 */
import type { Part } from './workoutModel';

function emptyPart(overrides: Partial<Part> = {}): Part {
  return {
    title: 'Part',
    minutes: '',
    format: 'Other',
    team: '',
    instructions: [],
    items: [],
    ...overrides,
  };
}

export interface GuidedTemplate {
  name: string;
  description: string;
  parts: Part[];
}

export const GUIDED_TEMPLATES: GuidedTemplate[] = [
  {
    name: 'Standard class',
    description: 'Warm-up 15′ · Strength 15′ · WOD 30′',
    parts: [
      emptyPart({ title: 'Warm-up', minutes: '15', timerMode: 'countup' }),
      emptyPart({ title: 'Strength', minutes: '15', format: 'Strength' }),
      emptyPart({ title: 'WOD', minutes: '30', timerMode: 'countup' }),
    ],
  },
  {
    name: 'Team of 2 · AMRAP',
    description: 'One AMRAP part, worked in pairs',
    parts: [
      emptyPart({ title: 'WOD', minutes: '20', format: 'AMRAP', team: 'Team of 2' }),
    ],
  },
  {
    name: 'Stations · Intervals',
    description: 'Intervals 4 × 1:45 / 0:15, two stations',
    parts: [
      emptyPart({
        title: 'WOD',
        format: 'Other',
        otherName: 'Stations',
        timerMode: 'intervals',
        timer: { rounds: 4, work: 105, rest: 15, sets: 1, setRest: 60, prep: 10 },
        items: [
          { kind: 'section', text: 'Station 1' },
          { kind: 'section', text: 'Station 2' },
        ],
      }),
    ],
  },
  {
    name: 'EMOM 12',
    description: 'One EMOM part, 12 minutes',
    parts: [
      emptyPart({ title: 'WOD', minutes: '12', format: 'EMOM' }),
    ],
  },
  {
    name: 'Empty',
    description: 'One blank part to fill in yourself',
    parts: [emptyPart({ title: 'WOD' })],
  },
];
