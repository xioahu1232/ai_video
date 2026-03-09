import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '长风跨境Prompt智能体',
    template: '%s | 长风跨境',
  },
  description:
    '填写产品信息，调用多个AI智能体协作撰写视频提示词，助力跨境营销内容创作',
  keywords: [
    'AI视频生成',
    '视频营销',
    'Prompt生成',
    '跨境营销',
    '长风跨境',
  ],
  authors: [{ name: '长风跨境' }],
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
      <head>
        {/* Google Fonts - Noto Sans SC */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className={`antialiased`}>
        {isDev && <Inspector />}
        {children}
      </body>
    </html>
  );
}
