'use client';

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Card, Loading, Button, ErrorMessage } from '@/components/ui';
import { WorkoutTemplate } from '@/lib/workout-templates';

export default function TemplateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const templateId = params.id as string;

  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTemplate();
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      const response = await fetch(`/api/templates/${templateId}`);
      if (response.ok) {
        const data = await response.json();
        setTemplate(data.template);
      } else {
        setError('Template not found');
      }
    } catch (error) {
      console.error('Fetch template error:', error);
      setError('Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = () => {
    router.push(`/workouts/create?template=${templateId}`);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/archive');
      } else {
        setError('Failed to delete template');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    }
  };

  if (loading) return <Loading />;

  if (!template) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-pure-dark py-8">
          <div className="container mx-auto px-4 max-w-4xl">
            <Card className="bg-pure-gray border-gray-700">
              <p className="text-red-400">Template not found</p>
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
        <div className="container mx-auto px-4 max-w-4xl">
          {error && <ErrorMessage message={error} />}

          <Card className="bg-pure-gray border-gray-700">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-sm font-medium px-3 py-1 bg-purple-600 text-white rounded">
                  {template.category}
                </span>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleUseTemplate}>
                  Use Template
                </Button>
                <Button variant="danger" onClick={handleDelete} className="text-sm">
                  Delete
                </Button>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-pure-white mb-4">{template.title}</h1>
            
            <div className="flex items-center gap-4 text-gray-400 mb-6">
              <div>
                <span className="font-medium">Type:</span> {template.workout_type}
              </div>
              <div>
                <span className="font-medium">Used:</span> {template.times_used} times
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-pure-white mb-2">Workout</h2>
              <p className="text-gray-300 whitespace-pre-wrap">{template.description}</p>
            </div>

            {/* Actions */}
            <div className="border-t border-gray-700 pt-6 mt-6">
              <div className="flex gap-4">
                <Button onClick={handleUseTemplate} className="flex-1">
                  Schedule This Workout
                </Button>
                <Link href="/archive">
                  <Button variant="secondary" className="w-full">
                    Back to Archive
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
