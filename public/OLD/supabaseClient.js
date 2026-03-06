// supabaseClient.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = 'https://xxxxxx.supabase.co'  // remplace par ton URL
const SUPABASE_KEY = 'public-anon-key'            // remplace par ta clé anonyme

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)