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
    
    // Set the session
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Create service role client for admin operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Check if the current user is an admin
    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .from('user_roles')
      .select('role, is_active')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .eq('is_active', true);

    if (adminError || !adminCheck || adminCheck.length === 0) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get total users count (all users in auth.users)
    const { count: totalUsers, error: usersError } = await supabaseAdmin
      .from('user_roles')
      .select('*', { count: 'exact', head: true });

    // Get pending approvals count
    const { count: pendingApprovals, error: pendingError } = await supabaseAdmin
      .from('pending_user_approvals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Get approved today count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: approvedToday, error: approvedError } = await supabaseAdmin
      .from('pending_user_approvals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .gte('reviewed_at', today.toISOString());

    // Get active admins count
    const { count: activeAdmins, error: adminsError } = await supabaseAdmin
      .from('user_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('is_active', true);

    // Handle any errors
    if (usersError || pendingError || approvedError || adminsError) {
      console.error('Error fetching stats:', { usersError, pendingError, approvedError, adminsError });
      return NextResponse.json({ 
        error: 'Error fetching statistics',
        details: { usersError, pendingError, approvedError, adminsError }
      }, { status: 500 });
    }

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers || 0,
        pendingApprovals: pendingApprovals || 0,
        approvedToday: approvedToday || 0,
        activeAdmins: activeAdmins || 0
      }
    });
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}