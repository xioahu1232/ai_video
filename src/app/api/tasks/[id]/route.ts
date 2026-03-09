import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 更新任务
// 规则：
// - 收藏时：取消过期时间（永久保存）
// - 取消收藏时：设置48小时后过期
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const supabase = getSupabaseClient(token);

    // 验证用户
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: '登录已过期，请重新登录' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // 更新任务（只能更新自己的任务）
    const updateData: Record<string, unknown> = {};
    if (body.sora !== undefined) updateData.sora = body.sora;
    if (body.seedance !== undefined) updateData.seedance = body.seedance;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.error !== undefined) updateData.error = body.error;
    
    // 收藏状态变化时，同步更新过期时间
    if (body.starred !== undefined) {
      updateData.starred = body.starred;
      if (body.starred === true) {
        // 收藏时：取消过期时间，永久保存
        updateData.expires_at = null;
      } else {
        // 取消收藏时：设置48小时后过期
        updateData.expires_at = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: '没有要更新的内容' },
        { status: 400 }
      );
    }

    const { data: task, error } = await supabase
      .from('user_tasks')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Update task error:', error);
      return NextResponse.json(
        { error: '更新任务失败' },
        { status: 500 }
      );
    }

    if (!task) {
      return NextResponse.json(
        { error: '任务不存在或无权限' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json(
      { error: '更新任务失败' },
      { status: 500 }
    );
  }
}

// 删除任务
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const supabase = getSupabaseClient(token);

    // 验证用户
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: '登录已过期，请重新登录' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // 删除任务（只能删除自己的任务）
    const { error } = await supabase
      .from('user_tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Delete task error:', error);
      return NextResponse.json(
        { error: '删除任务失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json(
      { error: '删除任务失败' },
      { status: 500 }
    );
  }
}
