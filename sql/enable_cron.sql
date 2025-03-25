-- Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to the application database user
GRANT USAGE ON SCHEMA cron TO your_database_user;

-- You might need to run this as superuser (postgres)
ALTER SYSTEM SET shared_preload_libraries = 'pg_cron';

-- After running this, you'll need to restart your PostgreSQL server
-- sudo systemctl restart postgresql
-- or on macOS:
-- brew services restart postgresql 