// Cloudflare D1 Database Adapter for Production
// This file switches between mock DB (development) and real D1 (production)

import { User, Workout, Registration, Poll, PollOption, PollVote } from '../types';
import { WorkoutTemplate } from '../workout-templates';

// Check if we're in Cloudflare Workers environment
const isCloudflare = typeof globalThis.DB !== 'undefined';

// Import the appropriate database implementation
let db: any;

if (isCloudflare && globalThis.DB) {
  // Production: Use Cloudflare D1
  db = {
    // User operations
    async createUser(email: string, password_hash: string, name: string, is_admin: boolean = false): Promise<User> {
      const result = await (globalThis.DB as any).prepare(
        'INSERT INTO users (email, password_hash, name, is_admin, created_at) VALUES (?, ?, ?, ?, datetime("now")) RETURNING *'
      ).bind(email, password_hash, name, is_admin ? 1 : 0).first();
      return result as User;
    },

    async getUserByEmail(email: string): Promise<User | null> {
      const result = await (globalThis.DB as any).prepare(
        'SELECT * FROM users WHERE email = ?'
      ).bind(email).first();
      return result as User | null;
    },

    async getUserById(id: number): Promise<User | null> {
      const result = await (globalThis.DB as any).prepare(
        'SELECT * FROM users WHERE id = ?'
      ).bind(id).first();
      return result as User | null;
    },

    async getAllUsers(): Promise<User[]> {
      const result = await (globalThis.DB as any).prepare(
        'SELECT * FROM users ORDER BY created_at DESC'
      ).all();
      return result.results as User[];
    },

    async deleteUser(id: number): Promise<boolean> {
      // Delete related data first
      await (globalThis.DB as any).prepare('DELETE FROM registrations WHERE user_id = ?').bind(id).run();
      await (globalThis.DB as any).prepare('DELETE FROM poll_votes WHERE user_id = ?').bind(id).run();
      
      const result = await (globalThis.DB as any).prepare(
        'DELETE FROM users WHERE id = ?'
      ).bind(id).run();
      return result.meta.changes > 0;
    },

    // Add more methods as needed...
    // For now, we'll import from the mock DB for development
  };
} else {
  // Development: Use mock database
  const { db: mockDb } = require('./index');
  db = mockDb;
}

export { db };
