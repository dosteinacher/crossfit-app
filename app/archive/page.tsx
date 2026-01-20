'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Card, Loading, Button } from '@/components/ui';
import { WorkoutTemplate } from '@/lib/workout-templates';

export default function ArchivePage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchTemplates();
    }
  }, [filter, loading]);

  useEffect(() => {
    if (!loading && searchQuery === '') {
      // Refetch when search is cleared
      fetchTemplates();
    }
  }, [searchQuery, loading]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/session');
      if (!response.ok) {
        router.push('/login');
        return;
      }
      setLoading(false);
    } catch (error) {
      router.push('/login');
    }
  };

  const fetchTemplates = async () => {
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
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Fetch templates error:', error);
    }
  };

  const handleSearch = () => {
    fetchTemplates();
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    // Will trigger fetchTemplates via useEffect
  };

  const handleUseTemplate = (templateId: number) => {
    router.push(`/workouts/create?template=${templateId}`);
  };

  if (loading) return <Loading />;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-pure-dark py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-pure-white">Workout Archive</h1>
            <Link href="/archive/import">
              <Button>Import from Excel</Button>
            </Link>
          </div>

          <div className="bg-pure-gray border border-pure-green rounded-lg p-4 mb-6">
            <h3 className="font-bold text-pure-green mb-2">📚 Your Workout Library</h3>
            <p className="text-gray-300">
              Browse all your workout templates. Click "Use Template" to schedule it for a specific date and time!
            </p>
          </div>

          {/* Search */}
          <Card className="mb-6 bg-pure-gray border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search workouts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 px-4 py-2 bg-pure-dark border border-gray-600 text-pure-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-pure-green"
              />
              {searchQuery && (
                <Button variant="secondary" onClick={handleClearSearch}>
                  Clear
                </Button>
              )}
              <Button onClick={handleSearch}>Search</Button>
            </div>
            {searchQuery && (
              <p className="text-sm text-gray-400 mt-2">
                Searching for: <span className="text-pure-green font-medium">"{searchQuery}"</span>
              </p>
            )}
          </Card>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-700 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 font-medium transition ${
                filter === 'all'
                  ? 'text-pure-green border-b-2 border-pure-green'
                  : 'text-gray-400 hover:text-pure-white'
              }`}
            >
              All ({templates.length})
            </button>
            <button
              onClick={() => setFilter('Team of 2')}
              className={`px-4 py-2 font-medium transition ${
                filter === 'Team of 2'
                  ? 'text-pure-green border-b-2 border-pure-green'
                  : 'text-gray-400 hover:text-pure-white'
              }`}
            >
              Team of 2
            </button>
            <button
              onClick={() => setFilter('Solo')}
              className={`px-4 py-2 font-medium transition ${
                filter === 'Solo'
                  ? 'text-pure-green border-b-2 border-pure-green'
                  : 'text-gray-400 hover:text-pure-white'
              }`}
            >
              Solo
            </button>
            <button
              onClick={() => setFilter('Team of 3')}
              className={`px-4 py-2 font-medium transition ${
                filter === 'Team of 3'
                  ? 'text-pure-green border-b-2 border-pure-green'
                  : 'text-gray-400 hover:text-pure-white'
              }`}
            >
              Team of 3
            </button>
            <button
              onClick={() => setFilter('Custom')}
              className={`px-4 py-2 font-medium transition ${
                filter === 'Custom'
                  ? 'text-pure-green border-b-2 border-pure-green'
                  : 'text-gray-400 hover:text-pure-white'
              }`}
            >
              Custom
            </button>
          </div>

          {/* Templates Grid */}
          {templates.length === 0 ? (
            <Card className="bg-pure-gray border-gray-700">
              <div className="text-center py-12">
                <p className="text-gray-300 text-lg mb-4">No workout templates yet</p>
                <p className="text-gray-400 mb-6">
                  Import your workouts from Excel to build your archive!
                </p>
                <Link href="/archive/import">
                  <Button>Import from Excel</Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <Card key={template.id} className="h-full flex flex-col bg-pure-gray border-gray-700 hover:border-pure-green transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-medium px-2 py-1 bg-purple-600 text-white rounded">
                      {template.category}
                    </span>
                    <span className="text-xs text-gray-400">
                      Used {template.times_used}x
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-pure-white mb-2">
                    {template.title}
                  </h3>

                  <p className="text-sm text-gray-300 mb-4 line-clamp-4 flex-1 whitespace-pre-wrap">
                    {template.description}
                  </p>

                  <div className="flex gap-2 mt-auto">
                    <Button
                      onClick={() => handleUseTemplate(template.id)}
                      className="flex-1"
                    >
                      Use Template
                    </Button>
                    <Link href={`/archive/${template.id}`}>
                      <Button variant="secondary" className="w-full">
                        View
                      </Button>
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
