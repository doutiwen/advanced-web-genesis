import { defineConfig } from 'eslint/config';
import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import eslintPluginVue from 'eslint-plugin-vue';

export default defineConfig([
  {
    extends: [
      eslint.configs.recommended,
      ...eslintPluginVue.configs['flat/recommended'],
      //'./.eslintrc-auto-import.json',
    ],
    plugins: {
      prettier: eslintConfigPrettier,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        defineProps: 'readonly',
        defineEmits: 'readonly',
        defineExpose: 'readonly',
        withDefaults: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'vue/attributes-order': 'off',
      'vue/attribute-hyphenation': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/html-self-closing': 'off',
      'vue/html-indent': 'off',
      'vue/require-default-prop': 'off',
      'vue/no-unused-vars': 'off',
      'no-console': 'off',
      'no-empty': 0,
      'comma-dangle': 0,
      'no-const-assign': 2,
      'no-dupe-class-members': 2,
      'no-duplicate-case': 2,
      'no-self-compare': 2,
      'accessor-pairs': 2,
      'constructor-super': 2,
      'new-cap': [
        2,
        {
          newIsCap: true,
          capIsNew: false,
        },
      ],
      'new-parens': 2,
      'no-array-constructor': 2,
      'no-class-assign': 2,
      'no-cond-assign': 2,
      'linebreak-style': ['off', 'windows'],
      'import/no-unresolved': 'off',
      'import/no-absolute-path': 'off',
      'import/extensions': 'off',
      'no-param-reassign': 'off',
      'import/no-extraneous-dependencies': 'off',
      'no-underscore-dangle': 'off',
      'no-plusplus': 'off',
      semi: 'warn',
      'vue/multi-word-component-names': 'off',
      // 子组件绑定v-model
      'vue/no-mutating-props': 0,
      'vue/no-unused-components': 0,
      'vue/singleline-html-element-content-newline': 'off',
      'vue/no-use-v-if-with-v-for': 'off',
    },
    ignores: ['node_modules/*', 'index.html'],
  },
]);
