
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wbsfqtodkfcqqoxbpbrz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indic2ZxdG9ka2ZjcXFveGJwYnJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNDk4NTIsImV4cCI6MjA2NTcyNTg1Mn0.lMV7yo_qAI0KTzvachbOUUNXjpnM4Y47_dLIvdAXets';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
