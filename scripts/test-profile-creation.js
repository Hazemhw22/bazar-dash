// Test script to debug profile creation issues
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testProfileCreation() {
  try {
    console.log('🔍 Testing profile creation...')
    
    // Test 1: Check if profiles table exists and is accessible
    console.log('\n1. Testing table access...')
    const { data: tableData, error: tableError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
    
    if (tableError) {
      console.error('❌ Table access error:', tableError)
      return
    }
    console.log('✅ Table access successful')
    
    // Test 2: Check table structure
    console.log('\n2. Testing table structure...')
    const { data: structureData, error: structureError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, created_at, updated_at')
      .limit(0)
    
    if (structureError) {
      console.error('❌ Structure check error:', structureError)
    } else {
      console.log('✅ Table structure check successful')
    }
    
    // Test 3: Try to insert a test profile (will fail due to auth, but we can see the error)
    console.log('\n3. Testing profile insertion...')
    const testProfileData = {
      id: 'test-user-id-' + Date.now(),
      full_name: 'Test User',
      email: 'test@example.com',
      role: 'customer',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    
    console.log('Test data:', testProfileData)
    
    const { data: insertData, error: insertError } = await supabase
      .from('profiles')
      .insert(testProfileData)
      .select()
    
    if (insertError) {
      console.error('❌ Insert error:', insertError)
      console.error('Error details:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      })
    } else {
      console.log('✅ Insert successful:', insertData)
    }
    
    // Test 4: Check RLS policies
    console.log('\n4. Checking RLS policies...')
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_policies', { table_name: 'profiles' })
      .catch(() => ({ data: null, error: { message: 'RPC function not available' } }))
    
    if (policiesError) {
      console.log('ℹ️  RLS check:', policiesError.message)
    } else {
      console.log('✅ RLS policies:', policies)
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the test
testProfileCreation() 