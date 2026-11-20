import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getMovementSuggestions, summarizePastWorkouts } from './pastWorkoutInsights';

const WORKOUTS = [
  {
    id: 1,
    title: 'Monday WOD',
    date: '2026-01-05T10:00:00Z',
    description: '# WOD | 20 | AMRAP | Team of 2\n10 Wall Balls @ 9/6 kg / Lighter ball\n10 Burpees',
  },
  {
    id: 2,
    title: 'Tuesday WOD',
    date: '2026-01-06T10:00:00Z',
    description: '# WOD | 15 | For Time\n21 Wall Balls @ 9/6 kg\n15 Pull-Ups\n9 Wall Balls @ 9/6 kg',
  },
  {
    id: 3,
    title: 'Wednesday WOD',
    date: '2026-01-07T10:00:00Z',
    description: '# WOD | 10 | EMOM\n10 Wall Balls @ 7/4 kg\n10 Burpees',
  },
];

describe('summarizePastWorkouts', () => {
  it('builds a title/date/formats summary for each workout', () => {
    const summaries = summarizePastWorkouts(WORKOUTS);
    assert.equal(summaries.length, 3);
    assert.equal(summaries[0].title, 'Monday WOD');
    assert.equal(summaries[0].date, '2026-01-05T10:00:00Z');
    assert.match(summaries[0].formats, /AMRAP/);
    assert.match(summaries[0].formats, /TEAM OF 2/i);
  });
});

describe('getMovementSuggestions', () => {
  it('sorts movements by how often they appear', () => {
    const suggestions = getMovementSuggestions(WORKOUTS);
    assert.equal(suggestions[0].name, 'Wall Balls');
    assert.equal(suggestions[0].count, 4);
    const burpees = suggestions.find((s) => s.name === 'Burpees');
    assert.equal(burpees?.count, 2);
  });

  it('suggests the most common load seen for a movement', () => {
    const suggestions = getMovementSuggestions(WORKOUTS);
    const wallBalls = suggestions.find((s) => s.name === 'Wall Balls');
    assert.equal(wallBalls?.mostCommonLoad, '9/6 kg');
  });

  it('suggests the most common easier option for a movement', () => {
    const suggestions = getMovementSuggestions(WORKOUTS);
    const wallBalls = suggestions.find((s) => s.name === 'Wall Balls');
    assert.equal(wallBalls?.mostCommonAlt, 'Lighter ball');
  });

  it('never throws on empty or malformed input', () => {
    assert.doesNotThrow(() => getMovementSuggestions([]));
    assert.doesNotThrow(() => summarizePastWorkouts([]));
  });
});
