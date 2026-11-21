'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Button, ErrorMessage, SuccessMessage } from '@/components/ui';
import WorkoutFormBody from '@/components/WorkoutFormBody';
import MoreOptionsSection from '@/components/MoreOptionsSection';
import { getMainWorkoutFormat } from '@/lib/workoutNotation';

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

  const parsedWorkoutType = getMainWorkoutFormat(description);
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
          workout_type: parsedWorkoutType || workoutType,
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
              workout_type: parsedWorkoutType || workoutType,
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

  const moreOptions = (
    <MoreOptionsSection>
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
    </MoreOptionsSection>
  );

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
            <Link href="/archive" className="hidden md:block">
              <Button type="button" variant="secondary">⧉ Copy an old workout</Button>
            </Link>
          </div>

          {templateId && (
            <div className="mb-6 border-l-4 border-ink bg-paper p-4 text-ink">
              <p className="text-base text-ink-2">
                <strong>Using template!</strong> Edit as needed and schedule for a specific date/time.
              </p>
            </div>
          )}

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
                loading={loading}
                submitLabel="Create workout"
                loadingLabel="Creating…"
                onCancel={() => router.back()}
                showStartScreen
                moreOptions={moreOptions}
              />
            </div>
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
