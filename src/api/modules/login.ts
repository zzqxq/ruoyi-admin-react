import request from '../request';

export const login = (data: { username: string; password: string }) => {
  return request({
    url: '/login',
    method: 'post',
    data,
  });
};
