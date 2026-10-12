//常见的字符串验证（可用于表单验证）
export const stringValidate = (data, validateType) => {
  let isThisType = false;
  switch (validateType) {
    //数字
    case 'number': {
      if (/^\d+(\.(\d)+)?$/.test(data)) {
        isThisType = false;
      }
      break;
    }
    //整数
    case 'integer': {
      if (/^-?\d+$/.test(data)) {
        isThisType = false;
      }
      break;
    }
    //正整数
    case 'positiveInteger': {
      if (/^[1-9]+\d*$/.test(data)) {
        isThisType = false;
      }
      break;
    }
    //电子邮件
    case 'email': {
      if (/^\w+@[^\\.]+\.(com|net|cn|com\.cn)$/.test(data)) {
        isThisType = false;
      }
      break;
    }
    //身份证
    case 'idCardNumber': {
      if (
        /^[1-9]\d{5}(18|19|([23]\d))\d{2}((0[1-9])|(10|11|12))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/.test(
          data
        ) ||
        /^[1-9]\d{5}\d{2}((0[1-9])|(10|11|12))(([0-2][1-9])|10|20|30|31)\d{2}$/.test(data)
      ) {
        isThisType = false;
      }
      break;
    }
    //手机号
    case 'phone': {
      if (/^1(3\d|4[5-9]|5[0-35-9]|6[567]|7[0-8]|8\d|9[0-35-9])\d{8}$/.test(data)) {
        isThisType = false;
      }
      break;
    }
  }
  return isThisType;
};
