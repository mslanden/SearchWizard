import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Helper: authenticate and verify admin access
async function getAdminClient(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return { error: NextResponse.json({ error: 'No authorization header' }, { status: 401 }) };
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Invalid token' }, { status: 401 }) };
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: adminCheck, error: adminError } = await supabaseAdmin
    .from('user_roles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .eq('is_active', true);

  if (adminError || !adminCheck || adminCheck.length === 0) {
    return { error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) };
  }

  return { supabaseAdmin };
}

// GET /api/admin/artifact-types?category=company
export async function GET(request) {
  try {
    const { error: authError, supabaseAdmin } = await getAdminClient(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let query = supabaseAdmin
      .from('artifact_types')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ types: data || [] });
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/artifact-types
// Body: { id, category, name, description?, sort_order? }
export async function POST(request) {
  try {
    const { error: authError, supabaseAdmin } = await getAdminClient(request);
    if (authError) return authError;

    const body = await request.json();
    const { id, category, name, description, sort_order } = body;

    if (!id || !category || !name) {
      return NextResponse.json({ error: 'id, category, and name are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('artifact_types')
      .insert({
        id,
        category,
        name,
        description: description || null,
        sort_order: sort_order ?? 0,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ type: data }, { status: 201 });
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/admin/artifact-types
// Body: { id, name?, description?, sort_order?, is_active? }
export async function PATCH(request) {
  try {
    const { error: authError, supabaseAdmin } = await getAdminClient(request);
    if (authError) return authError;

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    // Only allow updating these fields
    const allowed = ['name', 'description', 'sort_order', 'is_active'];
    const safeUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) => allowed.includes(key))
    );

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('artifact_types')
      .update(safeUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ type: data });
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/admin/artifact-types?id=annual_report
export async function DELETE(request) {
  try {
    const { error: authError, supabaseAdmin } = await getAdminClient(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('artifact_types')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
