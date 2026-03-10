/**
 * 数据库连接池管理器
 * 
 * 核心优化：
 * 1. 单例客户端：避免重复创建连接
 * 2. 连接池配置：优化并发连接
 * 3. 健康检查：定期验证连接可用性
 * 4. 自动重连：连接失败时自动重试
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 客户端缓存
let serviceClient: SupabaseClient | null = null;
let clientCreationError: Error | null = null;

// 配置
const DB_CONFIG = {
  timeout: 30000,        // 30秒超时
  maxRetries: 3,         // 最大重试次数
  retryDelay: 1000,      // 重试延迟
};

/**
 * 获取服务端 Supabase 客户端（单例）
 */
export function getServiceClient(): SupabaseClient {
  if (serviceClient) {
    return serviceClient;
  }

  const credentials = getCredentials();
  
  serviceClient = createClient(credentials.url, credentials.anonKey, {
    db: {
      timeout: DB_CONFIG.timeout,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'x-client-info': 'video-prompt-generator',
      },
    },
  });

  return serviceClient;
}

/**
 * 获取用户端 Supabase 客户端（带用户 token）
 */
export function getUserClient(token: string): SupabaseClient {
  const credentials = getCredentials();
  
  return createClient(credentials.url, credentials.anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    db: {
      timeout: DB_CONFIG.timeout,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * 带重试的数据库操作
 */
export async function withRetry<T>(
  operation: string,
  fn: () => Promise<T>,
  maxRetries: number = DB_CONFIG.maxRetries
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 判断是否为可重试错误
      const isRetryable = isRetryableError(lastError);
      
      if (!isRetryable || attempt === maxRetries) {
        console.error(`[DB] ${operation} failed after ${attempt} attempts:`, lastError.message);
        throw lastError;
      }

      console.warn(`[DB] ${operation} attempt ${attempt} failed, retrying...`);
      await sleep(DB_CONFIG.retryDelay * attempt);
    }
  }

  throw lastError || new Error('Unknown error');
}

/**
 * 判断错误是否可重试
 */
function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // 网络错误、超时、连接重置等可重试
  const retryablePatterns = [
    'network',
    'timeout',
    'econnreset',
    'econnrefused',
    'socket hang up',
    'fetch failed',
    'aborted',
  ];

  return retryablePatterns.some(pattern => message.includes(pattern));
}

/**
 * 数据库健康检查
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> {
  try {
    const start = Date.now();
    const client = getServiceClient();

    // 简单查询测试连接
    const { error } = await client
      .from('system_config')
      .select('key')
      .limit(1);

    const latency = Date.now() - start;

    if (error) {
      return {
        healthy: false,
        latency,
        error: error.message,
      };
    }

    return {
      healthy: true,
      latency,
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 获取数据库凭据
 */
function getCredentials(): { url: string; anonKey: string } {
  // 尝试从环境变量获取
  let url = process.env.COZE_SUPABASE_URL;
  let anonKey = process.env.COZE_SUPABASE_ANON_KEY;

  // 如果环境变量不存在，尝试加载
  if (!url || !anonKey) {
    loadEnvFromCoze();
    url = process.env.COZE_SUPABASE_URL;
    anonKey = process.env.COZE_SUPABASE_ANON_KEY;
  }

  if (!url) {
    throw new Error('COZE_SUPABASE_URL is not configured');
  }
  if (!anonKey) {
    throw new Error('COZE_SUPABASE_ANON_KEY is not configured');
  }

  return { url, anonKey };
}

/**
 * 从 Coze 工作负载身份加载环境变量
 */
function loadEnvFromCoze(): void {
  try {
    const { execSync } = require('child_process');
    
    const pythonCode = `
import os
import sys
try:
    from coze_workload_identity import Client
    client = Client()
    env_vars = client.get_project_env_vars()
    client.close()
    for env_var in env_vars:
        print(f"{env_var.key}={env_var.value}")
except Exception as e:
    print(f"# Error: {e}", file=sys.stderr)
`;

    const output = execSync(`python3 -c '${pythonCode.replace(/'/g, "'\"'\"'")}'`, {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const lines = output.trim().split('\n');
    for (const line of lines) {
      if (line.startsWith('#')) continue;
      const eqIndex = line.indexOf('=');
      if (eqIndex > 0) {
        const key = line.substring(0, eqIndex);
        let value = line.substring(eqIndex + 1);
        if ((value.startsWith("'") && value.endsWith("'")) ||
            (value.startsWith('"') && value.endsWith('"'))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  } catch (error) {
    console.error('[DB] Failed to load env from Coze:', error);
  }
}

/**
 * 工具函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重置客户端（用于测试或强制重连）
 */
export function resetClient(): void {
  serviceClient = null;
  clientCreationError = null;
}

// 导出兼容旧代码的函数
export { getServiceClient as getSupabaseClient };
