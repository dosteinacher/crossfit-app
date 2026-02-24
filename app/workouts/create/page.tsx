'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Card, Input, TextArea, Button, ErrorMessage, SuccessMessage, TimeInput } from '@/components/ui';
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
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

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
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

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
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Fetch users error:', error);
    }
  };

  const loadTemplate = async () => {
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
  };

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
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-pure-dark py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-pure-white">
              {templateId ? 'Schedule from Template' : 'Create New Workout'}
            </h1>
            <Link href="/archive">
              <Button variant="secondary">Browse Archive</Button>
            </Link>
          </div>

          {templateId && (
            <div className="bg-purple-900 border border-purple-700 rounded-lg p-4 mb-6">
              <p className="text-purple-200">
                <strong>📚 Using template!</strong> Edit as needed and schedule for a specific date/time.
              </p>
            </div>
          )}

          {/* Workout generator (optional) */}
          {!templateId && (
            <div className="mb-6 border border-gray-700 rounded-lg bg-pure-gray overflow-hidden">
              <button
                type="button"
                onClick={() => setGenExpanded(!genExpanded)}
                className="w-full px-4 py-3 flex justify-between items-center text-left text-pure-white font-medium hover:bg-gray-800 transition"
              >
                <span>Help me build a workout</span>
                <span className="text-xl">{genExpanded ? '−' : '+'}</span>
              </button>
              {genExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-gray-700 space-y-4">
                  {genSuccess && (
                    <p className="text-sm text-pure-green font-medium">{genSuccess}</p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-pure-white mb-1">
                        How many CrossFitters? (1–6) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={6}
                        value={genAthleteCount}
                        onChange={(e) => setGenAthleteCount(Math.min(6, Math.max(1, Number(e.target.value) || 1)))}
                        className="w-full px-3 py-2 bg-pure-dark border border-gray-700 text-pure-white rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-pure-white mb-1">
                        How long? (min) <span className="text-red-500">*</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {DURATION_PRESETS.map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setGenDuration(d)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium ${
                              genDuration === d
                                ? 'bg-pure-green text-pure-dark'
                                : 'bg-pure-dark text-pure-white border border-gray-700'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-pure-white mb-2">
                      Strength included?
                    </label>
                    <div className="flex gap-4 mb-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={!genStrengthIncluded}
                          onChange={() => setGenStrengthIncluded(false)}
                          className="text-pure-green"
                        />
                        <span className="text-pure-white">No</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={genStrengthIncluded}
                          onChange={() => setGenStrengthIncluded(true)}
                          className="text-pure-green"
                        />
                        <span className="text-pure-white">Yes</span>
                      </label>
                    </div>
                    {genStrengthIncluded && (
                      <div className="mt-2">
                        <select
                          value={genStrengthPreset}
                          onChange={(e) => setGenStrengthPreset(e.target.value)}
                          className="w-full px-3 py-2 bg-pure-dark border border-gray-700 text-pure-white rounded-lg mb-2"
                        >
                          {STRENGTH_PRESETS.map((p) => (
                            <option key={p.label} value={p.value} className="bg-pure-dark">
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
                            className="w-full px-3 py-2 bg-pure-dark border border-gray-700 text-pure-white rounded-lg"
                          />
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-pure-white mb-1">
                      Workout format
                    </label>
                    <select
                      value={genFormat}
                      onChange={(e) => setGenFormat(e.target.value as WorkoutFormat)}
                      className="w-full px-3 py-2 bg-pure-dark border border-gray-700 text-pure-white rounded-lg"
                    >
                      {WORKOUT_FORMATS.map((f) => (
                        <option key={f.value} value={f.value} className="bg-pure-dark">
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-pure-white mb-1">
                        Exercises to include (optional)
                      </label>
                      <div className="bg-pure-dark border border-gray-700 rounded-lg p-2 max-h-32 overflow-y-auto">
                        {EXERCISES.map((ex) => (
                          <label key={ex} className="flex items-center gap-2 py-1 px-2 rounded cursor-pointer hover:bg-gray-800">
                            <input
                              type="checkbox"
                              checked={genIncludeExercises.includes(ex)}
                              onChange={() => toggleGenInclude(ex)}
                              className="text-pure-green"
                            />
                            <span className="text-sm text-pure-white">{ex}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-pure-white mb-1">
                        Exercises to exclude (optional, max 4)
                      </label>
                      <div className="bg-pure-dark border border-gray-700 rounded-lg p-2 max-h-32 overflow-y-auto">
                        {EXERCISES.map((ex) => (
                          <label key={ex} className="flex items-center gap-2 py-1 px-2 rounded cursor-pointer hover:bg-gray-800">
                            <input
                              type="checkbox"
                              checked={genExcludeExercises.includes(ex)}
                              onChange={() => toggleGenExclude(ex)}
                              disabled={!genExcludeExercises.includes(ex) && genExcludeExercises.length >= 4}
                              className="text-pure-green"
                            />
                            <span className="text-sm text-pure-white">{ex}</span>
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

          <Card>
            {error && <ErrorMessage message={error} />}
            {success && <SuccessMessage message={success} />}

            <form onSubmit={handleSubmit}>
              <Input
                label="Workout Title"
                type="text"
                value={title}
                onChange={setTitle}
                placeholder="e.g., Monday Morning WOD"
                required
              />

              <TextArea
                label="Description"
                value={description}
                onChange={setDescription}
                placeholder="Describe the workout, movements, and any notes..."
                rows={6}
              />

              <div className="mb-4">
                <label className="block text-sm font-medium text-pure-white mb-1">
                  Workout Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={workoutType}
                  onChange={(e) => setWorkoutType(e.target.value)}
                  className="w-full px-3 py-2 bg-pure-dark border border-gray-700 text-pure-white rounded-lg focus:outline-none focus:ring-2 focus:ring-pure-green"
                  required
                >
                  {workoutTypes.map((type) => (
                    <option key={type} value={type} className="bg-pure-dark text-pure-white">
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Date"
                  type="date"
                  value={date}
                  onChange={setDate}
                  required
                />

                <TimeInput
                  label="Time"
                  value={time}
                  onChange={setTime}
                  required
                />
              </div>

              <Input
                label="Max Participants"
                type="number"
                value={maxParticipants}
                onChange={setMaxParticipants}
                placeholder="4"
                required
              />

              <div className="mb-4">
                <label className="block text-sm font-medium text-pure-white mb-1">
                  Pre-select Attendees (Optional)
                </label>
                <p className="text-xs text-gray-400 mb-2">
                  Select users who you know will attend. They'll be auto-registered and receive a calendar invite.
                </p>
                <div className="bg-pure-dark border border-gray-700 rounded-lg p-3 max-h-48 overflow-y-auto">
                  {users.length === 0 ? (
                    <p className="text-gray-400 text-sm">Loading users...</p>
                  ) : (
                    users.map((user) => (
                      <label key={user.id} className="flex items-center gap-2 py-2 hover:bg-gray-800 px-2 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUserIds([...selectedUserIds, user.id]);
                            } else {
                              setSelectedUserIds(selectedUserIds.filter((id) => id !== user.id));
                            }
                          }}
                          className="w-4 h-4 text-pure-green rounded focus:ring-2 focus:ring-pure-green"
                        />
                        <span className="text-sm text-pure-white">
                          {user.name} <span className="text-gray-400 text-xs">({user.email})</span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
                {selectedUserIds.length > 0 && (
                  <p className="text-xs text-pure-green mt-2">
                    {selectedUserIds.length} user{selectedUserIds.length > 1 ? 's' : ''} selected
                  </p>
                )}
              </div>

              {!templateId && (
                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveToArchive}
                      onChange={(e) => setSaveToArchive(e.target.checked)}
                      className="w-4 h-4 text-pure-green rounded focus:ring-2 focus:ring-pure-green"
                    />
                    <span className="text-sm text-pure-white">
                      Save this workout to Archive (for future reuse)
                    </span>
                  </label>
                </div>
              )}

              <div className="flex gap-4 mt-6">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Creating...' : 'Create Workout'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.back()}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
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
