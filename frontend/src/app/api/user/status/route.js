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

    // Create service role client to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get the user's roles
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError);
      return NextResponse.json({ error: rolesError.message }, { status: 500 });
    }

    // Determine user status
    const userRoles = roles || [];
    const adminRole = userRoles.find(r => r.role === 'admin');
    const userRole = userRoles.find(r => r.role === 'user');

    const isAdmin = !!adminRole;
    const role = adminRole ? 'admin' : (userRole ? 'user' : null);
    const isApproved = userRoles.length > 0; // User is approved if they have any active role

    // If no roles, check if there's a pending approval
    let pendingApproval = null;
    if (!isApproved) {
      const { data: approval, error: approvalError } = await supabaseAdmin
        .from('pending_user_approvals')
        .select('status')
        .eq('user_id', user.id)
        .single();

      if (!approvalError && approval) {
        pendingApproval = approval.status;
      }
    }

    return NextResponse.json({
      isAdmin,
      role,
      isApproved,
      pendingApproval,
      userId: user.id,
      email: user.email
    });
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}