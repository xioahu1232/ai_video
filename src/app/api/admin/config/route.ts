import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

interface ConfigItem {
  key: string;
  value: string;
  description?: string;
  updated_at: string;
}

// 预定义的配置项
const CONFIG_DEFINITIONS = [
  { key: 'coze_api_key', description: 'Coze API 密钥，用于调用工作流' },
  { key: 'coze_workflow_id', description: 'Coze 工作流 ID' },
];

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

    // 获取已有配置
    const { data: existingConfigs, error } = await supabase
      .from('system_config')
      .select('*');

    if (error) {
      console.error('Failed to fetch configs:', error);
      return NextResponse.json({ error: '获取配置失败' }, { status: 500 });
    }

    // 合并预定义配置和已有配置
    const configMap = new Map<string, ConfigItem>();
    (existingConfigs as ConfigItem[])?.forEach(config => {
      configMap.set(config.key, config);
    });

    const configs = CONFIG_DEFINITIONS.map(def => {
      const existing = configMap.get(def.key);
      return {
        key: def.key,
        description: def.description,
        value: existing?.value 
          ? (def.key === 'coze_api_key' 
            ? `${existing.value.substring(0, 10)}...${existing.value.substring(existing.value.length - 4)}`
            : existing.value)
          : '',
        hasValue: !!existing?.value,
        updated_at: existing?.updated_at || '',
      };
    });

    return NextResponse.json({ configs });

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

    // 清理配置值
    let cleanValue = value || '';
    
    // 特殊处理：工作流ID 去除可能的 "id=" 前缀
    if (key === 'coze_workflow_id') {
      cleanValue = cleanValue.replace(/^id=/i, '').trim();
      // 验证是否为纯数字
      if (cleanValue && !/^\d+$/.test(cleanValue)) {
        return NextResponse.json({ 
          error: '工作流 ID 格式错误，应为纯数字，例如：7504252811677974554' 
        }, { status: 400 });
      }
    }
    
    // 特殊处理：API Key 去除可能的 "Bearer " 前缀和多余空格
    if (key === 'coze_api_key') {
      cleanValue = cleanValue.replace(/^Bearer\s+/i, '').trim();
    }

    // 更新或插入配置
    const { error } = await supabase
      .from('system_config')
      .upsert({
        key,
        value: cleanValue,
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
