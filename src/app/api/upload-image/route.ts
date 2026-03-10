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

// API Route 配置
export const maxDuration = 60; // 增加API路由超时时间到60秒
export const dynamic = 'force-dynamic'; // 强制动态渲染

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  const requestId = Date.now().toString();
  console.log(`[${requestId}] Upload request started`);

  try {
    // 检查Content-Type判断上传方式
    const contentType = request.headers.get('content-type') || '';
    console.log(`[${requestId}] Content-Type: ${contentType.substring(0, 100)}`);
    
    let buffer: Buffer;
    let fileType = 'image/jpeg';
    let fileName = 'image.jpg';
    
    // 支持两种上传方式：FormData 和 JSON(Base64)
    if (contentType.includes('multipart/form-data')) {
      // 传统FormData方式
      console.log(`[${requestId}] Using FormData mode`);
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

      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { success: false, error: '只支持图片文件' },
          { status: 400 }
        );
      }

      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: '图片大小不能超过 10MB' },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      fileType = file.type;
      fileName = file.name;
    } else if (contentType.includes('application/json')) {
      // Base64 JSON方式（移动端备用方案）
      console.log(`[${requestId}] Using Base64 JSON mode`);
      const body = await request.json();
      
      if (!body.fileBase64) {
        return NextResponse.json(
          { success: false, error: '未找到文件数据' },
          { status: 400 }
        );
      }
      
      // 解析Base64数据
      const matches = body.fileBase64.match(/^data:(.+);base64,(.+)$/);
      if (!matches) {
        // 尝试直接解码（不带data:前缀）
        try {
          buffer = Buffer.from(body.fileBase64, 'base64');
          fileType = body.fileType || 'image/jpeg';
          fileName = body.fileName || 'image.jpg';
        } catch {
          return NextResponse.json(
            { success: false, error: '无效的Base64数据' },
            { status: 400 }
          );
        }
      } else {
        fileType = matches[1] || 'image/jpeg';
        const base64Data = matches[2];
        buffer = Buffer.from(base64Data, 'base64');
        fileName = body.fileName || 'image.jpg';
      }
      
      console.log(`[${requestId}] Base64 file info:`, {
        type: fileType,
        size: `${(buffer.length / 1024).toFixed(1)}KB`
      });
      
      if (buffer.length > 10 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: '图片大小不能超过 10MB' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: '不支持的Content-Type' },
        { status: 400 }
      );
    }

    // 生成文件名
    const timestamp = Date.now();
    const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageFileName = `video-generator/${timestamp}_${safeName}`;

    // 上传到对象存储
    console.log(`[${requestId}] Uploading to S3: ${storageFileName}`);
    const key = await storage.uploadFile({
      fileContent: buffer,
      fileName: storageFileName,
      contentType: fileType,
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
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : '图片上传失败，请稍后重试';
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
