import type { ExtendedProperties } from './types';

/**
 * 将CSS属性对象转换为样式字符串
 * @param styles CSS属性对象
 * @returns 格式化的CSS字符串
 */
export function getStyleString(styles: ExtendedProperties): string {
  if (!styles) return '';
  
  return Object.entries(styles)
    .map(([key, value]) => `${key}: ${value};`)
    .join(' ');
}

/**
 * 深度克隆对象
 * @param obj 需要克隆的对象
 * @returns 克隆后的对象
 */
export function cloneDeep<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => cloneDeep(item)) as unknown as T;
  }

  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, cloneDeep(value)])
  ) as T;
}

/**
 * 合并对象，类似于Object.assign但支持深度合并
 * @param target 目标对象
 * @param source 源对象
 * @returns 合并后的对象
 */
export function toMerged<T, U>(target: T, source: U): T & U {
  const result = {...target} as any;
  
  if (source && typeof source === 'object') {
    Object.keys(source).forEach(key => {
      const sourceValue = (source as any)[key];
      result[key] = sourceValue;
    });
  }
  
  return result;
}

/**
 * HTML特殊字符转义
 * @param text 待转义文本
 * @returns 转义后的安全文本
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;');
}
