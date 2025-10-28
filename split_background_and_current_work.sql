-- Split the background field into two separate fields for better matching context
-- This migration creates a new 'working_on' field while keeping 'background' field

-- Add new column for current work if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS working_on TEXT;

-- Update the comment for background field to clarify its purpose
COMMENT ON COLUMN profiles.background IS 'User''s background, experience, and what they''ve built in the past';
COMMENT ON COLUMN profiles.working_on IS 'What the user is currently working on or exploring';

-- For existing profiles, we'll keep the existing 'background' data as-is
-- Users will need to update their profiles to add 'working_on' separately
-- Or you can run a manual migration/script to split existing data

-- Example of checking the update
SELECT name, background, working_on FROM profiles LIMIT 5;

