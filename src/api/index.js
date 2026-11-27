import { createOpenApi } from './core/index.js';
import DictionaryCache from './core/dictionaryCache.js';
import { passThroughResTransform } from './core/responseTransform.js';
import senderPresets from './core/senders/presets.js';
import { installViteApiScanner } from './extensions/viteApiScanner.js';
import { defaultResTransform, defaultRequestConfig, defaultHooks } from '@/config.js';

//响应契约表：JSON 结构由本项目定义，二进制/文本/流式直接复用核心的透传转换器
const defaultTransformMap = {
  json: defaultResTransform,
  blob: passThroughResTransform,
  arraybuffer: passThroughResTransform,
  text: passThroughResTransform,
  stream: passThroughResTransform,
};

//mock 扩展按需加载：非 mock 模式下这段动态导入不会进入生产包
let mockSenderPromise = null;
const withMock = (sender) => (context) => {
  if (import.meta.env.MODE !== 'mock') {
    return sender(context);
  }
  if (!mockSenderPromise) {
    mockSenderPromise = import('./extensions/mock/index.js').then(
      ({ default: createMockRequest }) => createMockRequest()
    );
  }
  return mockSenderPromise.then((mockSend) => mockSend(context));
};

//发送器注册表：普通请求默认走 axios，流式响应自动切到 fetch
//只用 fetch 的项目改成 import fetchSender from './core/senders/fetchSender.js'，
//senders 只传 { fetch: fetchSender } 并设 defaultSender: 'fetch'，axios 就不会进包
const senders = {
  axios: withMock(senderPresets.axios),
  fetch: withMock(senderPresets.fetch),
};

const { openApi, registerApiModule } = createOpenApi({
  defaultHooks,
  defaultTransformMap,
  defaultRequestConfig,
  senders,
  defaultSender: 'axios',
  dictCache: new DictionaryCache(),
});

//自动扫描各模块的 config/api.js 并注册
//其他项目若不需要扫描，删掉这一行，改为手写 registerApiModule('模块路径', 接口配置对象)
installViteApiScanner(registerApiModule);

export { openApi };
