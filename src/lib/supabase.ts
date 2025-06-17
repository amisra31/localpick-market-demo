
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please configure:');
  console.error('- VITE_SUPABASE_URL');
  console.error('- VITE_SUPABASE_ANON_KEY');
  console.error('These should be automatically set when you connect to Supabase via the Lovable integration.');
  
  // Create a mock client to prevent app crashes during development
  export const supabase = createClient(
    'https://placeholder.supabase.co',
    'placeholder-key'
  );
} else {
  export const supabase = createClient(supabaseUrl, supabaseAnonKey);
}
