export const runtime = 'edge';

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Card, Input, TextArea, Button, ErrorMessage, SuccessMessage, Loading, TimeInput } from '@/components/ui';

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

  const workoutTypes = ['General', 'Strength', 'Cardio', 'HIIT', 'Mobility', 'Olympic Lifting', 'Gymnastics'];

  useEffect(() => {
    fetchWorkout();
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

        // Split date and time
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

  if (loading) return <Loading />;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-pure-dark py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <h1 className="text-4xl font-bold mb-8 text-pure-white">Edit Workout</h1>

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
                rows={4}
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
