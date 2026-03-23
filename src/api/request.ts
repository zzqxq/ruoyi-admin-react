import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { message } from 'antd'
import { useUserStore } from "@/stores/user"

const baseURL = import.meta.env.VITE_API_BASE_URL
const httpInstance: AxiosInstance = axios.create({
  baseURL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json;charset=utf-8' }
});

//axios 请求拦截器
httpInstance.interceptors.request.use(
  (config) => {
    // 设置token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

//axios 响应拦截器
httpInstance.interceptors.response.use(
  (res: AxiosResponse) => {
    // 未设置状态码则默认成功状态
    const code = res.data.code || 200
    // 二进制数据则直接返回
    if (res.request.responseType ===  'blob' || res.request.responseType ===  'arraybuffer') {
      return res.data
    }
    if (code === 401) {
      message.error('登录已过期，请重新登录');
      // 清除用户信息
      useUserStore.getState().logout()
      // 跳转到登录页
      // 使用 replace 防止用户点击“返回”又回到过期的页面
      if (!window.location.pathname.includes('/login')) {
         window.location.replace('/login');
      }
      return Promise.reject('无效的会话，或者会话已过期，请重新登录。')
    } else if (code === 500) {
      message.error('服务器错误');
      return Promise.reject('服务器错误')
    } else if (code === 601) {
      message.error('权限不足');
      return Promise.reject('权限不足')
    } else if (code !== 200) {
      message.error(res.data.message || '请求失败');
      return Promise.reject(res.data.message || '请求失败')
    } else {
      return res.data
    }
  },
  (error) => {
    let { message } = error
    if (message == "Network Error") {
      message = "后端接口连接异常"
    } else if (message.includes("timeout")) {
      message = "系统接口请求超时"
    } else if (message.includes("Request failed with status code")) {
      message = "系统接口" + message.slice(-3) + "异常"
    }
    message.error(message)
    return Promise.reject(error)
  }
);

export default httpInstance;



