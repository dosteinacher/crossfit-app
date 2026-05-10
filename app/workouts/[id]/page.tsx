'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Card, Loading, Button, ErrorMessage, SuccessMessage } from '@/components/ui';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

export default function WorkoutDetailPage() {
  const router = useRouter();
  const params = useParams();
  const workoutId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [workout, setWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [resultSaving, setResultSaving] = useState(false);
  const [editResult, setEditResult] = useState('');
  const [editRating, setEditRating] = useState<number | ''>('');
  const [dayNav, setDayNav] = useState<{
    previousId: number | null;
    nextId: number | null;
  } | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [edits, setEdits] = useState<Array<{ id: number; editor_name: string; edited_at: string }>>([]);

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [workoutId, authLoading]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const el = e.target as HTMLElement | null;
      if (el?.closest('textarea, input, select, [contenteditable=true]')) {
        return;
      }
      if (e.key === 'ArrowLeft' && dayNav?.previousId != null) {
        e.preventDefault();
        router.push(`/workouts/${dayNav.previousId}`);
      }
      if (e.key === 'ArrowRight' && dayNav?.nextId != null) {
        e.preventDefault();
        router.push(`/workouts/${dayNav.nextId}`);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dayNav, router]);

  const fetchData = async () => {
    try {
      // Fetch workout
      const workoutResponse = await fetch(`/api/workouts/${workoutId}`);
      if (workoutResponse.ok) {
        const workoutData = await workoutResponse.json();
        const w = workoutData.workout;
        if (w) {
          setWorkout({ ...w, participants: Array.isArray(w.participants) ? w.participants : [] });
          setEditResult(typeof w.result === 'string' ? w.result : '');
          const r = w.rating;
          setEditRating(r != null && r >= 1 && r <= 5 ? Number(r) : '');
          const nav = workoutData.navigation;
          setDayNav(
            nav &&
            typeof nav.previousId !== 'undefined' &&
            typeof nav.nextId !== 'undefined'
              ? { previousId: nav.previousId, nextId: nav.nextId }
              : null
          );
          if (Array.isArray(workoutData.edits)) setEdits(workoutData.edits);
        } else {
          setError('Workout not found');
        }
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
      await fetch(`/api/workouts/${workoutId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, attended }),
      });
      fetchData();
    } catch (error) {
      console.error('Mark attendance error:', error);
    }
  };

  const handleMarkAllAttendance = async (attended: boolean) => {
    try {
      await fetch(`/api/workouts/${workoutId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulk: true, attended }),
      });
      fetchData();
    } catch (error) {
      console.error('Bulk attendance error:', error);
    }
  };

  const handleSaveResult = async () => {
    setError('');
    setSuccess('');
    setResultSaving(true);
    try {
      const response = await fetch(`/api/workouts/${workoutId}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result: typeof editResult === 'string' ? editResult.trim() || null : null,
          rating: editRating === '' ? null : Number(editRating),
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.workout) setWorkout(data.workout);
        setSuccess('Result and rating saved.');
        fetchData();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save result');
      }
    } catch (err) {
      setError('Failed to save result.');
    } finally {
      setResultSaving(false);
    }
  };

  const handleDelete = async () => {
    setCancelling(true);
    try {
      const response = await fetch(`/api/workouts/${workoutId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellation_reason: cancelReason }),
      });
      if (response.ok) {
        router.push('/workouts');
      } else {
        setError('Failed to cancel workout');
        setShowCancelModal(false);
      }
    } catch {
      setError('An error occurred. Please try again.');
      setShowCancelModal(false);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <Loading />;

  if (!workout) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-pure-dark py-8">
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
      <div className="min-h-screen bg-pure-dark py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {error && <ErrorMessage message={error} />}
          {success && <SuccessMessage message={success} />}

          <Card>
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-sm font-medium px-3 py-1 bg-coastal-sky/20 text-coastal-sky border border-coastal-sky/30 rounded">
                  {workout.workout_type}
                </span>
                {workout.is_registered && (
                  <span className="ml-2 text-sm font-medium px-3 py-1 bg-coastal-day text-pure-dark rounded">
                    Registered
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {workout.deleted_at ? (
                  <span className="text-sm font-medium px-3 py-1 bg-red-900/40 text-red-300 border border-red-700/50 rounded">
                    Cancelled
                  </span>
                ) : (
                  <>
                    <Link href={`/workouts/${workoutId}/edit`}>
                      <Button variant="secondary" className="text-sm">Edit</Button>
                    </Link>
                    {user?.is_admin && (
                      <Button variant="danger" onClick={() => setShowCancelModal(true)} className="text-sm">
                        Cancel Workout
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Title with prev/next workout (schedule order — same day or adjacent days) */}
            <div className="flex items-start gap-2 sm:gap-4 mb-4">
              <div className="flex-shrink-0 pt-1">
                {dayNav?.previousId != null ? (
                  <Link
                    href={`/workouts/${dayNav.previousId}`}
                    className="inline-flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg border-2 border-coastal-sky text-coastal-sky hover:bg-coastal-sky/20 transition text-lg font-semibold"
                    aria-label="Previous workout"
                    title="Earlier workout (same day or day before)"
                  >
                    ←
                  </Link>
                ) : (
                  <span
                    className="inline-flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg border border-gray-600 text-gray-600 cursor-not-allowed text-lg"
                    aria-hidden
                  >
                    ←
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-pure-white flex-1 min-w-0 text-center sm:text-left leading-tight">
                {workout.title}
              </h1>
              <div className="flex-shrink-0 pt-1">
                {dayNav?.nextId != null ? (
                  <Link
                    href={`/workouts/${dayNav.nextId}`}
                    className="inline-flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg border-2 border-coastal-sky text-coastal-sky hover:bg-coastal-sky/20 transition text-lg font-semibold"
                    aria-label="Next workout"
                    title="Later workout (same day or next day)"
                  >
                    →
                  </Link>
                ) : (
                  <span
                    className="inline-flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg border border-gray-600 text-gray-600 cursor-not-allowed text-lg"
                    aria-hidden
                  >
                    →
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-pure-text-light mb-6">
              <div>
                <span className="font-medium">Date:</span>{' '}
                {format(new Date(workout.date), 'EEEE, MMMM d, yyyy')}
              </div>
              <div>
                <span className="font-medium">Time:</span>{' '}
                {format(new Date(workout.date), 'h:mm a')}
              </div>
            </div>

            {/* Cancellation notice */}
            {workout.deleted_at && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-700/40 rounded-lg">
                <p className="text-red-300 font-medium">This workout has been cancelled.</p>
                {workout.cancellation_reason && (
                  <p className="text-red-400/80 text-sm mt-1">{workout.cancellation_reason}</p>
                )}
              </div>
            )}

            {/* Description */}
            {workout.description && (
              <div className="mb-6">
                <h2 className="text-xl font-bold text-pure-white mb-2">Description</h2>
                <p className="text-pure-text-light whitespace-pre-wrap">{workout.description}</p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-pure-dark border border-coastal-search rounded-lg p-4">
                <p className="text-sm text-pure-text-light">Created by</p>
                <p className="text-lg font-semibold text-pure-white">{workout.creator_name || 'Unknown'}</p>
              </div>
              <div className="bg-pure-dark border border-coastal-search rounded-lg p-4">
                <p className="text-sm text-pure-text-light">Participants</p>
                <p className="text-lg font-semibold text-pure-white">
                  {workout.registered_count}/{workout.max_participants}
                </p>
              </div>
              <div className="bg-pure-dark border border-coastal-search rounded-lg p-4">
                <p className="text-sm text-pure-text-light">Status</p>
                <p className="text-lg font-semibold text-pure-white">
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

            {/* Result & Rating (past workouts only) */}
            {isPastWorkout && (
              <div className="mb-6 space-y-4">
                <h2 className="text-xl font-bold text-pure-white">Result & Rating</h2>
                {(workout.is_registered || (user && workout.created_by === user.id)) ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-pure-text-light mb-1">
                        Result (time, reps, or notes)
                      </label>
                      <textarea
                        value={editResult}
                        onChange={(e) => setEditResult(e.target.value)}
                        placeholder="e.g. 12:34 or 3 rounds + 5 reps"
                        rows={2}
                        className="w-full px-4 py-2 bg-pure-dark border border-coastal-search rounded-lg text-pure-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pure-green"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-pure-text-light mb-2">
                        How hard was it? (1–5)
                      </label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setEditRating(Number(editRating) === n ? '' : n)}
                            className={`w-10 h-10 rounded-lg font-semibold border-2 transition ${
                              Number(editRating) === n
                                ? 'bg-pure-green border-pure-green text-black'
                                : 'border-coastal-search text-pure-text-light hover:border-pure-green'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button
                      onClick={handleSaveResult}
                      disabled={resultSaving}
                      className="w-full sm:w-auto"
                    >
                      {resultSaving ? 'Saving...' : 'Save result & rating'}
                    </Button>
                  </>
                ) : (
                  <div className="space-y-2">
                    {workout.result ? (
                      <p className="text-pure-text-light whitespace-pre-wrap">{workout.result}</p>
                    ) : (
                      <p className="text-gray-500">No result recorded yet.</p>
                    )}
                    {workout.rating != null && workout.rating >= 1 && workout.rating <= 5 ? (
                      <p className="text-pure-text-light">
                        Rating: {workout.rating}/5
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            )}

            {/* Participants List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-pure-white">
                  Participants ({(workout.participants || []).length})
                </h2>
                {isPastWorkout && user?.is_admin && (workout.participants || []).length > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMarkAllAttendance(true)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-pure-green/20 text-pure-green border border-pure-green/40 hover:bg-pure-green/30 transition font-medium"
                    >
                      ✓ All attended
                    </button>
                    <button
                      onClick={() => handleMarkAllAttendance(false)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-gray-700/50 text-gray-400 border border-gray-600 hover:bg-gray-700 transition font-medium"
                    >
                      ✗ Clear all
                    </button>
                  </div>
                )}
              </div>

              {(workout.participants || []).length === 0 ? (
                <p className="text-pure-text-light">No participants yet</p>
              ) : (
                <div className="space-y-2">
                  {(workout.participants || []).map((participant: any) => (
                    <div
                      key={participant.user_id}
                      className="flex justify-between items-center bg-pure-dark border border-coastal-search rounded-lg p-3"
                    >
                      <span className="font-medium text-pure-white">
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
                            className="w-4 h-4 text-pure-green rounded focus:ring-2 focus:ring-pure-green"
                          />
                          <span className="text-sm text-pure-text-light">Attended</span>
                        </label>
                      )}
                      {isPastWorkout && !user?.is_admin && participant.attended && (
                        <span className="text-sm font-medium text-coastal-day">✓ Attended</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {edits.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-pure-text-light mb-2 uppercase tracking-wide">Edit History</h3>
              <div className="space-y-1">
                {edits.map((e) => (
                  <p key={e.id} className="text-xs text-gray-500">
                    Edited by <span className="text-pure-text-light">{e.editor_name}</span> · {format(new Date(e.edited_at), 'MMM d, yyyy · h:mm a')}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <Link href="/workouts">
              <Button variant="secondary">← Back to Workouts</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Cancel workout modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-pure-gray border border-gray-700 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-pure-white mb-2">Cancel Workout</h2>
            <p className="text-pure-text-light text-sm mb-4">
              This will soft-cancel the workout. Registered members will be notified.
            </p>
            <label className="block text-sm font-medium text-pure-text-light mb-1">
              Reason <span className="text-gray-500">(optional)</span>
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Coach is sick, facility unavailable…"
              rows={3}
              className="w-full px-4 py-2 bg-pure-dark border border-gray-600 rounded-lg text-pure-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 mb-5 resize-none"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowCancelModal(false); setCancelReason(''); }}
                disabled={cancelling}
                className="px-4 py-2 rounded-lg border border-gray-600 text-pure-white hover:bg-gray-700 transition font-medium"
              >
                Keep Workout
              </button>
              <button
                onClick={handleDelete}
                disabled={cancelling}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition disabled:opacity-50"
              >
                {cancelling ? 'Cancelling…' : 'Yes, Cancel Workout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
