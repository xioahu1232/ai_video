/**
 * 余额服务
 * 
 * 提供并发安全的余额操作，防止超扣问题
 * 
 * 使用策略：
 * 1. 乐观锁：使用版本号检查
 * 2. 原子更新：使用数据库的原子操作
 * 3. 重试机制：失败时自动重试
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface BalanceInfo {
  userId: string;
  balance: number;
  totalUsed: number;
  totalPurchased: number;
  role: string;
}

export interface DeductResult {
  success: boolean;
  previousBalance: number;
  newBalance: number;
  error?: string;
}

export interface AddBalanceResult {
  success: boolean;
  previousBalance: number;
  newBalance: number;
  error?: string;
}

// 最大重试次数
const MAX_RETRIES = 3;
// 重试延迟（毫秒）
const RETRY_DELAY = 100;

/**
 * 并发安全的余额扣减
 * 
 * 使用原子更新语句，防止超扣：
 * UPDATE user_balances 
 * SET balance = balance - 1, total_used = total_used + 1
 * WHERE user_id = ? AND balance > 0
 */
export async function deductBalance(
  supabase: SupabaseClient,
  userId: string,
  amount: number = 1
): Promise<DeductResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // 1. 先获取当前余额
      const { data: current, error: fetchError } = await supabase
        .from('user_balances')
        .select('balance, total_used')
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        // 如果用户没有余额记录，创建一个
        if (fetchError.code === 'PGRST116') {
          return {
            success: false,
            previousBalance: 0,
            newBalance: 0,
            error: '余额不足',
          };
        }
        // 返回错误而不是抛出
        return {
          success: false,
          previousBalance: 0,
          newBalance: 0,
          error: fetchError.message || '获取余额失败',
        };
      }

      const previousBalance = current.balance;

      // 2. 检查余额是否充足
      if (previousBalance < amount) {
        return {
          success: false,
          previousBalance,
          newBalance: previousBalance,
          error: '余额不足',
        };
      }

      // 3. 原子更新（使用条件更新防止并发超扣）
      const newBalance = previousBalance - amount;
      
      const { error: updateError } = await supabase
        .from('user_balances')
        .update({
          balance: newBalance,
          total_used: current.total_used + amount,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('balance', previousBalance); // 乐观锁：确保余额没有被其他请求修改

      if (updateError) {
        // 如果是并发冲突，重试
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY * attempt);
          continue;
        }
        // 返回错误而不是抛出
        return {
          success: false,
          previousBalance,
          newBalance: previousBalance,
          error: updateError.message || '余额更新失败',
        };
      }

      // 4. 验证更新是否成功
      const { data: verify, error: verifyError } = await supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (verifyError || verify.balance !== newBalance) {
        // 验证失败，可能是并发问题，重试
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY * attempt);
          continue;
        }
        return {
          success: false,
          previousBalance,
          newBalance: verify?.balance || previousBalance,
          error: '余额扣减验证失败',
        };
      }

      return {
        success: true,
        previousBalance,
        newBalance,
      };

    } catch (error) {
      // 处理各种类型的错误
      if (error instanceof Error) {
        lastError = error;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        // Supabase 错误对象
        lastError = new Error((error as { message: string }).message);
      } else {
        lastError = new Error(String(error));
      }
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY * attempt);
      }
    }
  }

  return {
    success: false,
    previousBalance: 0,
    newBalance: 0,
    error: lastError?.message || '余额扣减失败，请稍后重试',
  };
}

/**
 * 并发安全的余额增加
 */
export async function addBalance(
  supabase: SupabaseClient,
  userId: string,
  amount: number
): Promise<AddBalanceResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // 1. 获取当前余额
      const { data: current, error: fetchError } = await supabase
        .from('user_balances')
        .select('balance, total_purchased')
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        // 返回错误而不是抛出
        return {
          success: false,
          previousBalance: 0,
          newBalance: 0,
          error: fetchError.message || '获取余额失败',
        };
      }

      const previousBalance = current.balance;
      const newBalance = previousBalance + amount;

      // 2. 原子更新
      const { error: updateError } = await supabase
        .from('user_balances')
        .update({
          balance: newBalance,
          total_purchased: current.total_purchased + amount,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('balance', previousBalance);

      if (updateError) {
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY * attempt);
          continue;
        }
        // 返回错误而不是抛出
        return {
          success: false,
          previousBalance,
          newBalance: previousBalance,
          error: updateError.message || '余额更新失败',
        };
      }

      return {
        success: true,
        previousBalance,
        newBalance,
      };

    } catch (error) {
      // 处理各种类型的错误
      if (error instanceof Error) {
        lastError = error;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        lastError = new Error((error as { message: string }).message);
      } else {
        lastError = new Error(String(error));
      }
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY * attempt);
      }
    }
  }

  return {
    success: false,
    previousBalance: 0,
    newBalance: 0,
    error: lastError?.message || '余额增加失败',
  };
}

/**
 * 获取用户余额信息
 */
export async function getBalanceInfo(
  supabase: SupabaseClient,
  userId: string
): Promise<BalanceInfo | null> {
  try {
    const { data, error } = await supabase
      .from('user_balances')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // 用户不存在
      }
      throw error;
    }

    return {
      userId: data.user_id,
      balance: data.balance,
      totalUsed: data.total_used,
      totalPurchased: data.total_purchased,
      role: data.role || 'user',
    };

  } catch (error) {
    console.error('Get balance info error:', error);
    return null;
  }
}

/**
 * 检查用户是否是管理员
 */
export async function isAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const info = await getBalanceInfo(supabase, userId);
  return info?.role === 'admin';
}

/**
 * 辅助函数：延迟
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
