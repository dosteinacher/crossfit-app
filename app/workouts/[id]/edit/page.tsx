'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Card, Input, TextArea, Button, ErrorMessage, SuccessMessage, Loading, TimeInput } from '@/components/ui';

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

  const workoutTypes = ['General', 'Strength', 'Cardio', 'HIIT', 'Mobility', 'Olympic Lifting', 'Gymnastics'];

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
          workout_type: workoutType,
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

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-pure-bg py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <h1 className="text-4xl font-bold mb-8 text-pure-ink">Edit Workout</h1>

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
                rows={16}
                textareaClassName="min-h-[22rem]"
              />

              <div className="mb-4">
                <label className="block text-sm font-medium text-pure-ink mb-1">
                  Workout Type <span className="text-red-600">*</span>
                </label>
                <select
                  value={workoutType}
                  onChange={(e) => setWorkoutType(e.target.value)}
                  className="w-full px-3 py-2 bg-pure-bg border border-gray-200 text-pure-ink rounded-lg focus:outline-none focus:ring-2 focus:ring-pure-green"
                  required
                >
                  {workoutTypes.map((type) => (
                    <option key={type} value={type} className="bg-pure-bg text-pure-ink">
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

              <div className="mb-6">
                <label className="block text-sm font-medium text-pure-ink mb-1">
                  Participants
                </label>
                {participantError && (
                  <p className="text-red-600 text-xs mb-2">{participantError}</p>
                )}

                {participants.length === 0 ? (
                  <p className="text-pure-text-light text-sm mb-3">No participants yet.</p>
                ) : (
                  <ul className="mb-3 space-y-1">
                    {participants.map((p) => (
                      <li
                        key={p.user_id}
                        className="flex items-center justify-between bg-pure-bg border border-gray-200 rounded-lg px-3 py-2"
                      >
                        <span className="text-sm text-pure-ink">{p.user_name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveParticipant(p.user_id)}
                          disabled={participantLoading}
                          className="text-red-600 hover:text-red-700 text-xs font-medium disabled:opacity-50"
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
                      className="flex-1 px-3 py-2 bg-pure-bg border border-gray-200 text-pure-ink rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pure-green"
                    >
                      <option value="">Select a person to add...</option>
                      {unregisteredUsers.map((u) => (
                        <option key={u.id} value={u.id} className="bg-pure-bg">
                          {u.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddParticipant}
                      disabled={!selectedAddUserId || participantLoading}
                      className="px-4 py-2 bg-pure-green text-black text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-40"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-4 mt-6">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? 'Saving...' : 'Save Changes'}
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
