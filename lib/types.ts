// Type definitions for the Crossfit App

export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  is_admin: boolean;
  created_at: string;
}

export interface Workout {
  id: number;
  title: string;
  description: string;
  workout_type: string;
  date: string;
  max_participants: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  sequence: number; // For calendar update tracking
}

export interface Registration {
  id: number;
  workout_id: number;
  user_id: number;
  attended: boolean;
  registered_at: string;
}

export interface WorkoutEdit {
  id: number;
  workout_id: number;
  user_id: number;
  edited_at: string;
}

export interface WorkoutWithDetails extends Workout {
  creator_name: string;
  registered_count: number;
  is_registered: boolean;
  participants: Array<{
    user_id: number;
    user_name: string;
    attended: boolean;
  }>;
}

export interface UserStats {
  total_workouts: number;
  attended_workouts: number;
  upcoming_workouts: number;
  current_streak: number;
}

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  is_admin: boolean;
}

export interface Poll {
  id: number;
  title: string;
  description?: string;
  template_id?: number; // Optional link to workout template
  created_by: number;
  status: 'active' | 'closed';
  created_at: string;
}

export interface PollOption {
  id: number;
  poll_id: number;
  date: string; // ISO datetime
  label?: string; // Optional label like "Morning session"
  created_at: string;
}

export interface PollVote {
  id: number;
  poll_option_id: number;
  user_id: number;
  voted_at: string;
}
