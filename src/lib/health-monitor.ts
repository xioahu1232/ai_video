/**
 * 系统健康监控服务
 * 
 * 核心功能：
 * 1. 定期健康检查
 * 2. 服务状态监控
 * 3. 自动告警
 */

import { checkDatabaseHealth } from './db-pool';
import { checkConfigHealth } from './stable-config';

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: {
      healthy: boolean;
      latency?: number;
      error?: string;
    };
    config: {
      healthy: boolean;
      hasApiKey: boolean;
      hasWorkflowId: boolean;
      source: string;
    };
    cozeApi: {
      healthy: boolean;
      latency?: number;
      error?: string;
    };
  };
  uptime: number;
  version: string;
}

// 启动时间
const startTime = Date.now();

// 缓存上次检查结果
let lastHealthCheck: SystemHealth | null = null;
let lastHealthCheckTime = 0;

// 健康检查缓存时间（30秒）
const HEALTH_CACHE_TTL = 30 * 1000;

/**
 * 获取系统健康状态
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  const now = Date.now();
  
  // 使用缓存（避免频繁检查）
  if (lastHealthCheck && now - lastHealthCheckTime < HEALTH_CACHE_TTL) {
    return lastHealthCheck;
  }

  // 并行执行检查
  const [dbHealth, configHealth, cozeHealth] = await Promise.all([
    checkDatabaseHealth(),
    checkConfigHealth(),
    checkCozeApiHealth(),
  ]);

  // 判断整体状态
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  if (!dbHealth.healthy) {
    status = 'unhealthy';
  } else if (!configHealth.healthy || !cozeHealth.healthy) {
    status = 'degraded';
  }

  const health: SystemHealth = {
    status,
    timestamp: new Date().toISOString(),
    checks: {
      database: dbHealth,
      config: {
        ...configHealth,
        source: configHealth.source,
      },
      cozeApi: cozeHealth,
    },
    uptime: Math.floor((now - startTime) / 1000),
    version: process.env.npm_package_version || '1.0.0',
  };

  // 缓存结果
  lastHealthCheck = health;
  lastHealthCheckTime = now;

  return health;
}

/**
 * 检查 Coze API 健康状态
 */
async function checkCozeApiHealth(): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> {
  try {
    // 动态导入避免循环依赖
    const { getCozeApiKey } = await import('./stable-config');
    const apiKey = await getCozeApiKey();

    if (!apiKey) {
      return {
        healthy: false,
        error: 'API Key not configured',
      };
    }

    // 简单的 API 可达性检查（发送一个最小请求）
    const start = Date.now();
    
    const response = await fetch('https://api.coze.cn/v1/workflow/run', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflow_id: 'health_check',
        parameters: {},
      }),
      signal: AbortSignal.timeout(5000), // 5秒超时
    });

    const latency = Date.now() - start;

    // 只要能收到响应就算健康（即使是错误响应）
    // 因为这可能是因为工作流不存在，但 API 是可达的
    if (response.status === 401 || response.status === 403) {
      return {
        healthy: false,
        latency,
        error: 'API Key invalid or expired',
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
 * 快速健康检查（轻量级，用于负载均衡器）
 */
export async function quickHealthCheck(): Promise<{
  healthy: boolean;
  latency: number;
}> {
  const start = Date.now();
  
  try {
    // 只检查数据库连接
    const dbHealth = await checkDatabaseHealth();
    
    return {
      healthy: dbHealth.healthy,
      latency: Date.now() - start,
    };
  } catch {
    return {
      healthy: false,
      latency: Date.now() - start,
    };
  }
}

/**
 * 获取运行统计
 */
export function getRuntimeStats(): {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  nodeVersion: string;
  platform: string;
} {
  return {
    uptime: Math.floor((Date.now() - startTime) / 1000),
    memoryUsage: process.memoryUsage(),
    nodeVersion: process.version,
    platform: process.platform,
  };
}
