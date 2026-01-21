'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Card, Loading, Button, ErrorMessage, SuccessMessage } from '@/components/ui';
import { format } from 'date-fns';

export default function PollDetailPage() {
  const router = useRouter();
  const params = useParams();
  const pollId = params.id as string;

  const [poll, setPoll] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
      } else {
        setError('Poll not found');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setError('Failed to load poll');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (optionId: number, currentlyVoted: boolean) => {
    setError('');
    try {
      if (currentlyVoted) {
        // Unvote
        await fetch('/api/polls/vote', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ poll_option_id: optionId }),
        });
      } else {
        // Vote
        await fetch('/api/polls/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ poll_option_id: optionId }),
        });
      }
      fetchData(); // Refresh
    } catch (error) {
      setError('An error occurred. Please try again.');
    }
  };

  const handleClosePoll = async () => {
    if (!confirm('Are you sure you want to close this poll?')) return;

    try {
      const response = await fetch(`/api/polls/${pollId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      });

      if (response.ok) {
        setSuccess('Poll closed successfully!');
        fetchData();
      } else {
        setError('Failed to close poll');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    }
  };

  const handleScheduleWorkout = (optionId: number, optionDate: string, optionLabel: string) => {
    const params = new URLSearchParams({
      poll_option_id: optionId.toString(),
      date: optionDate,
    });
    
    if (poll.template_id) {
      params.append('template', poll.template_id.toString());
    }

    router.push(`/workouts/create?${params}`);
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

  const sortedOptions = [...poll.options].sort((a, b) => b.vote_count - a.vote_count);
  const maxVotes = Math.max(...poll.options.map((o: any) => o.vote_count), 1);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-pure-dark py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {error && <ErrorMessage message={error} />}
          {success && <SuccessMessage message={success} />}

          <Card className="bg-pure-gray border-gray-700">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold text-pure-white mb-2">{poll.title}</h1>
                <span
                  className={`text-sm font-medium px-3 py-1 rounded ${
                    poll.status === 'active'
                      ? 'bg-green-900 text-green-200'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {poll.status}
                </span>
              </div>
              {user?.is_admin && poll.status === 'active' && (
                <Button variant="secondary" onClick={handleClosePoll}>
                  Close Poll
                </Button>
              )}
            </div>

            {poll.description && (
              <p className="text-gray-300 mb-4">{poll.description}</p>
            )}

            {poll.template && (
              <div className="bg-purple-900 border border-purple-700 rounded-lg p-3 mb-6">
                <p className="text-purple-200 text-sm">
                  <strong>📋 Linked Workout:</strong> {poll.template.title}
                </p>
              </div>
            )}

            <div className="text-sm text-gray-400 mb-6">
              Created by {poll.creator_name} on {format(new Date(poll.created_at), 'MMM d, yyyy')}
            </div>

            {/* Voting Options */}
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-pure-white mb-4">
                {poll.status === 'active' ? 'Vote for times you can attend:' : 'Results:'}
              </h2>

              {sortedOptions.map((option: any) => (
                <div
                  key={option.id}
                  className="bg-pure-dark border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-pure-white">
                          {format(new Date(option.date), 'EEEE, MMM d')} at{' '}
                          {format(new Date(option.date), 'h:mm a')}
                        </h3>
                        {option.label && (
                          <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded">
                            {option.label}
                          </span>
                        )}
                      </div>

                      {/* Vote Bar */}
                      <div className="mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-pure-green transition-all"
                              style={{ width: `${(option.vote_count / maxVotes) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold text-pure-green">
                            {option.vote_count}
                          </span>
                        </div>
                      </div>

                      {/* Voters */}
                      {option.voters.length > 0 && (
                        <p className="text-xs text-gray-400">
                          {option.voters.join(', ')}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      {poll.status === 'active' && (
                        <Button
                          variant={option.user_voted ? 'secondary' : 'primary'}
                          onClick={() => handleVote(option.id, option.user_voted)}
                          className="whitespace-nowrap"
                        >
                          {option.user_voted ? '✓ Voted' : 'Vote'}
                        </Button>
                      )}
                      
                      {user?.is_admin && (
                        <Button
                          variant="secondary"
                          onClick={() => handleScheduleWorkout(option.id, option.date, option.label)}
                          className="whitespace-nowrap text-sm"
                        >
                          Schedule →
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="mt-6">
            <Link href="/polls">
              <Button variant="secondary">← Back to Polls</Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
