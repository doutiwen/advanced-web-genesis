//流式解析扩展：把服务端推送的 SSE 文本流解析成事件对象
//不需要流式的项目不会引入本文件
import { readTextStream } from '../core/streamUtils.js';

/**
 * 解析单个 SSE 事件块
 * @param {string} rawEvent - 以空行分隔的事件块
 * @returns {{event: string, data: string, id: string}|null}
 */
const parseSseEvent = (rawEvent) => {
  if (!rawEvent || !rawEvent.trim()) return null;
  const dataLines = [];
  let eventName = 'message';
  let id = '';
  rawEvent.split('\n').forEach((line) => {
    if (!line || line.startsWith(':')) return; //空行与注释行
    const colonIndex = line.indexOf(':');
    const fieldName = colonIndex === -1 ? line : line.slice(0, colonIndex);
    let fieldValue = colonIndex === -1 ? '' : line.slice(colonIndex + 1);
    //规范允许冒号后带一个空格，需要去掉
    if (fieldValue.startsWith(' ')) fieldValue = fieldValue.slice(1);
    if (fieldName === 'data') {
      dataLines.push(fieldValue);
    } else if (fieldName === 'event') {
      eventName = fieldValue;
    } else if (fieldName === 'id') {
      id = fieldValue;
    }
  });
  if (!dataLines.length) return null;
  return { event: eventName, data: dataLines.join('\n'), id };
};

/**
 * 逐条读取 SSE 事件
 * 服务端以 `data: xxx\n\n` 分隔事件，结尾可能没有空行，这里一并兼容
 * @param {Object|ReadableStream} streamSource - res.data 或原始流
 * @returns {AsyncGenerator<{event: string, data: string, id: string}>}
 */
export async function* readSseStream(streamSource) {
  let buffer = '';
  for await (const text of readTextStream(streamSource)) {
    //统一换行符，兼容 \r\n 跨块被拆开的情况
    buffer += text.replace(/\r\n/g, '\n');
    let boundaryIndex = buffer.indexOf('\n\n');
    while (boundaryIndex !== -1) {
      const rawEvent = buffer.slice(0, boundaryIndex);
      buffer = buffer.slice(boundaryIndex + 2);
      const event = parseSseEvent(rawEvent);
      if (event) yield event;
      boundaryIndex = buffer.indexOf('\n\n');
    }
  }
  //收尾：处理最后一个没有空行结尾的事件
  const lastEvent = parseSseEvent(buffer);
  if (lastEvent) yield lastEvent;
}

export default readSseStream;
