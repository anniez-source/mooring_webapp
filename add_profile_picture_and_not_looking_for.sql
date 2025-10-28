-- Add missing columns to profiles table if they don't exist
-- Run this in Supabase SQL Editor

-- Add not_looking_for column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'not_looking_for'
    ) THEN
        ALTER TABLE profiles ADD COLUMN not_looking_for TEXT;
    END IF;
END $$;

-- Ensure profile_picture column exists and is TEXT type
-- (TEXT in PostgreSQL can store up to 1GB, which should be plenty for base64 images)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'profile_picture'
    ) THEN
        ALTER TABLE profiles ADD COLUMN profile_picture TEXT;
    END IF;
END $$;

-- Verify the columns exist
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('profile_picture', 'not_looking_for')
ORDER BY column_name;

