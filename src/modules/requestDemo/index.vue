<template>
  <div class="api_demo">
    <el-alert type="info" :closable="false" show-icon class="api_demo_tip">
      <template #title>
        当前运行模式：{{ runMode }}。mock 模式下所有请求由 mock 扩展接管，流式与二进制接口无法真实返回，
        对应条目会显示相应说明；切到 dev 模式并接上真实接口即可完整验证。
      </template>
    </el-alert>

    <el-card
      v-for="group in demoGroups"
      :key="group.title"
      shadow="never"
      class="api_demo_group"
    >
      <template #header>
        <div class="api_demo_group_title">{{ group.title }}</div>
      </template>

      <div v-for="item in group.items" :key="item.key" class="api_demo_item">
        <div class="api_demo_item_head">
          <div class="api_demo_item_text">
            <div class="api_demo_item_name">{{ item.name }}</div>
            <div class="api_demo_item_desc">{{ item.desc }}</div>
          </div>
          <el-button
            type="primary"
            plain
            size="small"
            :loading="results[item.key]?.status === 'running'"
            @click="runItem(item)"
          >
            运行
          </el-button>
        </div>
        <pre
          v-if="results[item.key]"
          class="api_demo_output"
          :class="`is-${results[item.key].status}`"
          >{{ results[item.key].text }}</pre
        >
      </div>
    </el-card>
  </div>
</template>

<script setup>
  import { readSseStream } from '@/api/extensions/stream.js';
  import { readTextStream } from '@/api/core/streamUtils.js';

  const runMode = import.meta.env.MODE;

  //每个条目独立记录运行状态与输出
  const results = reactive({});

  //把返回值转成可读文本：特殊对象单独描述，其余按 JSON 输出
  const describeValue = (value) => {
    if (value instanceof Blob) {
      return `Blob { size: ${value.size}, type: ${value.type || '未知'} }`;
    }
    if (value instanceof ArrayBuffer) {
      return `ArrayBuffer { byteLength: ${value.byteLength} }`;
    }
    if (value && typeof value.stream === 'object') {
      return 'ReadableStream（流式响应）';
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  };

  //执行单个条目：统一处理运行中、成功、异常三种状态
  const runItem = async (item) => {
    results[item.key] = { status: 'running', text: '执行中…' };
    try {
      const output = await item.run();
      results[item.key] = { status: 'done', text: output };
    } catch (error) {
      results[item.key] = { status: 'error', text: `执行失败：${error?.message || error}` };
    }
  };

  //普通调用：把 success 与 data 一起展示
  const showResponse = (res) =>
    `success: ${res.success}\ncode: ${res.code}\nmsg: ${res.msg || '(空)'}\ndata:\n${describeValue(res.data)}`;

  const demoGroups = [
    {
      title: '一、基础调用',
      items: [
        {
          key: 'basicGet',
          name: '属性式调用 + 查询参数',
          desc: 'openApi.requestDemo.getList({ params })，params 会剔除空值后作为查询串',
          async run() {
            const res = await openApi.requestDemo.getList({
              params: { pageNum: 1, pageSize: 3, keyword: '示例' },
            });
            return showResponse(res);
          },
        },
        {
          key: 'basicPost',
          name: '请求体参数',
          desc: 'openApi.requestDemo.saveData({ data })，data 作为请求体发送',
          async run() {
            const res = await openApi.requestDemo.saveData({ data: { name: '新增示例', level: '1' } });
            return showResponse(res);
          },
        },
        {
          key: 'nestedModule',
          name: '多级模块路径',
          desc: '目录层级就是模块路径：openApi.requestDemo.nested.echo()',
          async run() {
            const res = await openApi.requestDemo.nested.echo({ params: { from: 'demo' } });
            return showResponse(res);
          },
        },
        {
          key: 'urlFunction',
          name: '地址写法：函数',
          desc: 'url 写成函数，接收 otherData 数组，适合路径参数',
          async run() {
            const res = await openApi.requestDemo.urlByFunction({ otherData: [1001] });
            return `实际请求地址：/api/requestDemo/detail/1001\n\n${showResponse(res)}`;
          },
        },
        {
          key: 'urlTemplate',
          name: '地址写法：模板字符串',
          desc: 'url 里写 ${0}/${1}，由 otherData 依次填充',
          async run() {
            const res = await openApi.requestDemo.urlByTemplate({ otherData: [1001, 'audit'] });
            return `实际请求地址：/api/requestDemo/detail/1001/sub/audit\n\n${showResponse(res)}`;
          },
        },
      ],
    },
    {
      title: '二、请求方法',
      items: [
        {
          key: 'methods',
          name: '写操作：post / put / delete',
          desc: 'method 只描述请求动词，策略表统一处理参数与请求体',
          async run() {
            const postRes = await openApi.requestDemo.saveData({ data: { name: 'post' } });
            const putRes = await openApi.requestDemo.updateData({ data: { id: 1 } });
            const deleteRes = await openApi.requestDemo.removeData({ params: { id: 1 } });
            return [
              `post  -> success: ${postRes.success}, data: ${JSON.stringify(postRes.data)}`,
              `put   -> success: ${putRes.success}, data: ${JSON.stringify(putRes.data)}`,
              `delete-> success: ${deleteRes.success}, data: ${JSON.stringify(deleteRes.data)}`,
            ].join('\n');
          },
        },
        {
          key: 'upload',
          name: '上传：method: upload',
          desc: 'data 里的 File / FileList 会按同名 key 追加进 FormData，并自动移除 Content-Type',
          async run() {
            const file = new File(['api 层上传示例内容'], 'api-demo.txt', { type: 'text/plain' });
            const res = await openApi.requestDemo.uploadFile({
              data: { file, remark: '普通表单字段' },
            });
            return showResponse(res);
          },
        },
      ],
    },
    {
      title: '三、响应形态',
      items: [
        {
          key: 'textResponse',
          name: '文本响应',
          desc: 'responseType: text，data 为纯文本（mock 下会收到 JSON 包装，属正常限制）',
          async run() {
            const res = await openApi.requestDemo.getText();
            return showResponse(res);
          },
        },
        {
          key: 'binaryResponse',
          name: '二进制响应',
          desc: 'responseType: arraybuffer，data 为 ArrayBuffer，且不会被 JSON 深拷贝破坏',
          async run() {
            const res = await openApi.requestDemo.getBinary();
            return showResponse(res);
          },
        },
        {
          key: 'download',
          name: '文件下载',
          desc: 'responseType: blob + download: true，成功后自动触发浏览器下载',
          async run() {
            const res = await openApi.requestDemo.downloadFile();
            return `已触发浏览器下载（文件名取自 content-disposition）\n${showResponse(res)}`;
          },
        },
        {
          key: 'streamText',
          name: '流式：原始文本块',
          desc: 'responseType: stream 自动选用 fetch 发送器，用 readTextStream 逐块读取',
          async run() {
            const res = await openApi.requestDemo.streamText();
            const chunks = [];
            for await (const text of readTextStream(res.data)) {
              chunks.push(text);
            }
            return `共收到 ${chunks.length} 个文本块：\n${chunks.join('')}`;
          },
        },
        {
          key: 'streamSse',
          name: '流式：SSE 事件',
          desc: '用 readSseStream 把 data: ...\\n\\n 解析成事件对象（含 [DONE]）',
          async run() {
            const res = await openApi.requestDemo.streamSse({ data: { prompt: '你好' } });
            const events = [];
            for await (const event of readSseStream(res.data)) {
              events.push(`event=${event.event} data=${event.data}`);
            }
            return `共收到 ${events.length} 个 SSE 事件：\n${events.join('\n')}`;
          },
        },
      ],
    },
    {
      title: '四、三级处理链（全局 / 接口 / 调用）',
      items: [
        {
          key: 'hookLayered',
          name: '三级叠加：转换与回调都执行',
          desc: '转换按 全局→接口→调用 叠加；回调是洋葱，调用层调用 next() 才会继续走外层',
          async run() {
            const logs = [];
            const res = await openApi.requestDemo.hookDemo({
              resTransform: (sourceRes, defaultRes) => ({
                ...defaultRes,
                fromCallTransform: true,
              }),
              success: (response, next) => {
                logs.push(
                  `调用层 success：fromApiTransform=${response.fromApiTransform}, fromCallTransform=${response.fromCallTransform}`
                );
                next();
              },
              final: () => logs.push('调用层 final'),
            });
            logs.push(`返回 success=${res.success}`);
            logs.push('（接口层 success / final 的输出见浏览器控制台）');
            return logs.join('\n');
          },
        },
        {
          key: 'hookSwallow',
          name: '调用层吞掉外层：不调用 next',
          desc: '调用层 fail 不调 next，接口层与全局的失败处理都不会执行，也不弹全局提示',
          async run() {
            const logs = [];
            try {
              await openApi.requestDemo.failDemo({
                fail: (error) => {
                  logs.push(`调用层 fail 接管：${error?.msg}（未调用 next）`);
                },
              });
            } catch (error) {
              logs.push(`Promise 仍然 reject：${error?.msg}`);
            }
            return logs.join('\n');
          },
        },
        {
          key: 'hookPassThrough',
          name: '调用层放行：调用 next',
          desc: '调用层 fail 调用 next()，继续执行接口层，最终由全局 fail 弹出 ElMessage',
          async run() {
            try {
              await openApi.requestDemo.failDemo({
                fail: (error, next) => next(),
              });
            } catch (error) {
              return `已放行到全局 fail，应弹出「${error?.msg}」提示`;
            }
            return '未进入失败分支（不符合预期）';
          },
        },
        {
          key: 'hookApiOnly',
          name: '只使用接口层定义',
          desc: '不传任何调用级选项，接口层的 resTransform、success、fail、final 全部生效',
          async run() {
            const res = await openApi.requestDemo.hookDemo();
            return `${showResponse(res)}\n\n（接口层 success / final 的输出见浏览器控制台）`;
          },
        },
      ],
    },
    {
      title: '五、字典接口',
      items: [
        {
          key: 'dict',
          name: 'isDict 缓存',
          desc: '首次调用发起请求，后续调用直接命中缓存（mock 下每次请求固定 200ms，便于对比）',
          async run() {
            const firstStart = performance.now();
            const firstData = await openApi.requestDemo.getLevel();
            const firstCost = performance.now() - firstStart;

            const secondStart = performance.now();
            const secondData = await openApi.requestDemo.getLevel();
            const secondCost = performance.now() - secondStart;

            return [
              `第一次耗时：${firstCost.toFixed(0)}ms`,
              `第二次耗时：${secondCost.toFixed(0)}ms（命中缓存）`,
              `数据：${JSON.stringify(secondData?.data ?? firstData?.data ?? secondData)}`,
            ].join('\n');
          },
        },
      ],
    },
    {
      title: '六、请求配置与发送器',
      items: [
        {
          key: 'requestConfig',
          name: '接口级 requestConfig',
          desc: '与全局默认请求配置深度合并，可用于追加头部等',
          async run() {
            const res = await openApi.requestDemo.withRequestConfig();
            return showResponse(res);
          },
        },
        {
          key: 'customConfig',
          name: '调用级 customConfig',
          desc: 'customConfig 在接口配置之上再做一次合并，只影响本次调用',
          async run() {
            const res = await openApi.requestDemo.getList({
              params: { pageSize: 2 },
              customConfig: { headers: { 'X-Call-Scene': 'demo' } },
            });
            return showResponse(res);
          },
        },
        {
          key: 'senderFetch',
          name: '显式指定 fetch 发送器',
          desc: '接口配置 sender: fetch；不写则使用全局默认的 axios，调用方式完全一致',
          async run() {
            const res = await openApi.requestDemo.byFetchSender();
            return showResponse(res);
          },
        },
        {
          key: 'senderAtCall',
          name: '调用级切换发送器',
          desc: '调用选项里的 sender 优先级最高，可临时切换发送器',
          async run() {
            const res = await openApi.requestDemo.getList({
              params: { pageSize: 2 },
              sender: 'fetch',
            });
            return showResponse(res);
          },
        },
      ],
    },
    {
      title: '七、错误与误用提示',
      items: [
        {
          key: 'errorModule',
          name: '模块未注册',
          desc: '访问不存在的模块时，错误信息会带可用模块列表',
          async run() {
            try {
              await openApi.notExistModule.getList();
            } catch (error) {
              return `已按预期报错：\n${error.message}`;
            }
            return '未报错（不符合预期）';
          },
        },
        {
          key: 'errorApi',
          name: '接口不存在',
          desc: '模块存在但接口名写错时，错误信息会带该模块的可用接口',
          async run() {
            try {
              await openApi.requestDemo.notExistApi();
            } catch (error) {
              return `已按预期报错：\n${error.message}`;
            }
            return '未报错（不符合预期）';
          },
        },
        {
          key: 'errorSender',
          name: '发送器不存在',
          desc: '调用级指定未注册的发送器时，错误信息会带可用发送器',
          async run() {
            try {
              await openApi.requestDemo.getList({ sender: 'notExistSender' });
            } catch (error) {
              return `已按预期报错：\n${error.message}`;
            }
            return '未报错（不符合预期）';
          },
        },
        {
          key: 'errorMisuse',
          name: '误用：把 openApi 当函数调用',
          desc: '旧的字符串写法已被移除，会提示改用属性式调用',
          async run() {
            try {
              await openApi({ api: 'requestDemo/getList' });
            } catch (error) {
              return `已按预期报错：\n${error.message}`;
            }
            return '未报错（不符合预期）';
          },
        },
      ],
    },
  ];
</script>

<style scoped lang="scss">
  .api_demo {
    padding: 12px 16px 32px;

    .api_demo_tip {
      margin-bottom: 12px;
    }

    .api_demo_group {
      margin-bottom: 12px;
    }

    .api_demo_group_title {
      font-size: 15px;
      font-weight: 600;
    }

    .api_demo_item {
      padding: 12px 0;
      border-bottom: 1px dashed var(--el-border-color-lighter);

      &:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }

      .api_demo_item_head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
      }

      .api_demo_item_name {
        font-size: 14px;
        font-weight: 600;
        line-height: 1.6;
      }

      .api_demo_item_desc {
        margin-top: 4px;
        font-size: 12px;
        line-height: 1.6;
        color: var(--el-text-color-secondary);
      }

      .api_demo_output {
        margin: 8px 0 0;
        padding: 10px 12px;
        max-height: 240px;
        overflow: auto;
        font-size: 12px;
        line-height: 1.6;
        white-space: pre-wrap;
        word-break: break-all;
        border-radius: 4px;
        background: var(--el-fill-color-light);

        &.is-error {
          color: var(--el-color-danger);
          background: var(--el-color-danger-light-9);
        }
      }
    }
  }
</style>
