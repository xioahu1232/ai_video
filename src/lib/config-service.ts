/**
 * 配置服务
 * 
 * 重新导出稳定配置服务，保持向后兼容
 */

export {
  CONFIG_KEYS,
  getConfig,
  getCozeApiKey,
  getWorkflowId,
  clearConfigCache,
  warmupConfigCache,
  checkConfigHealth,
} from './stable-config';

// 兼容旧接口
import { getConfig, CONFIG_KEYS } from './stable-config';

export interface SystemConfig {
  key: string;
  value: string;
  description?: string;
  updated_at: string;
}

// 获取系统配置（兼容旧接口）
export async function getSystemConfig(key: string): Promise<string | null> {
  const value = await getConfig(key);
  return value || null;
}

// 设置系统配置
export async function setSystemConfig(key: string, value: string, description?: string): Promise<boolean> {
  try {
    const { getSupabaseClient } = await import('./db-pool');
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
    
    // 清除缓存
    if (!error) {
      const { clearConfigCache } = await import('./stable-config');
      clearConfigCache(key);
    }
    
    return !error;
  } catch {
    return false;
  }
}
