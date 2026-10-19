import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getDashboardStats } from './dashboard-stats';
import type { WorkoutWithDetails } from './types';

function workout(id: number, date: string, attended: boolean, userId = 7): WorkoutWithDetails {
  return {
    id,
    title: `Workout ${id}`,
    description: '',
    workout_type: 'General',
    date,
    max_participants: 10,
    created_by: 1,
    created_at: date,
    updated_at: date,
    creator_name: 'Coach',
    registered_count: 1,
    is_registered: true,
    participants: [{ user_id: userId, user_name: 'Member', attended }],
    guests: [],
  };
}

describe('getDashboardStats', () => {
  it('returns a 12-week attendance strip and excludes workouts older than its lookup window', () => {
    const now = new Date('2026-10-19T12:00:00');
    const stats = getDashboardStats([
      workout(1, '2026-10-19T10:00:00', true),
      workout(2, '2026-10-12T10:00:00', true),
      workout(3, '2026-10-12T18:00:00', false),
      workout(4, '2026-07-20T10:00:00', true),
      workout(5, '2026-07-13T10:00:00', true),
    ], 7, now);

    assert.equal(stats.weeks.length, 12);
    assert.equal(stats.attended, 2);
    assert.equal(stats.registered, 3);
    assert.equal(stats.attendanceRate, 67);
    assert.equal(stats.streakWeeks, 2);
    assert.equal(stats.sessionsThisMonth, 2);
    assert.equal(stats.weeks.at(-1)?.attended, 1);
    assert.equal(stats.weeks.at(-1)?.current, true);
    assert.equal(stats.registeredDays[0].registered, true);
    assert.equal(stats.registeredDays.length, 7);
  });

  it('does not include future registrations in attendance stats', () => {
    const now = new Date('2026-10-19T12:00:00');
    const stats = getDashboardStats([
      workout(1, '2026-10-20T10:00:00', false),
      workout(2, '2026-10-19T10:00:00', false, 8),
    ], 7, now);

    assert.equal(stats.registered, 0);
    assert.equal(stats.attendanceRate, 0);
    assert.equal(stats.streakWeeks, 0);
  });

  it('continues a streak from the previous week when the current week has no attended session', () => {
    const stats = getDashboardStats([
      workout(1, '2026-10-12T10:00:00', true),
      workout(2, '2026-10-19T10:00:00', false),
    ], 7, new Date('2026-10-19T12:00:00'));

    assert.equal(stats.streakWeeks, 1);
    assert.equal(stats.weeks.at(-1)?.current, true);
    assert.equal(stats.weeks.at(-1)?.attended, 0);
  });
});
