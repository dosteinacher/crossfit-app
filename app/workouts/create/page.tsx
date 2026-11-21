'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Card, Button, ErrorMessage, SuccessMessage } from '@/components/ui';
import PasteFirstWorkoutEditor from '@/components/PasteFirstWorkoutEditor';
import { getMainWorkoutFormat } from '@/lib/workoutNotation';
import { classifyLines } from '@/lib/classifyLines';
import { cleanPastedText } from '@/lib/pasteCleanup';

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
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [mobileStep, setMobileStep] = useState<'start' | 'editor'>('start');
  const [mobileTab, setMobileTab] = useState<'text' | 'preview'>('text');
  const [pasteError, setPasteError] = useState('');

  const parsedWorkoutType = getMainWorkoutFormat(description);
  const checkCount = classifyLines(description).filter((c) => c.kind === 'check').length;
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

  const handlePasteFromClipboard = async () => {
    setPasteError('');
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setPasteError('Your clipboard is empty.');
        return;
      }
      setDescription(cleanPastedText(text));
      setMobileTab('preview');
      setMobileStep('editor');
    } catch {
      setPasteError("Couldn't read your clipboard. Copy the workout text first, then try again.");
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

  const moreOptionsSection = (
    <div className="border-t border-line-2 pt-3">
      <button
        type="button"
        onClick={() => setMoreOptionsOpen(!moreOptionsOpen)}
        aria-expanded={moreOptionsOpen}
        className="flex min-h-11 w-full items-center justify-between text-left text-sm font-bold text-ink"
      >
        <span>More options</span>
        <span aria-hidden="true" className="text-lg">{moreOptionsOpen ? '−' : '+'}</span>
      </button>
      {moreOptionsOpen && (
        <div className="space-y-5 pt-3">
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
        </div>
      )}
    </div>
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
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Phone flow: a dedicated start screen, then a single Text|Preview
                    tab with a bottom-sheet ✎ Edit and a sticky Save bar — replacing
                    the desktop two-column layout, which doesn't fit a phone screen. */}
                <div className="md:hidden">
                  {mobileStep === 'start' ? (
                    <Card className="space-y-5">
                      <div>
                        <label htmlFor="workout-title-m" className="mb-1.5 block text-sm font-bold text-ink">Title</label>
                        <input
                          id="workout-title-m"
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="e.g., Monday Morning WOD"
                          required
                          className="min-h-12 w-full rounded-sm border border-line bg-paper px-3 py-2 text-base text-ink placeholder:text-ink-2 focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <label className="min-h-12 flex-1 rounded-sm border border-line bg-paper px-3 py-1.5">
                          <span className="block text-[11px] font-bold text-ink-2">Date</span>
                          <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                            lang="de-CH"
                            className="w-full bg-transparent text-sm font-semibold text-ink focus:outline-none"
                          />
                        </label>
                        <label className="min-h-12 flex-1 rounded-sm border border-line bg-paper px-3 py-1.5">
                          <span className="block text-[11px] font-bold text-ink-2">Time</span>
                          <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            required
                            className="w-full bg-transparent text-sm font-semibold text-ink focus:outline-none"
                          />
                        </label>
                        <label className="min-h-12 flex-1 rounded-sm border border-line bg-paper px-3 py-1.5">
                          <span className="block text-[11px] font-bold text-ink-2">Max</span>
                          <input
                            type="number"
                            min={1}
                            value={maxParticipants}
                            onChange={(e) => setMaxParticipants(e.target.value)}
                            required
                            className="w-full bg-transparent text-sm font-semibold text-ink focus:outline-none"
                          />
                        </label>
                      </div>

                      {pasteError && <ErrorMessage message={pasteError} />}

                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setMobileStep('editor')}
                          className="min-h-[72px] w-full rounded-sm border-2 border-ink bg-paper text-left px-4 text-base font-bold text-ink hover:bg-canvas"
                        >
                          ✎ Type it now
                        </button>
                        <button
                          type="button"
                          onClick={handlePasteFromClipboard}
                          className="min-h-[72px] w-full rounded-sm bg-lime text-left px-4 text-base font-bold text-ink hover:opacity-90"
                        >
                          📋 Paste from WhatsApp
                        </button>
                        <Link href="/archive" className="block">
                          <span className="flex min-h-[72px] w-full items-center rounded-sm border border-line bg-paper px-4 text-base font-bold text-ink hover:bg-canvas">
                            ⧉ Copy an old workout
                          </span>
                        </Link>
                      </div>
                    </Card>
                  ) : (
                    <div>
                      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-2 border-b border-line bg-canvas/95 px-4 py-2 backdrop-blur-sm">
                        <button type="button" onClick={() => setMobileStep('start')} className="min-h-10 shrink-0 text-sm font-bold text-ink">
                          ‹ Back
                        </button>
                        <p className="min-w-0 truncate text-sm font-bold text-ink" style={{ hyphens: 'none' }}>
                          {title || 'Untitled workout'}
                        </p>
                        <span className="w-10 shrink-0" aria-hidden="true" />
                      </div>

                      <div className="mt-3 flex rounded-sm border border-line bg-paper p-1">
                        <button
                          type="button"
                          onClick={() => setMobileTab('text')}
                          className={`min-h-9 flex-1 rounded-sm text-sm font-bold ${mobileTab === 'text' ? 'bg-ink text-lime' : 'text-ink'}`}
                        >
                          Text
                        </button>
                        <button
                          type="button"
                          onClick={() => setMobileTab('preview')}
                          className={`min-h-9 flex-1 rounded-sm text-sm font-bold ${mobileTab === 'preview' ? 'bg-ink text-lime' : 'text-ink'}`}
                        >
                          Preview
                        </button>
                      </div>

                      <div className="mt-3">
                        <PasteFirstWorkoutEditor
                          title={title}
                          description={description}
                          onDescriptionChange={setDescription}
                          onTitleChange={setTitle}
                          mobileView={mobileTab}
                          useBottomSheetForEdit
                        />
                      </div>

                      <div className="mt-4">{moreOptionsSection}</div>

                      <div className="sticky bottom-0 z-20 -mx-4 mt-4 flex flex-wrap items-center gap-3 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur-sm">
                        <Button type="submit" disabled={loading} className="flex-1">
                          {loading ? 'Creating…' : 'Create workout'}
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => router.back()} className="flex-1">
                          Cancel
                        </Button>
                        {checkCount > 0 && (
                          <p className="w-full text-[13px] text-ink-2">
                            {checkCount} line{checkCount === 1 ? '' : 's'} may need a look — you can still create it.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Desktop: Basics row + two-column editor side by side. */}
                <div className="hidden md:block space-y-5">
                <Card className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-4">
                    <div className="sm:col-span-1">
                      <label htmlFor="workout-title" className="mb-1.5 block text-sm font-bold text-ink">Title</label>
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
                      <label htmlFor="workout-date" className="mb-1.5 block text-sm font-bold text-ink">Date</label>
                      <input
                        id="workout-date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                        lang="de-CH"
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
                    <div>
                      <label htmlFor="max-participants" className="mb-1.5 block text-sm font-bold text-ink">Max people</label>
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
                  </div>

                  <div>
                    <PasteFirstWorkoutEditor title={title} description={description} onDescriptionChange={setDescription} onTitleChange={setTitle} />
                  </div>

                  {moreOptionsSection}
                </Card>
                <div className="sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur-sm">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading ? 'Creating…' : 'Create workout'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => router.back()} className="flex-1">
                    Cancel
                  </Button>
                  {checkCount > 0 && (
                    <p className="w-full text-[13px] text-ink-2">
                      {checkCount} line{checkCount === 1 ? '' : 's'} in the workout text may need a look — you can still create it.
                    </p>
                  )}
                </div>
                </div>
              </form>
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
