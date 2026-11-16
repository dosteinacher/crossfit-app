import { convertLegacyWorkoutToNotation, parseWorkout } from './workoutNotation';

function getPartHeaders(lines: string[]) {
  return lines.flatMap((line, index) => /^#(?!#)\s/.test(line.trim()) ? [index] : []);
}

function lineEndingOf(value: string) {
  return value.includes('\r\n') ? '\r\n' : '\n';
}

export function hasTimerLine(description: string, partIndex: number) {
  const lines = description.split(/\r?\n/);
  const headers = getPartHeaders(lines);
  if (headers.length !== parseWorkout(description).parts.length) return false;
  const start = headers[partIndex];
  if (start === undefined) return false;
  const end = headers[partIndex + 1] ?? lines.length;
  return lines.slice(start + 1, end).some((line) => /^\s*~/.test(line));
}

export function writeTimerLine(description: string, partIndex: number, timerLine: string) {
  let source = description;
  let lines = source.split(/\r?\n/);
  let headers = getPartHeaders(lines);
  if (headers.length !== parseWorkout(source).parts.length) {
    source = convertLegacyWorkoutToNotation(source);
    lines = source.split(/\r?\n/);
    headers = getPartHeaders(lines);
  }
  const start = headers[partIndex];
  if (start === undefined) return { description: source, partLine: 1 };
  const end = headers[partIndex + 1] ?? lines.length;
  const timerLines = lines.flatMap((line, index) =>
    index > start && index < end && /^\s*~/.test(line) ? [index] : []
  );
  if (timerLines.length) {
    lines[timerLines[0]] = timerLine;
    for (const index of timerLines.slice(1).reverse()) lines.splice(index, 1);
  } else {
    lines.splice(start + 1, 0, timerLine);
  }
  return { description: lines.join(lineEndingOf(source)), partLine: start + 1 };
}

export function removeTimerLine(description: string, partIndex: number) {
  const lines = description.split(/\r?\n/);
  const headers = getPartHeaders(lines);
  if (headers.length !== parseWorkout(description).parts.length) {
    return { description, removed: false };
  }
  const start = headers[partIndex];
  if (start === undefined) return { description, removed: false };
  const end = headers[partIndex + 1] ?? lines.length;
  const timerLines = lines.flatMap((line, index) =>
    index > start && index < end && /^\s*~/.test(line) ? [index] : []
  );
  for (const index of timerLines.reverse()) lines.splice(index, 1);
  return {
    description: lines.join(lineEndingOf(description)),
    removed: timerLines.length > 0,
  };
}
