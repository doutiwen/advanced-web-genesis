/**
 * AdvModal 高级弹窗组件
 *
 * 【组件功能】
 * 基于 Element Plus 封装的弹窗管理器，支持多个弹窗配置和统一管理。
 *
 * 【组件架构】
 * AdvModal (当前组件)
 *   └── modalItem[] (多个弹窗项组件)
 *
 * 【Props 属性】
 * | 属性名 | 类型 | 必填 | 说明 |
 * |--------|------|------|------|
 * | config | Array | 是 | 弹窗配置列表 |
 *
 * 【暴露方法】
 * | 方法名 | 说明 | 参数 |
 * |--------|------|------|
 * | openModal | 打开指定弹窗 | key (弹窗标识), payload (数据), title (标题) |
 * | closeModal | 关闭指定弹窗 | key (弹窗标识), refreshRecordList, resetFormData |
 * | getModalData | 获取弹窗数据 | key (弹窗标识) |
 */

import { defineComponent, toValue } from 'vue';
import modalItem from './item.jsx';

export default defineComponent({
  name: 'adv-modal',
  props: {
    /**
     * 弹窗配置列表
     */
    config: {
      type: Array,
      required: true,
    },
  },
  emits: ['modalOpen', 'modalClose', 'refreshRecordList'],
  setup(props, { slots, expose, emit, attrs }) {
    /**
     * 弹窗引用对象，key 为弹窗标识
     */
    const modalRefs = {};

    /**
     * 打开弹窗
     * @param {String} key - 弹窗标识
     * @param {Any} payload - 传入的数据
     * @param {String} title - 弹窗标题（可选）
     */
    const openModal = (key, payload, title) => {
      const modalRef = modalRefs[key];
      if (modalRef) {
        modalRef.openModal(payload, title);
      }
    };

    /**
     * 关闭弹窗
     * @param {String} key - 弹窗标识
     * @param {Boolean} refreshRecordList - 是否刷新列表
     * @param {Boolean} resetFormData - 是否重置表单数据
     */
    const closeModal = (key, refreshRecordList = false, resetFormData = true) => {
      const modalRef = modalRefs[key];
      if (modalRef) {
        modalRef.closeModal(refreshRecordList, resetFormData);
      }
    };

    /**
     * 获取弹窗数据
     * @param {String} key - 弹窗标识
     * @returns {Any} 弹窗数据
     */
    const getModalData = (key) => {
      const modalRef = modalRefs[key];
      if (modalRef) {
        return modalRef.getModalData();
      }
      return null;
    };

    /**
     * 暴露方法给父组件
     */
    expose({
      openModal,
      closeModal,
      getModalData,
    });

    /**
     * 渲染弹窗列表
     */
    return () =>
      toValue(props.config).map((modalItemConfig) => (
        <modalItem
          key={modalItemConfig.key}
          config={modalItemConfig}
          ref={(ref) => {
            if (ref) {
              modalRefs[modalItemConfig.key] = ref;
            }
          }}
          onModalOpen={(e) => emit('modalOpen', e)}
          onModalClose={(e) => emit('modalClose', e)}
          onRefreshRecordList={() => emit('refreshRecordList')}
          {...attrs}
        >
          {slots}
        </modalItem>
      ));
  },
});
