import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '');
    
    // Set the session and create authenticated client
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Create service role client for admin operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Check if the current user is an admin using service role
    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .from('user_roles')
      .select('role, is_active')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .eq('is_active', true);

    if (adminError || !adminCheck || adminCheck.length === 0) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Use the new database function that accepts admin user ID as parameter
    const { data: users, error } = await supabaseAdmin
      .rpc('admin_get_all_users_with_roles', { admin_user_id: user.id });

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform the data to match expected format
    const formattedUsers = (users || []).map(user => ({
      id: user.user_id,
      email: user.email,
      created_at: user.created_at,
      roles: Array.isArray(user.roles) ? user.roles : []
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}