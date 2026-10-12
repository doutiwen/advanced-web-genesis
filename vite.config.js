import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import ElementPlusStyle from 'unplugin-element-plus/vite';
import { ElementPlusResolver, AntDesignVueResolver } from 'unplugin-vue-components/resolvers';
import vueJsx from '@vitejs/plugin-vue-jsx';
import VueSetupExtend from 'vite-plugin-vue-setup-extend';
import compressPlugin from 'vite-plugin-compression';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  /*
    当前生效的 UI 库实现，取值 'ele' | 'ant'（见 .env 中的 VITE_UI_LIB）
    它决定了组件入口里 './core/@ui/...' 解析到哪个实现目录，以及 UI 能力门面 '@ui-kit' 指向哪个文件。
    未被选中的实现目录不会进入模块图，因此其对应的 UI 库代码会被物理剔除（而非打包后再 tree-shake）。
    注意这里用 __dirname 而非 process.cwd()，以保证从任意工作目录执行 vite 都能定位到 .env
  */
  const UI_LIB = loadEnv(mode, __dirname).VITE_UI_LIB || 'ele';
  return {
    server: {
      host: '0.0.0.0',
      port: 8088,
      proxy: {
        '/api': {
          target: '',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    plugins: [
      vue(),
      /*
        按需引入 element-plus 样式：为手写的 import { ElXxx } from 'element-plus'
        自动补上 element-plus/es/components/<xxx>/style/css
        用于兜住 resolver 覆盖不到的场景——手动导入的组件（ElMessage、ElDialog 等）和
        通过 h() 渲染的组件，unplugin-* 的 resolver 不会为已显式导入的标识符注入样式
      */
      ElementPlusStyle(),
      //自动引入ES模块
      AutoImport({
        include: [
          /\.[tj]sx?$/, // .ts, .tsx, .js, .jsx
          /\.vue$/,
          /\.vue\?vue/, // .vue
        ],
        //引入index.js中的模块
        fileFilter: (filePath) => {
          return /\.(js|ts)$/.test(filePath) && !filePath.includes('node_modules');
        },
        resolvers: [ElementPlusResolver()], //自动引入element-plus组件
        imports: ['vue', 'vuex', 'vue-router'],
        dirs: ['./src/utils', './src/api'],
        eslintrc: {
          enabled: true,
        },
      }),
      //自动按需引入vue组件
      Components({
        resolvers: [
          ElementPlusResolver(),
          AntDesignVueResolver({
            importStyle: false,
            resolveIcons: true,
          }),
        ], //自动引入element-plus、antD组件
        directoryAsNamespace: true, //解决命名冲突
        include: [/\.vue$/, /\.vue\?vue/, /\.jsx$/, /\.tsx$/],
      }),
      vueJsx({
        transformOn: true,
        mergeProps: true,
      }), //vue文件中使用jsx
      VueSetupExtend(), //支持在setup标签中直接添加vue组件name属性
      command === 'serve' &&
        mode === 'prod' &&
        compressPlugin({
          ext: '.gz',
          algorithm: 'gzip',
          deleteOriginFile: true,
        }), //产品模式下开启gzip压缩
    ].filter((i) => !!i),
    resolve: {
      /*
        必须用数组形式：UI 实现目录重定向依赖正则匹配，而对象形式的 key 只能是字符串，
        Vite 的字符串别名要求说明符以别名开头，无法命中 './core/@ui/...' 这类相对路径中间的片段。
        顺序上把最具体的放前面。
      */
      alias: [
        {
          // 组件入口中的 UI 实现目录重定向：'./core/@ui/xxx' → './core/<ele|ant>/xxx'
          // 锚定到 /core/@ui/ 而非裸 @ui，避免误伤 node_modules 中同名的 scoped 包
          find: /\/core\/@ui\//,
          replacement: `/core/${UI_LIB}/`,
        },
        {
          // UI 能力门面：业务代码永远只写 import ui from '@ui-kit'，由此处决定指向哪个库的实现
          find: /^@ui-kit$/,
          replacement: resolve(__dirname, `src/ui/${UI_LIB}.js`),
        },
        { find: '@', replacement: resolve(__dirname, 'src') },
        {
          find: 'request',
          replacement: resolve(
            __dirname,
            'src',
            mode === 'mock' ? './api/requestMock/index.js' : './api/request.js'
          ),
        }, //接口请求方法，根据是否为mock模式来引入不同的文件
      ],
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
    },
    css: {
      preprocessorOptions: {
        scss: {
          //自动引入全局scss变量定义文件
          additionalData: '@use "/src/styles/vars.scss" as *;',
          charset: false,
          api: 'modern',
        },
      },
      postcss: {
        plugins: [
          {
            postcssPlugin: 'internal:charset-removal',
            AtRule: {
              charset: (atRule) => {
                if (atRule.name === 'charset') {
                  atRule.remove();
                }
              },
            },
          },
        ],
      },
    },
    assetsInclude: [
      '**/*.doc',
      '**/*.docx',
      '**/*.xls',
      '**/*.xlsx',
      '**/*.7z',
      '**/*.zip',
      '**/*.rar',
      '**/*.txt',
      '**/*.pdf',
    ],
    build: {
      outDir: 'dist', // 打包输出目录
      assetsDir: 'assets', // 静态资源目录
      sourcemap: false, // 生产环境通常关闭 sourcemap 以保护源码并减小体积
      minify: 'terser', // 使用 terser 压缩 (比 esbuild 压缩率更高，但速度稍慢)
      cssCodeSplit: true, // CSS 代码分割
      chunkSizeWarningLimit: 1500, // 增大 chunk 警告限制
      rollupOptions: {
        output: {
          manualChunks: {
            'vue-vendor': ['vue', 'vue-router', 'pinia'], // 框架相关库单独打包
            // 大型 UI 库单独打包 (按需引入时可选)，跟随 VITE_UI_LIB 决定收哪个库
            'ui-vendor': [UI_LIB === 'ant' ? 'ant-design-vue' : 'element-plus'],
          },
          chunkFileNames: 'assets/chunk/[hash]_[name].js',
          assetFileNames: (assetInfo) => {
            /* 
              type assetInfo={
                fileName: string;
                name?: string; //模块名称，assetsInclude中声明的类型为绝对地址
                source: string | Uint8Array;
                type: 'asset';
              }
            */
            if (assetInfo.name.includes('/src/asyncRequestApi/mockFile/mock')) {
              return 'assets/static/mockFile/[name].[ext]';
            } else {
              return 'assets/static/[ext]/[hash]_[name].[ext]';
            }
          },
          entryFileNames: 'assets/entry/[name].js',
        },
      },
      // Terser 压缩配置
      terserOptions: {
        compress: {
          drop_console: true, // 生产环境移除 console
          drop_debugger: true, // 移除 debugger
        },
      },
    },
  };
});
