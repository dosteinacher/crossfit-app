import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getCalendarAgendaWorkouts } from './calendar-agenda';

const workouts = [
  { id: 1, date: '2026-11-06T10:00:00' },
  { id: 2, date: '2026-11-07T08:00:00' },
  { id: 3, date: '2026-11-07T12:00:00' },
  { id: 4, date: '2026-11-08T09:00:00' },
  { id: 5, date: '2026-11-16T10:00:00' },
];

describe('getCalendarAgendaWorkouts', () => {
  it('starts mobile agendas with today and sorts all remaining workouts chronologically', () => {
    const result = getCalendarAgendaWorkouts(
      [...workouts].reverse(),
      new Date('2026-11-07T15:00:00'),
      true
    );

    assert.deepEqual(result.map((workout) => workout.id), [2, 3, 4, 5]);
  });

  it('preserves the descending agenda order and past workouts on desktop', () => {
    const result = getCalendarAgendaWorkouts(
      workouts,
      new Date('2026-11-07T15:00:00'),
      false
    );

    assert.deepEqual(result.map((workout) => workout.id), [5, 4, 3, 2, 1]);
  });
});
