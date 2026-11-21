'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import WorkoutFormBody from '@/components/WorkoutFormBody';
import MoreOptionsSection from '@/components/MoreOptionsSection';
import { ErrorMessage, SuccessMessage, Loading } from '@/components/ui';
import { getMainWorkoutFormat } from '@/lib/workoutNotation';

interface Participant {
  user_id: number;
  user_name: string;
  attended: boolean;
}

interface User {
  id: number;
  name: string;
  email: string;
}

export default function EditWorkoutPage() {
  const router = useRouter();
  const params = useParams();
  const workoutId = params.id as string;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workoutType, setWorkoutType] = useState('General');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('4');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedAddUserId, setSelectedAddUserId] = useState('');
  const [participantError, setParticipantError] = useState('');
  const [participantLoading, setParticipantLoading] = useState(false);

  const parsedWorkoutType = getMainWorkoutFormat(description);

  useEffect(() => {
    fetchWorkout();
    fetchUsers();
  }, [workoutId]);

  const fetchWorkout = async () => {
    try {
      const response = await fetch(`/api/workouts/${workoutId}`);
      if (response.ok) {
        const data = await response.json();
        const workout = data.workout;

        setTitle(workout.title);
        setDescription(workout.description || '');
        setWorkoutType(workout.workout_type);
        setMaxParticipants(workout.max_participants.toString());
        setParticipants(workout.participants || []);

        const workoutDate = new Date(workout.date);
        setDate(workoutDate.toISOString().split('T')[0]);
        setTime(workoutDate.toTimeString().slice(0, 5));
      } else {
        setError('Workout not found');
      }
    } catch (error) {
      setError('Failed to load workout');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data.users);
      }
    } catch {
      // non-critical, silently ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!date || !time) {
      setError('Please select both date and time');
      return;
    }

    setSaving(true);

    try {
      const dateTime = new Date(`${date}T${time}`).toISOString();

      const response = await fetch(`/api/workouts/${workoutId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          workout_type: parsedWorkoutType || workoutType,
          date: dateTime,
          max_participants: parseInt(maxParticipants),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Workout updated successfully!');
        setTimeout(() => router.push(`/workouts/${workoutId}`), 1500);
      } else {
        setError(data.error || 'Failed to update workout');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddParticipant = async () => {
    if (!selectedAddUserId) return;
    setParticipantError('');
    setParticipantLoading(true);

    try {
      const response = await fetch(`/api/workouts/${workoutId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: parseInt(selectedAddUserId) }),
      });

      if (response.ok) {
        const user = allUsers.find((u) => u.id === parseInt(selectedAddUserId));
        setParticipants((prev) => [
          ...prev,
          { user_id: parseInt(selectedAddUserId), user_name: user?.name || 'Unknown', attended: false },
        ]);
        setSelectedAddUserId('');
      } else {
        const data = await response.json();
        setParticipantError(data.error || 'Failed to add participant');
      }
    } catch {
      setParticipantError('Failed to add participant');
    } finally {
      setParticipantLoading(false);
    }
  };

  const handleRemoveParticipant = async (userId: number) => {
    setParticipantError('');
    setParticipantLoading(true);

    try {
      const response = await fetch(`/api/workouts/${workoutId}/register`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });

      if (response.ok) {
        setParticipants((prev) => prev.filter((p) => p.user_id !== userId));
      } else {
        const data = await response.json();
        setParticipantError(data.error || 'Failed to remove participant');
      }
    } catch {
      setParticipantError('Failed to remove participant');
    } finally {
      setParticipantLoading(false);
    }
  };

  const unregisteredUsers = allUsers.filter(
    (u) => !participants.some((p) => p.user_id === u.id)
  );

  if (loading) return <Loading />;

  const moreOptions = (
    <MoreOptionsSection>
      <div>
        <label className="mb-1.5 block text-sm font-bold text-ink">Participants</label>
        {participantError && <ErrorMessage message={participantError} />}

        {participants.length === 0 ? (
          <p className="mb-3 text-sm text-ink-2">No participants yet.</p>
        ) : (
          <ul className="mb-3 space-y-1">
            {participants.map((p) => (
              <li
                key={p.user_id}
                className="flex items-center justify-between rounded-sm border border-line bg-canvas px-3 py-2"
              >
                <span className="text-sm text-ink">{p.user_name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveParticipant(p.user_id)}
                  disabled={participantLoading}
                  className="text-[13px] font-bold text-danger hover:underline disabled:opacity-50"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {unregisteredUsers.length > 0 && (
          <div className="flex gap-2">
            <select
              value={selectedAddUserId}
              onChange={(e) => setSelectedAddUserId(e.target.value)}
              className="min-h-11 flex-1 rounded-sm border border-line bg-paper px-3 text-sm text-ink focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
            >
              <option value="">Select a person to add...</option>
              {unregisteredUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddParticipant}
              disabled={!selectedAddUserId || participantLoading}
              className="min-h-11 rounded-sm bg-lime px-4 text-sm font-bold text-ink hover:opacity-90 disabled:opacity-40"
            >
              Add
            </button>
          </div>
        )}
      </div>
    </MoreOptionsSection>
  );

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-canvas py-6 md:py-10">
        <div className="mx-auto max-w-[1200px] px-4">
          <div className="mb-6 md:mb-8">
            <p className="text-[13px] font-bold uppercase tracking-[.14em] text-ink-2">Workouts</p>
            <h1 className="mt-2 font-display text-[58px] font-black leading-[.82] tracking-[-.01em] text-ink md:text-[96px]">
              Edit Workout
            </h1>
          </div>

          <div className="grid items-start gap-6">
            <div className="space-y-6">
              {error && <ErrorMessage message={error} />}
              {success && <SuccessMessage message={success} />}
              <WorkoutFormBody
                title={title}
                onTitleChange={setTitle}
                description={description}
                onDescriptionChange={setDescription}
                date={date}
                onDateChange={setDate}
                time={time}
                onTimeChange={setTime}
                maxParticipants={maxParticipants}
                onMaxParticipantsChange={setMaxParticipants}
                onSubmit={handleSubmit}
                loading={saving}
                submitLabel="Save changes"
                loadingLabel="Saving…"
                onCancel={() => router.back()}
                moreOptions={moreOptions}
              />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
