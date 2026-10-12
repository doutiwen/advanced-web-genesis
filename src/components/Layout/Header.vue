<template>
  <!-- 顶部导航栏 -->
  <header class="header">
    <!-- 左侧：Logo和系统名称 -->
    <div class="header-left">
      <!-- Logo图标 -->
      <div class="logo"></div>
      <!-- 系统名称（读取 env 的 VITE_APP_TITLE，与浏览器标签标题一致） -->
      <div class="system-name">{{ appTitle }}</div>
    </div>

    <!-- 右侧：功能按钮和用户信息 -->
    <div class="header-right">
      <!-- 用户欢迎信息 -->
      <div class="welcome-text">
        欢迎您：{{ userStore?.userInfo?.deptName || '宁夏回族自治区水运工程质量监督中心' }}
      </div>

      <!-- 功能按钮组 -->
      <button
        class="header-btn"
        @click="router.push('/')"
      >
        <el-icon :size="16">
          <HomeFilled />
        </el-icon>
        <span>回到首页</span>
      </button>

      <button
        class="header-btn"
        @click="handleChangePassword"
      >
        <el-icon :size="16">
          <Lock />
        </el-icon>
        <span>修改密码</span>
      </button>

      <button class="header-btn">
        <el-icon :size="16">
          <Help />
        </el-icon>
        <span>系统帮助</span>
      </button>

      <!-- 退出按钮 -->
      <LogoutButton />
    </div>
  </header>

  <!-- 修改密码抽屉 -->
  <ChangePasswordDrawer
    v-model="changePwdDrawerVisible"
    :userId="userStore.userInfo?.id || ''"
    @success="onChangePasswordSuccess"
  />
</template>

<script setup>
  import { ref } from "vue";
  import { useRouter } from "vue-router";
  import { HomeFilled, Lock, Help, Setting } from "@element-plus/icons-vue";
  import { useUserStore } from "@/stores/user";
  import ChangePasswordDrawer from "@/components/ChangePasswordDrawer.vue";
  import LogoutButton from "@/components/LogoutButton.vue";

  const props = defineProps<{
    collapse: boolean;
  }>();

  const emit = defineEmits<{
    (e: "toggle-sidebar"): void;
  }>();

  const router = useRouter();
  const userStore = useUserStore();
  // 顶部系统名称：来自 env 的 VITE_APP_TITLE（构建配置阶段合并根目录与 App 目录 .env）
  const appTitle =
    import.meta.env.VITE_APP_TITLE ||
    "宁夏市、县（区）交通建设工程质量责任登记系统";
  console.log(userStore.userInfo, "header");

  /**
   * 修改密码抽屉可见性
   */
  const changePwdDrawerVisible = ref(false);

  /**
   * 打开修改密码抽屉
   */
  const handleChangePassword = () => {
    changePwdDrawerVisible.value = true;
  };

  /**
   * 修改密码成功回调
   */
  const onChangePasswordSuccess = () => {
    changePwdDrawerVisible.value = false;
  };
</script>

<style scoped lang="scss">
  // 顶部导航栏容器
  .header {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 30px;
    background:
      url(../../assets/image/home/home-title.png) no-repeat center,
      linear-gradient(135deg, #1677ff 0%, #0050b3 100%);
    background-size: cover;
    color: #fff;
    position: relative;

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;

      .logo {
        width: 46px;
        height: 46px;
        display: flex;
        align-items: center;
        justify-content: center;

        background: url('../../assets/image/logo.png') no-repeat center;
        background-size: cover;
        align-self: center;
      }

      .system-name {
        font-size: 24px;
        font-weight: bold;
        color: #ffffff;
        white-space: nowrap;
      }
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;

      .welcome-text {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.95);
        margin-right: 16px;
        white-space: nowrap;
      }

      .header-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 14px;
        background: transparent;
        border: none;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 4px;
        color: rgba(255, 255, 255, 0.95);
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;

        &:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.5);
        }
      }
    }
  }
</style>
