"use client";

import { useState, useEffect } from "react";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BlessingToastProps {
  isVisible: boolean;
  onClose: () => void;
  blessing?: string;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export function BlessingToast({
  isVisible,
  onClose,
  blessing,
  autoClose = true,
  autoCloseDelay = 5000,
}: BlessingToastProps) {
  const [displayBlessing, setDisplayBlessing] = useState(
    blessing || "祝老板发大财！💰"
  );
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      // 随机祝福语
      if (!blessing) {
        const defaultBlessings = [
          "祝老板发大财！💰",
          "视频生成成功，爆款预定！🎬",
          "老板牛逼，这波稳了！🔥",
          "创意满分，订单接到手软！📦",
          "又搞定一个，老板就是效率担当！⚡",
        ];
        setDisplayBlessing(
          defaultBlessings[Math.floor(Math.random() * defaultBlessings.length)]
        );
      } else {
        setDisplayBlessing(blessing);
      }
    } else {
      setIsAnimating(false);
    }
  }, [isVisible, blessing]);

  useEffect(() => {
    if (isVisible && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [isVisible, autoClose, autoCloseDelay, onClose]);

  if (!isVisible && !isAnimating) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 transition-all duration-500 ease-out",
        isVisible && isAnimating
          ? "translate-y-0 opacity-100"
          : "translate-y-20 opacity-0"
      )}
    >
      <div className="relative bg-gradient-to-r from-[#1a3a6b] to-[#4fa3d1] rounded-2xl shadow-2xl p-4 pr-10 max-w-sm">
        {/* 小帆帆头像 */}
        <div className="absolute -top-3 -left-3 w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
          <span className="text-lg">🚀</span>
        </div>

        {/* 小帆帆名字 */}
        <div className="flex items-center gap-2 ml-6 mb-1">
          <span className="text-xs font-medium text-white/80">小帆帆</span>
          <Sparkles className="w-3 h-3 text-yellow-300 animate-pulse" />
        </div>

        {/* 祝福语内容 */}
        <div className="ml-6">
          <p className="text-white font-medium text-sm leading-relaxed">
            {displayBlessing}
          </p>
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-white/60 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 装饰元素 - 星星 */}
        <div className="absolute -top-1 right-8 text-yellow-300 animate-ping">
          ✨
        </div>
        <div
          className="absolute -bottom-1 left-8 text-yellow-300 animate-ping"
          style={{ animationDelay: "0.5s" }}
        >
          ✨
        </div>
      </div>
    </div>
  );
}

// 带API调用的祝福组件
interface SmartBlessingProps {
  isVisible: boolean;
  onClose: () => void;
  context?: string;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export function SmartBlessing({
  isVisible,
  onClose,
  context,
  autoClose = true,
  autoCloseDelay = 5000,
}: SmartBlessingProps) {
  const [blessing, setBlessing] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // 调用API生成祝福语
      const fetchBlessing = async () => {
        setIsLoading(true);
        try {
          const response = await fetch("/api/blessing", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ context }),
          });
          const data = await response.json();
          if (data.success) {
            setBlessing(data.blessing);
          }
        } catch (error) {
          console.error("获取祝福语失败:", error);
          // 使用默认祝福语
          const fallbackBlessings = [
            "祝老板发大财！💰",
            "视频生成成功，爆款预定！🎬",
          ];
          setBlessing(
            fallbackBlessings[
              Math.floor(Math.random() * fallbackBlessings.length)
            ]
          );
        } finally {
          setIsLoading(false);
        }
      };

      fetchBlessing();
    }
  }, [isVisible, context]);

  return (
    <BlessingToast
      isVisible={isVisible && !isLoading}
      onClose={onClose}
      blessing={blessing}
      autoClose={autoClose}
      autoCloseDelay={autoCloseDelay}
    />
  );
}
