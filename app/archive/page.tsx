'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Badge, Button, Card, Loading, SegmentedControl } from '@/components/ui';
import { WorkoutTemplate } from '@/lib/workout-templates';
import { useAuth } from '@/hooks/useAuth';

const TEMPLATE_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Team of 2', value: 'Team of 2' },
  { label: 'Solo', value: 'Solo' },
  { label: 'Team of 3', value: 'Team of 3' },
  { label: 'Custom', value: 'Custom' },
];

export default function ArchivePage() {
  const { loading } = useAuth();
  const router = useRouter();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTemplates = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      
      // Only apply category filter if no search query
      if (!searchQuery && filter !== 'all') {
        params.append('category', filter);
      }
      
      // Search query takes precedence
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/templates?${params}`);
      if (!response.ok) throw new Error('Could not load workout templates');
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Fetch templates error:', error);
    }
  }, [filter, searchQuery]);

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  useEffect(() => {
    if (!loading) void fetchTemplates();
  }, [fetchTemplates, loading]);

  const handleUseTemplate = (templateId: number) => {
    router.push(`/workouts/create?template=${templateId}`);
  };

  if (loading) return <Loading />;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-pure-bg py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-[58px] font-black leading-[.82] tracking-[-.01em] text-ink md:text-[96px]">Workout Library</h1>
              <p className="mt-2 text-base text-ink-2">Browse saved templates and use one to plan a workout.</p>
            </div>
            <Link href="/archive/import" className="inline-flex min-h-11 items-center rounded-sm bg-lime px-4 text-[15px] font-bold text-ink hover:brightness-95">
              Import from Excel
            </Link>
          </div>

          {/* Search */}
          <div className="mb-5 flex gap-2">
            <input
              type="search"
              placeholder="Search workouts..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              aria-label="Search workout templates"
              className="min-h-11 min-w-0 w-full rounded-sm border border-line bg-paper px-4 text-base text-ink placeholder:text-ink-2 focus:border-ink focus:outline-none focus:ring-[3px] focus:ring-ink/15"
            />
            {searchQuery && <Button variant="ghost" onClick={handleClearSearch}>Clear</Button>}
          </div>

          {/* Filter Tabs */}
          <div className="mb-6">
            <SegmentedControl items={TEMPLATE_FILTERS} value={filter} onChange={setFilter} ariaLabel="Filter workout templates" />
          </div>

          {/* Templates Grid */}
          {templates.length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <p className="mb-6 text-base text-ink-2">No workout templates found.</p>
                <Link href="/archive/import" className="inline-flex min-h-11 items-center rounded-sm bg-lime px-4 text-[15px] font-bold text-ink hover:brightness-95">
                  Import from Excel
                </Link>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <Card key={template.id} className="flex h-full flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <Badge variant="neutral">{template.category}</Badge>
                    <span className="text-[13px] text-ink-2">
                      Used {template.times_used}x
                    </span>
                  </div>

                  <h3 className="mb-2 font-display text-2xl font-bold uppercase text-ink">
                    {template.title}
                  </h3>

                  <p className="mb-4 line-clamp-4 flex-1 whitespace-pre-line text-base text-ink-2">
                    {template.description}
                  </p>

                  <div className="flex gap-2 mt-auto">
                    <Button
                      onClick={() => handleUseTemplate(template.id)}
                      variant="secondary"
                      className="flex-1"
                    >
                      Use template
                    </Button>
                    <Link href={`/archive/${template.id}`} className="inline-flex min-h-11 items-center rounded-sm border border-line bg-paper px-4 text-sm font-bold text-ink hover:bg-canvas">
                      View
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
