// Database abstraction - uses Postgres in production, mock database in development

// Check if we have Postgres connection
const hasPostgres = process.env.POSTGRES_URL || process.env.DATABASE_URL;

// Export the appropriate database implementation
export const db = hasPostgres
  ? require('./postgres').db
  : require('./mock').db;
