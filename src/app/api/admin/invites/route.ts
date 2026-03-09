import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 管理员密钥（生产环境应使用环境变量）
const ADMIN_SECRET = 'changfeng-admin-2024';

// 生成邀请码
export async function POST(request: NextRequest) {
  try {
    const { secret, count, description, expiresInDays } = await request.json();

    // 验证管理员权限
    if (secret !== ADMIN_SECRET) {
      return NextResponse.json(
        { error: '无权限' },
        { status: 403 }
      );
    }

    if (!count || count <= 0 || count > 1000) {
      return NextResponse.json(
        { error: '数量必须在1-1000之间' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 生成批次ID
    const batchId = crypto.randomUUID();

    // 生成邀请码
    const codes: string[] = [];
    const codesToInsert = [];

    for (let i = 0; i < count; i++) {
      // 生成格式：REG-XXXX-XXXX-XXXX（REG = 注册邀请）
      const code = `REG-${generateCodeSegment()}-${generateCodeSegment()}-${generateCodeSegment()}`;
      codes.push(code);

      const codeData: Record<string, unknown> = {
        code,
        batch_id: batchId,
        description: description || '注册邀请码',
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
      .from('invite_codes')
      .insert(codesToInsert);

    if (error) {
      console.error('Insert invite codes error:', error);
      return NextResponse.json(
        { error: '生成邀请码失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      batchId,
      codes,
      message: `成功生成 ${count} 个邀请码`,
    });
  } catch (error) {
    console.error('Generate invite codes error:', error);
    return NextResponse.json(
      { error: '生成邀请码失败' },
      { status: 500 }
    );
  }
}

// 查询邀请码状态
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const batchId = searchParams.get('batchId');

    // 验证管理员权限
    if (secret !== ADMIN_SECRET) {
      return NextResponse.json(
        { error: '无权限' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseClient();

    if (batchId) {
      // 查询特定批次的邀请码
      const { data, error } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('batch_id', batchId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Query invite codes error:', error);
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
        .from('invite_codes')
        .select('batch_id, description, is_used, created_at')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        console.error('Query invite codes error:', error);
        return NextResponse.json(
          { error: '查询失败' },
          { status: 500 }
        );
      }

      // 按批次汇总
      const batchSummary: Record<string, {
        batchId: string;
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
    console.error('Query invite codes error:', error);
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
