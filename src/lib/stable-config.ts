/**
 * 稳定配置服务
 * 
 * 核心优化：
 * 1. 多层缓存：内存缓存 -> 数据库 -> 环境变量
 * 2. 自动降级：数据库不可用时使用环境变量
 * 3. 定时刷新：避免缓存过期
 */

import { getSupabaseClient } from '@/storage/database/supabase-client';

// 配置键名
export const CONFIG_KEYS = {
  COZE_API_KEY: 'coze_api_key',
  WORKFLOW_ID: 'coze_workflow_id',
} as const;

// 内存缓存
const configCache = new Map<string, { value: string; expireTime: number }>();

// 缓存有效期（5分钟）
const CACHE_TTL = 5 * 60 * 1000;

// 环境变量缓存（启动时加载一次）
let envConfigCache: Map<string, string> | null = null;

/**
 * 加载环境变量到缓存
 */
function loadEnvConfig(): Map<string, string> {
  if (envConfigCache) {
    return envConfigCache;
  }

  envConfigCache = new Map();
  
  // 加载已知的环境变量
  const envMappings: Record<string, string> = {
    [CONFIG_KEYS.COZE_API_KEY]: 'COZE_API_KEY',
    [CONFIG_KEYS.WORKFLOW_ID]: 'COZE_WORKFLOW_ID',
  };

  for (const [configKey, envKey] of Object.entries(envMappings)) {
    const value = process.env[envKey];
    if (value) {
      envConfigCache.set(configKey, value);
    }
  }

  return envConfigCache;
}

/**
 * 从数据库获取配置（带缓存）
 */
async function getConfigFromDB(key: string): Promise<string | null> {
  try {
    // 检查缓存
    const cached = configCache.get(key);
    if (cached && cached.expireTime > Date.now()) {
      return cached.value;
    }

    // 查询数据库
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', key)
      .single();

    if (error || !data) {
      return null;
    }

    const value = data.value?.trim() || null;
    
    // 更新缓存
    if (value) {
      configCache.set(key, {
        value,
        expireTime: Date.now() + CACHE_TTL,
      });
    }

    return value;
  } catch (error) {
    console.error(`[Config] DB query failed for ${key}:`, error);
    return null;
  }
}

/**
 * 获取配置值（三层回退：缓存 -> 数据库 -> 环境变量 -> 默认值）
 */
export async function getConfig(
  key: string, 
  defaultValue: string = ''
): Promise<string> {
  // 1. 尝试从数据库获取（带缓存）
  const dbValue = await getConfigFromDB(key);
  if (dbValue) {
    return dbValue;
  }

  // 2. 数据库没有，尝试环境变量
  const envConfig = loadEnvConfig();
  const envValue = envConfig.get(key);
  if (envValue) {
    return envValue;
  }

  // 3. 返回默认值
  return defaultValue;
}

/**
 * 获取 Coze API Key
 */
export async function getCozeApiKey(): Promise<string | null> {
  const value = await getConfig(CONFIG_KEYS.COZE_API_KEY);
  return value || null;
}

/**
 * 获取工作流 ID
 */
export async function getWorkflowId(): Promise<string> {
  return getConfig(CONFIG_KEYS.WORKFLOW_ID, '7601074566710444095');
}

/**
 * 清除配置缓存（配置更新时调用）
 */
export function clearConfigCache(key?: string): void {
  if (key) {
    configCache.delete(key);
  } else {
    configCache.clear();
  }
}

/**
 * 预热配置缓存（启动时调用）
 */
export async function warmupConfigCache(): Promise<void> {
  console.log('[Config] Warming up config cache...');
  
  const keys = Object.values(CONFIG_KEYS);
  await Promise.all(keys.map(key => getConfigFromDB(key)));
  
  console.log('[Config] Config cache warmed up');
}

/**
 * 健康检查：验证配置是否可用
 */
export async function checkConfigHealth(): Promise<{
  healthy: boolean;
  hasApiKey: boolean;
  hasWorkflowId: boolean;
  source: 'database' | 'env' | 'default';
}> {
  let hasApiKey = false;
  let hasWorkflowId = false;
  let source: 'database' | 'env' | 'default' = 'default';

  // 检查 API Key
  const apiKey = await getConfig(CONFIG_KEYS.COZE_API_KEY);
  if (apiKey) {
    hasApiKey = true;
    // 判断来源
    const cached = configCache.get(CONFIG_KEYS.COZE_API_KEY);
    if (cached) {
      source = 'database';
    } else {
      source = 'env';
    }
  }

  // 检查工作流 ID
  const workflowId = await getConfig(CONFIG_KEYS.WORKFLOW_ID);
  if (workflowId && workflowId !== '7601074566710444095') {
    hasWorkflowId = true;
  } else if (workflowId) {
    hasWorkflowId = true;
    source = 'default';
  }

  return {
    healthy: hasApiKey && hasWorkflowId,
    hasApiKey,
    hasWorkflowId,
    source,
  };
}
