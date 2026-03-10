import { NextRequest, NextResponse } from 'next/server';

// 测试上传接口 - 不实际上传，只检查请求
export async function POST(request: NextRequest) {
  const requestId = Date.now().toString();
  console.log(`[${requestId}] Test upload endpoint called`);
  
  try {
    const contentLength = request.headers.get('content-length');
    const contentType = request.headers.get('content-type');
    
    console.log(`[${requestId}] Headers:`, {
      contentLength: contentLength ? `${Math.round(parseInt(contentLength) / 1024)}KB` : 'unknown',
      contentType: contentType?.substring(0, 50),
    });
    
    // 尝试读取formData
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      console.log(`[${requestId}] No file in formData`);
      return NextResponse.json({ 
        success: false, 
        error: 'No file',
        headers: { contentLength, contentType }
      });
    }
    
    console.log(`[${requestId}] File received:`, {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024).toFixed(1)}KB`
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Test upload successful',
      fileInfo: {
        name: file.name,
        type: file.type,
        size: file.size
      }
    });
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
