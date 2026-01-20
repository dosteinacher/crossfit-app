'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Card, Loading, Button, ErrorMessage, SuccessMessage } from '@/components/ui';
import { format } from 'date-fns';

export default function WorkoutDetailPage() {
  const router = useRouter();
  const params = useParams();
  const workoutId = params.id as string;

  const [workout, setWorkout] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [workoutId]);

  const fetchData = async () => {
    try {
      // Check authentication
      const sessionResponse = await fetch('/api/auth/session');
      if (!sessionResponse.ok) {
        router.push('/login');
        return;
      }
      const sessionData = await sessionResponse.json();
      setUser(sessionData.user);

      // Fetch workout
      const workoutResponse = await fetch(`/api/workouts/${workoutId}`);
      if (workoutResponse.ok) {
        const workoutData = await workoutResponse.json();
        setWorkout(workoutData.workout);
      } else {
        setError('Workout not found');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setError('Failed to load workout');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const response = await fetch(`/api/workouts/${workoutId}/register`, {
        method: 'POST',
      });

      if (response.ok) {
        setSuccess('Successfully registered!');
        fetchData();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to register');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnregister = async () => {
    setError('');
    setSuccess('');
    setActionLoading(true);

    try {
      const response = await fetch(`/api/workouts/${workoutId}/register`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Successfully unregistered!');
        fetchData();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to unregister');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAttendance = async (userId: number, attended: boolean) => {
    try {
      const response = await fetch(`/api/workouts/${workoutId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, attended }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Mark attendance error:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this workout?')) return;

    try {
      const response = await fetch(`/api/workouts/${workoutId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/workouts');
      } else {
        setError('Failed to delete workout');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    }
  };

  if (loading) return <Loading />;

  if (!workout) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="container mx-auto px-4 max-w-4xl">
            <Card>
              <p className="text-red-600">Workout not found</p>
            </Card>
          </div>
        </div>
      </>
    );
  }

  const isPastWorkout = new Date(workout.date) < new Date();
  const isFull = workout.registered_count >= workout.max_participants;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {error && <ErrorMessage message={error} />}
          {success && <SuccessMessage message={success} />}

          <Card>
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-sm font-medium px-3 py-1 bg-blue-100 text-blue-800 rounded">
                  {workout.workout_type}
                </span>
                {workout.is_registered && (
                  <span className="ml-2 text-sm font-medium px-3 py-1 bg-green-100 text-green-800 rounded">
                    Registered
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Link href={`/workouts/${workoutId}/edit`}>
                  <Button variant="secondary" className="text-sm">
                    Edit
                  </Button>
                </Link>
                {user?.is_admin && (
                  <Button variant="danger" onClick={handleDelete} className="text-sm">
                    Delete
                  </Button>
                )}
              </div>
            </div>

            {/* Title and Date */}
            <h1 className="text-3xl font-bold text-gray-800 mb-4">{workout.title}</h1>
            
            <div className="flex items-center gap-4 text-gray-600 mb-6">
              <div>
                <span className="font-medium">Date:</span>{' '}
                {format(new Date(workout.date), 'EEEE, MMMM d, yyyy')}
              </div>
              <div>
                <span className="font-medium">Time:</span>{' '}
                {format(new Date(workout.date), 'h:mm a')}
              </div>
            </div>

            {/* Description */}
            {workout.description && (
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-2">Description</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{workout.description}</p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Created by</p>
                <p className="text-lg font-semibold text-gray-800">{workout.creator_name}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Participants</p>
                <p className="text-lg font-semibold text-gray-800">
                  {workout.registered_count}/{workout.max_participants}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-lg font-semibold text-gray-800">
                  {isPastWorkout ? 'Completed' : isFull ? 'Full' : 'Open'}
                </p>
              </div>
            </div>

            {/* Registration Button */}
            {!isPastWorkout && (
              <div className="mb-6">
                {workout.is_registered ? (
                  <Button
                    variant="danger"
                    onClick={handleUnregister}
                    disabled={actionLoading}
                    className="w-full"
                  >
                    {actionLoading ? 'Processing...' : 'Unregister'}
                  </Button>
                ) : (
                  <Button
                    onClick={handleRegister}
                    disabled={actionLoading || isFull}
                    className="w-full"
                  >
                    {actionLoading ? 'Processing...' : isFull ? 'Workout Full' : 'Register'}
                  </Button>
                )}
              </div>
            )}

            {/* Participants List */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Participants ({workout.participants.length})
              </h2>
              
              {workout.participants.length === 0 ? (
                <p className="text-gray-600">No participants yet</p>
              ) : (
                <div className="space-y-2">
                  {workout.participants.map((participant: any) => (
                    <div
                      key={participant.user_id}
                      className="flex justify-between items-center bg-gray-50 rounded-lg p-3"
                    >
                      <span className="font-medium text-gray-800">
                        {participant.user_name}
                      </span>
                      {isPastWorkout && user?.is_admin && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={participant.attended}
                            onChange={(e) =>
                              handleMarkAttendance(participant.user_id, e.target.checked)
                            }
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-600">Attended</span>
                        </label>
                      )}
                      {isPastWorkout && !user?.is_admin && participant.attended && (
                        <span className="text-sm font-medium text-green-600">✓ Attended</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <div className="mt-6">
            <Link href="/workouts">
              <Button variant="secondary">← Back to Workouts</Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
