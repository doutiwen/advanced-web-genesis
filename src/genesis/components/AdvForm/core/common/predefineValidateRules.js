const predefineValidateRules = {
  required: {
    notice(label) {
      return `${label}是必填项`;
    },
  },

  intNumber: {
    pattern: /^\d+$/,
    notice(label) {
      return `${label}必须是整数`;
    },
  },

  email: {
    pattern: /^\w+@\w+\.(com|net|cn|com\.cn)$/g,
    notice(label) {
      return '必须是正确的邮箱格式';
    },
  },

  phone: {
    // 手机号（沿用原 11 位号段枚举）或座机（区号-号码，如 0951-6732639）二选一。
    // 座机分支与项目既有约定 contactPhoneRegex 保持同一形态：
    // 0 + 2~3 位区号 + 可选 '-' + 7~8 位号码（见 LabRec/Filing/components/TestInstInfo/Regex.ts 等）
    pattern:
      /^(?:(13[0-9]|14[01456879]|15[0-35-9]|16[2567]|17[0-8]|18[0-9]|19[0-35-9])\d{8}|0\d{2,3}-?\d{7,8})$/g,
    notice(label) {
      return '必须是正确的手机号码或座机号码格式';
    },
  },

  peopleIdNum: {
    validateFn(rule, value, formData) {
      if (
        /^[1-9]\d{5}(18|19|([23]\d))\d{2}((0[1-9])|(10|11|12))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/.test(
          value
        ) ||
        /^[1-9]\d{5}\d{2}((0[1-9])|(10|11|12))(([0-2][1-9])|10|20|30|31)\d{2}$/.test(value)
      ) {
        return true;
      } else {
        return false;
      }
    },
    notice(label) {
      return '必须是正确的身份证号码';
    },
  },

  number({ min, max }) {
    return {
      validateFn(rule, value, formData) {
        // min 和 max 均未定义时，跳过校验
        if (min === undefined && max === undefined) {
          return true;
        }
        // 将 value 转为数字，避免字符串与数字直接比较
        const numValue = Number(value);
        // 仅有 min 约束时，校验 value >= min
        if (min !== undefined && numValue < min) {
          return false;
        }
        // 仅有 max 约束时，校验 value <= max
        if (max !== undefined && numValue > max) {
          return false;
        }
        return true;
      },
      notice(label) {
        if (min !== undefined && max !== undefined) {
          return `${label}必须在${min}到${max}之间`;
        }
        if (min !== undefined) {
          return `${label}不能小于${min}`;
        }
        if (max !== undefined) {
          return `${label}不能大于${max}`;
        }
        return '';
      },
    };
  },

  // 验证两个字段值是否一致，targetFieldName: 目标字段名
  sameWith({ targetFieldName }) {
    return {
      validateFn(rule, value, formData) {
        return value === formData[targetFieldName];
      },
      notice(label) {
        return `${label}输入不一致`;
      },
    };
  },
};

export default predefineValidateRules;
