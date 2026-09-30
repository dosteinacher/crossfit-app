import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-pure-bg text-pure-ink flex flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-4xl font-bold text-pure-accent-ink">Page not found</h1>
      <p className="text-pure-text-light">The page you’re looking for doesn’t exist.</p>
      <div className="flex gap-4">
        <Link
          href="/"
          className="bg-pure-green text-black px-6 py-3 rounded-lg font-semibold hover:bg-pure-accent-light transition"
        >
          Home
        </Link>
        <Link
          href="/login"
          className="bg-pure-surface text-pure-ink px-6 py-3 rounded-lg font-semibold border border-pure-green hover:bg-gray-100 transition"
        >
          Login
        </Link>
      </div>
    </div>
  );
}
