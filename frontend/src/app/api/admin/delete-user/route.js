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

    // Verify the service role key is working
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Check if current user is admin before proceeding
    const { data: adminCheck, error: adminError } = await supabaseAdmin
      .from('user_roles')
      .select('role, is_active')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .eq('is_active', true);

    if (adminError) {
      console.error('Admin check error:', adminError);
      return NextResponse.json({ error: 'Failed to verify admin status' }, { status: 500 });
    }

    if (!adminCheck || adminCheck.length === 0) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get target user info before deletion
    const { data: targetUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(target_user_id);
    if (userError) {
      console.error('Get user error:', userError);
      return NextResponse.json({ error: `Failed to get user info: ${userError.message}` }, { status: 404 });
    }
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Use the database function to clean up user records first
    const { data: cleanupResult, error: cleanupError } = await supabaseAdmin
      .rpc('delete_user_complete', {
        p_target_user_id: target_user_id,
        p_admin_user_id: user.id,
        p_admin_notes: admin_notes || 'User account deleted by admin'
      });

    if (cleanupError) {
      console.error('Database cleanup error:', cleanupError);
      return NextResponse.json({ 
        error: `Database cleanup failed: ${cleanupError.message}`,
        details: cleanupError
      }, { status: 500 });
    }

    console.log('Database cleanup successful:', cleanupResult);

    // Now delete the user from Supabase Auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(target_user_id);
    
    if (deleteError) {
      console.error('Auth deletion error:', deleteError);
      return NextResponse.json({ 
        error: `Failed to delete user from auth: ${deleteError.message}`,
        details: deleteError
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User deleted successfully',
      deleted_user: {
        id: target_user_id,
        email: targetUser.user.email
      }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: `Database error deleting user: ${error.message}` }, { status: 500 });
  }
}