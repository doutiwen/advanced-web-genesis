import axios from 'axios';

/**
 * axios 发送器（普通请求的默认实现）
 * 契约：({ apiDesc, requestConfig }) => Promise<responseLike>
 */
const axiosSender = async ({ apiDesc, requestConfig }) => {
  // axios 在浏览器端拿不到流式 body，流式接口必须走 fetch 发送器
  if (requestConfig.responseType === 'stream') {
    throw new Error(
      '[openApi] axios 发送器不支持流式响应，请在接口配置中声明 sender: "fetch"，或去掉 sender 让流式接口自动选择 fetch'
    );
  }
  return axios(requestConfig);
};

export default axiosSender;
