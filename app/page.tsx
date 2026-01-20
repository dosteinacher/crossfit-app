import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl font-bold mb-6">Crossfit Workouts</h1>
          <p className="text-2xl mb-12 opacity-90">
            Track your workouts, manage attendance, and stay connected with your Crossfit community
          </p>

          <div className="flex flex-col md:flex-row gap-6 justify-center items-center mb-16">
            <Link
              href="/register"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg text-xl font-semibold hover:bg-gray-100 transition shadow-lg"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="bg-blue-500 text-white px-8 py-4 rounded-lg text-xl font-semibold hover:bg-blue-400 transition border-2 border-white"
            >
              Login
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-xl p-6">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="text-xl font-bold mb-2">Schedule Workouts</h3>
              <p className="opacity-90">
                Create and manage workout schedules for your community
              </p>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-xl p-6">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-xl font-bold mb-2">Track Attendance</h3>
              <p className="opacity-90">
                Keep track of who attended and monitor your progress
              </p>
            </div>

            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-xl p-6">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-xl font-bold mb-2">Community Driven</h3>
              <p className="opacity-90">
                Everyone can create and edit workouts collaboratively
              </p>
            </div>
          </div>

          <div className="mt-16 text-sm opacity-75">
            <p>Built for Crossfit enthusiasts by Crossfit enthusiasts</p>
          </div>
        </div>
      </div>
    </div>
  );
}
