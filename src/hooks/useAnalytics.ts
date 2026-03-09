'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * 数据埋点 Hook
 * 
 * 使用方式：
 * const analytics = useAnalytics();
 * analytics.track('click', 'submit_button', { page: 'home' });
 */

// 生成唯一会话ID
const generateSessionId = () => {
  if (typeof window !== 'undefined') {
    let sessionId = sessionStorage.getItem('_sid');
    if (!sessionId) {
      sessionId = `sid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('_sid', sessionId);
    }
    return sessionId;
  }
  return '';
};

// 事件类型定义
type EventType = 
  | 'page_view'      // 页面浏览
  | 'click'          // 点击
  | 'submit'         // 表单提交
  | 'success'        // 操作成功
  | 'error'          // 错误
  | 'login'          // 登录
  | 'logout'         // 登出
  | 'register'       // 注册
  | 'purchase'       // 购买
  | 'generate'       // 生成
  | 'download'       // 下载
  | 'share'          // 分享
  | 'star'           // 收藏
  | 'delete';        // 删除

interface TrackOptions {
  eventData?: Record<string, any>;
  eventCategory?: string;
}

export function useAnalytics() {
  const sessionId = useRef(generateSessionId());

  // 发送埋点事件
  const track = useCallback(async (
    eventType: EventType | string,
    eventName: string,
    options?: TrackOptions
  ) => {
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          eventName,
          eventCategory: options?.eventCategory,
          eventData: options?.eventData,
          sessionId: sessionId.current,
          pageUrl: window.location.href,
          referrer: document.referrer,
        }),
      });
    } catch (error) {
      // 埋点失败静默处理，不影响用户体验
      console.debug('Analytics track failed:', error);
    }
  }, []);

  // 页面浏览追踪
  const trackPageView = useCallback((pageName?: string) => {
    track('page_view', pageName || window.location.pathname, {
      eventData: {
        title: document.title,
        path: window.location.pathname,
      },
    });
  }, [track]);

  // 点击追踪
  const trackClick = useCallback((elementName: string, data?: Record<string, any>) => {
    track('click', elementName, { eventData: data });
  }, [track]);

  // 表单提交追踪
  const trackSubmit = useCallback((formName: string, data?: Record<string, any>) => {
    track('submit', formName, { eventData: data });
  }, [track]);

  // 操作成功追踪
  const trackSuccess = useCallback((actionName: string, data?: Record<string, any>) => {
    track('success', actionName, { eventData: data });
  }, [track]);

  // 错误追踪
  const trackError = useCallback((errorName: string, error?: Error | string) => {
    track('error', errorName, {
      eventData: {
        message: typeof error === 'string' ? error : error?.message,
        stack: typeof error === 'object' ? error?.stack : undefined,
      },
    });
  }, [track]);

  // 登录追踪
  const trackLogin = useCallback((method: 'email' | 'admin' = 'email') => {
    track('login', 'user_login', { eventData: { method } });
  }, [track]);

  // 登出追踪
  const trackLogout = useCallback(() => {
    track('logout', 'user_logout');
  }, [track]);

  // 注册追踪
  const trackRegister = useCallback(() => {
    track('register', 'user_register');
  }, [track]);

  // 生成追踪
  const trackGenerate = useCallback((duration: string, language: string) => {
    track('generate', 'video_prompt_generate', {
      eventData: { duration, language },
    });
  }, [track]);

  // 下载追踪
  const trackDownload = useCallback((fileName: string, format: string) => {
    track('download', 'result_download', {
      eventData: { fileName, format },
    });
  }, [track]);

  // 收藏追踪
  const trackStar = useCallback((taskId: string, starred: boolean) => {
    track(starred ? 'star' : 'unstar', 'task_star_toggle', {
      eventData: { taskId, starred },
    });
  }, [track]);

  // 删除追踪
  const trackDelete = useCallback((taskId: string) => {
    track('delete', 'task_delete', {
      eventData: { taskId },
    });
  }, [track]);

  return {
    track,
    trackPageView,
    trackClick,
    trackSubmit,
    trackSuccess,
    trackError,
    trackLogin,
    trackLogout,
    trackRegister,
    trackGenerate,
    trackDownload,
    trackStar,
    trackDelete,
  };
}

// 全局错误追踪（自动捕获未处理错误）
export function useErrorTracking() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'error',
          eventName: 'javascript_error',
          eventData: {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack: event.error?.stack,
          },
        }),
      }).catch(() => {});
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'error',
          eventName: 'unhandled_promise_rejection',
          eventData: {
            reason: String(event.reason),
          },
        }),
      }).catch(() => {});
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);
}
