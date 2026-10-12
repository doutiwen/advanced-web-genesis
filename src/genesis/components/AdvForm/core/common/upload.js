import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';

const uploadProps = {
  modelValue: {
    type: [Object, Array, String],
  },
  limitType: {
    type: [String, Array],
  },
  limitNum: {
    type: Number,
    default: 1,
  },
  limitSize: {
    type: Number,
    default: 2048,
  },
  hasPreview: {
    type: Boolean,
    default: true,
  },
  previewWidth: {
    type: String,
    default: '1000px',
  },
  uploadFn: {
    type: Function,
  },
};

const uploadEmits = ['update:modelValue'];

const useUpload = (props, emits) => {
  const imgTypeExts = ['.jpg', '.png', '.jpeg', '.gif', '.bmp', '.webp'];

  const _limitType = computed(() => {
    const typeList = [];
    let hasImg = false;
    if (!props.limitType) {
      hasImg = true;
    } else {
      const sourceTypeList = Array.isArray(props.limitType)
        ? props.limitType
        : typeof props.limitType === 'string'
          ? [props.limitType]
          : [];
      for (const item of sourceTypeList) {
        if (item === 'img') {
          hasImg = true;
        } else {
          typeList.push(`.${item}`);
        }
      }
    }
    if (hasImg) {
      typeList.push(...imgTypeExts);
    }
    return typeList;
  });

  const limitTypeString = computed(() => _limitType.value.join(','));

  /** el-upload 组件引用（用于移除校验不通过的文件等操作） */
  const uploadRef = ref();

  const showPreviewModal = ref(false);

  const previewInfo = ref({
    title: '详情',
    data: null,
  });

  const validateFileType = (file) => {
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.slice(fileName.lastIndexOf('.'));
    const fileMimeType = `.${file.type
      .toLowerCase()
      .slice(file.type.toLowerCase().lastIndexOf('/') + 1)}`;
    const isTypeValid =
      _limitType.value.includes(fileExtension) && _limitType.value.includes(fileMimeType);
    const notice = isTypeValid
      ? ''
      : `文件类型错误，请上传${_limitType.value.join('、')}格式的文件。`;
    return { valid: isTypeValid, notice };
  };

  const formatFileSize = (Kbytes, decimal = 2) => {
    if (!Kbytes || isNaN(Kbytes)) return '0B';
    const units = ['KB', 'MB', 'GB'];
    let size = Kbytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(decimal)}${units[unitIndex]}`;
  };

  const maxSizeString = computed(() => {
    return formatFileSize(props.limitSize);
  });

  const validateFileSize = (file) => {
    const fileSizeBytes = file.size / 1024;
    const isValid = fileSizeBytes <= props.limitSize;
    const formattedFileSize = formatFileSize(fileSizeBytes);
    const notice = isValid
      ? ''
      : `文件「${file.name}」大小${formattedFileSize}，超出最大限制${maxSizeString.value}。`;
    return { valid: isValid, notice };
  };

  const beforeUploadHandler = (file) => {
    const validateFnList = [validateFileType, validateFileSize];
    let allNotice = '',
      isValid = true;
    for (const validateFn of validateFnList) {
      const { valid, notice } = validateFn(file);
      if (!valid) {
        isValid = false;
        allNotice += notice;
      }
    }
    return {
      valid: isValid,
      notice: allNotice,
    };
  };

  /**
   * 归一化绑定值，作为 el-upload 的 file-list 数据源
   * 支持：文件列表数组 / 单个文件对象 / URL 字符串（回显场景）
   */
  const _moduleValue = computed(() => {
    if (Array.isArray(props.modelValue)) {
      return props.modelValue;
    } else if (typeof props.modelValue === 'object' && props.modelValue) {
      return [props.modelValue];
    } else if (typeof props.modelValue === 'string' && props.modelValue) {
      return [{ name: 'upload', url: props.modelValue }];
    }
    return [];
  });

  /**
   * 文件变更回调（auto-upload=false 时 before-upload 不触发，校验统一放这里）
   * 校验不通过时移除该文件（会触发 on-remove 同步模型），通过时同步模型
   */
  const changeUploadItemHandler = (file, fileList) => {
    if (file.status === 'ready') {
      const { valid, notice } = beforeUploadHandler(file.raw);
      if (!valid) {
        ElMessage.error(notice);
        uploadRef.value?.handleRemove(file);
        return;
      }
    }
    emits('update:modelValue', fileList);
  };

  /** 移除文件回调，同步模型 */
  const removeUploadItemHandler = (file, fileList) => {
    emits('update:modelValue', fileList);
  };

  /** 超出数量上限提示 */
  const exceedUploadItemHandler = () => {
    ElMessage.warning(`最多只能上传 ${props.limitNum} 个文件`);
  };

  /** 点击图片预览 */
  const previewUploadItemHandler = (file) => {
    const url = file?.url || file?.response?.url;
    if (!url) return;
    previewInfo.value = {
      title: '详情',
      data: url,
    };
    showPreviewModal.value = true;
  };

  /** 上传动作（仅在 auto-upload 被外部覆盖为 true 时触发） */
  const uploadHandler = (file) => {
    if (props.uploadFn) {
      props.uploadFn(file);
    }
  };

  const defineExposeConfig = {
    uploadRef,
  };

  return {
    _moduleValue,
    limitTypeString,
    uploadRef,
    showPreviewModal,
    previewInfo,
    changeUploadItemHandler,
    removeUploadItemHandler,
    exceedUploadItemHandler,
    previewUploadItemHandler,
    beforeUploadHandler,
    uploadHandler,
    defineExposeConfig,
  };
};

export { useUpload, uploadProps, uploadEmits };
