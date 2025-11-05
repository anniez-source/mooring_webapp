import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function setupDefaultOrg() {
  console.log('Setting up default organization...\n');
  
  // Create default organization (just name)
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name: 'Default Community' })
    .select()
    .single();
  
  if (orgError) {
    console.error('Error creating organization:', orgError);
    return;
  }
  
  console.log(`✓ Created organization: ${org.name} (${org.org_id})\n`);
  
  // Get all users
  const { data: users, error: userError} = await supabase
    .from('users')
    .select('user_id, name, email');
  
  if (userError || !users) {
    console.error('Error fetching users:', userError);
    return;
  }
  
  console.log(`Found ${users.length} users to add to organization\n`);
  
  // Add all users to the organization
  const memberships = users.map(user => ({
    org_id: org.org_id,
    user_id: user.user_id,
    role: 'member'
  }));
  
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert(memberships);
  
  if (memberError) {
    console.error('Error adding members:', memberError);
    return;
  }
  
  console.log(`✓ Added ${users.length} members to organization\n`);
  console.log('✨ Setup complete! You can now run: npm run detect-clusters');
}

setupDefaultOrg().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
