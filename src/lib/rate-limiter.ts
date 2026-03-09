/**
 * 请求限流器
 * 
 * 使用滑动窗口算法实现请求限流，保护系统免受高并发冲击
 * 
 * 限制规则：
 * - 全局限制：1000 请求/分钟（防止单点过载）
 * - 单用户限制：20 请求/分钟（防止单用户刷接口）
 * - 生成接口限制：5 请求/分钟（保护 Coze API）
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs: number;      // 时间窗口（毫秒）
  maxRequests: number;   // 窗口内最大请求数
  keyGenerator?: (identifier: string) => string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// 内存存储（适用于单实例部署）
// 如果是多实例部署，建议使用 Redis
const rateLimitStore = new Map<string, RateLimitEntry>();

// 定期清理过期记录（每5分钟）
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * 创建限流器
 */
function createRateLimiter(config: RateLimitConfig) {
  return (identifier: string): RateLimitResult => {
    const key = config.keyGenerator 
      ? config.keyGenerator(identifier) 
      : identifier;
    
    const now = Date.now();
    const entry = rateLimitStore.get(key);
    
    // 如果没有记录或已过期，创建新记录
    if (!entry || entry.resetTime < now) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs,
      };
    }
    
    // 检查是否超过限制
    if (entry.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      };
    }
    
    // 增加计数
    entry.count++;
    rateLimitStore.set(key, entry);
    
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  };
}

// 预定义限流器

/**
 * 全局限流器：1000 请求/分钟
 */
export const globalRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1分钟
  maxRequests: 1000,
  keyGenerator: () => 'global',
});

/**
 * 用户限流器：20 请求/分钟
 */
export const userRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  keyGenerator: (userId) => `user:${userId}`,
});

/**
 * 生成接口限流器：5 请求/分钟
 */
export const generateRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 5,
  keyGenerator: (userId) => `generate:${userId}`,
});

/**
 * 管理员限流器：100 请求/分钟
 */
export const adminRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  keyGenerator: (userId) => `admin:${userId}`,
});

/**
 * 组合限流检查
 * 同时检查全局限流和用户限流
 */
export function checkRateLimit(
  userId: string,
  limiters: Array<{ name: string; limiter: (id: string) => RateLimitResult }> = [
    { name: 'global', limiter: globalRateLimiter },
    { name: 'user', limiter: userRateLimiter },
  ]
): { allowed: boolean; result?: RateLimitResult; limiterName?: string } {
  for (const { name, limiter } of limiters) {
    const result = limiter(userId);
    if (!result.allowed) {
      return { allowed: false, result, limiterName: name };
    }
  }
  return { allowed: true };
}

/**
 * 获取限流统计信息
 */
export function getRateLimitStats(): {
  totalEntries: number;
  activeEntries: number;
  topUsers: Array<{ key: string; count: number }>;
} {
  const now = Date.now();
  let activeCount = 0;
  const entries: Array<{ key: string; count: number }> = [];
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime > now) {
      activeCount++;
      entries.push({ key, count: entry.count });
    }
  }
  
  // 按请求次数排序，取前10
  entries.sort((a, b) => b.count - a.count);
  
  return {
    totalEntries: rateLimitStore.size,
    activeEntries: activeCount,
    topUsers: entries.slice(0, 10),
  };
}

/**
 * 清除所有限流记录（用于测试或紧急重置）
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}
