import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

// Initialize Supabase client
// Check for both NEXT_PUBLIC_ prefixed and non-prefixed versions
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {

}

const supabase = createClient(supabaseUrl, supabaseKey);

// Path to example documents
const EXAMPLE_DOCS_DIR = path.join(process.cwd(), '..', 'backend', 'Example-docs');

export async function GET() {
  try {
    // Verify user authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get directories from Example-docs
    const directories = getExampleDocDirectories();

    return NextResponse.json({ directories });
  } catch (error) {

    return NextResponse.json({ error: 'Failed to retrieve example document directories' }, { status: 500 });
  }
}

/**
 * Get directories from Example-docs
 */
function getExampleDocDirectories() {
  try {
    // Check if Example-docs directory exists
    if (!fs.existsSync(EXAMPLE_DOCS_DIR)) {

      return [];
    }

    // Get all subdirectories
    const directories = fs.readdirSync(EXAMPLE_DOCS_DIR)
      .filter(item => {
        const itemPath = path.join(EXAMPLE_DOCS_DIR, item);
        return fs.statSync(itemPath).isDirectory();
      });

    return directories;
  } catch (error) {

    return [];
  }
}
