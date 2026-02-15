// Postgres database adapter using Neon
import { sql } from '@vercel/postgres';
import { User, Workout, Registration, Poll, PollOption, PollVote } from '../types';
import { WorkoutTemplate } from '../workout-templates';

// Global flag to track if tables are initialized
let tablesInitialized = false;

export class PostgresDatabase {
  private async ensureTablesExist() {
    if (tablesInitialized) return;
    
    try {
      // Create users table
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          name VARCHAR(255) NOT NULL,
          is_admin BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // Create workouts table
      await sql`
        CREATE TABLE IF NOT EXISTS workouts (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          workout_type VARCHAR(100),
          date TIMESTAMP NOT NULL,
          max_participants INTEGER DEFAULT 4,
          created_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // Create registrations table
      await sql`
        CREATE TABLE IF NOT EXISTS registrations (
          id SERIAL PRIMARY KEY,
          workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          attended BOOLEAN DEFAULT FALSE,
          registered_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(workout_id, user_id)
        )
      `;

      // Create workout_templates table
      await sql`
        CREATE TABLE IF NOT EXISTS workout_templates (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          workout_type VARCHAR(100),
          category VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          times_used INTEGER DEFAULT 0
        )
      `;

      // Create polls table
      await sql`
        CREATE TABLE IF NOT EXISTS polls (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          template_id INTEGER REFERENCES workout_templates(id),
          created_by INTEGER REFERENCES users(id),
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // Create poll_options table
      await sql`
        CREATE TABLE IF NOT EXISTS poll_options (
          id SERIAL PRIMARY KEY,
          poll_id INTEGER REFERENCES polls(id) ON DELETE CASCADE,
          date TIMESTAMP NOT NULL,
          label VARCHAR(255),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // Create poll_votes table
      await sql`
        CREATE TABLE IF NOT EXISTS poll_votes (
          id SERIAL PRIMARY KEY,
          poll_option_id INTEGER REFERENCES poll_options(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          voted_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(poll_option_id, user_id)
        )
      `;

      tablesInitialized = true;
      console.log('Database tables initialized successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  // User operations
  async createUser(email: string, password_hash: string, name: string, is_admin: boolean = false): Promise<User> {
    await this.ensureTablesExist();
    const result = await sql`
      INSERT INTO users (email, password_hash, name, is_admin)
      VALUES (${email}, ${password_hash}, ${name}, ${is_admin})
      RETURNING *
    `;
    return this.mapUser(result.rows[0]);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    await this.ensureTablesExist();
    const result = await sql`
      SELECT * FROM users WHERE email = ${email}
    `;
    return result.rows[0] ? this.mapUser(result.rows[0]) : null;
  }

  async getUserById(id: number): Promise<User | null> {
    const result = await sql`
      SELECT * FROM users WHERE id = ${id}
    `;
    return result.rows[0] ? this.mapUser(result.rows[0]) : null;
  }

  async getAllUsers(): Promise<User[]> {
    const result = await sql`
      SELECT * FROM users ORDER BY created_at DESC
    `;
    return result.rows.map(row => this.mapUser(row));
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await sql`
      DELETE FROM users WHERE id = ${id}
    `;
    return result.rowCount ? result.rowCount > 0 : false;
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
    const result = await sql`
      INSERT INTO workouts (title, description, workout_type, date, max_participants, created_by)
      VALUES (${title}, ${description}, ${workout_type}, ${date}, ${max_participants}, ${created_by})
      RETURNING *
    `;
    return this.mapWorkout(result.rows[0]);
  }

  async getWorkoutById(id: number): Promise<Workout | null> {
    const result = await sql`
      SELECT * FROM workouts WHERE id = ${id}
    `;
    return result.rows[0] ? this.mapWorkout(result.rows[0]) : null;
  }

  async getWorkouts(filterPast: boolean = false): Promise<Workout[]> {
    let result;
    if (filterPast) {
      result = await sql`
        SELECT * FROM workouts 
        WHERE date >= NOW() 
        ORDER BY date ASC
      `;
    } else {
      result = await sql`
        SELECT * FROM workouts 
        ORDER BY date DESC
      `;
    }
    return result.rows.map(row => this.mapWorkout(row));
  }

  async getWorkoutsByDateRange(startDate: string, endDate: string): Promise<Workout[]> {
    const result = await sql`
      SELECT * FROM workouts 
      WHERE date >= ${startDate} AND date <= ${endDate}
      ORDER BY date ASC
    `;
    return result.rows.map(row => this.mapWorkout(row));
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
    const result = await sql`
      UPDATE workouts 
      SET title = ${title}, 
          description = ${description}, 
          workout_type = ${workout_type}, 
          date = ${date}, 
          max_participants = ${max_participants},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return result.rows[0] ? this.mapWorkout(result.rows[0]) : null;
  }

  async deleteWorkout(id: number): Promise<boolean> {
    const result = await sql`
      DELETE FROM workouts WHERE id = ${id}
    `;
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Registration operations
  async registerForWorkout(workout_id: number, user_id: number): Promise<Registration> {
    const result = await sql`
      INSERT INTO registrations (workout_id, user_id)
      VALUES (${workout_id}, ${user_id})
      ON CONFLICT (workout_id, user_id) DO UPDATE SET workout_id = ${workout_id}
      RETURNING *
    `;
    return this.mapRegistration(result.rows[0]);
  }

  async unregisterFromWorkout(workout_id: number, user_id: number): Promise<boolean> {
    const result = await sql`
      DELETE FROM registrations 
      WHERE workout_id = ${workout_id} AND user_id = ${user_id}
    `;
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getRegistrationsForWorkout(workout_id: number): Promise<Registration[]> {
    const result = await sql`
      SELECT * FROM registrations WHERE workout_id = ${workout_id}
    `;
    return result.rows.map(row => this.mapRegistration(row));
  }

  async getRegistrationsForUser(user_id: number): Promise<Registration[]> {
    const result = await sql`
      SELECT * FROM registrations WHERE user_id = ${user_id}
    `;
    return result.rows.map(row => this.mapRegistration(row));
  }

  async markAttendance(workout_id: number, user_id: number, attended: boolean): Promise<boolean> {
    const result = await sql`
      UPDATE registrations 
      SET attended = ${attended}
      WHERE workout_id = ${workout_id} AND user_id = ${user_id}
    `;
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getUserStats(user_id: number): Promise<any> {
    const result = await sql`
      SELECT 
        COUNT(DISTINCT CASE WHEN w.date < NOW() THEN r.workout_id END) as total_workouts,
        COUNT(DISTINCT CASE WHEN r.attended = true THEN r.workout_id END) as attended_workouts,
        COUNT(DISTINCT CASE WHEN w.date >= NOW() THEN w.id END) as upcoming_workouts
      FROM registrations r
      LEFT JOIN workouts w ON r.workout_id = w.id
      WHERE r.user_id = ${user_id} OR w.id IS NOT NULL
    `;
    
    const allUpcoming = await sql`
      SELECT COUNT(*) as count FROM workouts WHERE date >= NOW()
    `;

    const stats = result.rows[0];
    return {
      total_workouts: parseInt(stats.total_workouts || '0'),
      attended_workouts: parseInt(stats.attended_workouts || '0'),
      upcoming_workouts: parseInt(allUpcoming.rows[0].count || '0'),
      current_streak: 0,
    };
  }

  // Workout Template operations
  async createWorkoutTemplate(
    title: string,
    description: string,
    workout_type: string,
    category: 'Team of 2' | 'Team of 3' | 'Solo' | 'Custom'
  ): Promise<WorkoutTemplate> {
    const result = await sql`
      INSERT INTO workout_templates (title, description, workout_type, category)
      VALUES (${title}, ${description}, ${workout_type}, ${category})
      RETURNING *
    `;
    return this.mapWorkoutTemplate(result.rows[0]);
  }

  async getWorkoutTemplates(category?: string): Promise<WorkoutTemplate[]> {
    let result;
    if (category) {
      result = await sql`
        SELECT * FROM workout_templates 
        WHERE category = ${category}
        ORDER BY times_used DESC
      `;
    } else {
      result = await sql`
        SELECT * FROM workout_templates 
        ORDER BY times_used DESC
      `;
    }
    return result.rows.map(row => this.mapWorkoutTemplate(row));
  }

  async getWorkoutTemplateById(id: number): Promise<WorkoutTemplate | null> {
    const result = await sql`
      SELECT * FROM workout_templates WHERE id = ${id}
    `;
    return result.rows[0] ? this.mapWorkoutTemplate(result.rows[0]) : null;
  }

  async updateWorkoutTemplate(
    id: number,
    title: string,
    description: string,
    workout_type: string,
    category: 'Team of 2' | 'Team of 3' | 'Solo' | 'Custom'
  ): Promise<WorkoutTemplate | null> {
    const result = await sql`
      UPDATE workout_templates 
      SET title = ${title}, 
          description = ${description}, 
          workout_type = ${workout_type}, 
          category = ${category}
      WHERE id = ${id}
      RETURNING *
    `;
    return result.rows[0] ? this.mapWorkoutTemplate(result.rows[0]) : null;
  }

  async incrementTemplateUsage(id: number): Promise<void> {
    await sql`
      UPDATE workout_templates 
      SET times_used = times_used + 1
      WHERE id = ${id}
    `;
  }

  async deleteWorkoutTemplate(id: number): Promise<boolean> {
    const result = await sql`
      DELETE FROM workout_templates WHERE id = ${id}
    `;
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async searchWorkoutTemplates(query: string): Promise<WorkoutTemplate[]> {
    const result = await sql`
      SELECT * FROM workout_templates 
      WHERE title ILIKE ${'%' + query + '%'} OR description ILIKE ${'%' + query + '%'}
      ORDER BY times_used DESC
    `;
    return result.rows.map(row => this.mapWorkoutTemplate(row));
  }

  // Poll operations
  async createPoll(
    title: string,
    description: string,
    template_id: number | null,
    created_by: number
  ): Promise<Poll> {
    const result = await sql`
      INSERT INTO polls (title, description, template_id, created_by)
      VALUES (${title}, ${description}, ${template_id}, ${created_by})
      RETURNING *
    `;
    return this.mapPoll(result.rows[0]);
  }

  async getPollById(id: number): Promise<Poll | null> {
    const result = await sql`
      SELECT * FROM polls WHERE id = ${id}
    `;
    return result.rows[0] ? this.mapPoll(result.rows[0]) : null;
  }

  async getPolls(status?: 'active' | 'closed'): Promise<Poll[]> {
    let result;
    if (status) {
      result = await sql`
        SELECT * FROM polls 
        WHERE status = ${status}
        ORDER BY created_at DESC
      `;
    } else {
      result = await sql`
        SELECT * FROM polls 
        ORDER BY created_at DESC
      `;
    }
    return result.rows.map(row => this.mapPoll(row));
  }

  async updatePoll(
    id: number,
    title: string,
    description: string,
    template_id: number | null
  ): Promise<Poll | null> {
    const result = await sql`
      UPDATE polls 
      SET title = ${title}, 
          description = ${description}, 
          template_id = ${template_id}
      WHERE id = ${id}
      RETURNING *
    `;
    return result.rows[0] ? this.mapPoll(result.rows[0]) : null;
  }

  async updatePollStatus(id: number, status: 'active' | 'closed'): Promise<Poll | null> {
    const result = await sql`
      UPDATE polls 
      SET status = ${status}
      WHERE id = ${id}
      RETURNING *
    `;
    return result.rows[0] ? this.mapPoll(result.rows[0]) : null;
  }

  async deletePoll(id: number): Promise<boolean> {
    const result = await sql`
      DELETE FROM polls WHERE id = ${id}
    `;
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Poll option operations
  async createPollOption(poll_id: number, date: string, label?: string): Promise<PollOption> {
    const result = await sql`
      INSERT INTO poll_options (poll_id, date, label)
      VALUES (${poll_id}, ${date}, ${label || null})
      RETURNING *
    `;
    return this.mapPollOption(result.rows[0]);
  }

  async getPollOptions(poll_id: number): Promise<PollOption[]> {
    const result = await sql`
      SELECT * FROM poll_options 
      WHERE poll_id = ${poll_id}
      ORDER BY date ASC
    `;
    return result.rows.map(row => this.mapPollOption(row));
  }

  async deletePollOption(id: number): Promise<boolean> {
    const result = await sql`
      DELETE FROM poll_options WHERE id = ${id}
    `;
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Poll vote operations
  async createPollVote(poll_option_id: number, user_id: number): Promise<PollVote> {
    const result = await sql`
      INSERT INTO poll_votes (poll_option_id, user_id)
      VALUES (${poll_option_id}, ${user_id})
      ON CONFLICT (poll_option_id, user_id) DO UPDATE SET poll_option_id = ${poll_option_id}
      RETURNING *
    `;
    return this.mapPollVote(result.rows[0]);
  }

  async deletePollVote(poll_option_id: number, user_id: number): Promise<boolean> {
    const result = await sql`
      DELETE FROM poll_votes 
      WHERE poll_option_id = ${poll_option_id} AND user_id = ${user_id}
    `;
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getPollVotes(poll_option_id: number): Promise<PollVote[]> {
    const result = await sql`
      SELECT * FROM poll_votes WHERE poll_option_id = ${poll_option_id}
    `;
    return result.rows.map(row => this.mapPollVote(row));
  }

  async getUserVotesForPoll(poll_id: number, user_id: number): Promise<number[]> {
    const result = await sql`
      SELECT pv.poll_option_id 
      FROM poll_votes pv
      JOIN poll_options po ON pv.poll_option_id = po.id
      WHERE po.poll_id = ${poll_id} AND pv.user_id = ${user_id}
    `;
    return result.rows.map(row => row.poll_option_id);
  }

  // Mapping functions to convert DB rows to typed objects
  private mapUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      password_hash: row.password_hash,
      name: row.name,
      is_admin: row.is_admin,
      created_at: row.created_at.toISOString(),
    };
  }

  private mapWorkout(row: any): Workout {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      workout_type: row.workout_type,
      date: row.date.toISOString(),
      max_participants: row.max_participants,
      created_by: row.created_by,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
    };
  }

  private mapRegistration(row: any): Registration {
    return {
      id: row.id,
      workout_id: row.workout_id,
      user_id: row.user_id,
      attended: row.attended,
      registered_at: row.registered_at.toISOString(),
    };
  }

  private mapWorkoutTemplate(row: any): WorkoutTemplate {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      workout_type: row.workout_type,
      category: row.category,
      created_at: row.created_at.toISOString(),
      times_used: row.times_used,
    };
  }

  private mapPoll(row: any): Poll {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      template_id: row.template_id,
      created_by: row.created_by,
      status: row.status,
      created_at: row.created_at.toISOString(),
    };
  }

  private mapPollOption(row: any): PollOption {
    return {
      id: row.id,
      poll_id: row.poll_id,
      date: row.date.toISOString(),
      label: row.label,
      created_at: row.created_at.toISOString(),
    };
  }

  private mapPollVote(row: any): PollVote {
    return {
      id: row.id,
      poll_option_id: row.poll_option_id,
      user_id: row.user_id,
      voted_at: row.voted_at.toISOString(),
    };
  }
}

export const db = new PostgresDatabase();
