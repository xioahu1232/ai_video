import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * 安全响应头中间件
 * 
 * 功能：
 * 1. 添加安全响应头防止常见攻击
 * 2. 防止点击劫持（Clickjacking）
 * 3. 防止 XSS 攻击
 * 4. 强制 HTTPS
 * 5. 防止 MIME 类型嗅探
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // 1. 防止点击劫持 - 禁止在 iframe 中嵌入
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');

  // 2. 防止 MIME 类型嗅探
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // 3. XSS 防护（现代浏览器已内置，但保留兼容性）
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // 4. 引用策略 - 控制来源信息
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 5. 权限策略 - 限制浏览器功能
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // 6. 内容安全策略（CSP）- 防止 XSS 和数据注入
  // 注意：开发模式需要放宽限制以便热更新
  const isDev = process.env.NODE_ENV === 'development';
  
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https: http:",
    "connect-src 'self' https://api.coze.cn https://*.supabase.co https://*.coze.cn",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ];

  // 开发环境放宽 CSP 以支持热更新
  if (isDev) {
    cspDirectives[1] = "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'report-sample'";
    cspDirectives[4] = "connect-src 'self' https://api.coze.cn https://*.supabase.co https://*.coze.cn ws: wss:";
  }

  response.headers.set('Content-Security-Policy', cspDirectives.join('; '));

  // 7. HTTP 严格传输安全（HSTS）- 仅生产环境
  // 强制浏览器使用 HTTPS 连接
  if (!isDev && request.nextUrl.protocol === 'https:') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // 8. 缓存控制 - 敏感页面禁止缓存
  const sensitivePaths = ['/admin', '/api/auth', '/api/admin', '/api/balance', '/api/redeem'];
  const isSensitivePath = sensitivePaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );
  
  if (isSensitivePath) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');
  }

  // 9. 隐藏服务器信息
  response.headers.delete('X-Powered-By');
  response.headers.set('X-Powered-By', 'Secure Server');

  return response;
}

// 配置中间件匹配路径
export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了：
     * - _next/static（静态文件）
     * - _next/image（图片优化文件）
     * - favicon.ico（网站图标）
     * - public 文件夹中的静态资源
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)).*)',
  ],
};
