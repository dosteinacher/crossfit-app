'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Card, Input, TextArea, Button, ErrorMessage, SuccessMessage, TimeInput } from '@/components/ui';

export default function CreatePollPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [options, setOptions] = useState<Array<{ date: string; time: string; label: string }>>([
    { date: '', time: '12:00', label: '' },
  ]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

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
    if (options.length > 1) {
      setOptions(options.filter((_, i) => i !== index));
    }
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

    // Validate options
    const validOptions = options.filter((opt) => opt.date && opt.time);
    if (validOptions.length === 0) {
      setError('Please add at least one time slot with date and time');
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
        setSuccess('Poll created successfully!');
        setTimeout(() => router.push(`/polls/${data.poll.id}`), 1500);
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
                  {options.map((option, index) => (
                    <div key={index} className="bg-pure-dark border border-gray-700 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                          <Input
                            label={`Date ${index + 1}`}
                            type="date"
                            value={option.date}
                            onChange={(val) => updateOption(index, 'date', val)}
                            required
                            className="mb-0"
                          />
                          <TimeInput
                            label={`Time ${index + 1}`}
                            value={option.time}
                            onChange={(val) => updateOption(index, 'time', val)}
                            required
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
                        </div>
                        {options.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeOption(index)}
                            className="mt-7 text-red-400 hover:text-red-300 transition"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Creating...' : 'Create Poll'}
                </Button>
                <Link href="/polls">
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
