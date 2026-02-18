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
    console.log('Activity log API - Token received (first 20 chars):', token.substring(0, 20) + '...');
    
    // Set the session
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Activity log API - Auth error:', authError, 'User:', user);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    console.log('Activity log API - Authenticated user:', user.id, user.email);

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

    console.log('Activity log API - Admin check result:', { adminCheck, adminError });

    if (adminError || !adminCheck || adminCheck.length === 0) {
      console.error('Activity log API - Admin access denied for user:', user.id, 'Error:', adminError, 'Check result:', adminCheck);
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get URL params for pagination and filtering
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    const offset = parseInt(url.searchParams.get('offset')) || 0;
    const actionType = url.searchParams.get('action_type');

    // Use the new database function to get activity log with admin emails
    const { data: activities, error } = await supabaseAdmin
      .rpc('admin_get_activity_log', {
        admin_user_id: user.id,
        limit_count: limit,
        offset_count: offset,
        filter_action_type: actionType && actionType !== 'all' ? actionType : null
      });

    if (error) {
      console.error('Activity log query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ activities: activities || [] });
  } catch (error) {
    console.error('Activity log API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}