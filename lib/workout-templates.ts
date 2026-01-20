// Workout Template/Archive types

export interface WorkoutTemplate {
  id: number;
  title: string;
  description: string;
  workout_type: string;
  category: 'Team of 2' | 'Team of 3' | 'Solo' | 'Custom';
  created_at: string;
  times_used: number;
}
