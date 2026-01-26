// Database utility for local development (mock database)
// In production, this will be replaced with Cloudflare D1

import { User, Workout, Registration, Poll, PollOption, PollVote } from '../types';
import { WorkoutTemplate } from '../workout-templates';

// Use global to persist data across hot reloads in development
const globalForDb = global as typeof globalThis & {
  mockUsers?: User[];
  mockWorkouts?: Workout[];
  mockRegistrations?: Registration[];
  mockWorkoutEdits?: any[];
  mockWorkoutTemplates?: WorkoutTemplate[];
  mockPolls?: Poll[];
  mockPollOptions?: PollOption[];
  mockPollVotes?: PollVote[];
  userIdCounter?: number;
  workoutIdCounter?: number;
  registrationIdCounter?: number;
  editIdCounter?: number;
  templateIdCounter?: number;
  pollIdCounter?: number;
  pollOptionIdCounter?: number;
  pollVoteIdCounter?: number;
};

// In-memory mock database for local development
let mockUsers = globalForDb.mockUsers || [];
let mockWorkouts = globalForDb.mockWorkouts || [];
let mockRegistrations = globalForDb.mockRegistrations || [];
let mockWorkoutEdits = globalForDb.mockWorkoutEdits || [];
let mockWorkoutTemplates = globalForDb.mockWorkoutTemplates || [];
let mockPolls = globalForDb.mockPolls || [];
let mockPollOptions = globalForDb.mockPollOptions || [];
let mockPollVotes = globalForDb.mockPollVotes || [];

let userIdCounter = globalForDb.userIdCounter || 1;
let workoutIdCounter = globalForDb.workoutIdCounter || 1;
let registrationIdCounter = globalForDb.registrationIdCounter || 1;
let editIdCounter = globalForDb.editIdCounter || 1;
let templateIdCounter = globalForDb.templateIdCounter || 1;
let pollIdCounter = globalForDb.pollIdCounter || 1;
let pollOptionIdCounter = globalForDb.pollOptionIdCounter || 1;
let pollVoteIdCounter = globalForDb.pollVoteIdCounter || 1;

// Always persist to global (needed for serverless environments like Vercel)
globalForDb.mockUsers = mockUsers;
globalForDb.mockWorkouts = mockWorkouts;
globalForDb.mockRegistrations = mockRegistrations;
globalForDb.mockWorkoutEdits = mockWorkoutEdits;
globalForDb.mockWorkoutTemplates = mockWorkoutTemplates;
globalForDb.mockPolls = mockPolls;
globalForDb.mockPollOptions = mockPollOptions;
globalForDb.mockPollVotes = mockPollVotes;
globalForDb.userIdCounter = userIdCounter;
globalForDb.workoutIdCounter = workoutIdCounter;
globalForDb.registrationIdCounter = registrationIdCounter;
globalForDb.editIdCounter = editIdCounter;
globalForDb.templateIdCounter = templateIdCounter;
globalForDb.pollIdCounter = pollIdCounter;
globalForDb.pollOptionIdCounter = pollOptionIdCounter;
globalForDb.pollVoteIdCounter = pollVoteIdCounter;

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
    globalForDb.userIdCounter = userIdCounter;
    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return mockUsers.find((u) => u.email === email) || null;
  }

  async getUserById(id: number): Promise<User | null> {
    return mockUsers.find((u) => u.id === id) || null;
  }

  async getAllUsers(): Promise<User[]> {
    return mockUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async deleteUser(id: number): Promise<boolean> {
    const index = mockUsers.findIndex((u) => u.id === id);
    if (index === -1) return false;

    // Remove user
    mockUsers.splice(index, 1);

    // Also remove their registrations and votes
    mockRegistrations = mockRegistrations.filter((r) => r.user_id !== id);
    mockPollVotes = mockPollVotes.filter((v) => v.user_id !== id);

    return true;
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
      sequence: 0,
    };
    mockWorkouts.push(workout);
    globalForDb.workoutIdCounter = workoutIdCounter;
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
    workout.sequence = (workout.sequence || 0) + 1; // Increment sequence for calendar updates

    // Log the edit
    mockWorkoutEdits.push({
      id: editIdCounter++,
      workout_id: id,
      user_id,
      edited_at: new Date().toISOString(),
    });
    globalForDb.editIdCounter = editIdCounter;

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
    globalForDb.registrationIdCounter = registrationIdCounter;
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
    
    const now = new Date().toISOString();
    
    // Count workouts user is registered for
    const workoutIds = userRegistrations.map((r) => r.workout_id);
    const userWorkouts = mockWorkouts.filter((w) => workoutIds.includes(w.id));
    const pastWorkouts = userWorkouts.filter((w) => w.date < now);
    const attendedWorkouts = userRegistrations.filter((r) => r.attended);
    
    // Count ALL upcoming workouts (not just registered ones)
    const allUpcomingWorkouts = mockWorkouts.filter((w) => w.date >= now);

    return {
      total_workouts: pastWorkouts.length,
      attended_workouts: attendedWorkouts.length,
      upcoming_workouts: allUpcomingWorkouts.length,
      current_streak: 0, // TODO: Calculate streak
    };
  }

  // Workout Template operations
  async createWorkoutTemplate(
    title: string,
    description: string,
    workout_type: string,
    category: 'Team of 2' | 'Team of 3' | 'Solo' | 'Custom'
  ): Promise<WorkoutTemplate> {
    const template: WorkoutTemplate = {
      id: templateIdCounter++,
      title,
      description,
      workout_type,
      category,
      created_at: new Date().toISOString(),
      times_used: 0,
    };
    mockWorkoutTemplates.push(template);
    globalForDb.templateIdCounter = templateIdCounter;
    return template;
  }

  async getWorkoutTemplates(category?: string): Promise<WorkoutTemplate[]> {
    if (category) {
      return mockWorkoutTemplates.filter((t) => t.category === category);
    }
    return mockWorkoutTemplates.sort((a, b) => b.times_used - a.times_used);
  }

  async getWorkoutTemplateById(id: number): Promise<WorkoutTemplate | null> {
    return mockWorkoutTemplates.find((t) => t.id === id) || null;
  }

  async updateWorkoutTemplate(
    id: number,
    title: string,
    description: string,
    workout_type: string,
    category: 'Team of 2' | 'Team of 3' | 'Solo' | 'Custom'
  ): Promise<WorkoutTemplate | null> {
    const template = mockWorkoutTemplates.find((t) => t.id === id);
    if (!template) return null;

    template.title = title;
    template.description = description;
    template.workout_type = workout_type;
    template.category = category;

    return template;
  }

  async incrementTemplateUsage(id: number): Promise<void> {
    const template = mockWorkoutTemplates.find((t) => t.id === id);
    if (template) {
      template.times_used++;
    }
  }

  async deleteWorkoutTemplate(id: number): Promise<boolean> {
    const index = mockWorkoutTemplates.findIndex((t) => t.id === id);
    if (index === -1) return false;
    mockWorkoutTemplates.splice(index, 1);
    return true;
  }

  async searchWorkoutTemplates(query: string): Promise<WorkoutTemplate[]> {
    const lowerQuery = query.toLowerCase();
    return mockWorkoutTemplates.filter(
      (t) =>
        t.title.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery)
    );
  }

  // Poll operations
  async createPoll(
    title: string,
    description: string,
    template_id: number | null,
    created_by: number
  ): Promise<Poll> {
    const poll: Poll = {
      id: pollIdCounter++,
      title,
      description,
      template_id: template_id || undefined,
      created_by,
      status: 'active',
      created_at: new Date().toISOString(),
    };
    mockPolls.push(poll);
    globalForDb.pollIdCounter = pollIdCounter;
    return poll;
  }

  async getPollById(id: number): Promise<Poll | null> {
    return mockPolls.find((p) => p.id === id) || null;
  }

  async getPolls(status?: 'active' | 'closed'): Promise<Poll[]> {
    if (status) {
      return mockPolls.filter((p) => p.status === status).sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return mockPolls.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async updatePollStatus(id: number, status: 'active' | 'closed'): Promise<Poll | null> {
    const poll = mockPolls.find((p) => p.id === id);
    if (!poll) return null;
    poll.status = status;
    return poll;
  }

  async deletePoll(id: number): Promise<boolean> {
    const index = mockPolls.findIndex((p) => p.id === id);
    if (index === -1) return false;
    mockPolls.splice(index, 1);
    // Also delete associated options and votes
    mockPollOptions = mockPollOptions.filter((o) => o.poll_id !== id);
    const optionIds = mockPollOptions.filter((o) => o.poll_id === id).map((o) => o.id);
    mockPollVotes = mockPollVotes.filter((v) => !optionIds.includes(v.poll_option_id));
    return true;
  }

  // Poll option operations
  async createPollOption(poll_id: number, date: string, label?: string): Promise<PollOption> {
    const option: PollOption = {
      id: pollOptionIdCounter++,
      poll_id,
      date,
      label,
      created_at: new Date().toISOString(),
    };
    mockPollOptions.push(option);
    globalForDb.pollOptionIdCounter = pollOptionIdCounter;
    return option;
  }

  async getPollOptions(poll_id: number): Promise<PollOption[]> {
    return mockPollOptions.filter((o) => o.poll_id === poll_id).sort((a, b) => a.date.localeCompare(b.date));
  }

  async deletePollOption(id: number): Promise<boolean> {
    const index = mockPollOptions.findIndex((o) => o.id === id);
    if (index === -1) return false;
    mockPollOptions.splice(index, 1);
    // Also delete associated votes
    mockPollVotes = mockPollVotes.filter((v) => v.poll_option_id !== id);
    return true;
  }

  // Poll vote operations
  async createPollVote(poll_option_id: number, user_id: number): Promise<PollVote> {
    // Check if already voted for this option
    const existing = mockPollVotes.find(
      (v) => v.poll_option_id === poll_option_id && v.user_id === user_id
    );
    if (existing) return existing;

    const vote: PollVote = {
      id: pollVoteIdCounter++,
      poll_option_id,
      user_id,
      voted_at: new Date().toISOString(),
    };
    mockPollVotes.push(vote);
    globalForDb.pollVoteIdCounter = pollVoteIdCounter;
    return vote;
  }

  async deletePollVote(poll_option_id: number, user_id: number): Promise<boolean> {
    const index = mockPollVotes.findIndex(
      (v) => v.poll_option_id === poll_option_id && v.user_id === user_id
    );
    if (index === -1) return false;
    mockPollVotes.splice(index, 1);
    return true;
  }

  async getPollVotes(poll_option_id: number): Promise<PollVote[]> {
    return mockPollVotes.filter((v) => v.poll_option_id === poll_option_id);
  }

  async getUserVotesForPoll(poll_id: number, user_id: number): Promise<number[]> {
    const options = await this.getPollOptions(poll_id);
    const optionIds = options.map((o) => o.id);
    const userVotes = mockPollVotes.filter(
      (v) => optionIds.includes(v.poll_option_id) && v.user_id === user_id
    );
    return userVotes.map((v) => v.poll_option_id);
  }
}

export const db = new Database();
