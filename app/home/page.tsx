import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pure-bg via-pure-surface to-pure-bg text-pure-ink">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl font-bold mb-6 text-pure-accent-ink">PURE Workouts</h1>
          <p className="text-2xl mb-12 opacity-90">
            Track your workouts, manage attendance, and stay connected with your PURE community
          </p>

          <div className="flex flex-col md:flex-row gap-6 justify-center items-center mb-16">
            <Link
              href="/register"
              className="bg-pure-green text-black px-8 py-4 rounded-lg text-xl font-semibold hover:bg-pure-accent-light transition shadow-lg"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="bg-pure-surface text-pure-ink px-8 py-4 rounded-lg text-xl font-semibold hover:bg-gray-100 transition border-2 border-pure-green"
            >
              Login
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="bg-pure-surface bg-opacity-80 backdrop-blur-lg rounded-xl p-6 border border-gray-300">
              <h3 className="text-xl font-bold mb-2 text-pure-ink">Schedule Workouts</h3>
              <p className="opacity-90 text-gray-600">
                Create and manage workout schedules for your community
              </p>
            </div>

            <div className="bg-pure-surface bg-opacity-80 backdrop-blur-lg rounded-xl p-6 border border-gray-300">
              <h3 className="text-xl font-bold mb-2 text-pure-ink">Track Attendance</h3>
              <p className="opacity-90 text-gray-600">
                Keep track of who attended and monitor your progress
              </p>
            </div>

            <div className="bg-pure-surface bg-opacity-80 backdrop-blur-lg rounded-xl p-6 border border-gray-300">
              <h3 className="text-xl font-bold mb-2 text-pure-ink">Community Driven</h3>
              <p className="opacity-90 text-gray-600">
                Everyone can create and edit workouts collaboratively
              </p>
            </div>
          </div>

          <div className="mt-16 text-sm opacity-75">
            <p className="text-pure-text-light">Built for PURE enthusiasts by PURE enthusiasts</p>
          </div>
        </div>
      </div>
    </div>
  );
}
