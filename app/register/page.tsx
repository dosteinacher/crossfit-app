'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input, Button, Card, ErrorMessage, SuccessMessage } from '@/components/ui';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, inviteCode }),
      });

      const data = await response.json();

      if (response.ok) {
        // Auto-login after successful registration
        const loginResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (loginResponse.ok) {
          setSuccess('Registration successful! Redirecting...');
          setTimeout(() => router.push('/dashboard'), 1500);
        } else {
          setSuccess('Registration successful! Redirecting to login...');
          setTimeout(() => router.push('/login'), 2000);
        }
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pure-dark flex items-center justify-center px-4">
      <Card className="w-full max-w-md bg-pure-gray border-gray-700">
        <h1 className="text-3xl font-bold text-center mb-6 text-pure-white">
          Register for PURE
        </h1>
        
        {error && <ErrorMessage message={error} />}
        {success && <SuccessMessage message={success} />}

        <form onSubmit={handleSubmit}>
          <Input
            label="Name"
            type="text"
            value={name}
            onChange={setName}
            placeholder="Your name"
            required
          />

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="your@email.com"
            required
          />

          <Input
            label="Invite Code"
            type="text"
            value={inviteCode}
            onChange={setInviteCode}
            placeholder="Ask your gym admin"
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            required
          />

          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="••••••••"
            required
          />

          <Button
            type="submit"
            disabled={loading}
            className="w-full mt-2"
          >
            {loading ? 'Creating account...' : 'Register'}
          </Button>
        </form>

        <p className="text-center mt-4 text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="text-pure-green hover:underline">
            Login here
          </Link>
        </p>
      </Card>
    </div>
  );
}
