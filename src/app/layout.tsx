import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '梵梦AIGC - AI视频生成器',
    template: '%s | 梵梦AIGC',
  },
  description:
    '通过AI技术快速生成高质量视频内容，助力您的营销推广',
  keywords: [
    'AI视频生成',
    '视频营销',
    'AIGC',
    '智能视频',
    '梵梦',
  ],
  authors: [{ name: 'Fanmeng AI Team' }],
  generator: 'Coze Workflow',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="zh-CN" className="dark">
      <body className={`antialiased`}>
        {isDev && <Inspector />}
        {children}
      </body>
    </html>
  );
}
