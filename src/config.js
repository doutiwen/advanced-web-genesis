import { useTokenExpire } from '@/modules/logout/common/hooks.js';
import { useUserStore } from './store';
import { ElMessage } from 'element-plus';

export const defaultResTransform = (sourceResponse) => {
  const targetResponse = {
    success: true, //请求操作是否成功
    data: {}, //后台返回的数据部分（一般仅在成功后才使用）
    msg: '', //后台返回的消息部分（一般仅在失败后才使用，提示信息）
    code: -1, //结果类型代码
    [Symbol.for('source')]: sourceResponse,
  };
  if (sourceResponse.statusText === 'OK') {
    targetResponse.code = sourceResponse.status;
    switch (sourceResponse.status) {
      case 200:
      case 201:
      case 204: {
        if (sourceResponse.headers['content-type'] === 'application/octet-stream') {
          targetResponse.data = sourceResponse.data;
        } else {
          if (!sourceResponse.data.isSuccess) {
            targetResponse.success = false;
          }
          targetResponse.data = sourceResponse.data?.data || {};
          targetResponse.msg = sourceResponse.data?.message || '';
        }
        break;
      }
      default: {
        targetResponse.success = false;
        targetResponse.data = sourceResponse.data;
        targetResponse.msg = sourceResponse.statusText;
      }
    }
  } else {
    targetResponse.success = false;
    targetResponse.data = sourceResponse.data;
    targetResponse.msg = sourceResponse.statusText;
  }
  return targetResponse;
};

export const defaultAxiosConfig = {
  headers: {
    'X-Access-Token': () => useUserStore().getToken(),
    'Content-Type': 'application/json;charset=utf-8',
  },
  timeout: 50000,
};

export const defaultCallback = {
  success(response) {},
  fail(error) {
    ElMessage.error(error.msg);
    console.log(118, ElMessage, error.msg);
    if (error.code === 401) {
      useTokenExpire();
    }
  },
  final() {},
};
