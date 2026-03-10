import { getSupabaseClient } from '@/storage/database/supabase-client';

// 系统配置键名
export const CONFIG_KEYS = {
  COZE_API_KEY: 'coze_api_key',
  WORKFLOW_ID: 'coze_workflow_id',
} as const;

// 系统配置项
export interface SystemConfig {
  key: string;
  value: string;
  description?: string;
  updated_at: string;
}

// 获取系统配置
export async function getSystemConfig(key: string): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', key)
      .single();
    
    if (error || !data) {
      console.log(`[Config] No config found for key: ${key}, error:`, error?.message || 'no data');
      return null;
    }
    
    console.log(`[Config] Got config for ${key}: "${data.value}" (length: ${data.value?.length})`);
    return data.value?.trim() || null;
  } catch (e) {
    console.error(`[Config] Error getting config for ${key}:`, e);
    return null;
  }
}

// 设置系统配置
export async function setSystemConfig(key: string, value: string, description?: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('system_config')
      .upsert({
        key,
        value,
        description,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'key',
      });
    
    return !error;
  } catch {
    return false;
  }
}

// 获取 Coze API Key（优先数据库配置，其次环境变量）
export async function getCozeApiKey(): Promise<string | null> {
  // 优先从数据库获取
  const dbKey = await getSystemConfig(CONFIG_KEYS.COZE_API_KEY);
  if (dbKey) {
    return dbKey;
  }
  
  // 回退到环境变量
  return process.env.COZE_API_KEY || null;
}

// 获取工作流 ID
export async function getWorkflowId(): Promise<string> {
  const dbId = await getSystemConfig(CONFIG_KEYS.WORKFLOW_ID);
  return dbId || '7601074566710444095';
}
