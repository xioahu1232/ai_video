import { NextRequest, NextResponse } from 'next/server';
import { S3Storage } from 'coze-coding-dev-sdk';

// 初始化对象存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

interface ImageUrlResponse {
  success: boolean;
  url?: string;
  error?: string;
}

// API Route 配置
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

/**
 * 根据 S3 key 获取预签名 URL
 * GET /api/get-image-url?key=xxx
 * POST /api/get-image-url { keys: ['xxx', 'yyy'] } 批量获取
 */
export async function GET(request: NextRequest): Promise<NextResponse<ImageUrlResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { success: false, error: '缺少图片 key' },
        { status: 400 }
      );
    }

    // 生成新的预签名 URL（有效期 7 天）
    const url = await storage.generatePresignedUrl({
      key: key,
      expireTime: 7 * 24 * 60 * 60, // 7 天
    });

    return NextResponse.json({
      success: true,
      url: url,
    });
  } catch (error) {
    console.error('Get image URL error:', error);
    return NextResponse.json(
      { success: false, error: '获取图片 URL 失败' },
      { status: 500 }
    );
  }
}

// 批量获取图片 URL
interface BatchRequest {
  keys: string[];
}

interface BatchResponse {
  success: boolean;
  urls?: Record<string, string>;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<BatchResponse>> {
  try {
    const body: BatchRequest = await request.json();
    const { keys } = body;

    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json(
        { success: false, error: '缺少图片 keys' },
        { status: 400 }
      );
    }

    // 批量生成预签名 URL
    const urls: Record<string, string> = {};
    
    await Promise.all(
      keys.map(async (key) => {
        try {
          const url = await storage.generatePresignedUrl({
            key: key,
            expireTime: 7 * 24 * 60 * 60, // 7 天
          });
          urls[key] = url;
        } catch (error) {
          console.error(`Failed to get URL for key ${key}:`, error);
        }
      })
    );

    return NextResponse.json({
      success: true,
      urls: urls,
    });
  } catch (error) {
    console.error('Batch get image URLs error:', error);
    return NextResponse.json(
      { success: false, error: '批量获取图片 URL 失败' },
      { status: 500 }
    );
  }
}
