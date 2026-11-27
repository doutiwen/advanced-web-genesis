/**
 * 流式响应工具：核心只负责把原始流交出去，具体解析（文本/SSE）由调用方选择
 */

/**
 * 给流包一层"结束回调"：正常读完、出错、被取消时都会触发一次
 * 用于把 final 清理逻辑推迟到流真正结束
 * @param {ReadableStream} stream - 原始流
 * @param {Function} onFinish - 结束回调（只会触发一次）
 * @returns {ReadableStream}
 */
export const createStreamWithFinish = (stream, onFinish) => {
  const reader = stream.getReader();
  let isFinished = false;
  const finish = () => {
    if (isFinished) return;
    isFinished = true;
    onFinish();
  };
  return new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          finish();
        } else {
          controller.enqueue(value);
        }
      } catch (error) {
        controller.error(error);
        finish();
      }
    },
    cancel(reason) {
      reader.cancel(reason);
      finish();
    },
  });
};

/**
 * 逐块把流解码成文本
 * 支持传入 res.data（{ stream }）或原始 ReadableStream
 * @param {Object|ReadableStream} streamSource - 流对象
 * @returns {AsyncGenerator<string>}
 */
export async function* readTextStream(streamSource) {
  const stream = streamSource?.stream || streamSource;
  if (!stream) {
    throw new Error('[openApi] 当前响应不是流式响应，请确认接口配置了 responseType: "stream"');
  }
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  let isCompleted = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        isCompleted = true;
        break;
      }
      const text = decoder.decode(value, { stream: true });
      if (text) yield text;
    }
    //冲刷解码器内部残留的多字节字符
    const tailText = decoder.decode();
    if (tailText) yield tailText;
  } catch (error) {
    //调用方主动中断时按正常结束处理，避免 for await 之外再抛错
    if (error?.name !== 'AbortError') throw error;
  } finally {
    //调用方提前 break 时关闭底层流，避免连接悬挂
    if (!isCompleted) await reader.cancel().catch(() => {});
    reader.releaseLock?.();
  }
}
