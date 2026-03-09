'use client';

import { useState } from 'react';
import { MessageCircle, QrCode, Gift, Sparkles, Mail, Globe } from 'lucide-react';
import Image from 'next/image';

/**
 * 页脚组件
 * 
 * 包含：
 * - 品牌信息
 * - 联系方式
 * - 二维码展示
 */

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function QRModal({ isOpen, onClose }: QRModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9990] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-2xl shadow-2xl max-w-xs w-full overflow-hidden animate-fadeInUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 text-center">
          <h3 className="text-lg font-bold text-gray-800 mb-4">扫码添加微信</h3>
          <div className="bg-gray-50 p-4 rounded-xl inline-block">
            <Image
              src="https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F50998985b708600651cbaa34e65c607c.jpg&nonce=20a2c68f-6399-4831-a186-860fb48e8928&project_id=7615252896803864582&sign=0fb25f951062fc9d0477443e0c985b30c922f4c1bc30cc3b89293be746b2aad3"
              alt="管理员微信二维码"
              width={180}
              height={180}
              className="rounded-lg"
              unoptimized
            />
          </div>
          <p className="text-sm text-gray-500 mt-3">备注「长风跨境」通过更快</p>
          <button
            onClick={onClose}
            className="mt-4 px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Footer() {
  const [showQR, setShowQR] = useState(false);

  return (
    <>
      <footer className="relative mt-16 border-t border-white/10">
        {/* 背景装饰 */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1220] to-transparent pointer-events-none" />
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-12 sm:py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {/* 品牌信息 */}
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-[#4fa3d1] to-[#1a3a6b] rounded-xl flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">长风跨境</span>
              </div>
              <p className="text-white/60 text-sm leading-relaxed">
                专注为中国商家提供出海服务，<br />
                用AI技术助力品牌全球化。
              </p>
            </div>

            {/* 联系方式 */}
            <div className="text-center">
              <h4 className="text-white font-semibold mb-4 flex items-center justify-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#4fa3d1]" />
                联系我们
              </h4>
              <div className="space-y-3">
                <button
                  onClick={() => setShowQR(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
                >
                  <QrCode className="w-5 h-5 text-[#4fa3d1] group-hover:scale-110 transition-transform" />
                  <span className="text-white/80 text-sm">扫码添加管理员微信</span>
                </button>
                <div className="flex items-center justify-center gap-4 text-white/50 text-xs">
                  <span className="flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5" />
                    购买额度
                  </span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    优质反馈送额度
                  </span>
                </div>
              </div>
            </div>

            {/* 二维码 */}
            <div className="text-center md:text-right">
              <h4 className="text-white font-semibold mb-4">扫码联系</h4>
              <div 
                className="inline-block bg-white p-2 rounded-xl cursor-pointer hover:shadow-lg hover:shadow-[#4fa3d1]/20 transition-shadow"
                onClick={() => setShowQR(true)}
              >
                <Image
                  src="https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F50998985b708600651cbaa34e65c607c.jpg&nonce=20a2c68f-6399-4831-a186-860fb48e8928&project_id=7615252896803864582&sign=0fb25f951062fc9d0477443e0c985b30c922f4c1bc30cc3b89293be746b2aad3"
                  alt="管理员微信二维码"
                  width={100}
                  height={100}
                  className="rounded-lg"
                  unoptimized
                />
              </div>
              <p className="text-white/40 text-xs mt-2">点击放大</p>
            </div>
          </div>

          {/* 底部版权 */}
          <div className="mt-12 pt-8 border-t border-white/10 text-center">
            <p className="text-white/40 text-sm">
              © {new Date().getFullYear()} 长风跨境 · AI视频Prompt智能体
            </p>
            <p className="text-white/30 text-xs mt-2">
              助力中国品牌出海，让世界看到中国制造
            </p>
          </div>
        </div>
      </footer>

      {/* 二维码弹窗 */}
      <QRModal isOpen={showQR} onClose={() => setShowQR(false)} />
    </>
  );
}
