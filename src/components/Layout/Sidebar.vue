<template>
  <!-- 侧边栏容器 -->
  <aside
    class="sidebar"
    :class="{
      'sidebar-collapse': collapse,
    }"
  >
    <el-scrollbar>
      <!-- 菜单区域 -->
      <el-menu
        :default-active="activeMenu"
        :collapse="collapse"
        mode="vertical"
        background-color="#ffffff"
        text-color="#333333"
        active-text-color="#1677ff"
        :unique-opened="true"
      >
        <template
          v-for="menu in menuList"
          :key="menu.id"
        >
          <!-- 有子菜单的情况 -->
          <el-sub-menu
            v-if="menu.children && menu.children.length > 0"
            :index="menu.path"
          >
            <template #title>
              <el-icon :size="18">
                <component :is="iconComponents[menu.icon] || Tools" />
              </el-icon>
              <span>
                {{ menu.name }}
              </span>
            </template>
            <el-menu-item
              v-for="child in menu.children"
              :key="child.id"
              :index="child.path"
              :class="{
                'is-active': isActive(child.path),
              }"
              @click="handleMenuClick(child)"
            >
              <el-icon :size="16">
                <component :is="iconComponents[child.icon] || Document" />
              </el-icon>
              <span>
                {{ child.name }}
              </span>
            </el-menu-item>
          </el-sub-menu>

          <!-- 无子菜单的情况 -->
          <el-menu-item
            v-else
            :index="menu.path"
            :class="{
              'is-active': isActive(menu.path),
            }"
            @click="handleMenuClick(menu)"
          >
            <el-icon :size="18">
              <component :is="iconComponents[menu.icon] || Monitor" />
            </el-icon>
            <span>{{ menu.name }}</span>
          </el-menu-item>
        </template>
      </el-menu>
    </el-scrollbar>
  </aside>
</template>

<script setup>
  import { computed } from 'vue';
  import { useRouter, useRoute } from 'vue-router';
  import {
    Monitor,
    Setting,
    User,
    UserFilled,
    DataLine,
    Document,
    Tools,
    OfficeBuilding,
    Ticket,
    Files,
    EditPen,
    Notebook,
    HomeFilled,
    Menu,
  } from '@element-plus/icons-vue';
  import type { MenuItem } from '@common/types';
  import { useUserStore } from '@/stores/user';
  import { usePermissionStore } from '@/stores/permission';
  import { getRoleButton } from '@/api/login';
  import { setModuleSessionStorage } from '@/utils/storage';

  // 定义按钮类型接口
  interface MenuButton {
    id: string;
    name: string;
    code: string;
    target: number;
  }

  // 定义菜单按钮存储格式
  interface MenuButtons {
    navButtons: MenuButton[];
    inlineButtons: MenuButton[];
    tabButtons: MenuButton[];
  }

  const props = defineProps<{
    collapse: boolean;
    menuList: MenuItem[];
  }>();
  const permissionStore = usePermissionStore();
  const userStore = useUserStore();
  const router = useRouter();
  const route = useRoute();

  // 计算当前激活的菜单
  const activeMenu = computed(() => route.path);

  // 图标组件映射表
  const iconComponents: Record<string, any> = {
    Monitor,
    Setting,
    User,
    UserFilled,
    DataLine,
    Document,
    Tools,
    OfficeBuilding,
    Ticket,
    Files,
    EditPen,
    Notebook,
    HomeFilled,
    Menu,
  };

  /**
   * 判断菜单是否激活
   * @param path - 菜单路径
   * @returns 是否激活
   */
  const isActive = (path: string): boolean => {
    return route.path === path || route.path.startsWith(path + '/');
  };

  /**
   * 加载菜单按钮权限
   * @param userId - 用户ID
   * @param menuId - 菜单ID
   */
  const loadMenuButtons = async (userId: string, menuId: string): Promise<void> => {
    try {
      // 调用接口获取菜单按钮列表
      const res: any = await getRoleButton(userId, menuId);

      if (res.code === 200 || res.code === 0) {
        const buttons: MenuButton[] = res.data || [];

        // 根据 target 字段分类按钮
        // target=1: navButtons (顶部/导航栏按钮)
        // target=2: inlineButtons (行内/列表操作按钮)
        // target=3: tabButtons (标签页按钮)
        // const categorizedButtons: MenuButtons = {
        //   navButtons: buttons.filter(btn => btn.target === 1),
        //   inlineButtons: buttons.filter(btn => btn.target === 2),
        //   tabButtons: buttons.filter(btn => btn.target === 3)
        // }

        // 存储到 sessionStorage
        setModuleSessionStorage('curMenuButtons', buttons);

        // 存储到 Pinia (存储到当前菜单ID，便于组件访问)
        // userStore.currentMenuButtons = buttons
        permissionStore.setButtonList(buttons);
        console.log(`菜单 [${menuId}] 的按钮权限已加载:`, buttons);
      }
    } catch (error) {
      console.error(`加载菜单 [${menuId}] 按钮权限失败:`, error);
    }
  };

  /**
   * 处理菜单点击事件
   * 1. 获取用户ID和菜单ID
   * 2. 调用按钮接口获取权限
   * 3. 分类存储按钮权限
   * 4. 跳转到目标页面
   * @param item - 菜单项
   */
  const handleMenuClick = async (item: any): void => {
    console.log(item, 'handleMenuClick');
    console.log(userStore.userInfo, '用户信息');

    // 获取用户ID
    const roleId = userStore.userInfo?.roleId || '';
    // 获取菜单ID
    const menuId = item.id || '';

    // 如果存在菜单ID，则加载该菜单的按钮权限
    if (menuId && roleId) {
      await loadMenuButtons(roleId, menuId);
    }
    // 跳转到目标页面
    router.push(item.path);
  };
</script>

<style scoped lang="scss"></style>
