'use client';

import { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Card, Button, ErrorMessage, SuccessMessage, SegmentedControl } from '@/components/ui';
import { generateWorkout } from '@/lib/workout-generator';
import {
  EXERCISES,
  STRENGTH_PRESETS,
  DURATION_PRESETS,
  WORKOUT_FORMATS,
  type WorkoutFormat,
} from '@/lib/workout-generator-data';

function CreateWorkoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('template');
  const pollDate = searchParams.get('date'); // ISO datetime from poll
  const preselectUsers = searchParams.get('preselect_users'); // Comma-separated user IDs from poll

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workoutType, setWorkoutType] = useState('General');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('4');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveToArchive, setSaveToArchive] = useState(true);
  const [users, setUsers] = useState<Array<{ id: number; name: string; email: string }>>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersLoadError, setUsersLoadError] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Workout generator state (optional section)
  const [genExpanded, setGenExpanded] = useState(false);
  const [genAthleteCount, setGenAthleteCount] = useState(2);
  const [genStrengthIncluded, setGenStrengthIncluded] = useState(false);
  const [genStrengthPreset, setGenStrengthPreset] = useState('');
  const [genStrengthCustom, setGenStrengthCustom] = useState('');
  const [genDuration, setGenDuration] = useState(30);
  const [genFormat, setGenFormat] = useState<WorkoutFormat>('AMRAP');
  const [genIncludeExercises, setGenIncludeExercises] = useState<string[]>([]);
  const [genExcludeExercises, setGenExcludeExercises] = useState<string[]>([]);
  const [genSuccess, setGenSuccess] = useState('');

  const workoutTypes = ['General', 'Strength', 'Cardio', 'HIIT', 'Mobility', 'Olympic Lifting', 'Gymnastics'];
  const visibleUsers = users.filter((user) =>
    `${user.name} ${user.email}`.toLowerCase().includes(attendeeSearch.trim().toLowerCase())
  );

  useEffect(() => {
    // Pre-fill date and time from poll if provided
    if (pollDate) {
      const pollDateTime = new Date(pollDate);
      setDate(pollDateTime.toISOString().split('T')[0]); // YYYY-MM-DD
      setTime(pollDateTime.toTimeString().slice(0, 5)); // HH:MM
    }
    // Fetch users for pre-selection
    fetchUsers();
  }, [pollDate]);

  useEffect(() => {
    if (descriptionRef.current) {
      descriptionRef.current.style.height = 'auto';
      descriptionRef.current.style.height = `${descriptionRef.current.scrollHeight}px`;
    }
  }, [description]);

  // Pre-select users from poll after users are loaded
  useEffect(() => {
    if (preselectUsers && users.length > 0) {
      const userIdsToSelect = preselectUsers.split(',')
        .filter(id => id.trim())
        .map(id => parseInt(id.trim())); // Convert strings to numbers
      setSelectedUserIds(userIdsToSelect);
    }
  }, [preselectUsers, users]);

  // URL pre-fill (e.g. from generator or shared link)
  useEffect(() => {
    const urlTitle = searchParams.get('title');
    const urlDesc = searchParams.get('description');
    const urlType = searchParams.get('workout_type');
    const urlMax = searchParams.get('max_participants');
    const urlDate = searchParams.get('date');
    const urlTime = searchParams.get('time');
    if (urlTitle) setTitle(decodeURIComponent(urlTitle));
    if (urlDesc) setDescription(decodeURIComponent(urlDesc));
    if (urlType) setWorkoutType(decodeURIComponent(urlType));
    if (urlMax) setMaxParticipants(decodeURIComponent(urlMax));
    if (urlDate && !pollDate) setDate(decodeURIComponent(urlDate));
    if (urlTime && !pollDate) setTime(decodeURIComponent(urlTime));
  }, [searchParams, pollDate]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Could not load members');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Fetch users error:', error);
      setUsersLoadError('Could not load members. You can still create the workout without pre-selecting attendees.');
    } finally {
      setUsersLoading(false);
    }
  };

  const loadTemplate = useCallback(async () => {
    try {
      const response = await fetch(`/api/templates/${templateId}`);
      if (response.ok) {
        const data = await response.json();
        setTitle(data.template.title);
        setDescription(data.template.description);
        setWorkoutType(data.template.workout_type);
        // Increment usage count
        await fetch(`/api/templates/${templateId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data.template,
            times_used: (data.template.times_used || 0) + 1,
          }),
        });
      }
    } catch (error) {
      console.error('Load template error:', error);
    }
  }, [templateId]);

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId, loadTemplate]);

  const handleGenerate = () => {
    setGenSuccess('');
    const strengthBlock =
      genStrengthPreset === '' || genStrengthPreset === 'Custom'
        ? genStrengthCustom
        : genStrengthPreset;
    const result = generateWorkout({
      athleteCount: genAthleteCount,
      strengthIncluded: genStrengthIncluded,
      strengthBlock,
      durationMinutes: genDuration,
      format: genFormat,
      includeExercises: genIncludeExercises,
      excludeExercises: genExcludeExercises,
    });
    setTitle(result.title);
    setDescription(result.description);
    setWorkoutType(result.workout_type);
    setMaxParticipants(String(genAthleteCount));
    setGenSuccess('Workout generated! Edit below and set date/time, then create.');
  };

  const toggleGenInclude = (exercise: string) => {
    setGenIncludeExercises((prev) =>
      prev.includes(exercise) ? prev.filter((e) => e !== exercise) : [...prev, exercise]
    );
  };
  const toggleGenExclude = (exercise: string) => {
    setGenExcludeExercises((prev) =>
      prev.includes(exercise)
        ? prev.filter((e) => e !== exercise)
        : prev.length < 4
          ? [...prev, exercise]
          : prev
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!date || !time) {
      setError('Please select both date and time');
      return;
    }

    setLoading(true);

    try {
      const dateTime = new Date(`${date}T${time}`).toISOString();

      const response = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          workout_type: workoutType,
          date: dateTime,
          max_participants: parseInt(maxParticipants),
          pre_selected_user_ids: selectedUserIds,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Save to archive if checkbox is checked
        if (saveToArchive) {
          await fetch('/api/templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title,
              description,
              workout_type: workoutType,
              category: 'Custom',
            }),
          });
        }

        setSuccess('Workout created successfully!');
        setTimeout(() => router.push(`/workouts/${data.workout.id}`), 1500);
      } else {
        setError(data.error || 'Failed to create workout');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-canvas py-6 md:py-10">
        <div className="mx-auto max-w-[1200px] px-4">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
            <div>
              <p className="text-[13px] font-bold uppercase tracking-[.14em] text-ink-2">Workouts</p>
              <h1 className="mt-2 font-display text-[58px] font-black leading-[.82] tracking-[-.01em] text-ink md:text-[96px]">
              {templateId ? 'Schedule from Template' : 'Create New Workout'}
              </h1>
            </div>
            <Link href="/archive">
              <Button variant="secondary">Browse Archive</Button>
            </Link>
          </div>

          {templateId && (
            <div className="mb-6 border-l-4 border-ink bg-paper p-4 text-ink">
              <p className="text-base text-ink-2">
                <strong>Using template!</strong> Edit as needed and schedule for a specific date/time.
              </p>
            </div>
          )}

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
          {/* Workout generator (optional) */}
          {!templateId && (
            <div className="overflow-hidden rounded-lg border border-line bg-paper">
              <button
                type="button"
                onClick={() => setGenExpanded(!genExpanded)}
                aria-expanded={genExpanded}
                className="flex min-h-14 w-full items-center justify-between px-4 text-left font-bold text-ink hover:bg-canvas"
              >
                <span>Help me build a workout</span>
                <span aria-hidden="true" className="text-xl">{genExpanded ? '−' : '+'}</span>
              </button>
              {genExpanded && (
                <div className="space-y-4 border-t border-line-2 px-4 pb-4 pt-4">
                  {genSuccess && (
                    <p className="text-sm font-semibold text-ink">{genSuccess}</p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-bold text-ink">
                        How many CrossFitters? (1–6) <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={6}
                        value={genAthleteCount}
                        onChange={(e) => setGenAthleteCount(Math.min(6, Math.max(1, Number(e.target.value) || 1)))}
                        className="min-h-11 w-full rounded-sm border border-line bg-paper px-3 py-2 text-base text-ink focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-bold text-ink">
                        How long? (min) <span className="text-danger">*</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {DURATION_PRESETS.map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setGenDuration(d)}
                            className={`min-h-11 rounded-sm px-3 text-sm font-bold ${
                              genDuration === d
                                ? 'bg-lime text-ink'
                                : 'border border-line bg-paper text-ink hover:bg-canvas'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-ink">
                      Strength included?
                    </label>
                    <div className="mb-2 flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={!genStrengthIncluded}
                          onChange={() => setGenStrengthIncluded(false)}
                          className="accent-ink"
                        />
                        <span className="text-base text-ink">No</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={genStrengthIncluded}
                          onChange={() => setGenStrengthIncluded(true)}
                          className="accent-ink"
                        />
                        <span className="text-base text-ink">Yes</span>
                      </label>
                    </div>
                    {genStrengthIncluded && (
                      <div className="mt-2">
                        <select
                          value={genStrengthPreset}
                          onChange={(e) => setGenStrengthPreset(e.target.value)}
                          className="mb-2 min-h-11 w-full rounded-sm border border-line bg-paper px-3 py-2 text-base text-ink focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
                        >
                          {STRENGTH_PRESETS.map((p) => (
                            <option key={p.label} value={p.value}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                        {(genStrengthPreset === '' || genStrengthPreset === 'Custom') && (
                          <input
                            type="text"
                            value={genStrengthCustom}
                            onChange={(e) => setGenStrengthCustom(e.target.value)}
                            placeholder="e.g. Back Squat 5x5"
                            className="min-h-11 w-full rounded-sm border border-line bg-paper px-3 py-2 text-base text-ink focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
                          />
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-bold text-ink">
                      Workout format
                    </label>
                    <select
                      value={genFormat}
                      onChange={(e) => setGenFormat(e.target.value as WorkoutFormat)}
                      className="min-h-11 w-full rounded-sm border border-line bg-paper px-3 py-2 text-base text-ink focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
                    >
                      {WORKOUT_FORMATS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-bold text-ink">
                        Exercises to include (optional)
                      </label>
                      <div className="max-h-32 overflow-y-auto rounded-sm border border-line bg-canvas p-2">
                        {EXERCISES.map((ex) => (
                          <label key={ex} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-paper">
                            <input
                              type="checkbox"
                              checked={genIncludeExercises.includes(ex)}
                              onChange={() => toggleGenInclude(ex)}
                              className="accent-ink"
                            />
                            <span className="text-sm text-ink">{ex}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-bold text-ink">
                        Exercises to exclude (optional, max 4)
                      </label>
                      <div className="max-h-32 overflow-y-auto rounded-sm border border-line bg-canvas p-2">
                        {EXERCISES.map((ex) => (
                          <label key={ex} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-paper">
                            <input
                              type="checkbox"
                              checked={genExcludeExercises.includes(ex)}
                              onChange={() => toggleGenExclude(ex)}
                              disabled={!genExcludeExercises.includes(ex) && genExcludeExercises.length >= 4}
                              className="accent-ink"
                            />
                            <span className="text-sm text-ink">{ex}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button type="button" onClick={handleGenerate}>
                    Generate workout
                  </Button>
                </div>
              )}
            </div>
          )}

              {error && <ErrorMessage message={error} />}
              {success && <SuccessMessage message={success} />}
              <form onSubmit={handleSubmit} className="space-y-5">
                <Card className="space-y-5">
                  <div>
                    <label htmlFor="workout-title" className="mb-1.5 block text-sm font-bold text-ink">Workout title</label>
                    <input
                      id="workout-title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Monday Morning WOD"
                      required
                      className="min-h-12 w-full rounded-sm border border-line bg-paper px-3 py-2 text-base text-ink placeholder:text-ink-2 focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
                    />
                  </div>

                  <div>
                    <label htmlFor="workout-description" className="mb-1.5 block text-sm font-bold text-ink">Description</label>
                    <textarea
                      ref={descriptionRef}
                      id="workout-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the workout, movements, and any notes..."
                      rows={5}
                      className="min-h-40 w-full resize-none overflow-hidden rounded-sm border border-line bg-paper px-3 py-2 text-base text-ink placeholder:text-ink-2 focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-bold text-ink">Workout type</p>
                    <SegmentedControl
                      items={workoutTypes.map((type) => ({ label: type, value: type }))}
                      value={workoutType}
                      onChange={setWorkoutType}
                      ariaLabel="Workout type"
                      className="w-full flex-wrap"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="workout-date" className="mb-1.5 block text-sm font-bold text-ink">Date</label>
                      <input
                        id="workout-date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                        className="min-h-12 w-full rounded-sm border border-line bg-paper px-3 py-2 text-base text-ink focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
                      />
                    </div>
                    <div>
                      <label htmlFor="workout-time" className="mb-1.5 block text-sm font-bold text-ink">Time</label>
                      <input
                        id="workout-time"
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        required
                        className="min-h-12 w-full rounded-sm border border-line bg-paper px-3 py-2 text-base text-ink focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="max-participants" className="mb-1.5 block text-sm font-bold text-ink">Maximum participants</label>
                    <div className="inline-flex items-center rounded-sm border border-line bg-paper">
                      <button
                        type="button"
                        aria-label="Decrease maximum participants"
                        onClick={() => setMaxParticipants((current) => String(Math.max(1, (Number(current) || 1) - 1)))}
                        className="h-12 w-12 text-xl font-bold text-ink hover:bg-canvas focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/15"
                      >
                        −
                      </button>
                      <input
                        id="max-participants"
                        type="number"
                        min={1}
                        step={1}
                        value={maxParticipants}
                        onChange={(e) => setMaxParticipants(e.target.value)}
                        onBlur={() => setMaxParticipants(String(Math.max(1, Number.parseInt(maxParticipants, 10) || 1)))}
                        required
                        className="h-12 w-16 border-x border-line bg-paper text-center text-base font-bold tabular-nums text-ink focus:outline-none"
                      />
                      <button
                        type="button"
                        aria-label="Increase maximum participants"
                        onClick={() => setMaxParticipants((current) => String((Number(current) || 1) + 1))}
                        className="h-12 w-12 text-xl font-bold text-ink hover:bg-canvas focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ink/15"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="attendee-search" className="mb-1.5 block text-sm font-bold text-ink">Pre-select attendees <span className="font-normal text-ink-2">(optional)</span></label>
                    <p className="mb-3 text-sm text-ink-2">
                      Selected members will be registered automatically and receive a calendar invite.
                    </p>
                    <input
                      id="attendee-search"
                      type="search"
                      value={attendeeSearch}
                      onChange={(e) => setAttendeeSearch(e.target.value)}
                      placeholder="Search members by name or email"
                      className="mb-2 min-h-11 w-full rounded-sm border border-line bg-paper px-3 py-2 text-base text-ink placeholder:text-ink-2 focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
                    />
                    <div className="max-h-60 overflow-y-auto rounded-sm border border-line">
                      {usersLoadError ? (
                        <p className="p-3 text-sm text-ink-2">{usersLoadError}</p>
                      ) : usersLoading ? (
                        <p className="p-3 text-sm text-ink-2">Loading members…</p>
                      ) : users.length === 0 ? (
                        <p className="p-3 text-sm text-ink-2">No members are available to pre-select.</p>
                      ) : visibleUsers.length === 0 ? (
                        <p className="p-3 text-sm text-ink-2">No members match that search.</p>
                      ) : (
                        visibleUsers.map((user) => (
                          <label key={user.id} className="flex min-h-12 cursor-pointer items-center gap-3 border-b border-line-2 px-3 last:border-0 hover:bg-canvas">
                            <input
                              type="checkbox"
                              checked={selectedUserIds.includes(user.id)}
                              onChange={(e) => setSelectedUserIds((current) =>
                                e.target.checked
                                  ? current.includes(user.id) ? current : [...current, user.id]
                                  : current.filter((id) => id !== user.id)
                              )}
                              className="h-4 w-4 accent-ink"
                            />
                            <span className="min-w-0 text-sm font-semibold text-ink">
                              {user.name} <span className="font-normal text-ink-2">({user.email})</span>
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                    {selectedUserIds.length > 0 && (
                      <p className="mt-2 text-sm font-semibold text-ink">
                        {selectedUserIds.length} member{selectedUserIds.length === 1 ? '' : 's'} selected
                      </p>
                    )}
                  </div>

                  {!templateId && (
                    <label className="flex min-h-12 cursor-pointer items-center gap-3 border-t border-line-2 pt-3 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={saveToArchive}
                        onChange={(e) => setSaveToArchive(e.target.checked)}
                        className="h-4 w-4 accent-ink"
                      />
                      Save this workout to Archive for future reuse
                    </label>
                  )}
                </Card>
                <div className="sticky bottom-[calc(80px_+_env(safe-area-inset-bottom))] z-20 -mx-4 flex gap-3 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur-sm md:bottom-0">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? 'Creating…' : 'Create workout'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => router.back()} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </form>
            </div>

            <aside className="order-first lg:order-none lg:sticky lg:top-6 lg:self-start">
              <Card className="!bg-ink !text-white">
                <p className="text-[13px] font-bold uppercase tracking-[.14em] text-white/75">Live preview</p>
                <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
                  <h2 className="font-display text-3xl font-extrabold text-white">{title.trim() || 'Workout title'}</h2>
                  <span className="rounded-sm bg-lime px-2.5 py-1 text-[13px] font-bold text-ink">{workoutType}</span>
                </div>
                <p className="mt-3 text-sm text-white/80">
                  {date || 'Date not set'}{time ? ` · ${time}` : ''}
                </p>
                <div className="my-5 border-t border-white/20" />
                <p className="whitespace-pre-wrap break-words text-base leading-relaxed text-white">
                  {description.trim() || 'Your workout description will appear here.'}
                </p>
                <div className="mt-6 border-t border-white/20 pt-4">
                  <p className="text-sm font-bold text-white">{selectedUserIds.length} selected · {maxParticipants || '0'} spots max</p>
                  {selectedUserIds.length > 0 && (
                    <p className="mt-2 text-sm text-white/80">
                      {users.filter((user) => selectedUserIds.includes(user.id)).map((user) => user.name).join(', ')}
                    </p>
                  )}
                </div>
              </Card>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}

export default function CreateWorkoutPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateWorkoutForm />
    </Suspense>
  );
}
