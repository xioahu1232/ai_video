import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 获取用户的所有任务
// 规则：
// - 只返回未过期的任务（expires_at > now 或 expires_at IS NULL）
// - 过期任务由定时任务清理
export async function GET(request: NextRequest) {
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

    // 获取用户的任务列表 - 只返回未过期的任务
    // 过期条件：expires_at IS NOT NULL AND expires_at < now
    // 未过期条件：expires_at IS NULL OR expires_at >= now
    const now = new Date().toISOString();
    const { data: tasks, error } = await supabase
      .from('user_tasks')
      .select('*')
      .eq('user_id', user.id)
      .or(`expires_at.is.null,expires_at.gte.${now}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch tasks error:', error);
      return NextResponse.json(
        { error: '获取任务列表失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tasks: tasks || [],
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json(
      { error: '获取任务列表失败' },
      { status: 500 }
    );
  }
}

// 创建新任务
// 规则：
// - 新创建的任务默认设置48小时后过期
// - 如果 starred=true，则不设置过期时间（永久保存）
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { coreSellingPoint, specialRequirements, imageUrl, imageKey, videoDuration, language, sora, seedance, status, error: taskError, starred } = body;

    if (!coreSellingPoint || !language) {
      return NextResponse.json(
        { error: '核心卖点和语言为必填项' },
        { status: 400 }
      );
    }

    // 计算过期时间：未收藏的48小时后过期，收藏的不过期
    const isStarred = starred || false;
    const expiresAt = isStarred ? null : new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    // 创建任务
    const { data: task, error } = await supabase
      .from('user_tasks')
      .insert({
        user_id: user.id,
        core_selling_point: coreSellingPoint,
        special_requirements: specialRequirements, // 特殊要求
        image_url: imageUrl,
        image_key: imageKey, // 存储 S3 key，用于生成永久有效的预签名 URL
        video_duration: videoDuration,
        language,
        sora,
        seedance,
        status: status || 'pending',
        error: taskError,
        starred: isStarred,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      console.error('Create task error:', error);
      return NextResponse.json(
        { error: '创建任务失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      task,
    });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json(
      { error: '创建任务失败' },
      { status: 500 }
    );
  }
}

// 清空所有任务
export async function DELETE(request: NextRequest) {
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

    // 删除用户的所有任务
    const { error } = await supabase
      .from('user_tasks')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Delete tasks error:', error);
      return NextResponse.json(
        { error: '清空任务失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Delete tasks error:', error);
    return NextResponse.json(
      { error: '清空任务失败' },
      { status: 500 }
    );
  }
}
