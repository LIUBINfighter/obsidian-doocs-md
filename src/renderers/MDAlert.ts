import type { MarkedExtension } from 'marked';
import type { ThemeStyles } from './types';
import { getStyleString } from './utils';

interface AlertOptions {
  styles?: ThemeStyles;
}

/**
 * Marked.js的提示框扩展插件
 * 支持以下提示类型：
 * - 提示 (tip)：::: tip 内容 :::
 * - 警告 (warning)：::: warning 内容 :::
 * - 危险 (danger)：::: danger 内容 :::
 * - 信息 (info)：::: info 内容 :::
 */
export default function markedAlert(options: AlertOptions = {}): MarkedExtension {
  const ALERT_REGEX = /^:::\s*(tip|warning|danger|info)\s*\n([\s\S]+?)\n:::\s*(?:\n|$)/;
  
  return {
    extensions: [{
      name: 'alert',
      level: 'block',
      start(src: string) {
        return src.match(/^:::/)?.index ?? -1;
      },
      tokenizer(src: string) {
        const match = src.match(ALERT_REGEX);
        if (match) {
          return {
            type: 'alert',
            raw: match[0],
            alertType: match[1],
            text: match[2].trim()
          };
        }
        return false;
      },
      renderer(token: any) {
        const { alertType, text } = token;
        
        // 获取对应类型的样式
        let styleAttr = '';
        if (options.styles && options.styles[alertType as keyof ThemeStyles]) {
          const styleString = getStyleString(options.styles[alertType as keyof ThemeStyles]);
          styleAttr = `style="${styleString}"`;
        }
        
        // 根据类型设置图标和标题
        let icon = '💡';
        let title = '提示';
        
        switch (alertType) {
          case 'warning':
            icon = '⚠️';
            title = '警告';
            break;
          case 'danger':
            icon = '🚫';
            title = '危险';
            break;
          case 'info':
            icon = 'ℹ️';
            title = '信息';
            break;
        }
        
        return `
          <div class="alert alert-${alertType}" ${styleAttr}>
            <div class="alert-title">${icon} ${title}</div>
            <div class="alert-content">${text}</div>
          </div>
        `;
      }
    }]
  };
}
