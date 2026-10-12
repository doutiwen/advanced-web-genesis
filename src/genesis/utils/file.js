/**
 * 导出数据为CSV文件
 * @param data - 数据数组
 * @param filename - 文件名（不含扩展名）
 * @param headers - 表头映射（key为数据字段，value为显示名称）
 */
export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  headers: Record<string, string>
): void {
  const headerKeys = Object.keys(headers);
  // 生成表头行
  const headerRow = headerKeys.map((key) => headers[key]).join(',');

  // 生成数据行（处理特殊字符转义）
  const rows = data.map((item) => {
    return headerKeys
      .map((key) => {
        const value = item[key];
        if (value === null || value === undefined) return '';
        const strValue = String(value);
        // 包含逗号、引号或换行符时，用双引号包裹并转义内部引号
        if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
          return `"${strValue.replace(/"/g, '""')}"`;
        }
        return strValue;
      })
      .join(',');
  });

  // 组合CSV内容并下载
  const csvContent = `${headerRow}\n${rows.join('\n')}`;
  downloadFile(csvContent, `${filename}.csv`, 'text/csv');
}

/**
 * 导出数据为JSON文件
 * @param data - 任意数据
 * @param filename - 文件名（不含扩展名）
 */
export function exportToJSON(data: unknown, filename: string): void {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, `${filename}.json`, 'application/json');
}

/**
 * 通用文件下载函数（通过Blob创建临时下载链接）
 * @param content - 文件内容
 * @param filename - 文件名
 * @param mimeType - MIME类型
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 从CSV文件导入数据
 * @param file - CSV文件对象
 * @returns 解析后的数据数组
 */
export function importFromCSV(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const lines = content.split('\n').filter((line) => line.trim());
        if (lines.length === 0) {
          resolve([]);
          return;
        }

        // 解析表头
        const headers = lines[0].split(',').map((h) => h.trim());
        const data: Record<string, unknown>[] = [];

        // 解析数据行
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          const row: Record<string, unknown> = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          data.push(row);
        }

        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsText(file);
  });
}

/**
 * 解析CSV单行（处理引号包裹的字段）
 * @param line - CSV行字符串
 * @returns 字段值数组
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      // 双引号处理：连续两个双引号表示一个转义的双引号
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        // 切换引号状态
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // 逗号分隔（不在引号内时）
      result.push(current);
      current = '';
    } else {
      // 普通字符
      current += char;
    }
  }
  result.push(current);
  return result;
}