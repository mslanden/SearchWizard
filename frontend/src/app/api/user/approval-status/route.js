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

    // Get the user's approval status
    const { data: approvalStatus, error } = await supabaseAdmin
      .from('pending_user_approvals')
      .select('status, registration_date, reviewed_at, review_notes')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // If no pending approval record found, user might be already approved
      if (error.code === 'PGRST116') {
        return NextResponse.json({ 
          approved: true,
          message: 'User already approved or no pending approval needed'
        });
      }
      
      console.error('Error fetching approval status:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ approvalStatus });
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}