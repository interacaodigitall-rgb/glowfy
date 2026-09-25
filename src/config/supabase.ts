import { createClient } from '@supabase/supabase-js';

export const SUPABASE_PROJECT_ID = 'rfcgmouitpizvaxfribw';
export const SUPABASE_PROJECT_NAME = 'glowfy';

export const SUPABASE_URL = 
  import.meta.env.VITE_SUPABASE_URL || 
  `https://${SUPABASE_PROJECT_ID}.supabase.co`;

export const SUPABASE_ANON_KEY = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  '';

// Supabase JavaScript Client instance
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJmY2dtb3VpdHBpenZheGZyaWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwMDAwMDAsImV4cCI6MjA1NTU1NTU1NX0.placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
