<template>
  <!-- 组件综合示例：记录管理器 + 其内部依赖的按钮 / 表单 / 弹窗 -->
  <div class="adv_demo_page">
    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="demo_tip"
    >
      <template #title>
        覆盖 AdvRecordsManagerForApp / AdvRecordsManager（工具栏、列表、勾选、分页、实例方法）及内部依赖的
        AdvButton（确认 / 下载 / 弹窗 / 节流 / 异步）、AdvForm（全部表单项、校验、watch 联动、数据变换）、AdvModal
        （对话框 / 抽屉 / 表单 / 自定义插槽）。数据由页面内本地内存数据源提供，不依赖后端接口。
      </template>
    </el-alert>

    <el-tabs
      v-model="activeTab"
      type="border-card"
      class="demo_tabs"
    >
      <!-- ==================== 1. 记录管理器：inline 工具栏 ==================== -->
      <el-tab-pane
        label="记录管理器 · inline 工具栏"
        name="inline"
        lazy
      >
        <div class="demo_manager_layout">
          <div class="demo_manager_main">
            <div class="demo_manager_body">
              <AdvRecordsManagerForApp
                ref="mainManagerRef"
                :config="mainConfig"
                v-model:selectedRowKeys="mainSelectedRowKeys"
                v-model:pageNum="mainPageNum"
                v-model:pageSize="mainPageSize"
                v-model:total="mainTotal"
              >
                <!-- 工具栏按钮插槽：替换按钮文案 -->
                <template #toolBar-item-add>
                  <span>新增记录</span>
                </template>
                <!-- 工具栏 custom 类型插槽：内容完全自定义 -->
                <template #toolBar-item-custom-advancedHelp>
                  <AdvButton
                    size="small"
                    link
                    type="primary"
                    @click="pushLog('工具栏 custom 插槽被点击')"
                  >
                    高级帮助
                  </AdvButton>
                </template>
                <!-- 自定义渲染列插槽（级别） -->
                <template #recordList-column-level="{ colData }">
                  <el-tag
                    size="small"
                    effect="light"
                    :type="levelTagType(colData)"
                  >
                    {{ levelLabel(colData) }}
                  </el-tag>
                </template>
              </AdvRecordsManagerForApp>
            </div>
            <div class="demo_pagination">
              <span class="demo_selection_text">
                已勾选 {{ mainSelectedRowKeys.length }} 条（v-model:selectedRowKeys）
              </span>
              <el-pagination
                v-model:current-page="mainPageNum"
                v-model:page-size="mainPageSize"
                :total="mainTotal"
                :page-sizes="[10, 20, 50]"
                layout="total, sizes, prev, pager, next, jumper"
              />
            </div>
          </div>

          <div class="demo_manager_side">
            <el-card
              shadow="never"
              class="demo_side_card"
            >
              <template #header>
                <span>勾选 / 分页状态（v-model）</span>
              </template>
              <div class="demo_kv">
                <span>selectedRowKeys</span>
                <span class="demo_kv_value">
                  {{ mainSelectedRowKeys.length ? mainSelectedRowKeys.join(', ') : '[]' }}
                </span>
              </div>
              <div class="demo_kv">
                <span>pageNum / pageSize</span>
                <span>{{ mainPageNum }} / {{ mainPageSize }}</span>
              </div>
              <div class="demo_kv">
                <span>total</span>
                <span>{{ mainTotal }}</span>
              </div>
            </el-card>

            <el-card
              shadow="never"
              class="demo_side_card"
            >
              <template #header>
                <span>最近一次 getList 参数</span>
              </template>
              <pre class="demo_result">{{ requestInfo || '暂无请求' }}</pre>
            </el-card>

            <el-card
              shadow="never"
              class="demo_side_card"
            >
              <template #header>
                <span>实例方法（通过 ref 调用）</span>
              </template>
              <div class="demo_method_list">
                <el-button
                  v-for="item in methodDemos"
                  :key="item.label"
                  size="small"
                  @click="runMethodDemo(item)"
                >
                  {{ item.label }}
                </el-button>
              </div>
              <pre
                v-if="methodResult"
                class="demo_result"
              >{{ methodResult }}</pre>
            </el-card>
          </div>
        </div>
      </el-tab-pane>

      <!-- ==================== 2. 记录管理器：grid 工具栏 + 固定勾选 ==================== -->
      <el-tab-pane
        label="记录管理器 · grid 工具栏 / 固定勾选"
        name="grid"
        lazy
      >
        <div class="demo_manager_layout">
          <div class="demo_manager_main">
            <div class="demo_manager_body">
              <!-- 核心组件同样可用：AdvRecordsManager -->
              <AdvRecordsManager
                ref="gridManagerRef"
                :config="gridConfig"
                v-model:selectedRowKeys="gridSelectedRowKeys"
                v-model:pageNum="gridPageNum"
                v-model:pageSize="gridPageSize"
                v-model:total="gridTotal"
              >
              </AdvRecordsManager>
            </div>
            <div class="demo_pagination">
              <span class="demo_selection_text">
                已勾选 {{ gridSelectedRowKeys.length }} 条
              </span>
              <el-pagination
                v-model:current-page="gridPageNum"
                v-model:page-size="gridPageSize"
                :total="gridTotal"
                :page-sizes="[10, 20]"
                layout="total, sizes, prev, pager, next"
              />
            </div>
          </div>

          <div class="demo_manager_side">
            <el-card
              shadow="never"
              class="demo_side_card"
            >
              <template #header>
                <span>本实例覆盖点</span>
              </template>
              <ul class="demo_list">
                <li>toolBar.layout = grid，网格配置 cols / gap，工具栏项用 grid.col 占位</li>
                <li>getSelectedRows 类型按钮：列表固定进入勾选模式（selectionFixed）</li>
                <li>列内可编辑项 + formItemOperater 行内编辑（进入 / 保存 / 取消）</li>
                <li>列筛选、排序、分页参数仍由同一个 getList 接收</li>
              </ul>
            </el-card>

            <el-card
              shadow="never"
              class="demo_side_card"
            >
              <template #header>
                <span>固定勾选模式方法</span>
              </template>
              <div class="demo_method_list">
                <el-button
                  size="small"
                  @click="logGridMethod('getSelectedRows', gridManagerRef?.getSelectedRows())"
                >
                  getSelectedRows()
                </el-button>
                <el-button
                  size="small"
                  @click="logGridMethod('clearSelection', gridManagerRef?.clearSelection())"
                >
                  clearSelection()
                </el-button>
                <el-button
                  size="small"
                  @click="logGridMethod('setSelectedRowKeys([1,2])', gridManagerRef?.setSelectedRowKeys([1, 2]))"
                >
                  setSelectedRowKeys([1,2])
                </el-button>
                <el-button
                  size="small"
                  @click="logGridMethod('setPage(2)', gridManagerRef?.setPage(2))"
                >
                  setPage(2)
                </el-button>
                <el-button
                  size="small"
                  @click="logGridMethod('refreshList()', gridManagerRef?.refreshList())"
                >
                  refreshList()
                </el-button>
              </div>
              <pre class="demo_result">{{ gridMethodResult || '暂无调用结果' }}</pre>
            </el-card>

            <el-card
              shadow="never"
              class="demo_side_card"
            >
              <template #header>
                <span>最近一次 getList 参数</span>
              </template>
              <pre class="demo_result">{{ gridRequestInfo || '暂无请求' }}</pre>
            </el-card>
          </div>
        </div>
      </el-tab-pane>

      <!-- ==================== 3. AdvButton ==================== -->
      <el-tab-pane
        label="AdvButton"
        name="button"
        lazy
      >
        <div class="demo_button_grid">
          <el-card
            shadow="never"
            class="demo_button_card"
          >
            <template #header>同步点击</template>
            <AdvButton
              type="primary"
              @click="handleBasicClick"
            >
              点击 +1
            </AdvButton>
            <p class="demo_hint">已点击 {{ buttonClickCount }} 次</p>
          </el-card>

          <el-card
            shadow="never"
            class="demo_button_card"
          >
            <template #header>异步点击（自动 loading）</template>
            <AdvButton
              type="primary"
              plain
              @click="handleAsyncClick"
            >
              执行 1.2s 异步任务
            </AdvButton>
            <p class="demo_hint">onClick 为 asyncFunction 时按钮自动进入 loading</p>
          </el-card>

          <el-card
            shadow="never"
            class="demo_button_card"
          >
            <template #header>节流点击（1000ms）</template>
            <AdvButton
              type="warning"
              plain
              :throttle-time="1000"
              throttle-notice="点击过快，请稍后再试（1000ms 节流）"
              @click="handleBasicClick"
            >
              节流按钮
            </AdvButton>
            <p class="demo_hint">节流时间内重复点击会命中 throttleNotice 提示</p>
          </el-card>

          <el-card
            shadow="never"
            class="demo_button_card"
          >
            <template #header>默认确认</template>
            <AdvButton
              type="danger"
              plain
              :confirm="true"
              @click="handleConfirmClick"
            >
              默认确认后执行
            </AdvButton>
            <p class="demo_hint">confirm 传 true 使用默认标题 / 文案</p>
          </el-card>

          <el-card
            shadow="never"
            class="demo_button_card"
          >
            <template #header>自定义确认</template>
            <AdvButton
              type="danger"
              plain
              :confirm="customConfirmConfig"
              @click="handleConfirmClick"
            >
              自定义确认
            </AdvButton>
            <p class="demo_hint">notice / okText / cancelText / type / onCancel 均可配置</p>
          </el-card>

          <el-card
            shadow="never"
            class="demo_button_card"
          >
            <template #header>条件确认（beforeConfirm）</template>
            <AdvButton
              type="primary"
              plain
              :confirm="{ beforeConfirm: () => buttonClickCount % 2 === 1, notice: '奇数次点击才需要确认' }"
              @click="handleConfirmClick"
            >
              条件确认
            </AdvButton>
            <p class="demo_hint">beforeConfirm 返回 false 时跳过确认直接执行</p>
          </el-card>

          <el-card
            shadow="never"
            class="demo_button_card"
          >
            <template #header>下载 Blob（CSV）</template>
            <AdvButton
              type="success"
              plain
              :download="() => createCsvDownload(records.slice(0, 3), '前3条记录.csv')"
            >
              下载前 3 条（函数取数）
            </AdvButton>
            <p class="demo_hint">download 支持 Blob / File / { blob, filename } / 函数</p>
          </el-card>

          <el-card
            shadow="never"
            class="demo_button_card"
          >
            <template #header>下载直链（Object 形态）</template>
            <AdvButton
              type="success"
              plain
              :download="stringDownloadConfig"
            >
              下载文本文件
            </AdvButton>
            <p class="demo_hint">{ url, filename } 形态：文件名可显式指定</p>
          </el-card>

          <el-card
            shadow="never"
            class="demo_button_card"
          >
            <template #header>确认后下载（组合）</template>
            <AdvButton
              type="success"
              :confirm="{ notice: '确认下载全部记录？' }"
              :download="() => createCsvDownload(records, '全部记录.csv')"
            >
              确认后下载
            </AdvButton>
            <p class="demo_hint">confirm 与 download 可同时使用，下载期间自动 loading</p>
          </el-card>

          <el-card
            shadow="never"
            class="demo_button_card"
          >
            <template #header>弹窗 + 表单</template>
            <AdvButton
              type="primary"
              plain
              :modal="buttonFormModal"
              :modalPayload="{ name: '来自按钮的 modalPayload' }"
              @modalOpen="(payload) => pushLog('按钮弹窗 modalOpen', payload.bindData)"
              @modalClose="(payload) => pushLog('按钮弹窗 modalClose', payload.bindData)"
              @reloadList="() => pushLog('按钮弹窗触发 reloadList')"
            >
              打开表单弹窗
            </AdvButton>
            <p class="demo_hint">modal 由按钮自带，点击仅打开弹窗，提交逻辑写在 okButton.onClick</p>
          </el-card>

          <el-card
            shadow="never"
            class="demo_button_card"
          >
            <template #header>弹窗 + 自定义内容 / 底部</template>
            <AdvButton
              type="primary"
              plain
              :modal="buttonCustomModal"
              :modalPayload="() => ({ from: 'AdvButton 插槽示例' })"
              @reloadList="() => pushLog('自定义弹窗触发 reloadList')"
            >
              打开自定义弹窗
              <template #modal-content="{ modalBindData, closeModal }">
                <div class="demo_modal_content">
                  <p>弹窗入参：{{ modalBindData?.from }}</p>
                  <p>打开时间：{{ modalBindData?.time }}</p>
                  <el-button
                    size="small"
                    @click="closeModal"
                  >
                    内容区关闭
                  </el-button>
                </div>
              </template>
              <template #modal-footer="{ onOk, onCancel, okButtonText, okLoading }">
                <div class="demo_modal_footer">
                  <el-button
                    size="small"
                    @click="onCancel"
                  >
                    自定义取消
                  </el-button>
                  <el-button
                    size="small"
                    type="primary"
                    :loading="okLoading"
                    @click="onOk"
                  >
                    {{ okButtonText || '确定' }}
                  </el-button>
                </div>
              </template>
            </AdvButton>
            <p class="demo_hint">modal- 前缀插槽会去掉前缀后交给 AdvModal</p>
          </el-card>

          <el-card
            shadow="never"
            class="demo_button_card"
          >
            <template #header>属性透传</template>
            <div class="demo_button_row">
              <AdvButton
                type="danger"
                size="small"
                round
              >
                round / small
              </AdvButton>
              <AdvButton
                type="primary"
                plain
                disabled
              >
                disabled
              </AdvButton>
              <AdvButton
                type="primary"
                loading
              >
                loading
              </AdvButton>
            </div>
            <p class="demo_hint">未声明的 el-button 属性通过 attrs 透传</p>
          </el-card>
        </div>
      </el-tab-pane>

      <!-- ==================== 4. AdvForm ==================== -->
      <el-tab-pane
        label="AdvForm"
        name="form"
        lazy
      >
        <div class="demo_form_layout">
          <el-card
            shadow="never"
            class="demo_form_card"
          >
            <template #header>
              <span>全部表单项类型 / 校验规则 / watch 联动 / set-get 变换</span>
            </template>
            <AdvForm
              ref="advFormRef"
              :config="formConfig"
              @validateSuccess="(data) => pushLog('validateSuccess', data)"
              @validateFail="() => pushLog('validateFail：存在未通过的校验项')"
              @input="(payload) => (lastFormInput = `${payload.key} = ${formatResult(payload.value)}`)"
            >
              <!-- 表单项后置插槽 -->
              <template #form-item-after-remark>
                <span class="demo_form_after">（提交时会执行 get 变换，去掉 SET: 前缀）</span>
              </template>
              <!-- custom 类型表单项插槽 -->
              <template #form-item-custom-rating="slotProps">
                <el-rate
                  :model-value="slotProps.modelValue"
                  @update:model-value="slotProps['onUpdate:modelValue']"
                />
              </template>
              <!-- 上传预览内容插槽 -->
              <template #upload-avatar-previewContent="url">
                <img
                  class="demo_preview_img"
                  :src="url"
                />
              </template>
              <!-- 底部按钮区域插槽 -->
              <template #button>
                <div class="demo_button_row">
                  <el-button
                    type="primary"
                    @click="submitAdvForm"
                  >
                    提交（校验 + get 变换）
                  </el-button>
                  <el-button @click="readAdvForm">读取表单值</el-button>
                  <el-button @click="fillAdvForm">setFormData 回填</el-button>
                  <el-button @click="replaceAdvForm">replace 整表重置</el-button>
                  <el-button @click="updateAdvFormField">updateFormData</el-button>
                  <el-button @click="clearAdvForm">clearFormData</el-button>
                </div>
              </template>
            </AdvForm>
          </el-card>

          <el-card
            shadow="never"
            class="demo_result_card"
          >
            <template #header>
              <span>读取 / 提交结果</span>
            </template>
            <pre class="demo_result">{{ formResult || '暂无数据' }}</pre>
            <p class="demo_hint">最近输入：{{ lastFormInput || '无' }}</p>
          </el-card>
        </div>
      </el-tab-pane>

      <!-- ==================== 5. AdvModal ==================== -->
      <el-tab-pane
        label="AdvModal"
        name="modal"
        lazy
      >
        <div class="demo_modal_layout">
          <el-card
            shadow="never"
            class="demo_modal_card"
          >
            <template #header>
              <span>对话框：表单 + 异步 getBindData + 确认 + 按钮文案函数</span>
            </template>
            <div class="demo_button_row">
              <el-button
                type="primary"
                @click="openDialogModal({ id: 1, name: '张三', email: 'zhangsan@demo.com', department: 'rd' })"
              >
                打开（带数据）
              </el-button>
              <el-button @click="openDialogModal(null)">打开（空数据）</el-button>
              <el-button @click="readModalBindData">读取 getBindData()</el-button>
              <el-button @click="advModalRef?.closeModal()">closeModal()</el-button>
            </div>
            <pre class="demo_result">{{ modalBindDataText || '暂无弹窗数据' }}</pre>
            <AdvModal
              ref="advModalRef"
              :config="dialogModalConfig"
              @modalOpen="(payload) => pushLog('对话框 modalOpen', payload.bindData)"
              @modalClose="(payload) => pushLog('对话框 modalClose', payload.bindData)"
              @reloadList="() => pushLog('对话框 trigger reloadList')"
            />
          </el-card>

          <el-card
            shadow="never"
            class="demo_modal_card"
          >
            <template #header>
              <span>抽屉：自定义 content / footer 插槽</span>
            </template>
            <div class="demo_button_row">
              <el-button
                type="primary"
                @click="openDrawerModal({ source: 'AdvModal 抽屉示例', user: '李四' })"
              >
                打开抽屉
              </el-button>
              <el-button @click="drawerModalRef?.closeModal()">closeModal()</el-button>
            </div>
            <AdvModal
              ref="drawerModalRef"
              :config="drawerModalConfig"
              @modalOpen="(payload) => pushLog('抽屉 modalOpen', payload.bindData)"
              @modalClose="() => pushLog('抽屉 modalClose')"
              @reloadList="() => pushLog('抽屉 trigger reloadList')"
            >
              <template #content="{ modalBindData, closeModal }">
                <div class="demo_modal_content">
                  <p>来源：{{ modalBindData?.source }}</p>
                  <p>用户：{{ modalBindData?.user }}</p>
                  <p>打开时间：{{ modalBindData?.openedAt }}</p>
                  <el-button
                    size="small"
                    @click="closeModal"
                  >
                    内容区关闭
                  </el-button>
                </div>
              </template>
              <template #footer="{ onOk, onCancel, okButtonText, okLoading }">
                <div class="demo_modal_footer">
                  <el-button
                    size="small"
                    @click="onCancel"
                  >
                    自定义取消
                  </el-button>
                  <el-button
                    size="small"
                    type="primary"
                    :loading="okLoading"
                    @click="onOk"
                  >
                    {{ okButtonText || '确定' }}
                  </el-button>
                </div>
              </template>
            </AdvModal>
          </el-card>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 所有演示共用的操作日志 -->
    <el-card
      shadow="never"
      class="demo_log_card"
    >
      <template #header>
        <div class="demo_log_header">
          <span>操作日志（所有演示共用，最新在上）</span>
          <el-button
            size="small"
            @click="clearLogs"
          >
            清空
          </el-button>
        </div>
      </template>
      <div class="demo_log_list">
        <div
          v-for="(log, index) in logs"
          :key="index"
          class="demo_log_item"
        >
          {{ log }}
        </div>
        <div
          v-if="!logs.length"
          class="demo_log_empty"
        >
          暂无日志，操作上面的示例即可看到反馈
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
  /**
   * AdvRecordsManager 综合示例页面
   *
   * 【覆盖范围】
   * 1. AdvRecordsManagerForApp / AdvRecordsManager
   *    - 工具栏 inline / grid 布局、各类型工具栏项（input / select / treeSelect / checkbox / date / button /
   *      searchButton / import / enterSelectMode / getSelectedRows / openMoreSearch / custom）
   *    - 列类型（index / default / custom / link / openModal / formItem）、列排序与列筛选、操作列按钮
   *    - 勾选模式（enterSelectMode、固定勾选）、分页与全部实例方法
   * 2. AdvButton：同步 / 异步 / 节流 / confirm / download / modal / 插槽 / 属性透传
   * 3. AdvForm：全部表单项类型、预定义校验、watch 联动、set-get 变换、插槽、实例方法
   * 4. AdvModal：对话框 / 抽屉、表单模式 / 自定义插槽、getBindData、confirm、按钮文案函数
   *
   * 【数据来源】
   * 页面内本地内存数组（records），增删改都直接操作该数组，无需后端与 mock。
   */
  import AdvRecordsManagerForApp from '@common/components/AdvRecordsManagerForApp';
  import AdvRecordsManager from '@common/components/AdvRecordsManager';
  import AdvButton from '@common/components/AdvButton';
  import AdvForm from '@common/components/AdvForm';
  import AdvModal from '@common/components/AdvModal';
  import { ElMessage } from 'element-plus';

  /* ==================== 通用工具 ==================== */

  // 模拟接口耗时，便于观察 loading 与异步按钮状态
  const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

  // 结果格式化：统一把对象转成可读文本
  const formatResult = (value) => {
    if (value === undefined) return 'undefined';
    if (typeof value === 'function') return '[Function]';
    try {
      return JSON.stringify(value, null, 2);
    } catch (error) {
      return String(value);
    }
  };

  // 操作日志：所有演示共用，最新在上
  const logs = ref([]);
  const pushLog = (...args) => {
    const text = args
      .map((item) => (item !== null && typeof item === 'object' ? formatResult(item) : String(item)))
      .join(' ');
    logs.value.unshift(`[${new Date().toLocaleTimeString()}] ${text}`);
    if (logs.value.length > 60) logs.value.length = 60;
  };
  const clearLogs = () => {
    logs.value = [];
  };

  /* ==================== 演示数据（本地内存数据源） ==================== */

  const DEPARTMENTS = [
    { label: '研发部', value: 'rd' },
    { label: '产品部', value: 'pd' },
    { label: '测试部', value: 'qa' },
  ];
  const LEVELS = [
    { label: '一级', value: '1' },
    { label: '二级', value: '2' },
    { label: '三级', value: '3' },
  ];
  const DEPARTMENT_TREE = [
    {
      label: '总部',
      value: 'hq',
      children: [
        { label: '研发中心', value: 'rd' },
        { label: '质量中心', value: 'qa' },
      ],
    },
    {
      label: '分支机构',
      value: 'branch',
      children: [
        { label: '华东分部', value: 'east' },
        { label: '华南分部', value: 'south' },
      ],
    },
  ];
  const OWNER_OPTIONS = [1, 2, 3, 4, 5].map((value) => ({
    label: `负责人${value}`,
    value,
  }));
  const OWNER_NAMES = { 1: '张伟', 2: '李娜', 3: '王强', 4: '赵敏', 5: '孙磊' };
  const PROVINCES = [
    { label: '浙江', value: 'zj' },
    { label: '江苏', value: 'js' },
    { label: '广东', value: 'gd' },
  ];
  const CITY_MAP = {
    zj: [
      { label: '杭州', value: 'hz' },
      { label: '宁波', value: 'nb' },
    ],
    js: [
      { label: '南京', value: 'nj' },
      { label: '苏州', value: 'sz' },
    ],
    gd: [
      { label: '广州', value: 'gz' },
      { label: '深圳', value: 'sz2' },
    ],
  };

  // 部门 / 级别展示辅助
  const findDeptLabel = (value) => DEPARTMENTS.find((item) => item.value === value)?.label ?? value;
  const levelLabel = (value) => LEVELS.find((item) => item.value === value)?.label ?? value;
  const levelTagType = (value) => ({ 1: 'danger', 2: 'warning', 3: 'success' })[value] ?? 'info';

  // 生成初始数据
  const createSeedRecords = () =>
    Array.from({ length: 56 }, (_, index) => {
      const id = index + 1;
      return {
        id,
        code: `R-${String(id).padStart(3, '0')}`,
        name: `示例记录 ${id}`,
        department: ['rd', 'pd', 'qa'][index % 3],
        level: String((index % 3) + 1),
        ownerId: (index % 5) + 1,
        score: 45 + ((index * 7) % 56),
        status: index % 4 !== 0,
        flowStatus: ['待派工', '待整改', '已完成'][index % 3],
        publishDate: `2026-${String((index % 9) + 1).padStart(2, '0')}-${String(
          (index % 27) + 1
        ).padStart(2, '0')}`,
        remark: `备注 ${id}`,
        // locked 行不可勾选，用于演示 UiProps.selectable
        locked: index % 12 === 0,
        // fileList 列数据：content.text / content.pic 决定 hover 弹出的内容
        attachments: [{ id, name: `${id}.txt`, content: { text: `附件内容 ${id}` } }],
        quantity: (index % 5) + 1,
        price: 10 + index,
      };
    });

  const records = ref(createSeedRecords());
  let recordAutoId = records.value.length;

  // 新增记录时补齐非表单字段
  const buildRecord = (formData = {}) => {
    recordAutoId += 1;
    const id = recordAutoId;
    return {
      id,
      code: `R-${String(id).padStart(3, '0')}`,
      name: formData.name ?? `示例记录 ${id}`,
      department: formData.department ?? 'rd',
      level: formData.level ?? '1',
      ownerId: (id % 5) + 1,
      score: Number(formData.score ?? 60),
      status: !!formData.status,
      flowStatus: '待派工',
      publishDate: formData.publishDate ?? '2026-01-01',
      remark: formData.remark ?? '',
      locked: false,
      attachments: [],
      quantity: 1,
      price: 100,
    };
  };

  // CSV 生成：供下载 / 批量导出共用
  const toCsv = (rows = []) =>
    [
      '编号,名称,部门,级别,分数,状态,发布日期',
      ...rows.map((row) =>
        [
          row.code,
          row.name,
          findDeptLabel(row.department),
          levelLabel(row.level),
          row.score,
          row.status ? '启用' : '停用',
          row.publishDate,
        ].join(',')
      ),
    ].join('\n');
  const createCsvDownload = (rows, filename) => ({
    blob: new Blob([`\ufeff${toCsv(rows)}`], { type: 'text/csv;charset=utf-8' }),
    filename,
  });
  // 直接触发浏览器下载（批量导出等非 AdvButton 场景使用）
  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /* ==================== 列表数据请求（本地过滤 / 排序 / 分页） ==================== */

  const requestInfo = ref('');
  const gridRequestInfo = ref('');

  /**
   * 统一的 getList：接收分页 / 工具栏 / 排序 / 筛选 / 额外 / 临时参数
   * 与真实接口的参数结构保持一致，便于直接替换成 openApi 调用
   */
  const getList = async (params = {}) => {
    const { pageParams = {}, toolBarParams, sorterParams, filterParams, extraParams, tempParams } =
      params;
    await delay(260);

    const infoText = formatResult({
      pageParams,
      toolBarParams,
      sorterParams,
      filterParams,
      extraParams,
      tempParams,
    });
    requestInfo.value = infoText;
    gridRequestInfo.value = infoText;

    let list = [...records.value];
    const keyword = toolBarParams?.keyword?.trim();
    if (keyword) {
      list = list.filter((item) => item.name.includes(keyword) || item.code.includes(keyword));
    }

    // 部门：工具栏单选与表格列筛选共用同一字段
    const departmentValues = filterParams?.department?.length
      ? filterParams.department
      : toolBarParams?.department
        ? [toolBarParams.department]
        : [];
    if (departmentValues.length) {
      list = list.filter((item) => departmentValues.includes(item.department));
    }

    if (toolBarParams?.level) {
      list = list.filter((item) => item.level === toolBarParams.level);
    }
    if (Array.isArray(toolBarParams?.publishRange) && toolBarParams.publishRange.length === 2) {
      const [start, end] = toolBarParams.publishRange;
      list = list.filter((item) => item.publishDate >= start && item.publishDate <= end);
    }
    // 更多搜索（抽屉）里的条件
    if (Array.isArray(toolBarParams?.moreLevel) && toolBarParams.moreLevel.length) {
      list = list.filter((item) => toolBarParams.moreLevel.includes(item.level));
    }
    if (Array.isArray(toolBarParams?.morePublish) && toolBarParams.morePublish.length === 2) {
      const [start, end] = toolBarParams.morePublish;
      list = list.filter((item) => item.publishDate >= start && item.publishDate <= end);
    }
    if (Array.isArray(toolBarParams?.moreOwner) && toolBarParams.moreOwner.length) {
      list = list.filter((item) => toolBarParams.moreOwner.includes(item.ownerId));
    }
    // 临时参数：仅单次请求有效（refreshList / search 演示）
    if (tempParams?.onlyLocked) {
      list = list.filter((item) => item.locked);
    }

    // 排序参数形如 { score: 'asc' }
    const [sortField, sortOrder] = Object.entries(sorterParams ?? {})[0] ?? [];
    if (sortField) {
      list.sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        const result =
          typeof aValue === 'number' && typeof bValue === 'number'
            ? aValue - bValue
            : String(aValue).localeCompare(String(bValue), 'zh-Hans-CN');
        return sortOrder === 'desc' ? -result : result;
      });
    }

    const total = list.length;
    const pageNum = Number(pageParams.pageNum) || 1;
    const pageSize = Number(pageParams.pageSize) || 10;
    const start = (pageNum - 1) * pageSize;
    return { list: list.slice(start, start + pageSize), total };
  };

  /* ==================== 主实例：弹窗配置 ==================== */

  // 新增 / 编辑 / 详情共用的表单项，disabled 用于详情只读
  const createRecordFormList = (disabled = false) => [
    {
      key: 'name',
      type: 'input',
      label: '名称',
      grid: { col: 'span 2' },
      attrs: { disabled, maxlength: 30 },
      validate: disabled ? [] : [{ type: 'required' }],
    },
    {
      key: 'department',
      type: 'select',
      label: '部门',
      options: DEPARTMENTS,
      attrs: { disabled },
      validate: disabled ? [] : [{ type: 'required' }],
    },
    {
      key: 'level',
      type: 'select',
      label: '级别',
      options: LEVELS,
      attrs: { disabled },
    },
    {
      key: 'publishDate',
      type: 'date',
      label: '发布日期',
      attrs: { disabled },
      validate: disabled ? [] : [{ type: 'required' }],
    },
    {
      key: 'score',
      type: 'number',
      label: '分数',
      attrs: { disabled, min: 0, max: 100, step: 5 },
      validate: disabled ? [] : [{ type: 'number', min: 0, max: 100 }],
    },
    {
      key: 'status',
      type: 'switch',
      label: '启用状态',
      defaultValue: true,
      attrs: { disabled, activeText: '启用', inactiveText: '停用' },
    },
    {
      key: 'remark',
      type: 'textarea',
      label: '备注',
      grid: { col: 'span 2' },
      attrs: { disabled, maxlength: 120, showWordLimit: true },
    },
  ];

  // 新增记录弹窗：okButton.disabled.watch 演示
  const addModalConfig = {
    type: 'dialog',
    title: '新增记录',
    width: '640px',
    form: {
      list: createRecordFormList(),
      grid: { cols: 'repeat(2, 1fr)', gap: '12px' },
      formItemAttrs: { labelWidth: '90px' },
    },
    okButton: {
      text: '保存',
      // modal 的 disabled.watch：handle 接收 keys 对应的值数组
      disabled: { watch: { keys: ['name'], handle: ([name]) => !name } },
      async onClick(modalBindData, formData) {
        await delay(300);
        records.value = [buildRecord(formData), ...records.value];
        return { close: true, reloadList: true, message: '新增成功' };
      },
    },
    cancelButton: {
      text: '取消',
      onClick: () => {
        pushLog('取消新增');
        return { close: true };
      },
    },
  };

  // 编辑弹窗：异步 getBindData + 按钮文案函数
  const editModalConfig = {
    type: 'dialog',
    title: '编辑记录',
    width: '640px',
    form: {
      list: createRecordFormList(),
      grid: { cols: 'repeat(2, 1fr)', gap: '12px' },
      formItemAttrs: { labelWidth: '90px' },
    },
    // 打开前的校验：返回 false 时不打开
    openModalValidate: (row) => {
      pushLog('openModalValidate 入参', row);
      return !!row?.id;
    },
    async getBindData(row) {
      await delay(250);
      const target = records.value.find((item) => item.id === row.id);
      return { ...(target ?? row) };
    },
    okButton: {
      // 文案函数：根据弹窗数据动态展示
      text: (bindData) => (bindData?.id ? '保存修改' : '保存'),
      async onClick(bindData, formData) {
        await delay(300);
        const index = records.value.findIndex((item) => item.id === bindData.id);
        if (index > -1) {
          records.value[index] = { ...records.value[index], ...formData, id: bindData.id };
        }
        return { close: true, reloadList: true, message: '保存成功' };
      },
    },
  };

  // 详情弹窗：表格 openModal 列使用
  const detailModalConfig = {
    type: 'dialog',
    title: '记录详情',
    width: '600px',
    form: {
      list: createRecordFormList(true),
      grid: { cols: 'repeat(2, 1fr)', gap: '12px' },
      formItemAttrs: { labelWidth: '90px' },
    },
    getBindData(row) {
      return { ...row };
    },
    okButton: { text: '关闭', onClick: () => ({ close: true }) },
    cancelButton: { text: '返回' },
  };

  // 派工弹窗：由操作列按钮携带
  const dispatchModalConfig = {
    type: 'dialog',
    title: '派工',
    width: '520px',
    form: {
      list: [
        {
          key: 'rectificationDate',
          type: 'date',
          label: '整改期限',
          validate: [{ type: 'required' }],
        },
        { key: 'remark', type: 'textarea', label: '派工说明', attrs: { maxlength: 80 } },
      ],
      formItemAttrs: { labelWidth: '90px' },
    },
    // getBindData 会覆盖 bindData，需带上 id 以便提交时定位记录
    getBindData: (row) => ({ id: row.id, rectificationDate: row.publishDate, remark: '' }),
    okButton: {
      text: '确定派工',
      async onClick(bindData, formData) {
        await delay(200);
        const target = records.value.find((item) => item.id === bindData.id);
        if (target) {
          target.publishDate = formData.rectificationDate;
          target.remark = formData.remark ?? target.remark;
          target.flowStatus = '待整改';
        }
        return { close: true, reloadList: true, message: '派工成功' };
      },
    },
  };

  /* ==================== 主实例：工具栏 + 列表配置 ==================== */

  // 主实例状态（与组件双向绑定）
  const mainManagerRef = ref(null);
  const mainSelectedRowKeys = ref([]);
  const mainPageNum = ref(1);
  const mainPageSize = ref(10);
  const mainTotal = ref(0);

  const mainToolBarConfig = {
    layout: 'inline',
    items: [
      // 统一按钮：modal 打开新增弹窗，插槽替换文案
      { key: 'add', type: 'button', text: '新增记录', inline: 'left', modal: addModalConfig },
      // 导入：onClick 必须返回 Promise（组件内部链式调用 then/finally）
      {
        key: 'import',
        type: 'import',
        text: '导入 xlsx',
        inline: 'left',
        UiProps: { plain: true },
        onClick: async (file) => {
          await delay(600);
          const fileName = file?.file?.name ?? '导入数据.xlsx';
          records.value = [buildRecord({ name: `导入：${fileName}` }), ...records.value];
          pushLog('导入完成', fileName);
        },
      },
      // 下载按钮：disabled.watch 在未填写搜索条件时禁用
      {
        key: 'exportAll',
        type: 'button',
        text: '导出全部',
        inline: 'left',
        UiProps: { plain: true },
        disabled: {
          watch: {
            keys: ['keyword', 'department'],
            handle: ({ keyword, department }) => !keyword && !department,
          },
        },
        download: () => createCsvDownload(records.value, '全部记录.csv'),
      },
      // 进入勾选模式：确认 / 取消
      {
        key: 'batchDelete',
        type: 'enterSelectMode',
        text: '批量删除',
        inline: 'left',
        UiProps: { type: 'danger', plain: true },
        ok: {
          text: '确认删除',
          onClick: (selectedRows) => {
            const ids = selectedRows.map((row) => row.id);
            records.value = records.value.filter((item) => !ids.includes(item.id));
            pushLog('批量删除', `共 ${ids.length} 条`);
            mainManagerRef.value?.refreshList();
          },
        },
        cancel: { text: '取消', onClick: () => pushLog('取消批量删除') },
      },
      {
        key: 'batchExport',
        type: 'enterSelectMode',
        text: '批量导出',
        inline: 'left',
        UiProps: { plain: true },
        ok: {
          text: '确认导出',
          onClick: (selectedRows) => {
            const csv = createCsvDownload(selectedRows, '选中记录.csv');
            downloadBlob(csv.blob, csv.filename);
            pushLog('批量导出', `共 ${selectedRows.length} 条`);
          },
        },
        cancel: { text: '取消' },
      },
      // 更多搜索：自动生成抽屉弹窗，表单字段通过 toolBarParams 参与搜索
      {
        key: 'moreSearch',
        type: 'openMoreSearch',
        text: '更多搜索',
        inline: 'left',
        UiProps: { type: 'primary', plain: true },
        form: {
          list: [
            { key: 'moreLevel', type: 'checkbox', label: '级别（多选）', options: LEVELS },
            {
              key: 'morePublish',
              type: 'date',
              label: '发布日期',
              attrs: {
                type: 'daterange',
                valueFormat: 'YYYY-MM-DD',
                startPlaceholder: '开始日期',
                endPlaceholder: '结束日期',
              },
            },
            {
              key: 'moreOwner',
              type: 'select',
              label: '负责人',
              options: OWNER_OPTIONS,
              attrs: { multiple: true, collapseTags: true },
            },
          ],
          formItemAttrs: { labelWidth: '110px' },
        },
      },
      // checkbox 工具栏项：用于驱动其它按钮的 show.watch
      {
        key: 'showExtra',
        type: 'checkbox',
        inline: 'left',
        options: [{ label: '显示高级操作', value: 'yes' }],
        defaultValue: ['yes'],
        UiProps: { style: 'margin-left: 8px' },
      },
      // 显隐联动按钮：show.watch 的 handle 接收 keys 对应的值数组
      {
        key: 'advancedExport',
        type: 'button',
        text: '高级导出',
        inline: 'left',
        UiProps: { plain: true },
        show: {
          watch: {
            keys: ['showExtra'],
            handle: ([showExtra]) => Array.isArray(showExtra) && showExtra.includes('yes'),
          },
        },
        download: {
          blob: new Blob(['高级导出演示文件'], { type: 'text/plain;charset=utf-8' }),
          filename: '高级导出.txt',
        },
      },
      // 自定义类型：内容由 toolBar-item-custom-advancedHelp 插槽提供
      { key: 'advancedHelp', type: 'custom', inline: 'left' },
      // 关键字：searchTime 防抖自动搜索
      {
        key: 'keyword',
        type: 'input',
        placeholder: '名称 / 编号（800ms 防抖搜索）',
        inline: 'right',
        searchTime: 800,
        // get：提交搜索前对绑定值做一次变换
        get: (value) => String(value ?? '').trim(),
        UiProps: { style: 'width: 220px' },
      },
      // 下拉：异步 options
      {
        key: 'department',
        type: 'select',
        placeholder: '部门',
        inline: 'right',
        options: async () => {
          await delay(120);
          return DEPARTMENTS;
        },
        UiProps: { style: 'width: 140px' },
      },
      // 树形选择（工具栏类型演示）
      {
        key: 'departmentTree',
        type: 'treeSelect',
        placeholder: '组织（treeSelect）',
        inline: 'right',
        options: DEPARTMENT_TREE,
        // checkStrictly 让父节点也能被选中（默认只有叶子节点可选中）
        UiProps: { checkStrictly: true, style: 'width: 190px' },
      },
      {
        key: 'level',
        type: 'select',
        placeholder: '级别',
        inline: 'right',
        options: LEVELS,
        UiProps: { style: 'width: 120px' },
      },
      // 日期范围
      {
        key: 'publishRange',
        type: 'date',
        inline: 'right',
        UiProps: {
          type: 'daterange',
          valueFormat: 'YYYY-MM-DD',
          startPlaceholder: '开始日期',
          endPlaceholder: '结束日期',
          style: 'width: 240px',
        },
      },
      // 时间（工具栏类型演示）
      {
        key: 'publishTime',
        type: 'time',
        inline: 'right',
        UiProps: { style: 'width: 140px' },
      },
      // 搜索按钮组：搜索 + 清空
      {
        key: 'search',
        type: 'searchButton',
        text: '搜索',
        inline: 'right',
        isGroup: true,
        UiProps: { type: 'primary' },
      },
    ],
  };

  const mainCols = [
    { title: '序号', key: 'index', type: 'index', width: 64 },
    {
      title: '名称',
      key: 'name',
      width: 150,
      UiProps: { sortable: 'custom' },
    },
    {
      title: '部门',
      key: 'department',
      width: 120,
      get: (value) => findDeptLabel(value),
      // 列筛选数据源（异步）
      getFilterList: async () => {
        await delay(100);
        return DEPARTMENTS.map((item) => ({ text: item.label, value: item.value }));
      },
      UiProps: {
        filters: [],
        // 本地数据已由接口层过滤，这里让 el-table 不再二次过滤
        filterMethod: () => true,
        // 列筛选事件通过 columnKey 回传，这里与 cols 下标（+1）对齐
        columnKey: '3',
      },
    },
    { title: '级别', key: 'level', type: 'custom', width: 100 },
    {
      title: '负责人',
      key: 'owner',
      width: 110,
      // 异步 get：格式化列展示值
      get: async (value) => {
        await delay(60);
        return OWNER_NAMES[value] ?? `用户${value}`;
      },
    },
    { title: '分数', key: 'score', width: 100, UiProps: { sortable: 'custom' } },
    {
      title: '状态',
      key: 'status',
      type: 'formItem',
      width: 100,
      formItemConfig: {
        type: 'switch',
        UiProps: { activeText: '启用', inactiveText: '停用' },
      },
      // formItemActive 为 true 时无需进入编辑态，变更即保存
      fn: async (rowData) => {
        pushLog('状态已保存（演示）', rowData.name);
        return false;
      },
    },
    {
      title: '备注',
      key: 'remark',
      type: 'formItem',
      width: 160,
      formItemConfig: { type: 'input' },
      debounce: 800,
      fn: async (rowData) => {
        pushLog('备注已保存（演示）', rowData.name);
        return false;
      },
    },
    { title: '流程状态', key: 'flowStatus', width: 110 },
    { title: '发布日期', key: 'publishDate', width: 120, UiProps: { sortable: 'custom' } },
    {
      title: '编号',
      key: 'code',
      type: 'link',
      width: 120,
      onClick: (row) => pushLog('点击编号链接列', row.code),
    },
    {
      title: '详情',
      key: 'detail',
      type: 'openModal',
      width: 90,
      // text 支持函数形式，按行数据决定按钮文案
      text: (row) => (row.flowStatus === '已完成' ? '回看' : '查看'),
      modal: detailModalConfig,
      onClick: (row) => pushLog('点击弹窗列', row.code),
    },
    { title: '附件', key: 'attachments', type: 'fileList', width: 140 },
  ];

  const mainOperater = {
    key: 'operater',
    title: '操作',
    width: 320,
    UiProps: { fixed: 'right' },
    buttons: [
      { key: 'edit', type: 'button', text: '编辑', modal: editModalConfig },
      {
        key: 'dispatch',
        type: 'button',
        text: '派工',
        // 字符串表达式：会被编译成 rowData.flowStatus === '待派工'
        show: "flowStatus==='待派工'",
        modal: dispatchModalConfig,
      },
      {
        key: 'finish',
        type: 'button',
        text: '完成',
        // 函数形式：接收原始行数据
        show: (row) => row.flowStatus === '待整改',
        onClick: async (row) => {
          const target = records.value.find((item) => item.id === row.id);
          if (target) target.flowStatus = '已完成';
          return { refreshRecordList: true, message: '已完成整改' };
        },
      },
      {
        key: 'download',
        type: 'button',
        text: '下载',
        UiProps: { type: 'primary' },
        download: (row) => createCsvDownload([row], `${row.code}.csv`),
      },
      {
        key: 'delete',
        type: 'button',
        text: '删除',
        buttonAttrs: { type: 'danger' },
        confirm: {
          notice: (row) => `确认删除「${row.name}」？`,
          okText: '删除',
          cancelText: '取消',
          onCancel: (row) => pushLog('取消删除', row.name),
        },
        onClick: async (row) => {
          records.value = records.value.filter((item) => item.id !== row.id);
          return { refreshRecordList: true, message: '删除成功' };
        },
      },
    ],
  };

  const mainConfig = {
    toolBar: mainToolBarConfig,
    rowKeyName: 'id',
    // formItem 列无需进入编辑态，可直接修改
    formItemActive: true,
    // 额外参数：每次请求都会携带
    extraParams: { scene: 'advRecordsManagerDemo' },
    UiProps: {
      border: true,
      stripe: true,
      // 锁定行不可勾选
      selectable: (row) => !row.locked,
      rowClassName: ({ row }) => (row.locked ? 'demo_row_locked' : ''),
      'header-cell-style': { background: '#fafafa', color: '#303133' },
    },
    UiEvents: {
      'row-click': (row) => pushLog('表格行点击', row.name),
      'selection-change': (rows) => pushLog('selection-change', `当前页勾选 ${rows.length} 条`),
    },
    cols: mainCols,
    operater: mainOperater,
    getList,
  };

  /* ==================== 主实例：实例方法演示 ==================== */

  const methodResult = ref('');
  const methodDemos = [
    {
      label: 'getSelectedRowKeys()',
      exec: () => mainManagerRef.value?.getSelectedRowKeys(),
    },
    { label: 'getSelectedRows()', exec: () => mainManagerRef.value?.getSelectedRows() },
    {
      label: 'enterSelectMode([1,2])',
      exec: () => mainManagerRef.value?.enterSelectMode([1, 2]),
    },
    { label: 'exitSelectMode()', exec: () => mainManagerRef.value?.exitSelectMode() },
    { label: 'clearSelection()', exec: () => mainManagerRef.value?.clearSelection() },
    {
      label: 'setSelectedRowKeys([3,4])',
      exec: () => mainManagerRef.value?.setSelectedRowKeys([3, 4]),
    },
    { label: 'setPage(2)', exec: () => mainManagerRef.value?.setPage(2) },
    { label: 'setPageSize(20)', exec: () => mainManagerRef.value?.setPageSize(20) },
    { label: 'getToolBarParams()', exec: () => mainManagerRef.value?.getToolBarParams() },
    {
      label: 'getRecordList()',
      exec: () => {
        const listInfo = mainManagerRef.value?.getRecordList();
        return listInfo
          ? { total: listInfo.total, pageCount: listInfo.list.length, first: listInfo.list[0]?.name }
          : null;
      },
    },
    { label: 'searchParamsClear()', exec: () => mainManagerRef.value?.searchParamsClear() },
    {
      label: 'search({ tempParams })',
      exec: () =>
        mainManagerRef.value?.search({
          tempParams: { onlyLocked: true },
          extraParams: { from: 'external-search' },
        }),
    },
    {
      label: 'refreshList({ onlyLocked })',
      exec: () => mainManagerRef.value?.refreshList({ onlyLocked: true }),
    },
    { label: 'getRecordListRef()', exec: () => !!mainManagerRef.value?.getRecordListRef() },
    { label: 'getToolBarRef()', exec: () => !!mainManagerRef.value?.getToolBarRef() },
  ];
  const runMethodDemo = async (item) => {
    try {
      const result = await item.exec();
      methodResult.value = `${item.label}\n=> ${formatResult(result)}`;
      pushLog(item.label, result);
    } catch (error) {
      methodResult.value = `${item.label}\n=> 调用失败：${error?.message ?? error}`;
      pushLog(item.label, '调用失败');
    }
  };

  /* ==================== 第二个实例：grid 工具栏 + 固定勾选 + 行内编辑 ==================== */

  const gridManagerRef = ref(null);
  const gridSelectedRowKeys = ref([]);
  const gridPageNum = ref(1);
  const gridPageSize = ref(10);
  const gridTotal = ref(0);
  const gridMethodResult = ref('');

  const gridToolBarConfig = {
    layout: 'grid',
    grid: { cols: 'repeat(4, 1fr)', gap: '12px' },
    items: [
      {
        key: 'keyword',
        type: 'input',
        placeholder: '名称 / 编号',
        grid: { col: 'span 2' },
      },
      { key: 'department', type: 'select', placeholder: '部门', options: DEPARTMENTS },
      {
        key: 'search',
        type: 'searchButton',
        text: '搜索',
        isGroup: true,
        UiProps: { type: 'primary' },
      },
      // getSelectedRows 存在时列表固定进入勾选模式
      {
        key: 'selectedExport',
        type: 'getSelectedRows',
        text: '导出已选',
        grid: { col: 'span 2' },
        UiProps: { plain: true },
        onClick: (selectedRows) => {
          const csv = createCsvDownload(selectedRows, '已选记录.csv');
          downloadBlob(csv.blob, csv.filename);
          pushLog('固定勾选导出', `共 ${selectedRows.length} 条`);
        },
      },
      {
        key: 'reset',
        type: 'button',
        text: '重置条件',
        grid: { col: 'span 2' },
        onClick: () => {
          gridManagerRef.value?.searchParamsClear();
          gridManagerRef.value?.search();
        },
      },
    ],
  };

  const gridCols = [
    { title: '序号', key: 'index', type: 'index', width: 64 },
    { title: '名称', key: 'name', width: 150 },
    // 可编辑下拉列：options 提供给 el-select
    {
      title: '级别',
      key: 'level',
      type: 'formItem',
      width: 120,
      formItemConfig: { type: 'select' },
      options: LEVELS,
    },
    {
      title: '分数',
      key: 'score',
      width: 100,
      UiProps: { sortable: 'custom' },
    },
    {
      title: '备注',
      key: 'remark',
      type: 'formItem',
      width: 170,
      formItemConfig: { type: 'input' },
    },
    {
      title: '状态',
      key: 'status',
      type: 'formItem',
      width: 100,
      formItemConfig: {
        type: 'switch',
        UiProps: { activeText: '启用', inactiveText: '停用' },
      },
    },
    { title: '流程状态', key: 'flowStatus', width: 110 },
  ];

  const gridOperater = {
    key: 'operater',
    title: '操作',
    width: 190,
    UiProps: { fixed: 'right' },
    buttons: [
      // 行内编辑：进入 / 保存 / 取消
      {
        key: 'rowEdit',
        type: 'formItemOperater',
        text: '行内编辑',
        onClick: async (row) => {
          pushLog('行内编辑提交（演示：仅前端保留修改）', row.name);
          return false;
        },
      },
      {
        key: 'delete',
        type: 'button',
        text: '删除',
        buttonAttrs: { type: 'danger' },
        confirm: { notice: (row) => `确认删除「${row.name}」？` },
        onClick: async (row) => {
          records.value = records.value.filter((item) => item.id !== row.id);
          return { refreshRecordList: true, message: '删除成功' };
        },
      },
    ],
  };

  const gridConfig = {
    toolBar: gridToolBarConfig,
    rowKeyName: 'id',
    extraParams: { scene: 'gridToolBarDemo' },
    UiProps: {
      border: true,
      selectable: (row) => !row.locked,
    },
    cols: gridCols,
    operater: gridOperater,
    getList,
  };

  const logGridMethod = (label, result) => {
    gridMethodResult.value = `${label}\n=> ${formatResult(result)}`;
    pushLog(label, result);
  };

  /* ==================== AdvButton 演示 ==================== */

  const activeTab = ref('inline');
  const buttonClickCount = ref(0);

  const handleBasicClick = () => {
    buttonClickCount.value += 1;
    pushLog('同步点击', `第 ${buttonClickCount.value} 次`);
  };
  const handleAsyncClick = async () => {
    pushLog('异步点击开始（按钮自动 loading）');
    await delay(1200);
    pushLog('异步点击完成');
  };
  const handleConfirmClick = () => {
    buttonClickCount.value += 1;
    pushLog('确认后执行', `第 ${buttonClickCount.value} 次`);
  };

  // 自定义确认配置：notice 支持函数形式
  const customConfirmConfig = {
    title: '删除确认',
    notice: () => `当前点击次数 ${buttonClickCount.value}，确认执行删除？`,
    okText: '确认删除',
    cancelText: '再想想',
    type: 'warning',
    onCancel: () => pushLog('确认框已取消'),
  };

  // 按钮自带弹窗（表单模式）
  const buttonFormModal = {
    type: 'dialog',
    title: '按钮自带弹窗',
    width: '520px',
    form: {
      list: [
        { key: 'name', type: 'input', label: '名称', validate: [{ type: 'required' }] },
        { key: 'enabled', type: 'switch', label: '启用', defaultValue: true },
      ],
      formItemAttrs: { labelWidth: '80px' },
    },
    getBindData: (payload) => ({ name: payload?.name ?? '弹窗默认名称' }),
    okButton: {
      text: '提交',
      async onClick(modalBindData, formData) {
        pushLog('按钮弹窗提交', formData);
        return { close: true, reloadList: true, message: '弹窗提交成功' };
      },
    },
  };

  // 按钮自带弹窗（自定义内容插槽）
  const buttonCustomModal = {
    type: 'dialog',
    title: '自定义内容弹窗',
    width: '560px',
    getBindData: (payload) => ({
      from: payload?.from ?? 'unknown',
      time: new Date().toLocaleTimeString(),
    }),
    okButton: {
      text: '知道了',
      onClick: () => ({ close: true, message: '自定义弹窗已确认' }),
    },
    cancelButton: { text: '关闭' },
  };

  // 直链下载配置（data URL，避免依赖静态资源）
  const stringDownloadConfig = {
    url: `data:text/plain;charset=utf-8,${encodeURIComponent('这是直链下载演示文件')}`,
    filename: '直链下载演示.txt',
  };

  /* ==================== AdvForm 演示 ==================== */

  const advFormRef = ref(null);
  const formResult = ref('');
  const lastFormInput = ref('');

  const formConfig = {
    grid: { cols: 'repeat(2, 1fr)', gap: '16px' },
    attrs: { labelPosition: 'right' },
    formItemAttrs: { labelWidth: '110px' },
    // 使用 #button 插槽自定义底部按钮
    showButton: true,
    list: [
      {
        key: 'name',
        type: 'input',
        label: '姓名',
        defaultValue: '张三',
        tip: '支持中英文，最长 30 字',
        attrs: { maxlength: 30 },
        validate: [{ type: 'required' }],
      },
      {
        key: 'phone',
        type: 'phone',
        label: '手机号',
        validate: [{ type: 'required' }, { type: 'phone' }],
      },
      {
        key: 'email',
        type: 'input',
        label: '邮箱',
        validate: [{ type: 'email' }],
        events: { onBlur: () => pushLog('邮箱输入框失焦（表单项 events 演示）') },
      },
      {
        key: 'idCard',
        type: 'input',
        label: '身份证号',
        validate: [{ type: 'peopleIdNum' }],
      },
      {
        key: 'age',
        type: 'intNumber',
        label: '年龄',
        attrs: { min: 0, max: 120 },
        inputGuard: { numberLimit: { integer: 3 } },
        validate: [{ type: 'number', min: 18, max: 65 }],
      },
      {
        key: 'salary',
        type: 'number',
        label: '月薪',
        attrs: { step: 100, precision: 2 },
        inputGuard: { numberLimit: { integer: 6, decimal: 2 } },
      },
      {
        key: 'bizType',
        type: 'radio',
        label: '客户类型',
        defaultValue: 'person',
        options: [
          { label: '个人', value: 'person' },
          { label: '企业', value: 'company' },
        ],
      },
      {
        key: 'companyName',
        type: 'input',
        label: '企业名称',
        // watch：显隐联动 + 动态校验（企业类型才必填）
        watch: [
          { on: ['bizType'], show: ({ bizType }) => bizType === 'company' },
          {
            on: ['bizType'],
            validate: ({ bizType }) =>
              bizType === 'company' ? [{ type: 'required' }] : [],
          },
        ],
      },
      {
        key: 'province',
        type: 'select',
        label: '省份',
        defaultValue: 'zj',
        options: PROVINCES,
      },
      {
        key: 'city',
        type: 'select',
        label: '城市',
        options: [],
        // watch：选项联动，province 变化时重算城市选项
        watch: [
          {
            on: ['province'],
            options: ({ province }) => CITY_MAP[province] ?? [],
            option: { immediate: true },
          },
        ],
      },
      {
        key: 'org',
        type: 'treeSelect',
        label: '所属组织',
        options: DEPARTMENT_TREE,
      },
      {
        key: 'tags',
        type: 'checkbox',
        label: '标签',
        defaultValue: ['a'],
        options: [
          { label: '重点客户', value: 'a' },
          { label: '长期合作', value: 'b' },
          { label: '新客户', value: 'c' },
        ],
      },
      {
        key: 'enabled',
        type: 'switch',
        label: '是否启用',
        defaultValue: true,
      },
      {
        key: 'birthday',
        type: 'date',
        label: '生日',
        // 面板限选：不得晚于 2020-01-01
        inputGuard: { dateLimit: { type: 'notAfter', date: '2020-01-01' } },
      },
      { key: 'startDate', type: 'date', label: '开始日期' },
      {
        key: 'endDate',
        type: 'date',
        label: '结束日期',
        attrs: { disabled: true },
        // 面板限选 + disabled 联动
        inputGuard: { dateLimit: { type: 'notBefore', targetFieldName: 'startDate' } },
        watch: [
          {
            on: ['startDate'],
            attrKey: 'disabled',
            attrs: ({ startDate }) => !startDate,
            option: { immediate: true },
          },
        ],
      },
      { key: 'meetingTime', type: 'time', label: '会议时间' },
      { key: 'publishAt', type: 'dateTime', label: '发布时间' },
      {
        key: 'range',
        type: 'numberRange',
        label: '进度区间',
        defaultValue: [20, 70],
        grid: { col: 'span 2' },
        attrs: { min: 0, max: 100, marks: { 0: '0', 100: '100' } },
      },
      {
        key: 'quantity',
        type: 'number',
        label: '数量',
        defaultValue: 2,
        attrs: { min: 0 },
      },
      {
        key: 'price',
        type: 'number',
        label: '单价',
        defaultValue: 99,
        attrs: { min: 0 },
      },
      {
        key: 'total',
        type: 'number',
        label: '总价',
        attrs: { disabled: true },
        // watch：值联动（数量 × 单价）
        watch: [
          {
            on: ['quantity', 'price'],
            value: ({ quantity, price }) => Number(quantity || 0) * Number(price || 0),
            option: { immediate: true },
          },
        ],
      },
      {
        key: 'password',
        type: 'input',
        label: '密码',
        attrs: { type: 'password', showPassword: true },
        validate: [{ type: 'required' }],
      },
      {
        key: 'confirmPassword',
        type: 'input',
        label: '确认密码',
        attrs: { type: 'password', showPassword: true },
        validate: [{ type: 'required' }, { type: 'sameWith', targetFieldName: 'password' }],
      },
      {
        key: 'remark',
        type: 'textarea',
        label: '备注',
        grid: { col: 'span 2' },
        attrs: { maxlength: 100, showWordLimit: true },
        // 数据变换：set 仅在 setFormData 时执行，get 仅在 submit / getFormData(transform) 时执行
        set: (value) => (value ? `SET:${value}` : value),
        get: (value) => String(value ?? '').replace(/^SET:/, ''),
      },
      {
        key: 'avatar',
        type: 'upload',
        label: '头像',
        grid: { col: 'span 2' },
        limitType: 'img',
        limitNum: 2,
        limitSize: 2048,
      },
      {
        key: 'rating',
        type: 'custom',
        label: '自评分',
        grid: { col: 'span 1' },
      },
      {
        key: 'code',
        type: 'input',
        label: '编号',
        defaultValue: 'AUTO-001',
        attrs: { readonly: true },
      },
    ],
  };

  const submitAdvForm = () => {
    advFormRef.value
      ?.submit()
      .then((data) => {
        formResult.value = formatResult(data);
        pushLog('AdvForm 校验通过（get 变换后的提交数据）', data);
      })
      .catch(() => pushLog('AdvForm 校验未通过'));
  };
  const readAdvForm = () => {
    formResult.value = formatResult(advFormRef.value?.getFormData({ transform: true }));
    pushLog('读取表单值（transform: true）');
  };
  const fillAdvForm = () => {
    advFormRef.value?.setFormData({
      name: '回填姓名',
      bizType: 'company',
      companyName: '回填企业',
      province: 'js',
      city: 'nj',
      startDate: '2026-01-01',
      endDate: '2026-02-01',
      remark: '回填备注',
    });
    pushLog('setFormData 局部回填（remark 会执行 set 变换）');
  };
  const replaceAdvForm = () => {
    advFormRef.value?.setFormData({ name: '整表重置后的姓名' }, { replace: true });
    pushLog('setFormData({ replace: true }) 整表重置');
  };
  const updateAdvFormField = () => {
    advFormRef.value?.updateFormData('name', 'updateFormData 写入的姓名');
    pushLog('updateFormData(name, ...)');
  };
  const clearAdvForm = () => {
    advFormRef.value?.clearFormData();
    pushLog('clearFormData 清空表单');
  };

  /* ==================== AdvModal 演示 ==================== */

  const advModalRef = ref(null);
  const drawerModalRef = ref(null);
  const modalBindDataText = ref('');

  const dialogModalConfig = {
    type: 'dialog',
    title: '用户信息（对话框）',
    width: '560px',
    form: {
      list: [
        { key: 'name', type: 'input', label: '姓名', validate: [{ type: 'required' }] },
        { key: 'email', type: 'input', label: '邮箱', validate: [{ type: 'email' }] },
        { key: 'department', type: 'select', label: '部门', options: DEPARTMENTS },
        { key: 'enabled', type: 'switch', label: '启用', defaultValue: true },
        {
          key: 'remark',
          type: 'textarea',
          label: '备注',
          attrs: { maxlength: 80, showWordLimit: true },
        },
      ],
      formItemAttrs: { labelWidth: '80px' },
    },
    // 异步取数：打开时按入参换回完整数据
    getBindData: async (payload) => {
      pushLog('对话框 getBindData 入参', payload);
      await delay(400);
      return { ...(payload ?? {}) };
    },
    // 打开前校验：返回 false 则不打开
    openModalValidate: (payload) => {
      pushLog('openModalValidate 校验结果', payload?.id !== 0);
      return payload?.id !== 0;
    },
    okButton: {
      // 文案函数：数据落库后解析
      text: (bindData) => (bindData?.id ? '保存' : '创建'),
      // 二次确认
      confirm: { text: '确认提交该用户信息？', okText: '提交' },
      async onClick(bindData, formData) {
        pushLog('对话框 okButton.onClick', formData);
        await delay(300);
        return { close: true, reloadList: true, message: '已保存（reloadList=true）' };
      },
    },
    cancelButton: {
      text: '关闭',
      onClick: (bindData) => {
        pushLog('对话框 cancelButton.onClick', bindData);
        return { close: true };
      },
    },
  };

  const drawerModalConfig = {
    type: 'drawer',
    title: '抽屉弹窗（自定义 content / footer）',
    size: '520px',
    direction: 'rtl',
    getBindData: (payload) => ({
      ...(payload ?? {}),
      openedAt: new Date().toLocaleTimeString(),
    }),
    okButton: {
      text: '知道了',
      onClick: () => ({ close: true, reloadList: true, message: '抽屉已确认' }),
    },
    cancelButton: { text: '关闭', onClick: () => ({ close: true }) },
  };

  const openDialogModal = (payload) => {
    advModalRef.value?.openModal(payload);
  };
  const openDrawerModal = (payload) => {
    drawerModalRef.value?.openModal(payload);
  };
  const readModalBindData = () => {
    modalBindDataText.value = formatResult(advModalRef.value?.getBindData());
    pushLog('读取 AdvModal.getBindData()');
  };
</script>

<style lang="scss" scoped>
  /* 页面容器 */
  .adv_demo_page {
    padding: 4px;
  }

  .demo_tip {
    margin-bottom: 12px;
  }

  /* 记录管理器布局：左侧组件、右侧状态面板 */
  .demo_manager_layout {
    display: flex;
    gap: 12px;
    align-items: stretch;
  }

  .demo_manager_main {
    flex: 1;
    min-width: 0;
    height: 640px;
    display: flex;
    flex-direction: column;
  }

  /* 记录管理器容器：补齐中间层高度，让表格占满剩余空间 */
  .demo_manager_body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;

    > div {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
    }

    :deep(.adv_records_manager_wrapper) {
      height: 100%;
    }
  }

  .demo_pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-top: 10px;
  }

  .demo_selection_text {
    color: #606266;
    font-size: 13px;
  }

  .demo_manager_side {
    width: 360px;
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 700px;
    overflow-y: auto;
  }

  .demo_side_card {
    :deep(.el-card__header) {
      padding: 10px 14px;
      font-weight: 600;
    }

    :deep(.el-card__body) {
      padding: 12px 14px;
    }
  }

  .demo_kv {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 13px;
    line-height: 24px;
    color: #606266;
  }

  .demo_kv_value {
    max-width: 220px;
    word-break: break-all;
    text-align: right;
    color: #409eff;
  }

  .demo_method_list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .demo_result {
    margin: 8px 0 0;
    padding: 8px 10px;
    max-height: 260px;
    overflow: auto;
    background: #f5f7fa;
    border-radius: 4px;
    font-size: 12px;
    line-height: 18px;
    white-space: pre-wrap;
    word-break: break-all;
    color: #303133;
  }

  .demo_list {
    margin: 0;
    padding-left: 18px;
    font-size: 13px;
    line-height: 22px;
    color: #606266;
  }

  .demo_link {
    color: #409eff;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }

  /* 表格中的锁定行（通过 rowClassName 加在行上） */
  :deep(.demo_row_locked) {
    background: #fdf6ec !important;
  }

  /* AdvButton 卡片 */
  .demo_button_grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 12px;
  }

  .demo_button_card {
    :deep(.el-card__header) {
      padding: 10px 14px;
      font-weight: 600;
    }

    :deep(.el-card__body) {
      padding: 14px;
    }
  }

  .demo_hint {
    margin: 10px 0 0;
    font-size: 12px;
    line-height: 18px;
    color: #909399;
  }

  .demo_button_row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  /* AdvForm 布局 */
  .demo_form_layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 12px;
    align-items: start;
  }

  .demo_form_card {
    :deep(.el-card__header) {
      padding: 10px 14px;
      font-weight: 600;
    }
  }

  .demo_result_card {
    position: sticky;
    top: 0;

    :deep(.el-card__header) {
      padding: 10px 14px;
      font-weight: 600;
    }
  }

  .demo_form_after {
    margin-left: 8px;
    font-size: 12px;
    color: #909399;
  }

  .demo_preview_img {
    width: 100%;
    display: block;
  }

  /* AdvModal 布局 */
  .demo_modal_layout {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
    gap: 12px;
    align-items: start;
  }

  .demo_modal_card {
    :deep(.el-card__header) {
      padding: 10px 14px;
      font-weight: 600;
    }
  }

  .demo_modal_content {
    font-size: 13px;
    line-height: 24px;
    color: #606266;
  }

  .demo_modal_footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  /* 日志面板 */
  .demo_log_card {
    margin-top: 12px;

    :deep(.el-card__header) {
      padding: 10px 14px;
    }
  }

  .demo_log_header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 600;
  }

  .demo_log_list {
    max-height: 220px;
    overflow-y: auto;
  }

  .demo_log_item {
    padding: 2px 0;
    font-size: 12px;
    line-height: 18px;
    color: #606266;
    white-space: pre-wrap;
    word-break: break-all;
    border-bottom: 1px dashed #ebeef5;
  }

  .demo_log_empty {
    font-size: 12px;
    color: #909399;
  }

  /* 窄屏适配 */
  @media (max-width: 1280px) {
    .demo_manager_layout {
      flex-direction: column;
    }

    .demo_manager_side {
      width: auto;
      max-height: none;
    }

    .demo_form_layout {
      grid-template-columns: minmax(0, 1fr);
    }

    .demo_result_card {
      position: static;
    }
  }
</style>
