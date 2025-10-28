-- Add resume_filename column to profiles table

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS resume_filename TEXT;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name = 'resume_filename';


