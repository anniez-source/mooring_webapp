/**
 * Delete all profiles and users except Annie Znamierowski
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function deleteAllExceptAnnie() {
  console.log('🗑️  Deleting all profiles except Annie Znamierowski...\n');

  try {
    // Get Annie's user_id(s)
    const { data: annieProfiles, error: annieError } = await supabase
      .from('profiles')
      .select('user_id, name, email')
      .ilike('name', '%Annie Znamierowski%');

    if (annieError) {
      console.error('❌ Error finding Annie:', annieError);
      process.exit(1);
    }

    console.log(`✓ Found ${annieProfiles.length} profile(s) for Annie Znamierowski:`);
    annieProfiles.forEach(p => console.log(`  - ${p.name} (${p.email})`));
    
    const annieUserIds = annieProfiles.map(p => p.user_id);

    // Get count of profiles to delete
    const { count: totalCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const toDeleteCount = totalCount - annieProfiles.length;
    console.log(`\n📊 Total profiles: ${totalCount}`);
    console.log(`📊 Profiles to delete: ${toDeleteCount}\n`);

    if (toDeleteCount === 0) {
      console.log('✓ No profiles to delete!');
      process.exit(0);
    }

    // Delete cluster memberships for non-Annie users
    console.log('Deleting cluster memberships...');
    const { error: clusterMembersError } = await supabase
      .from('cluster_members')
      .delete()
      .not('user_id', 'in', `(${annieUserIds.join(',')})`);

    if (clusterMembersError) {
      console.error('Warning: Error deleting cluster members:', clusterMembersError);
    }

    // Delete saved contacts for non-Annie users
    console.log('Deleting saved contacts...');
    const { error: savedContactsError } = await supabase
      .from('saved_contacts')
      .delete()
      .not('user_id', 'in', `(${annieUserIds.join(',')})`);

    if (savedContactsError) {
      console.error('Warning: Error deleting saved contacts:', savedContactsError);
    }

    // Delete organization memberships for non-Annie users
    console.log('Deleting organization memberships...');
    const { error: orgMembersError } = await supabase
      .from('organization_members')
      .delete()
      .not('user_id', 'in', `(${annieUserIds.join(',')})`);

    if (orgMembersError) {
      console.error('Warning: Error deleting org members:', orgMembersError);
    }

    // Delete user behavior data
    console.log('Deleting user behavior data...');
    const { error: behaviorError } = await supabase
      .from('user_behavior')
      .delete()
      .not('user_id', 'in', `(${annieUserIds.join(',')})`);

    if (behaviorError) {
      console.error('Warning: Error deleting behavior data:', behaviorError);
    }

    // Delete profiles (excluding Annie)
    console.log('Deleting profiles...');
    const { error: profilesError } = await supabase
      .from('profiles')
      .delete()
      .not('user_id', 'in', `(${annieUserIds.join(',')})`);

    if (profilesError) {
      console.error('❌ Error deleting profiles:', profilesError);
      process.exit(1);
    }

    // Delete users (excluding Annie)
    console.log('Deleting users...');
    const { error: usersError } = await supabase
      .from('users')
      .delete()
      .not('user_id', 'in', `(${annieUserIds.join(',')})`);

    if (usersError) {
      console.error('❌ Error deleting users:', usersError);
      process.exit(1);
    }

    console.log('\n✨ Deletion complete!');
    console.log(`✓ Kept ${annieProfiles.length} profile(s) for Annie`);
    console.log(`✓ Deleted ${toDeleteCount} other profiles`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

deleteAllExceptAnnie();

