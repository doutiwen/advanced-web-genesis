//发送器预设：把两个内置实现组装成一张注册表
//注意：核心不会引用本文件，"按需引入"的入口就是这里
//只用 fetch 的项目不要引入本文件，直接把 fetchSender 作为 senders 传入即可，axios 就不会进包
import axiosSender from './axiosSender.js';
import fetchSender from './fetchSender.js';

export default {
  axios: axiosSender,
  fetch: fetchSender,
};
