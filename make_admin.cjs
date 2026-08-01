const fs = require('fs')
const env = fs.readFileSync('.env', 'utf8')
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim()
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(supabaseUrl, supabaseKey)

async function makeAdmin() {
  const email = 'pruebalopez@gmail.com'
  const password = 'Prueba123@'
  
  console.log('Attempting to create user...')
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        rol: 'admin'
      }
    }
  })
  
  if (signUpError) {
    if (signUpError.message.includes('already registered') || signUpError.message.includes('User already registered')) {
        console.log('User exists. Attempting to login and update metadata...')
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password
        })
        
        if (loginError) {
            console.log('Could not login to update role. Error:', loginError)
            return
        }
        
        const { data: updateData, error: updateError } = await supabase.auth.updateUser({
            data: { rol: 'admin' }
        })
        
        if (updateError) {
            console.log('Failed to update role:', updateError)
        } else {
            console.log('Successfully updated existing user to admin')
        }
    } else {
        console.log('Signup failed:', signUpError)
    }
  } else {
    console.log('Successfully created new admin user!')
  }
}

makeAdmin()
