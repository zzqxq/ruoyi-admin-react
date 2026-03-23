import React, { useState, useEffect } from 'react';
import '@wangeditor/editor/dist/css/style.css';
import { Editor, Toolbar } from '@wangeditor/editor-for-react';
import { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor';
import { message } from 'antd';
import OSS from 'ali-oss';

// 初始化 OSS 客户端
const ossClient = new OSS({
  region: 'oss-cn-beijing',
  accessKeyId: import.meta.env.VITE_OSS_KEY,
  accessKeySecret: import.meta.env.VITE_OSS_SECRET,
  bucket: 'zzqxq',
});

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  height?: string | number;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  value, 
  onChange, 
  height = '500px',
  placeholder = '请输入内容...' 
}) => {
  const [editor, setEditor] = useState<IDomEditor | null>(null);

  const toolbarConfig: Partial<IToolbarConfig> = {};
  
  const editorConfig: Partial<IEditorConfig> = {
    placeholder,
    MENU_CONF: {
      uploadImage: {
        // 自定义上传图片
        async customUpload(file: File, insertFn: any) {
          const hideLoading = message.loading('正在上传图片...', 0);
          try {
            // 生成唯一文件名，避免覆盖
            const suffix = file.name.split('.').pop() || 'png';
            const fileName = `rich-text-uploads/images/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${suffix}`;
            
            // 上传到阿里云 OSS
            const result = await ossClient.put(fileName, file);
            
            // 确保使用 https 链接
            const url = result.url.replace('http://', 'https://');
            
            // 插入图片到富文本编辑器中
            insertFn(url, file.name, url);
            message.success('图片上传成功');
          } catch (error) {
            console.error('上传图片到 OSS 失败:', error);
            message.error('图片上传失败，请检查 OSS 配置及跨域设置');
          } finally {
            hideLoading();
          }
        }
      },
      uploadVideo: {
        // 自定义上传视频
        async customUpload(file: File, insertFn: any) {
          const hideLoading = message.loading('正在上传视频，请稍候...', 0);
          try {
            // 生成唯一文件名，避免覆盖
            const suffix = file.name.split('.').pop() || 'mp4';
            const fileName = `rich-text-uploads/videos/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${suffix}`;
            
            // 上传到阿里云 OSS
            const result = await ossClient.put(fileName, file);
            
            // 确保使用 https 链接
            const url = result.url.replace('http://', 'https://');
            
            // 插入视频到富文本编辑器中
            insertFn(url);
            message.success('视频上传成功');
          } catch (error) {
            console.error('上传视频到 OSS 失败:', error);
            message.error('视频上传失败，请检查 OSS 配置及跨域设置');
          } finally {
            hideLoading();
          }
        }
      }
    }
  };

  // 及时销毁 editor ，重要！
  useEffect(() => {
    return () => {
      if (editor == null) return;
      editor.destroy();
      setEditor(null);
    };
  }, [editor]);

  return (
    <div style={{ border: '1px solid #ccc', zIndex: 100 }}>
      <Toolbar
        editor={editor}
        defaultConfig={toolbarConfig}
        mode="default"
        style={{ borderBottom: '1px solid #ccc' }}
      />
      <Editor
        defaultConfig={editorConfig}
        value={value}
        onCreated={setEditor}
        onChange={editor => onChange(editor.getHtml())}
        mode="default"
        style={{ height, overflowY: 'hidden' }}
      />
    </div>
  );
};

export default RichTextEditor;
