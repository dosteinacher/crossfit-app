'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Card, Input, TextArea, Button, ErrorMessage, SuccessMessage, TimeInput, Loading } from '@/components/ui';
import { format } from 'date-fns';

export default function EditPollPage() {
  const router = useRouter();
  const params = useParams();
  const pollId = params.id as string;

  const [poll, setPoll] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [existingOptions, setExistingOptions] = useState<any[]>([]);
  const [newOptions, setNewOptions] = useState<Array<{ date: string; time: string; label: string }>>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [pollId]);

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

      // Fetch poll
      const pollResponse = await fetch(`/api/polls/${pollId}`);
      if (pollResponse.ok) {
        const pollData = await pollResponse.json();
        setPoll(pollData.poll);
        setTitle(pollData.poll.title);
        setDescription(pollData.poll.description || '');
        setTemplateId(pollData.poll.template_id?.toString() || '');
        setExistingOptions(pollData.poll.options || []);
      } else {
        setError('Poll not found');
      }

      // Fetch templates
      const templatesResponse = await fetch('/api/templates');
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        setTemplates(templatesData.templates);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setError('Failed to load poll');
    } finally {
      setLoading(false);
    }
  };

  const addNewOption = () => {
    setNewOptions([...newOptions, { date: '', time: '12:00', label: '' }]);
  };

  const removeNewOption = (index: number) => {
    setNewOptions(newOptions.filter((_, i) => i !== index));
  };

  const updateNewOption = (index: number, field: string, value: string) => {
    const updated = [...newOptions];
    updated[index] = { ...updated[index], [field]: value };
    setNewOptions(updated);
  };

  const deleteExistingOption = async (optionId: number) => {
    if (!confirm('Are you sure you want to delete this time slot? All votes for it will be removed.')) {
      return;
    }

    try {
      const response = await fetch(`/api/polls/${pollId}/options?option_id=${optionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setExistingOptions(existingOptions.filter(opt => opt.id !== optionId));
        setSuccess('Time slot deleted successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to delete time slot');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      // 1. Update poll details
      const updateResponse = await fetch(`/api/polls/${pollId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          template_id: templateId ? parseInt(templateId) : null,
        }),
      });

      if (!updateResponse.ok) {
        const data = await updateResponse.json();
        setError(data.error || 'Failed to update poll');
        setSaving(false);
        return;
      }

      // 2. Add new options
      for (const option of newOptions) {
        if (option.date && option.time) {
          const dateTime = new Date(`${option.date}T${option.time}`).toISOString();
          await fetch(`/api/polls/${pollId}/options`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date: dateTime,
              label: option.label || undefined,
            }),
          });
        }
      }

      setSuccess('Poll updated successfully!');
      setTimeout(() => router.push(`/calendar/${pollId}`), 1500);
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  if (!poll) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-pure-dark py-8">
          <div className="container mx-auto px-4 max-w-4xl">
            <Card className="bg-pure-gray border-gray-700">
              <p className="text-red-400">Poll not found</p>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-pure-dark py-8">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-4xl font-bold text-pure-white mb-8">Edit Poll</h1>

          <Card className="bg-pure-gray border-gray-700">
            {error && <ErrorMessage message={error} />}
            {success && <SuccessMessage message={success} />}

            <form onSubmit={handleSubmit}>
              <Input
                label="Poll Title"
                type="text"
                value={title}
                onChange={setTitle}
                placeholder="e.g., Week of January 22 - Vote for your times"
                required
              />

              <TextArea
                label="Description (Optional)"
                value={description}
                onChange={setDescription}
                placeholder="Any additional info..."
                rows={2}
              />

              <div className="mb-4">
                <label className="block text-sm font-medium text-pure-white mb-1">
                  Link to Workout Template (Optional)
                </label>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="w-full px-3 py-2 bg-pure-dark border border-gray-700 text-pure-white rounded-lg focus:outline-none focus:ring-2 focus:ring-pure-green"
                >
                  <option value="">TBD - Decide later</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id} className="bg-pure-dark text-pure-white">
                      {template.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Existing Time Slots */}
              <div className="mb-6">
                <h2 className="text-lg font-medium text-pure-white mb-3">Existing Time Slots</h2>
                {existingOptions.length === 0 ? (
                  <p className="text-gray-400 text-sm">No time slots yet</p>
                ) : (
                  <div className="space-y-2">
                    {existingOptions.map((option) => (
                      <div key={option.id} className="bg-pure-dark border border-gray-700 rounded-lg p-4 flex items-center justify-between">
                        <div>
                          <p className="text-pure-white font-medium">
                            {format(new Date(option.date), 'EEEE, MMM d')} at{' '}
                            {format(new Date(option.date), 'h:mm a')}
                          </p>
                          {option.label && (
                            <p className="text-sm text-gray-400">{option.label}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {option.vote_count} vote{option.vote_count !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => deleteExistingOption(option.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Delete
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* New Time Slots */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-pure-white">
                    Add New Time Slots
                  </label>
                  <Button type="button" onClick={addNewOption} variant="secondary" className="text-sm">
                    + Add Time Slot
                  </Button>
                </div>

                {newOptions.length > 0 && (
                  <div className="space-y-3">
                    {newOptions.map((option, index) => (
                      <div key={index} className="bg-pure-dark border border-gray-700 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                            <Input
                              label={`Date ${index + 1}`}
                              type="date"
                              value={option.date}
                              onChange={(val) => updateNewOption(index, 'date', val)}
                              required
                              className="mb-0"
                            />
                            <TimeInput
                              label={`Time ${index + 1}`}
                              value={option.time}
                              onChange={(val) => updateNewOption(index, 'time', val)}
                              required
                              className="mb-0"
                            />
                            <Input
                              label="Label (Optional)"
                              type="text"
                              value={option.label}
                              onChange={(val) => updateNewOption(index, 'label', val)}
                              placeholder="e.g., Morning"
                              className="mb-0"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeNewOption(index)}
                            className="mt-7 text-red-400 hover:text-red-300 transition"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-4 mt-6">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Link href={`/calendar/${pollId}`}>
                  <Button type="button" variant="secondary" className="flex-1">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
