import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import App from './App.tsx';
import './styles/index.css';

dayjs.locale('zh-cn');

const bootstrap = async () => {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    await import('./mock/index.ts');
  }

  createRoot(document.getElementById('root')!).render(
    // <StrictMode>
      <ConfigProvider locale={zhCN}>
        <App />
      </ConfigProvider>
    // </StrictMode>
  );
};

bootstrap();
