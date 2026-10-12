/**
 * modalItem 弹窗项组件
 *
 * 【组件功能】
 * 单个弹窗的渲染组件，支持 Dialog 和 Drawer 两种类型，集成表单和自定义内容。
 *
 * 【弹窗类型】
 * - dialog: 普通弹窗（el-dialog）
 * - drawer: 抽屉式弹窗（el-drawer）
 *
 * 【内容渲染】
 * 1. 表单模式：通过 config.form 配置渲染 AdvForm
 * 2. 自定义模式：通过插槽 modal-{key}-content 自定义内容
 *
 * 【表单数据流】
 * Form 与 state.bindFormData 保留双向绑定，但 bindFormData 仅作为组件内部 watch 等逻辑
 * 的实时表单值镜像（如 okButton.disabled.watch 动态禁用确认按钮），不再作为 getData /
 * okButton.fn 的数据载体：
 * - 数据进入：getData 拉取后由 useAdvModalItem 直接调用 Form 实例的 setFormData() 注入，
 *   触发 encrypt 字段的 set 解密（modelValue 绑定不会触发变换），不写入 bindFormData
 * - 数据取出：点击确定时先执行 Form 实例的 submit() 校验并取出（经 get 变换后的）表单数据，
 *   再作为第二参数交给 okButton.fn，同样不经 bindFormData
 *
 * 【插槽说明】
 * | 插槽名 | 说明 |
 * |--------|------|
 * | modal-{key}-content | 弹窗内容自定义 |
 * | modal-{key}-footer | 弹窗底部区域自定义 |
 */

import { defineComponent } from 'vue';
import Form from '@/components/AdvForm';
import { ElDialog, ElDrawer, ElMessage, ElMessageBox } from 'element-plus';
import { useAdvModalItem, advModalItemProps } from '../common/index.js';

export default defineComponent({
  name: 'adv-modal-item',
  props: advModalItemProps,
  emits: ['modalOpen', 'modalClose', 'refreshRecordList'],
  setup(props, { emit, slots, expose }) {
    /**
     * 使用弹窗 Hook
     */
    const { state, setFormRef, modalButtonEventHandler, handleCancel, defineExposeConfig } =
      useAdvModalItem(props, emit, ElMessage.success, ElMessageBox);

    /**
     * 暴露方法给父组件
     */
    expose(defineExposeConfig);

    /**
     * 渲染弹窗底部按钮区域
     * @returns {JSX.Element} 底部按钮元素
     */
    const renderFooter = () => {
      const footerSlot = slots[`modal-${props.config.key}-footer`];
      if (footerSlot) {
        return footerSlot({
          modalData: state.data.value,
          // 已解析的确认按钮文案：外部 footer 插槽直接取用，不要在插槽里调用户方法
          // （插槽渲染位于 ElOverlay 的渲染副作用内，渲染期抛错会连带炸掉整个弹窗渲染）
          okButtonText: state.okButtonText.value,
          closeModal: () => modalButtonEventHandler('cancel'),
          okLoading: state.okButtonLoading.value,
          okDisabled: state.okButtonDisable.value,
          cancelLoading: state.cancelButtonLoading.value,
          onOk: () => modalButtonEventHandler('ok'),
          onCancel: () => modalButtonEventHandler('cancel'),
          config: props.config,
        });
      } else {
        /**
         * 确认按钮内容
         * okButton.text 支持方法形式 (modalData) => String，方法在数据落库后由
         * refreshOkButtonText 解析并缓存到 state.okButtonText（不在此处执行用户方法）
         */
        const okButtonContent = (
          <el-button
            loading={state.okButtonLoading.value}
            disabled={state.okButtonDisable.value}
            type="primary"
            onClick={() => modalButtonEventHandler('ok')}
          >
            {state.okButtonText.value || '确定'}
          </el-button>
        );

        /**
         * 取消按钮内容
         */
        const cancelButtonContent = (
          <el-button
            disabled={state.okButtonLoading.value}
            onClick={() => modalButtonEventHandler('cancel')}
          >
            {props.config.cancelButton?.text || '取消'}
          </el-button>
        );

        /**
         * 确认按钮
         */
        const okButton = okButtonContent;

        /**
         * 取消按钮
         */
        const cancelButton = cancelButtonContent;

        return (
          <div class="modal_footer">
            {okButton}
            {cancelButton}
          </div>
        );
      }
    };

    const formSlots = Object.fromEntries(
      Object.entries(slots).filter(([key]) => key.startsWith('form-'))
    );

    /**
     * 渲染弹窗主体内容
     * @returns {JSX.Element} 主体内容元素
     */
    const renderDefault = () => {
      const contentSlot = slots[`modal-${props.config.key}-content`];
      return (
        <div
          style="height: 100%"
          v-loading={state.loading.value}
        >
          {props.config?.form ? (
            // 表单模式
            // Form 保留 modelValue / onUpdate:modelValue 双向绑定，bindFormData 仅作为组件内部
            // watch 等使用的实时镜像（如 okButton.disabled.watch 动态禁用），不作为 getData /
            // okButton.fn 的数据载体：
            // - 载入：getData 拉取后由 useAdvModalItem 调用 formRef.setFormData() 注入（触发 encrypt 解密）
            // - 取出：okButton 事件中调用 formRef.submit() 获取后再执行 okButton.fn
            <el-scrollbar>
              <Form
                config={props.config.form}
                modelValue={state.bindFormData.value}
                onUpdate:modelValue={(val) => {
                  state.bindFormData.value = val;
                }}
                ref={(ref) => setFormRef(ref)}
                {...(props.config.form.events || {})}
              >
                {{ ...formSlots }}
              </Form>
            </el-scrollbar>
          ) : contentSlot ? (
            // 自定义内容模式
            contentSlot({
              modalData: state.data.value,
              closeModal: () => modalButtonEventHandler('cancel'),
              okLoading: state.okButtonLoading.value,
              okDisabled: state.okButtonDisable.value,
              cancelLoading: state.cancelButtonLoading.value,
              onOk: () => modalButtonEventHandler('ok'),
              onCancel: () => modalButtonEventHandler('cancel'),
              config: props.config,
            })
          ) : null}
        </div>
      );
    };

    /**
     * 渲染弹窗组件
     */
    return () => {
      /**
       * 根据类型选择弹窗组件
       */
      const ModalComponent = props.config.type === 'dialog' ? ElDialog : ElDrawer;

      /**
       * 弹窗属性配置
       */
      const modalProps = {
        class: props.config?.modalWrapClass,
        modelValue: state.show.value,
        'onUpdate:modelValue': (value) => {
          state.show.value = value;
        },
        title: props.config.title,
        appendToBody: true,
        destroyOnClose: true,
        ...(props.config.type === 'dialog'
          ? {
              ...(props.config?.width ? { width: props.config.width || '50%' } : {}),
              fullscreen: !!props.config.fullscreen,
            }
          : {
              size: props.config.size || props.config.width || '600px',
              direction: props.config.direction || 'rtl',
              fullscreen: !!props.config.fullscreen,
            }),
        onCancel: () => modalButtonEventHandler('cancel'),
        // 点击右上角关闭图标（以及 ESC / 遮罩关闭）时，先执行 cancelButton.fn，再决定是否关闭
        beforeClose: (done) => {
          if (handleCancel()) {
            done();
          }
        },
        ...props.config.attrs,
      };

      return (
        <ModalComponent {...modalProps}>
          {{
            default: () => renderDefault(),
            footer: () => renderFooter(),
          }}
        </ModalComponent>
      );
    };
  },
});
