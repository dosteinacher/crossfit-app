// Database utility for local development (mock database)
// In production, this will be replaced with Cloudflare D1

import { User, Workout, Registration } from '../types';

// In-memory mock database for local development
let mockUsers: User[] = [];
let mockWorkouts: Workout[] = [];
let mockRegistrations: Registration[] = [];
let mockWorkoutEdits: any[] = [];

let userIdCounter = 1;
let workoutIdCounter = 1;
let registrationIdCounter = 1;
let editIdCounter = 1;

export class Database {
  // User operations
  async createUser(email: string, password_hash: string, name: string, is_admin: boolean = false): Promise<User> {
    const user: User = {
      id: userIdCounter++,
      email,
      password_hash,
      name,
      is_admin,
      created_at: new Date().toISOString(),
    };
    mockUsers.push(user);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return mockUsers.find((u) => u.email === email) || null;
  }

  async getUserById(id: number): Promise<User | null> {
    return mockUsers.find((u) => u.id === id) || null;
  }

  // Workout operations
  async createWorkout(
    title: string,
    description: string,
    workout_type: string,
    date: string,
    max_participants: number,
    created_by: number
  ): Promise<Workout> {
    const workout: Workout = {
      id: workoutIdCounter++,
      title,
      description,
      workout_type,
      date,
      max_participants,
      created_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockWorkouts.push(workout);
    return workout;
  }

  async getWorkoutById(id: number): Promise<Workout | null> {
    return mockWorkouts.find((w) => w.id === id) || null;
  }

  async getWorkouts(filterPast: boolean = false): Promise<Workout[]> {
    if (filterPast) {
      const now = new Date().toISOString();
      return mockWorkouts.filter((w) => w.date >= now).sort((a, b) => a.date.localeCompare(b.date));
    }
    return mockWorkouts.sort((a, b) => b.date.localeCompare(a.date));
  }

  async updateWorkout(
    id: number,
    title: string,
    description: string,
    workout_type: string,
    date: string,
    max_participants: number,
    user_id: number
  ): Promise<Workout | null> {
    const workout = mockWorkouts.find((w) => w.id === id);
    if (!workout) return null;

    workout.title = title;
    workout.description = description;
    workout.workout_type = workout_type;
    workout.date = date;
    workout.max_participants = max_participants;
    workout.updated_at = new Date().toISOString();

    // Log the edit
    mockWorkoutEdits.push({
      id: editIdCounter++,
      workout_id: id,
      user_id,
      edited_at: new Date().toISOString(),
    });

    return workout;
  }

  async deleteWorkout(id: number): Promise<boolean> {
    const index = mockWorkouts.findIndex((w) => w.id === id);
    if (index === -1) return false;
    mockWorkouts.splice(index, 1);
    // Also delete associated registrations
    mockRegistrations = mockRegistrations.filter((r) => r.workout_id !== id);
    return true;
  }

  // Registration operations
  async registerForWorkout(workout_id: number, user_id: number): Promise<Registration> {
    // Check if already registered
    const existing = mockRegistrations.find(
      (r) => r.workout_id === workout_id && r.user_id === user_id
    );
    if (existing) return existing;

    const registration: Registration = {
      id: registrationIdCounter++,
      workout_id,
      user_id,
      attended: false,
      registered_at: new Date().toISOString(),
    };
    mockRegistrations.push(registration);
    return registration;
  }

  async unregisterFromWorkout(workout_id: number, user_id: number): Promise<boolean> {
    const index = mockRegistrations.findIndex(
      (r) => r.workout_id === workout_id && r.user_id === user_id
    );
    if (index === -1) return false;
    mockRegistrations.splice(index, 1);
    return true;
  }

  async getRegistrationsForWorkout(workout_id: number): Promise<Registration[]> {
    return mockRegistrations.filter((r) => r.workout_id === workout_id);
  }

  async getRegistrationsForUser(user_id: number): Promise<Registration[]> {
    return mockRegistrations.filter((r) => r.user_id === user_id);
  }

  async markAttendance(workout_id: number, user_id: number, attended: boolean): Promise<boolean> {
    const registration = mockRegistrations.find(
      (r) => r.workout_id === workout_id && r.user_id === user_id
    );
    if (!registration) return false;
    registration.attended = attended;
    return true;
  }

  async getUserStats(user_id: number): Promise<any> {
    const userRegistrations = mockRegistrations.filter((r) => r.user_id === user_id);
    const workoutIds = userRegistrations.map((r) => r.workout_id);
    const userWorkouts = mockWorkouts.filter((w) => workoutIds.includes(w.id));

    const now = new Date().toISOString();
    const pastWorkouts = userWorkouts.filter((w) => w.date < now);
    const attendedWorkouts = userRegistrations.filter((r) => r.attended);
    const upcomingWorkouts = userWorkouts.filter((w) => w.date >= now);

    return {
      total_workouts: pastWorkouts.length,
      attended_workouts: attendedWorkouts.length,
      upcoming_workouts: upcomingWorkouts.length,
      current_streak: 0, // TODO: Calculate streak
    };
  }
}

export const db = new Database();
