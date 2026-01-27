'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Card, Loading, Button } from '@/components/ui';
import { format } from 'date-fns';

export default function PollsPage() {
  const router = useRouter();
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('active');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchPolls();
    }
  }, [filter, loading]);

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

  const fetchPolls = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);

      const response = await fetch(`/api/polls?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPolls(data.polls);
      }
    } catch (error) {
      console.error('Fetch polls error:', error);
    }
  };

  if (loading) return <Loading />;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-pure-dark py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-pure-white">Availability Polls</h1>
            <Link href="/polls/create">
              <Button>Create Poll</Button>
            </Link>
          </div>

          <div className="bg-pure-gray border border-pure-green rounded-lg p-4 mb-6">
            <h3 className="font-bold text-pure-green mb-2">📊 Weekly Planning</h3>
            <p className="text-gray-300">
              Create polls to find the best times for workouts. Everyone can vote for times they're available!
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-700">
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 font-medium transition ${
                filter === 'active'
                  ? 'text-pure-green border-b-2 border-pure-green'
                  : 'text-gray-400 hover:text-pure-white'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 font-medium transition ${
                filter === 'all'
                  ? 'text-pure-green border-b-2 border-pure-green'
                  : 'text-gray-400 hover:text-pure-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('closed')}
              className={`px-4 py-2 font-medium transition ${
                filter === 'closed'
                  ? 'text-pure-green border-b-2 border-pure-green'
                  : 'text-gray-400 hover:text-pure-white'
              }`}
            >
              Closed
            </button>
          </div>

          {/* Polls List */}
          {polls.length === 0 ? (
            <Card className="bg-pure-gray border-gray-700">
              <div className="text-center py-12">
                <p className="text-gray-300 text-lg mb-4">No polls yet</p>
                <p className="text-gray-400 mb-6">
                  Create a poll to find the best workout times for your team!
                </p>
                <Link href="/polls/create">
                  <Button>Create Your First Poll</Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {polls.map((poll) => (
                <Link key={poll.id} href={`/polls/${poll.id}`}>
                  <Card className="hover:shadow-xl hover:border-pure-green transition-all cursor-pointer bg-pure-gray border-gray-700">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-pure-white">
                            {poll.title}
                          </h3>
                          <span
                            className={`text-xs font-medium px-2 py-1 rounded ${
                              poll.status === 'active'
                                ? 'bg-green-900 text-green-200'
                                : 'bg-gray-700 text-gray-400'
                            }`}
                          >
                            {poll.status}
                          </span>
                        </div>
                        
                        {poll.description && (
                          <p className="text-sm text-gray-400 mb-3">
                            {poll.description}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span>📊 {poll.option_count} time slots</span>
                          <span>👥 {poll.total_voters} voters</span>
                          <span>by {poll.creator_name}</span>
                        </div>
                      </div>

                      <div className="text-right text-xs text-gray-500">
                        {format(new Date(poll.created_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
