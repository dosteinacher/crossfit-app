'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Card, Input, TextArea, Button, ErrorMessage, SuccessMessage, TimeInput } from '@/components/ui';
import { format } from 'date-fns';

const WEEKDAY_TIMES = ['08:00', '12:00', '18:00']; // Mon–Fri: 8am, 12pm, 6pm
const SATURDAY_TIMES = ['09:00', '10:00', '11:00']; // Sat: 9am, 10am, 11am
const POLL_DAYS = 7;

function generateOptionsFromStartDate(startDate: string): Array<{ date: string; time: string; label: string }> {
  if (!startDate) return [];
  const options: Array<{ date: string; time: string; label: string }> = [];
  const start = new Date(startDate + 'T12:00:00');
  for (let d = 0; d < POLL_DAYS; d++) {
    const day = new Date(start);
    day.setDate(start.getDate() + d);
    const dayOfWeek = day.getDay(); // 0 Sun, 1 Mon, ..., 6 Sat
    if (dayOfWeek === 0) continue; // Sunday: no slots
    const dateStr = day.getFullYear() + '-' + String(day.getMonth() + 1).padStart(2, '0') + '-' + String(day.getDate()).padStart(2, '0');
    const times = dayOfWeek === 6 ? SATURDAY_TIMES : WEEKDAY_TIMES;
    for (const time of times) {
      options.push({ date: dateStr, time, label: '' });
    }
  }
  return options;
}

export default function CreatePollPage() {
  const router = useRouter();
  const [startDate, setStartDate] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [options, setOptions] = useState<Array<{ date: string; time: string; label: string }>>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (startDate) {
      setOptions(generateOptionsFromStartDate(startDate));
    } else {
      setOptions([]);
    }
  }, [startDate]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Fetch templates error:', error);
    }
  };

  const addOption = () => {
    setOptions([...options, { date: '', time: '12:00', label: '' }]);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, field: string, value: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!startDate) {
      setError('Please set the poll start date');
      return;
    }

    const validOptions = options.filter((opt) => opt.date && opt.time);
    if (validOptions.length === 0) {
      setError('Please add at least one time slot (or set a start date to generate the default week)');
      return;
    }

    setLoading(true);

    try {
      // Format options for API
      const formattedOptions = validOptions.map((opt) => ({
        date: new Date(`${opt.date}T${opt.time}`).toISOString(),
        label: opt.label || undefined,
      }));

      const response = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          template_id: templateId ? parseInt(templateId) : null,
          options: formattedOptions,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Poll created and is now active! Redirecting to your poll…');
        setTimeout(() => router.push(`/calendar/${data.poll.id}`), 1500);
      } else {
        setError(data.error || 'Failed to create poll');
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
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-4xl font-bold text-pure-white mb-8">Create Availability Poll</h1>

          <Card className="bg-pure-gray border-gray-700">
            {error && <ErrorMessage message={error} />}
            {success && <SuccessMessage message={success} />}

            <form onSubmit={handleSubmit}>
              <Input
                label="Poll start date"
                type="date"
                value={startDate}
                onChange={setStartDate}
                required
              />
              <p className="text-sm text-gray-400 mb-4">
                Mon–Fri: 8am, 12pm, 6pm. Saturday: 9am, 10am, 11am. Sunday: no slots. You can remove or add slots below.
              </p>

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

              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-pure-white">
                    Time Slot Options <span className="text-red-500">*</span>
                  </label>
                  <Button type="button" onClick={addOption} variant="secondary" className="text-sm">
                    + Add Time Slot
                  </Button>
                </div>

                <div className="space-y-3">
                  {options.map((option, index) => {
                    const isFilled = option.date && option.time;
                    const optionDate = option.date ? new Date(option.date + 'T12:00:00') : null;
                    const timeLabel = option.time === '08:00' ? '8am' : option.time === '12:00' ? '12pm' : option.time === '18:00' ? '6pm' : option.time === '09:00' ? '9am' : option.time === '10:00' ? '10am' : option.time === '11:00' ? '11am' : option.time;
                    return (
                      <div key={index} className="bg-pure-dark border border-gray-700 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                            {isFilled ? (
                              <>
                                <div className="md:col-span-2 flex items-center">
                                  <span className="text-pure-white font-medium">
                                    {optionDate ? format(optionDate, 'EEE d MMM') : ''}, {timeLabel}
                                  </span>
                                </div>
                                <Input
                                  label="Label (Optional)"
                                  type="text"
                                  value={option.label}
                                  onChange={(val) => updateOption(index, 'label', val)}
                                  placeholder="e.g., Morning"
                                  className="mb-0"
                                />
                              </>
                            ) : (
                              <>
                                <Input
                                  label="Date"
                                  type="date"
                                  value={option.date}
                                  onChange={(val) => updateOption(index, 'date', val)}
                                  className="mb-0"
                                />
                                <TimeInput
                                  label="Time"
                                  value={option.time}
                                  onChange={(val) => updateOption(index, 'time', val)}
                                  className="mb-0"
                                />
                                <Input
                                  label="Label (Optional)"
                                  type="text"
                                  value={option.label}
                                  onChange={(val) => updateOption(index, 'label', val)}
                                  placeholder="e.g., Morning"
                                  className="mb-0"
                                />
                              </>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeOption(index)}
                            className="mt-7 text-red-400 hover:text-red-300 transition shrink-0"
                            title="Remove slot"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className="text-sm text-gray-400 mt-4">
                Click Create Poll to publish. Your poll will then appear under &quot;Active&quot; on the Calendar page so others can vote.
              </p>
              <div className="flex gap-4 mt-6">
                <Button type="submit" disabled={loading || !startDate} className="flex-1">
                  {loading ? 'Creating...' : 'Create Poll'}
                </Button>
                <Link href="/calendar">
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
