<template>
  <div
    :class="[
      'logo-upload',
      { 'is-upload-limit': _moduleValue.length >= props.limitNum },
    ]"
  >
    <el-upload
      ref="uploadRef"
      :file-list="_moduleValue"
      list-type="picture-card"
      :accept="limitTypeString"
      :limit="props.limitNum"
      :auto-upload="false"
      :before-upload="beforeUploadEle"
      :http-request="uploadHandler"
      :on-change="changeUploadItemHandler"
      :on-remove="removeUploadItemHandler"
      :on-exceed="exceedUploadItemHandler"
      :on-preview="props.hasPreview ? previewUploadItemHandler : undefined"
      v-bind="$attrs"
    >
      <span>点击上传照片</span>
    </el-upload>
  </div>

  <Teleport
    v-if="props.hasPreview"
    to="body"
  >
    <el-dialog
      v-model="showPreviewModal"
      :title="previewInfo.title"
      :show-footer="false"
      :width="props.previewWidth"
    >
      <slot
        name="previewContent"
        :data="previewInfo.data"
      >
        <img
          class="viewUploadPic"
          :src="previewInfo.data"
        />
      </slot>
    </el-dialog>
  </Teleport>
</template>

<script setup>
  import { useUpload, uploadProps, uploadEmits } from '../common/index.js';
  import { ElMessage } from 'element-plus';

  const props = defineProps(uploadProps);
  const emits = defineEmits(uploadEmits);

  const {
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
  } = useUpload(props, emits);

  const beforeUploadEle = (file) => {
    return new Promise((res, rej) => {
      const { valid, notice } = beforeUploadHandler(file);
      if (valid) {
        res(file);
      } else {
        ElMessage.error(notice);
        rej();
      }
    });
  };

  defineExpose(defineExposeConfig);
</script>
<style lang="scss" scoped>
  @use './upload.scss' as *;
</style>
