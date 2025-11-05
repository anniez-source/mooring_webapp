import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function deleteDummies() {
  console.log('Deleting all dummy profiles...');
  
  // Delete profiles
  const { error: profileError } = await supabase
    .from('profiles')
    .delete()
    .like('email', '%@example.com');
  
  if (profileError) {
    console.error('Error deleting profiles:', profileError);
  } else {
    console.log('✓ Deleted dummy profiles');
  }
  
  // Delete users
  const { error: userError } = await supabase
    .from('users')
    .delete()
    .like('email', '%@example.com');
  
  if (userError) {
    console.error('Error deleting users:', userError);
  } else {
    console.log('✓ Deleted dummy users');
  }
  
  console.log('\n✨ All dummy data deleted!');
}

deleteDummies()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
