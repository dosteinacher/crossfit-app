import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-pure-dark text-pure-white flex flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-4xl font-bold text-pure-green">Page not found</h1>
      <p className="text-gray-400">The page you’re looking for doesn’t exist.</p>
      <div className="flex gap-4">
        <Link
          href="/"
          className="bg-pure-green text-black px-6 py-3 rounded-lg font-semibold hover:bg-lime-400 transition"
        >
          Home
        </Link>
        <Link
          href="/login"
          className="bg-pure-gray text-pure-white px-6 py-3 rounded-lg font-semibold border border-pure-green hover:bg-gray-700 transition"
        >
          Login
        </Link>
      </div>
    </div>
  );
}
