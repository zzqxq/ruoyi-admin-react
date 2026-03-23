import React, { useState, useEffect } from 'react';
import { Card } from 'antd';
import MobilePreview from '@/components/MobilePreview';
import RichTextEditor from '@/components/RichTextEditor';

export default function RichTextDemo() {
  const [html, setHtml] = useState('<p>欢迎使用 <b>wangEditor</b> 富文本编辑器</p>');

  // 模拟 ajax 请求，异步设置 html
  useEffect(() => {
    const timer = setTimeout(() => {
      setHtml('<p>欢迎使用 <b>wangEditor</b> 富文本编辑器</p><p>这是一个在 React 中使用的 Demo。</p>');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div>
      <Card title="富文本编辑器 (wangEditor) 与手机端预览" className="w-full">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* 左侧：编辑器区域 */}
          <div className="flex-1 min-w-0">
            <RichTextEditor 
              value={html} 
              onChange={setHtml} 
              height="500px" 
            />
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">HTML 输出:</h3>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded min-h-[100px] whitespace-pre-wrap">
                {html}
              </div>
            </div>
          </div>

          {/* 右侧：手机端预览区域 */}
          <div className="flex justify-center lg:justify-start items-start">
            <MobilePreview content={html} />
          </div>
        </div>
      </Card>
    </div>
  );
}
