import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 管理员密钥（生产环境应使用环境变量）
const ADMIN_SECRET = 'changfeng-admin-2024';

// 验证管理员权限
async function verifyAdmin(request: NextRequest): Promise<{ valid: boolean; supabase: ReturnType<typeof getSupabaseClient> }> {
  // 方式1：通过Authorization header验证
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseClient(token);
    
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) {
      const { data: userBalance } = await supabase
        .from('user_balances')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (userBalance?.role === 'admin') {
        return { valid: true, supabase };
      }
    }
  }
  
  // 方式2：通过secret参数验证
  return { valid: false, supabase: getSupabaseClient() };
}

// 生成兑换码
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, amount, count, description, expiresInDays } = body;

    // 验证管理员权限
    const { valid, supabase } = await verifyAdmin(request);
    if (!valid && secret !== ADMIN_SECRET) {
      return NextResponse.json(
        { error: '无权限' },
        { status: 403 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: '面额必须大于0' },
        { status: 400 }
      );
    }

    if (!count || count <= 0 || count > 1000) {
      return NextResponse.json(
        { error: '数量必须在1-1000之间' },
        { status: 400 }
      );
    }

    // 生成批次ID
    const batchId = crypto.randomUUID();

    // 生成兑换码
    const codes: string[] = [];
    const codesToInsert = [];

    for (let i = 0; i < count; i++) {
      // 生成格式：CF-XXXX-XXXX-XXXX（CF = 长风）
      const code = `CF-${generateCodeSegment()}-${generateCodeSegment()}-${generateCodeSegment()}`;
      codes.push(code);

      const codeData: Record<string, unknown> = {
        code,
        amount,
        batch_id: batchId,
        description: description || `${amount}次使用额度`,
      };

      // 设置过期时间
      if (expiresInDays && expiresInDays > 0) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);
        codeData.expires_at = expiresAt.toISOString();
      }

      codesToInsert.push(codeData);
    }

    // 批量插入
    const { error } = await supabase
      .from('redemption_codes')
      .insert(codesToInsert);

    if (error) {
      console.error('Insert codes error:', error);
      return NextResponse.json(
        { error: '生成兑换码失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      batchId,
      codes,
      message: `成功生成 ${count} 个兑换码`,
    });
  } catch (error) {
    console.error('Generate codes error:', error);
    return NextResponse.json(
      { error: '生成兑换码失败' },
      { status: 500 }
    );
  }
}

// 查询兑换码状态
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const batchId = searchParams.get('batchId');

    // 验证管理员权限
    const { valid, supabase } = await verifyAdmin(request);
    if (!valid && secret !== ADMIN_SECRET) {
      return NextResponse.json(
        { error: '无权限' },
        { status: 403 }
      );
    }

    if (batchId) {
      // 查询特定批次的兑换码
      const { data, error } = await supabase
        .from('redemption_codes')
        .select('*')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Query codes error:', error);
        return NextResponse.json(
          { error: '查询失败' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        codes: data,
      });
    } else {
      // 查询所有批次概览
      const { data, error } = await supabase
        .from('redemption_codes')
        .select('batch_id, amount, description, is_used, created_at')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        console.error('Query codes error:', error);
        return NextResponse.json(
          { error: '查询失败' },
          { status: 500 }
        );
      }

      // 按批次汇总
      const batchSummary: Record<string, {
        batchId: string;
        amount: number;
        description: string;
        total: number;
        used: number;
        unused: number;
        createdAt: string;
      }> = {};

      data?.forEach((code) => {
        const id = code.batch_id;
        if (!batchSummary[id]) {
          batchSummary[id] = {
            batchId: id,
            amount: code.amount,
            description: code.description || '',
            total: 0,
            used: 0,
            unused: 0,
            createdAt: code.created_at,
          };
        }
        batchSummary[id].total++;
        if (code.is_used) {
          batchSummary[id].used++;
        } else {
          batchSummary[id].unused++;
        }
      });

      return NextResponse.json({
        success: true,
        batches: Object.values(batchSummary),
      });
    }
  } catch (error) {
    console.error('Query codes error:', error);
    return NextResponse.json(
      { error: '查询失败' },
      { status: 500 }
    );
  }
}

// 生成4位随机码
function generateCodeSegment(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
