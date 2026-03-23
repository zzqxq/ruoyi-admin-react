import React, { useState, useRef, useEffect } from 'react';
import { Upload, message, Image } from 'antd';
import { PlusOutlined, DeleteOutlined, EyeOutlined, LoadingOutlined } from '@ant-design/icons';
import Sortable from 'sortablejs';
import OSS from 'ali-oss';

// 初始化阿里云 OSS 客户端配置
// 注意：在实际生产环境中，建议通过后端接口获取临时 STS Token 以保证 AccessKey 安全
const ossClient = new OSS({
  region: 'oss-cn-beijing',
  accessKeyId: import.meta.env.VITE_OSS_KEY,
  accessKeySecret: import.meta.env.VITE_OSS_SECRET,
  bucket: 'zzqxq',
});

interface OssUploadProps {
  /** 表单受控值：单个 URL 字符串或 URL 数组 */
  value?: string | string[];
  /** 值变化时的回调函数 */
  onChange?: (urls: string | string[]) => void;
  /** 最大上传数量，默认为 1（单图模式） */
  maxCount?: number;
  /** 是否开启拖拽排序，默认为 true */
  sortable?: boolean;
  /** 上传按钮显示的文字内容 */
  title?: string;
  /** 允许上传的图片类型（MIME 或扩展名），例如 ['image/jpeg','image/png'] 或 ['.jpg','.png'] */
  allowedTypes?: string[];
  /** 限制单张图片大小（单位 MB），不传则不限制 */
  maxSizeMB?: number;
}

/**
 * 通用阿里云 OSS 图片上传组件
 * 支持单图/多图上传、预览、删除以及拖拽排序功能
 */
const OssUpload: React.FC<OssUploadProps> = ({ 
  value, 
  onChange, 
  maxCount = 1,
  sortable = true,
  title = '上传图片',
  allowedTypes,
  maxSizeMB,
}) => {
  // 内部维护的图片链接列表
  const [fileList, setFileList] = useState<string[]>([]);
  // 记录当前正在上传的文件数量，用于显示加载状态
  const [uploadingCount, setUploadingCount] = useState(0);
  // 预览图片的显示状态和 URL
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  
  // 用于绑定 SortableJS 的 DOM 容器引用
  const sortableContainer = useRef<HTMLDivElement>(null);
  // 存储 Sortable 实例，用于组件销毁时进行清理
  const sortableInstance = useRef<Sortable | null>(null);
  // 用 ref 保存最新的 fileList，避免异步回调里读取到旧闭包值
  const fileListRef = useRef<string[]>([]);
  // 用 ref 统计当前“批量上传”的任务数与成功数，用于只提示一次成功
  const pendingUploadsRef = useRef(0);
  const uploadedInBatchRef = useRef(0);

  /**
   * 监听外部 value 变化，并同步到内部 fileList 状态
   * 兼容处理单字符串和字符串数组两种格式
   */
  useEffect(() => {
    if (Array.isArray(value)) {
      setFileList(value.filter(Boolean));
    } else if (typeof value === 'string' && value) {
      setFileList([value]);
    } else {
      setFileList([]);
    }
  }, [value]);

  /**
   * 同步最新列表到 ref，避免在异步上传/拖拽回调中拿到旧值
   */
  useEffect(() => {
    fileListRef.current = fileList;
  }, [fileList]);

  /**
   * 初始化拖拽排序逻辑
   * 当开启排序功能且图片数量大于 1 时生效
   */
  useEffect(() => {
    if (sortable && sortableContainer.current && fileList.length > 1) {
      sortableInstance.current = new Sortable(sortableContainer.current, {
        animation: 150, // 排序动画时长
        // 可选优化：使用 fallback 模式，减少 SortableJS 与 React 的 DOM 冲突风险
        forceFallback: true,
        handle: '.sortable-item', // 指定可拖拽的元素类名
        filter: '.upload-btn-wrapper', // 排除上传按钮，使其不可被拖拽
        onEnd: (evt) => {
          const { oldIndex, newIndex } = evt;
          if (oldIndex !== undefined && newIndex !== undefined && oldIndex !== newIndex) {
            // 只更新 state：由 React 接管 DOM 更新，不在这里手动操作 DOM
            setFileList((prev) => {
              const newList = [...prev];
              const [moved] = newList.splice(oldIndex, 1);
              newList.splice(newIndex, 0, moved);
              triggerChange(newList);
              return newList;
            });
          }
        },
      });
    }
    
    // 组件销毁或状态变化前，销毁旧的 Sortable 实例，防止内存泄漏或冲突
    return () => {
      if (sortableInstance.current) {
        sortableInstance.current.destroy();
        sortableInstance.current = null;
      }
    };
  }, [sortable, fileList]);

  /**
   * 统一触发数据变更的方法
   * 根据 maxCount 自动判断返回单字符串还是字符串数组
   */
  const triggerChange = (newList: string[]) => {
    // 注意：这里不再 setState，只负责把最新值同步给外部（例如 antd Form）
    if (maxCount === 1) {
      onChange?.(newList[0] || '');
    } else {
      onChange?.(newList);
    }
  };

  /**
   * Ant Design Upload 组件的上传前校验及自定义上传逻辑
   */
  const handleBeforeUpload = async (file: File) => {
    // 1. 文件类型基础校验
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件！');
      return false;
    }

    /**
     * 1.1 图片类型白名单校验
     * 支持两种写法：
     * - MIME: 'image/jpeg'
     * - 扩展名: '.jpg'
     */
    if (allowedTypes && allowedTypes.length > 0) {
      const lowerName = (file.name || '').toLowerCase();
      const ext = lowerName.includes('.') ? `.${lowerName.split('.').pop()}` : '';
      const mime = (file.type || '').toLowerCase();

      const normalized = allowedTypes.map((t) => t.toLowerCase().trim());
      const ok = normalized.includes(mime) || (ext && normalized.includes(ext));
      if (!ok) {
        message.error(`图片格式不支持，仅允许：${allowedTypes.join('、')}`);
        return false;
      }
    }

    // 1.2 图片大小校验
    if (typeof maxSizeMB === 'number' && maxSizeMB > 0) {
      const sizeMB = file.size / 1024 / 1024;
      if (sizeMB > maxSizeMB) {
        message.error(`图片大小不能超过 ${maxSizeMB}MB`);
        return false;
      }
    }

    // 2. 数量限制校验（使用 ref，避免旧闭包）
    // 单图模式允许覆盖，不在这里拦截
    if (maxCount !== 1 && fileListRef.current.length >= maxCount) {
      message.warning(`最多只能上传 ${maxCount} 张图片`);
      return false;
    }

    // 3. 记录当前批量上传状态
    pendingUploadsRef.current += 1;
    setUploadingCount(pendingUploadsRef.current);
    try {
      // 4. 生成 OSS 文件路径（uploads/时间戳_随机串.后缀）
      const suffix = file.name.split('.').pop() || 'png';
      const fileName = `uploads/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${suffix}`;
      
      // 5. 执行 OSS 直传
      const result = await ossClient.put(fileName, file);
      // 将返回的 http 地址转换为 https 以保证安全性
      const url = result.url.replace('http://', 'https://');

      // 6. 更新列表（必须用函数式更新，确保并发上传不会覆盖状态）
      setFileList((prev) => {
        // maxCount 限制：必须在这里基于最新 prev 判断
        // 单图模式允许覆盖
        if (maxCount !== 1 && prev.length >= maxCount) {
          return prev;
        }

        // 单图模式：新上传直接覆盖
        const newList = maxCount === 1 ? [url] : [...prev, url];
        triggerChange(newList);
        // 7. 统计本批次成功数量（只在最后统一提示一次）
        // 只有当图片真实写入列表时才算成功（避免超过 maxCount 时“成功数”不准确）
        uploadedInBatchRef.current += 1;
        return newList;
      });
    } catch (error) {
      console.error('OSS上传失败:', error);
      message.error('上传失败');
    } finally {
      // 8. 批量上传计数 -1，且当所有并发任务都完成时，统一提示成功
      pendingUploadsRef.current -= 1;
      setUploadingCount(pendingUploadsRef.current);
      if (pendingUploadsRef.current === 0) {
        if (uploadedInBatchRef.current > 0) {
          message.success(`成功上传 ${uploadedInBatchRef.current} 张图片`);
        }
        uploadedInBatchRef.current = 0;
      }
    }

    // 返回 false 以阻止 Antd Upload 的默认上传动作（我们已手动处理）
    return false;
  };

  /**
   * 删除图片处理函数
   */
  const handleDelete = (index: number) => {
    // 使用函数式更新，避免并发上传/排序时出现状态覆盖
    setFileList((prev) => {
      const newList = [...prev];
      newList.splice(index, 1);
      triggerChange(newList);
      return newList;
    });
  };

  /**
   * 点击预览图标处理函数
   */
  const handlePreview = (url: string) => {
    setPreviewImage(url);
    setPreviewVisible(true);
  };

  return (
    <div className="oss-upload-container">
      <div className="flex flex-wrap gap-4" ref={sortableContainer}>
        {/* 已上传图片列表渲染 */}
        {fileList.filter(url => !!url).map((url, index) => (
          <div 
            key={`${url}-${index}`} 
            className={`sortable-item relative group w-26 h-26 border border-gray-300 rounded-lg overflow-hidden bg-gray-50 ${sortable ? 'cursor-move' : 'cursor-default'}`}
          >
            {/* 图片主体 */}
            <img src={url} alt="upload" className="w-full h-full object-cover" />
            
            {/* 悬浮遮罩层：提供预览和删除操作 */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <EyeOutlined 
                className="text-white text-lg cursor-pointer hover:scale-120 transition-transform" 
                onClick={() => handlePreview(url)}
                style={{ color: '#fff' }}
                title="预览"
              />
              <DeleteOutlined 
                className="text-white text-lg cursor-pointer hover:scale-120 transition-transform" 
                onClick={() => handleDelete(index)}
                style={{ color: '#fff' }}
                title="删除"
              />
            </div>
          </div>
        ))}
        
        {/* 上传按钮渲染（当图片数量未达到限制时显示；单图模式允许直接替换） */}
        {(maxCount === 1 || fileList.length < maxCount) && (
          <div className="upload-btn-wrapper">
            <Upload
              beforeUpload={handleBeforeUpload}
              showUploadList={false} // 使用自定义列表，禁用 Antd 默认列表
              accept={allowedTypes && allowedTypes.length > 0 ? allowedTypes.join(',') : 'image/*'}
              multiple={maxCount > 1} // 仅在多图模式下允许一次选择多个
            >
              <div className="w-26 h-26 border border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors bg-gray-50">
                {uploadingCount > 0 ? (
                  <LoadingOutlined className="text-xl text-blue-500" />
                ) : (
                  <PlusOutlined className="text-xl text-gray-400" />
                )}
                <div className="mt-2 text-sm text-gray-500">
                  {uploadingCount > 0 ? '上传中...' : title}
                </div>
              </div>
            </Upload>
          </div>
        )}
      </div>

      {/* Ant Design 图片预览组件（隐藏触发器，由内部状态控制显示） */}
      <Image
        style={{ display: 'none' }}
        src={previewImage || undefined}
        preview={{
          open: previewVisible,
          src: previewImage || undefined,
          onOpenChange: (open) => setPreviewVisible(open),
        }}
      />
    </div>
  );
};

export default OssUpload;
