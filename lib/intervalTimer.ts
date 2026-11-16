import type { IntervalTimer } from './workoutNotation';

export type Phase = 'prep' | 'work' | 'rest' | 'setrest';

export type Seg = {
  phase: Phase;
  dur: number;
  round: number;
  set: number;
  start: number;
};

export type IntervalTimerState = {
  done: boolean;
  seg?: Seg;
  index: number;
  segLeft: number;
  round: number;
  set: number;
  next?: Seg;
  totalLeft: number;
  roundProgress: number[];
};

export type TimerCue = 'phaseStart-work' | 'phaseStart-rest' | 'tick' | 'finish';

export function buildTimeline(timer: IntervalTimer): { segs: Seg[]; end: number } {
  const segs: Seg[] = [];
  let start = 0;
  const add = (phase: Phase, dur: number, round: number, set: number) => {
    if (dur <= 0) return;
    segs.push({ phase, dur, round, set, start });
    start += dur;
  };

  add('prep', timer.prep, 1, 1);
  for (let set = 1; set <= timer.sets; set += 1) {
    for (let round = 1; round <= timer.rounds; round += 1) {
      add('work', timer.work, round, set);
      if (round < timer.rounds) add('rest', timer.rest, round, set);
    }
    if (set < timer.sets) add('setrest', timer.setRest, timer.rounds, set);
  }

  return { segs, end: start };
}

export function stateAt(timer: IntervalTimer, elapsed: number): IntervalTimerState {
  const { segs, end } = buildTimeline(timer);
  const time = Math.max(0, elapsed);
  const index = segs.findIndex((seg) => time < seg.start + seg.dur);
  const done = time >= end || index < 0;
  const seg = done ? undefined : segs[index];
  const next = seg ? segs[index + 1] : undefined;
  const round = seg?.round ?? timer.rounds;
  const set = seg?.set ?? timer.sets;
  const roundProgress = Array.from({ length: timer.rounds }, (_, index) => {
    const roundNumber = index + 1;
    if (done || seg?.phase === 'setrest') return 1;
    if (!seg || seg.phase === 'prep' || roundNumber > seg.round) return 0;
    if (roundNumber < seg.round) return 1;
    const roundDuration = timer.work + (roundNumber < timer.rounds ? timer.rest : 0);
    const roundElapsed = seg.phase === 'work'
      ? time - seg.start
      : timer.work + (time - seg.start);
    return roundDuration > 0 ? Math.max(0, Math.min(1, roundElapsed / roundDuration)) : 1;
  });
  const workTotal = end - (timer.prep > 0 ? timer.prep : 0);

  return {
    done,
    ...(seg ? { seg } : {}),
    index: done ? -1 : index,
    segLeft: seg ? seg.start + seg.dur - time : 0,
    round,
    set,
    ...(next ? { next } : {}),
    totalLeft: Math.max(0, Math.min(workTotal, end - time)),
    roundProgress,
  };
}

export function cueAt(timer: IntervalTimer, elapsed: number): TimerCue | null {
  const state = stateAt(timer, elapsed);
  if (state.done) return 'finish';
  if (!state.seg) return null;
  if (state.segLeft === state.seg.dur) {
    return state.seg.phase === 'work' ? 'phaseStart-work' : 'phaseStart-rest';
  }
  if (state.segLeft === 3 || state.segLeft === 2 || state.segLeft === 1) return 'tick';
  return null;
}
