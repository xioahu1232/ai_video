import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

interface ConfigItem {
  key: string;
  value: string;
  description?: string;
  updated_at: string;
}

// 获取所有系统配置
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 验证管理员权限
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const supabase = getSupabaseClient(token);

    // 验证用户
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }

    // 检查管理员权限
    const { data: userData } = await supabase
      .from('user_balances')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 });
    }

    // 获取所有配置
    const { data: configs, error } = await supabase
      .from('system_config')
      .select('*')
      .order('key');

    if (error) {
      console.error('Failed to fetch configs:', error);
      return NextResponse.json({ error: '获取配置失败' }, { status: 500 });
    }

    // 对敏感信息进行脱敏处理
    const sanitizedConfigs = (configs as ConfigItem[])?.map(config => ({
      ...config,
      value: config.key === 'coze_api_key' && config.value 
        ? `${config.value.substring(0, 10)}...${config.value.substring(config.value.length - 4)}`
        : config.value,
      hasValue: !!config.value,
    }));

    return NextResponse.json({ configs: sanitizedConfigs });

  } catch (error) {
    console.error('Get config error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// 更新系统配置
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    // 验证管理员权限
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const supabase = getSupabaseClient(token);

    // 验证用户
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 });
    }

    // 检查管理员权限
    const { data: userData } = await supabase
      .from('user_balances')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 });
    }

    const body = await request.json();
    const { key, value, description } = body;

    if (!key) {
      return NextResponse.json({ error: '缺少配置键名' }, { status: 400 });
    }

    // 更新或插入配置
    const { error } = await supabase
      .from('system_config')
      .upsert({
        key,
        value: value || '',
        description,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'key',
      });

    if (error) {
      console.error('Failed to update config:', error);
      return NextResponse.json({ error: '保存配置失败' }, { status: 500 });
    }

    console.log(`Config updated: ${key} by user ${user.id}`);

    return NextResponse.json({ success: true, message: '配置已保存' });

  } catch (error) {
    console.error('Update config error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
