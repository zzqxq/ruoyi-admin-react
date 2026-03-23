import { useMemo } from 'react';

interface MobilePreviewProps {
  content: string;
}

export default function MobilePreview({ content }: MobilePreviewProps) {
  // 监听 content 变化，替换 img 标签的样式以适应手机屏幕
  const processedContent = useMemo(() => {
    if (!content) return '';
    const regex = new RegExp('<img', 'gi');
    return content.replace(
      regex,
      '<img style="max-width: 100%;display:block;"'
    );
  }, [content]);

  return (
    <div
      className="ql-container mobile-preview-container flex-shrink-0"
      style={{
        padding: '30px 16px 30px 30px',
        marginLeft: '20px',
        background: `url(https://sygx-server-bucket-admin.oss-cn-shanghai.aliyuncs.com/gxj_manage/form_phone.png) center/100% 100%`,
        backgroundSize: '100% 100%',
        width: '296px', // 250(内容宽) + 30(左内边距) + 16(右内边距)
        height: '575px', // 515(内容高) + 30(上内边距) + 30(下内边距)
        boxSizing: 'border-box',
      }}
    >
      <div
        className="ql-editor"
        style={{
          width: '250px',
          height: '515px',
          padding: '15px 5px 0 0',
          overflowY: 'auto',
          overflowX: 'hidden',
          wordBreak: 'break-word',
        }}
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />
    </div>
  );
}
