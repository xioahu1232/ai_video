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

interface UploadResponse {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

export const maxDuration = 60; // 增加API路由超时时间到60秒

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  const requestId = Date.now().toString();
  console.log(`[${requestId}] Upload request started`);

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      console.log(`[${requestId}] Error: No file found`);
      return NextResponse.json(
        { success: false, error: '未找到上传文件' },
        { status: 400 }
      );
    }

    console.log(`[${requestId}] File info:`, {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024).toFixed(1)}KB`
    });

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      console.log(`[${requestId}] Error: Invalid file type: ${file.type}`);
      return NextResponse.json(
        { success: false, error: '只支持图片文件' },
        { status: 400 }
      );
    }

    // 验证文件大小（最大 10MB）
    if (file.size > 10 * 1024 * 1024) {
      console.log(`[${requestId}] Error: File too large: ${file.size}`);
      return NextResponse.json(
        { success: false, error: '图片大小不能超过 10MB' },
        { status: 400 }
      );
    }

    // 读取文件内容
    console.log(`[${requestId}] Reading file content...`);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`[${requestId}] File content read: ${buffer.length} bytes`);

    // 生成文件名
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `video-generator/${timestamp}_${originalName}`;

    // 上传到对象存储
    console.log(`[${requestId}] Uploading to S3: ${fileName}`);
    const key = await storage.uploadFile({
      fileContent: buffer,
      fileName: fileName,
      contentType: file.type || 'image/jpeg',
    });
    console.log(`[${requestId}] S3 upload complete: ${key}`);

    // 生成签名 URL（有效期 1 小时）
    const url = await storage.generatePresignedUrl({
      key: key,
      expireTime: 3600,
    });

    console.log(`[${requestId}] Upload successful: ${url}`);

    return NextResponse.json({
      success: true,
      url: url,
      key: key,
    });

  } catch (error) {
    console.error(`[${requestId}] Upload Error:`, error);
    
    // 更详细的错误信息
    const errorMessage = error instanceof Error 
      ? error.message 
      : '图片上传失败，请稍后重试';
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
