import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkProfile() {
  // Get your user (first one with name Annie)
  const { data: users } = await supabase
    .from('users')
    .select('user_id, name')
    .ilike('name', 'Annie%');
  
  if (!users || users.length === 0) {
    console.log('No Annie user found');
    return;
  }
  
  const user = users[0];
  console.log('Found user:', user.name);
  
  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('background, interests, expertise, opted_in')
    .eq('user_id', user.user_id)
    .single();
  
  if (!profile) {
    console.log('No profile found');
    return;
  }
  
  console.log('\nProfile data:');
  console.log('- background length:', profile.background?.length || 0, 'chars');
  console.log('- interests length:', profile.interests?.length || 0, 'chars');
  console.log('- expertise length:', profile.expertise?.length || 0, 'chars');
  console.log('- opted_in:', profile.opted_in);
  
  console.log('\nShowing modal?', 
    !profile.background || 
    !profile.interests ||
    !profile.expertise ||
    profile.background === 'Profile incomplete' ||
    profile.interests === 'Profile incomplete' ||
    profile.expertise === 'Profile incomplete' ||
    profile.background.length < 100 ||
    profile.interests.length < 100 ||
    profile.expertise.length < 100
  );
}

checkProfile();
