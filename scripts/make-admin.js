// Script to make an existing user an admin
// Usage: node scripts/make-admin.js <user-email>

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // You'll need this

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function makeUserAdmin(email) {
  try {
    console.log(`Making user ${email} an admin...`)
    
    // Update the user's role to admin
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('email', email)
      .select()

    if (error) {
      console.error('Error updating user role:', error)
      return
    }

    if (data && data.length > 0) {
      console.log(`✅ Successfully made ${email} an admin`)
      console.log('Updated profile:', data[0])
    } else {
      console.log(`❌ User with email ${email} not found`)
    }
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Get email from command line argument
const email = process.argv[2]
if (!email) {
  console.error('Please provide an email address')
  console.log('Usage: node scripts/make-admin.js <user-email>')
  process.exit(1)
}

makeUserAdmin(email) 