import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const { target_user_id, admin_notes } = await request.json();

    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '');
    
    // Set the session and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Validate input
    if (!target_user_id) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
    }

    // Create service role client for admin operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Call the new admin_deactivate_user function
    const { data, error } = await supabaseAdmin.rpc('admin_deactivate_user', {
      admin_user_id: user.id,
      target_user_id,
      admin_notes: admin_notes || null
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check if the function returned an error
    if (data && !data.success) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}