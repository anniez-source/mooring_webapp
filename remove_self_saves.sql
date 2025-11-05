-- Remove any saved contacts where someone saved themselves
-- (This happens when user_id = saved_profile_id)

DELETE FROM saved_contacts 
WHERE user_id = saved_profile_id;

-- Check if any remain (should return 0 rows)
SELECT COUNT(*) as self_saves_remaining 
FROM saved_contacts 
WHERE user_id = saved_profile_id;

