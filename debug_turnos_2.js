import fs from 'fs'
const env = fs.readFileSync('.env', 'utf8')
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim()
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim()

async function debug() {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/turnos?select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    })
    const data = await res.json()
    console.log(JSON.stringify(data, null, 2))
  } catch (err) {
    console.error(err)
  }
}
debug()
