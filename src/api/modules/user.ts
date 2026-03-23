
import request from '../request';

// 获取用户信息
export const getUserInfo = () => {
  return request({
    url: '/getUserInfo',
    method: 'get'
  })
}

// 测试401
export const test401 = () => {
  return request({
    url: '/test401',
    method: 'get'
  })
}
