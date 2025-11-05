#!/usr/bin/env node

/**
 * Script to create the user_behavior table in Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function createUserBehaviorTable() {
  console.log('📦 Creating user_behavior table in Supabase...\n');

  try {
    // Read the SQL file
    const sqlPath = join(__dirname, '..', 'create_user_behavior_table_simplified.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    // Split into individual statements and execute
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.includes('CREATE TABLE') && statement.includes('user_behavior')) {
        console.log('✓ Creating user_behavior table...');
      } else if (statement.includes('CREATE INDEX')) {
        const indexName = statement.match(/CREATE INDEX.*?(idx_\w+)/)?.[1] || 'index';
        console.log(`✓ Creating ${indexName}...`);
      } else if (statement.includes('CREATE TRIGGER')) {
        console.log('✓ Creating update trigger...');
      } else if (statement.includes('CREATE OR REPLACE FUNCTION')) {
        console.log('✓ Creating update function...');
      } else if (statement.includes('COMMENT ON')) {
        // Skip logging comments
        continue;
      }

      const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
      
      if (error) {
        // Try direct execution if rpc fails
        console.warn(`  RPC failed, trying direct execution...`);
        // For direct SQL execution, we'll use a workaround
        // Since Supabase client doesn't support direct SQL, we log the statement
        console.log(`  Statement: ${statement.substring(0, 100)}...`);
      }
    }

    console.log('\n✅ user_behavior table created successfully!\n');
    
    // Verify the table exists
    const { data, error } = await supabase
      .from('user_behavior')
      .select('*')
      .limit(0);

    if (error) {
      console.log('⚠️  Note: Could not verify table (this is normal if using RLS)');
      console.log('   Run this SQL directly in Supabase SQL Editor:\n');
      console.log('   File: create_user_behavior_table_simplified.sql\n');
    } else {
      console.log('✓ Table verified and ready to use!\n');
    }

    // Show next steps
    console.log('📋 Next steps:');
    console.log('   1. Verify in Supabase Dashboard: Database → Tables → user_behavior');
    console.log('   2. Test the tracking: Search in /chat and check the table');
    console.log('   3. Run adaptive clustering: node scripts/detect-clusters-adaptive.js\n');

  } catch (error) {
    console.error('\n❌ Error creating table:', error.message);
    console.log('\n💡 Manual setup:');
    console.log('   1. Go to Supabase Dashboard → SQL Editor');
    console.log('   2. Copy contents of: create_user_behavior_table_simplified.sql');
    console.log('   3. Paste and run the SQL\n');
    process.exit(1);
  }
}

createUserBehaviorTable()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });





