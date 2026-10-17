const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fxdhcaepgumfrlzpsfcf.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const TARGET_EMAIL = 'a.rajarathnareddychenni@gmail.com';
const TARGET_PASSWORD = 'Raja@9948959375.';

async function run() {
  console.log(`Connecting to Supabase at: ${supabaseUrl}`);
  try {
    const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) {
      console.error('Failed to list users:', listErr.message || listErr);
      return;
    }

    const existingUser = users.find(u => u.email?.toLowerCase() === TARGET_EMAIL.toLowerCase());

    if (existingUser) {
      console.log(`User ${TARGET_EMAIL} found with ID: ${existingUser.id}. Updating password...`);
      const { data, error: updateErr } = await supabase.auth.admin.updateUserById(existingUser.id, {
        password: TARGET_PASSWORD,
        email_confirm: true,
        user_metadata: {
          ...existingUser.user_metadata,
          full_name: existingUser.user_metadata?.full_name || 'Raja Rathna Reddy'
        }
      });

      if (updateErr) {
        console.error('Error updating password:', updateErr);
      } else {
        console.log(`SUCCESS: User password updated for ${TARGET_EMAIL}!`);
      }
    } else {
      console.log(`User ${TARGET_EMAIL} does not exist. Creating new user...`);
      const { data, error: createErr } = await supabase.auth.admin.createUser({
        email: TARGET_EMAIL,
        password: TARGET_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: 'Raja Rathna Reddy'
        }
      });

      if (createErr) {
        console.error('Error creating user:', createErr);
      } else {
        console.log(`SUCCESS: User created successfully with ID: ${data.user.id}!`);

        // Check profiles table
        const { error: profileErr } = await supabase.from('profiles').upsert({
          user_id: data.user.id,
          full_name: 'Raja Rathna Reddy',
          email: TARGET_EMAIL,
          role: 'admin'
        }, { onConflict: 'user_id' });

        if (profileErr) {
          console.warn('Note on profile upsert:', profileErr.message);
        } else {
          console.log('Profile created/verified.');
        }
      }
    }
  } catch (err) {
    console.error('Execution error:', err.message || err);
  }
}

run();
