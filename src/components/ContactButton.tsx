'use client';

import { useState } from 'react';
import { MessageCircle, X, QrCode, Gift, Sparkles } from 'lucide-react';
import Image from 'next/image';

/**
 * 联系方式悬浮按钮
 * 
 * 固定在页面右下角，点击展示二维码弹窗
 * 提供购买额度、吐槽建议的联系方式
 */

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 二维码弹窗
function ContactModal({ isOpen, onClose }: ContactModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9990] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-fadeInUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 背景装饰 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#4fa3d1]/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#1a3a6b]/10 rounded-full blur-3xl" />
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors z-10"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>

        {/* 内容 */}
        <div className="relative p-8 pt-10 text-center">
          {/* 标题 */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-2">联系管理员</h3>
            <p className="text-gray-500 text-sm">扫码添加微信，获取更多服务</p>
          </div>

          {/* 二维码 */}
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-[#4fa3d1]/20 to-[#1a3a6b]/20 rounded-2xl blur-xl" />
            <div className="relative bg-white p-4 rounded-2xl border-2 border-[#4fa3d1]/20 shadow-lg">
              <Image
                src="https://code.coze.cn/api/sandbox/coze_coding/file/proxy?expire_time=-1&file_path=assets%2F50998985b708600651cbaa34e65c607c.jpg&nonce=20a2c68f-6399-4831-a186-860fb48e8928&project_id=7615252896803864582&sign=0fb25f951062fc9d0477443e0c985b30c922f4c1bc30cc3b89293be746b2aad3"
                alt="管理员微信二维码"
                width={200}
                height={200}
                className="rounded-lg"
                unoptimized
              />
            </div>
          </div>

          {/* 服务项目 */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-3">
              <Gift className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <p className="text-xs text-gray-600 font-medium">购买额度</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3">
              <MessageCircle className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <p className="text-xs text-gray-600 font-medium">吐槽建议</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-3">
              <Sparkles className="w-5 h-5 text-purple-500 mx-auto mb-1" />
              <p className="text-xs text-gray-600 font-medium">优质反馈<br/>送额度</p>
            </div>
          </div>

          {/* 提示 */}
          <div className="bg-gray-50 rounded-xl p-4 text-left">
            <p className="text-sm text-gray-600 leading-relaxed">
              <span className="font-semibold text-gray-800">扫码添加微信</span>，备注「长风跨境」：
            </p>
            <ul className="mt-2 space-y-1 text-xs text-gray-500">
              <li>• 购买更多使用额度</li>
              <li>• 提交产品建议或吐槽</li>
              <li>• 优质反馈将获赠免费额度</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// 悬浮按钮
export default function ContactButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* 悬浮按钮 */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 group"
        aria-label="联系客服"
      >
        <div className="relative">
          {/* 脉冲动画 */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#4fa3d1] to-[#1a3a6b] rounded-full animate-ping opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#4fa3d1] to-[#1a3a6b] rounded-full animate-pulse opacity-50" />
          
          {/* 按钮主体 */}
          <div className="relative w-14 h-14 bg-gradient-to-r from-[#4fa3d1] to-[#1a3a6b] rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          
          {/* 提示文字 */}
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap">
            <div className="bg-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#4fa3d1]" />
                <span>联系客服</span>
              </div>
              {/* 小三角 */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full">
                <div className="border-8 border-transparent border-l-white" />
              </div>
            </div>
          </div>
        </div>
      </button>

      {/* 弹窗 */}
      <ContactModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
