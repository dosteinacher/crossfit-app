'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Card, Input, TextArea, Button, ErrorMessage, SuccessMessage, TimeInput } from '@/components/ui';

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
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

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

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        
        // Pre-select users from poll if provided
        if (preselectUsers) {
          const userIdsToSelect = preselectUsers.split(',').filter(id => id);
          setSelectedUserIds(userIdsToSelect);
        }
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
