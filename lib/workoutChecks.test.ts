import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getWorkoutChecks } from './workoutChecks';
import type { Part } from './workoutModel';

function part(overrides: Partial<Part> = {}): Part {
  return { title: 'Part', minutes: '', format: 'Other', team: '', instructions: [], items: [], ...overrides };
}

describe('getWorkoutChecks', () => {
  it('flags a countdown-mode part (AMRAP) with no minutes', () => {
    const checks = getWorkoutChecks([part({ title: 'WOD', format: 'AMRAP', items: [{ kind: 'movement', reps: '10', name: 'Burpees', load: '', alts: [] }] })]);
    assert.ok(checks.some((c) => c.kind === 'minutes' && c.message.includes('WOD')));
  });

  it('does not flag minutes for a count-up part with no cap (a deliberate choice)', () => {
    const checks = getWorkoutChecks([part({ title: 'WOD', format: 'Strength', items: [{ kind: 'movement', reps: '5', name: 'Back Squat', load: '', alts: [] }] })]);
    assert.ok(!checks.some((c) => c.kind === 'minutes'));
  });

  it('flags an AMRAP part with no movements', () => {
    const checks = getWorkoutChecks([part({ title: 'WOD', format: 'AMRAP', minutes: '20' })]);
    assert.ok(checks.some((c) => c.kind === 'movements' && c.message.includes('AMRAP')));
  });

  it('flags Rounds format without a rounds number', () => {
    const checks = getWorkoutChecks([part({
      format: 'Rounds',
      items: [{ kind: 'movement', reps: '10', name: 'Burpees', load: '', alts: [] }],
    })]);
    assert.ok(checks.some((c) => c.kind === 'rounds'));
  });

  it('does not flag Rounds format once a rounds number is set', () => {
    const checks = getWorkoutChecks([part({
      format: 'Rounds',
      rounds: '5',
      items: [{ kind: 'movement', reps: '10', name: 'Burpees', load: '', alts: [] }],
    })]);
    assert.ok(!checks.some((c) => c.kind === 'rounds'));
  });

  it('flags Intervals without a timer', () => {
    const checks = getWorkoutChecks([part({
      format: 'Intervals',
      items: [{ kind: 'movement', reps: '10', name: 'Burpees', load: '', alts: [] }],
    })]);
    assert.ok(checks.some((c) => c.kind === 'timer'));
  });

  it('does not flag Intervals once a timer is set', () => {
    const checks = getWorkoutChecks([part({
      format: 'Intervals',
      timer: { rounds: 10, work: 40, rest: 20, sets: 1, setRest: 60, prep: 10 },
      items: [{ kind: 'movement', reps: '10', name: 'Burpees', load: '', alts: [] }],
    })]);
    assert.ok(!checks.some((c) => c.kind === 'timer'));
  });

  it('reports no checks for a fully filled-in part', () => {
    const checks = getWorkoutChecks([part({
      title: 'WOD',
      format: 'AMRAP',
      minutes: '20',
      items: [{ kind: 'movement', reps: '10', name: 'Burpees', load: '', alts: [] }],
    })]);
    assert.deepEqual(checks, []);
  });

  it('never throws on an empty part list', () => {
    assert.doesNotThrow(() => getWorkoutChecks([]));
  });
});
