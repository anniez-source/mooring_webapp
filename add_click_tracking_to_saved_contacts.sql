-- Add click tracking columns to saved_contacts table
ALTER TABLE saved_contacts 
ADD COLUMN IF NOT EXISTS email_clicked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS linkedin_clicked BOOLEAN DEFAULT false;

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_saved_contacts_email_clicked ON saved_contacts(email_clicked);
CREATE INDEX IF NOT EXISTS idx_saved_contacts_linkedin_clicked ON saved_contacts(linkedin_clicked);

-- Verify the columns were added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'saved_contacts' 
AND column_name IN ('email_clicked', 'linkedin_clicked');

