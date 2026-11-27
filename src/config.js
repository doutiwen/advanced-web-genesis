import { useStore } from './store';
import { ElMessage } from 'element-plus';

//JSON 响应默认转换：把后端的 {isSuccess,data,message} 结构转成统一响应结构
export const defaultResTransform = (sourceResponse) => {
  const targetResponse = {
    success: true, //请求操作是否成功
    data: {}, //后台返回的数据部分（一般仅在成功后才使用）
    msg: '', //后台返回的消息部分（一般仅在失败后才使用，提示信息）
    code: -1, //结果类型代码
    [Symbol.for('source')]: sourceResponse,
  };
  //用状态码区间判断请求是否成功：HTTP/2 下 statusText 常为空，不能作为依据
  const isOkStatus = sourceResponse.status >= 200 && sourceResponse.status < 300;
  targetResponse.code = sourceResponse.status;
  if (isOkStatus) {
    if (!sourceResponse.data?.isSuccess) {
      targetResponse.success = false;
    }
    targetResponse.data = sourceResponse.data?.data || {};
    targetResponse.msg = sourceResponse.data?.message || '';
  } else {
    targetResponse.success = false;
    targetResponse.data = sourceResponse.data;
    targetResponse.msg = sourceResponse.statusText || `HTTP ${sourceResponse.status}`;
  }
  return targetResponse;
};

//非 JSON 响应（二进制/文本）的透传转换器由核心层提供，装配时按响应形态组合成契约表

export const defaultRequestConfig = {
  headers: {
    'X-Access-Token': () => useStore().data?.token,
    'Content-Type': 'application/json;charset=utf-8',
  },
  timeout: 50000,
};

export const defaultHooks = {
  success(response) {},
  fail(error) {
    ElMessage.error(error.msg);
    console.log(118, ElMessage, error.msg);
  },
  final() {},
};
