import React, { useEffect } from 'react';

interface PageLoadingProps {
  /** 提示文字 */
  message?: string;
  /** 是否开启全屏遮罩，默认为 true */
  fullScreen?: boolean;
}

/**
 * PageLoading 高级加载组件
 * 采用 RuoYi 经典多层环形旋转动画
 */
export default function PageLoading({ 
  message = '正在加载系统资源，请耐心等待...', 
  fullScreen = true 
}: PageLoadingProps) {

  // 当全屏加载时，禁止页面滚动
  useEffect(() => {
    if (fullScreen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [fullScreen]);

  // 动态计算容器样式
  const containerClass = fullScreen
    ? "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm"
    : "flex flex-col justify-center items-center h-full w-full min-h-[400px] p-8 bg-transparent";

  return (
    <div className={containerClass}>
      <style>
        {`
          .ruoyi-loader-inner {
            position: relative;
            width: 100px;
            height: 100px;
          }
          .ruoyi-loader-line-wrap {
            animation: ruoyi-spin 2000ms cubic-bezier(.175, .885, .32, 1.275) infinite;
            box-sizing: border-box;
            height: 50px;
            left: 0;
            overflow: hidden;
            position: absolute;
            top: 0;
            transform-origin: 50% 100%;
            width: 100px;
          }
          .ruoyi-loader-line {
            border: 4px solid transparent;
            border-radius: 100%;
            box-sizing: border-box;
            height: 100px;
            left: 0;
            margin: 0 auto;
            position: absolute;
            right: 0;
            top: 0;
            width: 100px;
          }
          
          /* 五层环形延迟动画 */
          .ruoyi-loader-line-wrap:nth-child(1) { animation-delay: -50ms; }
          .ruoyi-loader-line-wrap:nth-child(2) { animation-delay: -100ms; }
          .ruoyi-loader-line-wrap:nth-child(3) { animation-delay: -150ms; }
          .ruoyi-loader-line-wrap:nth-child(4) { animation-delay: -200ms; }
          .ruoyi-loader-line-wrap:nth-child(5) { animation-delay: -250ms; }

          /* 五层颜色定义 */
          .ruoyi-loader-line-wrap:nth-child(1) .ruoyi-loader-line {
            border-color: #f44336;
            height: 90px;
            width: 90px;
            top: 7px;
          }
          .ruoyi-loader-line-wrap:nth-child(2) .ruoyi-loader-line {
            border-color: #e91e63;
            height: 76px;
            width: 76px;
            top: 14px;
          }
          .ruoyi-loader-line-wrap:nth-child(3) .ruoyi-loader-line {
            border-color: #9c27b0;
            height: 62px;
            width: 62px;
            top: 21px;
          }
          .ruoyi-loader-line-wrap:nth-child(4) .ruoyi-loader-line {
            border-color: #673ab7;
            height: 48px;
            width: 48px;
            top: 28px;
          }
          .ruoyi-loader-line-wrap:nth-child(5) .ruoyi-loader-line {
            border-color: #3f51b5;
            height: 34px;
            width: 34px;
            top: 35px;
          }

          @keyframes ruoyi-spin {
            0%, 15% { transform: rotate(0); }
            100% { transform: rotate(360deg); }
          }
          
          .animate-text-fade {
            animation: text-fade 2s infinite ease-in-out;
          }
          @keyframes text-fade {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
      
      {/* 动画核心结构 */}
      <div className="ruoyi-loader-inner mb-8 transform scale-110">
        <div className="ruoyi-loader-line-wrap"><div className="ruoyi-loader-line"></div></div>
        <div className="ruoyi-loader-line-wrap"><div className="ruoyi-loader-line"></div></div>
        <div className="ruoyi-loader-line-wrap"><div className="ruoyi-loader-line"></div></div>
        <div className="ruoyi-loader-line-wrap"><div className="ruoyi-loader-line"></div></div>
        <div className="ruoyi-loader-line-wrap"><div className="ruoyi-loader-line"></div></div>
      </div>
      
      {/* 提示文案 */}
      {message && (
        <div className="text-[#555] text-[15px] font-medium tracking-[3px] animate-text-fade text-center px-4">
          {message}
        </div>
      )}
    </div>
  );
}