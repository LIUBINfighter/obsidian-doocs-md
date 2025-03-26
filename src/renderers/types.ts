import type { PropertiesHyphen } from 'csstype';
import type { ReadTimeResults } from 'reading-time';

/**
 * 扩展CSS属性类型
 */
export type ExtendedProperties = PropertiesHyphen & Record<string, string | number>;

/**
 * 主题样式映射
 */
export interface ThemeStyles {
  // 基础文本元素
  p: ExtendedProperties;
  h1: ExtendedProperties;
  h2: ExtendedProperties;
  h3: ExtendedProperties;
  h4: ExtendedProperties;
  h5: ExtendedProperties;
  h6: ExtendedProperties;
  
  // 内联元素
  em: ExtendedProperties;
  strong: ExtendedProperties;
  codespan: ExtendedProperties;
  link: ExtendedProperties;
  wx_link: ExtendedProperties;
  
  // 块级元素
  blockquote: ExtendedProperties;
  blockquote_p: ExtendedProperties;
  hr: ExtendedProperties;
  code: ExtendedProperties;
  code_pre: ExtendedProperties;
  
  // 列表元素
  ul: ExtendedProperties;
  ol: ExtendedProperties;
  listitem: ExtendedProperties;
  
  // 表格元素
  table: ExtendedProperties;
  thead: ExtendedProperties;
  tr: ExtendedProperties;
  td: ExtendedProperties;
  
  // 多媒体元素
  figure: ExtendedProperties;
  figcaption: ExtendedProperties;
  image: ExtendedProperties;
  
  // 容器和特殊元素
  container: ExtendedProperties;
  footnotes: ExtendedProperties;
  
  // 提示块元素
  tip: ExtendedProperties;
  warning: ExtendedProperties;
  danger: ExtendedProperties;
  info: ExtendedProperties;
}

/**
 * 主题配置
 */
export interface Theme {
  base: PropertiesHyphen;
  block: Record<string, PropertiesHyphen>;
  inline: Record<string, PropertiesHyphen>;
}

/**
 * 渲染器选项
 */
export interface IOpts {
  theme: Theme;
  fonts: string;
  size: string;
  isUseIndent: boolean;
  countStatus?: boolean;
  citeStatus?: boolean;
  legend?: string;
}

/**
 * Front Matter解析结果
 */
export interface ParseResult {
  yamlData: Record<string, any>;
  markdownContent: string;
  readingTime: ReadTimeResults;
}
