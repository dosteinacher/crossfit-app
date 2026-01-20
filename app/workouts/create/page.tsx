'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Card, Input, TextArea, Button, ErrorMessage, SuccessMessage } from '@/components/ui';

export default function CreateWorkoutPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workoutType, setWorkoutType] = useState('General');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('20');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const workoutTypes = ['General', 'Strength', 'Cardio', 'HIIT', 'Mobility', 'Olympic Lifting', 'Gymnastics'];

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
        }),
      });

      const data = await response.json();

      if (response.ok) {
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
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <h1 className="text-4xl font-bold mb-8 text-gray-800">Create New Workout</h1>

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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Workout Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={workoutType}
                  onChange={(e) => setWorkoutType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {workoutTypes.map((type) => (
                    <option key={type} value={type}>
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

                <Input
                  label="Time"
                  type="time"
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
                placeholder="20"
                required
              />

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
