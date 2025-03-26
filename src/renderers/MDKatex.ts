import type { MarkedExtension } from 'marked';

interface KatexOptions {
  throwOnError?: boolean;
  errorColor?: string;
  macros?: Record<string, string>;
  colorIsTextColor?: boolean;
  maxSize?: number;
  maxExpand?: number;
  fleqn?: boolean;
  trust?: boolean | ((context: any) => boolean);
  strict?: boolean | string;
  output?: string;
  nonStandard?: boolean;
}

/**
 * Marked.js的KaTeX扩展插件
 * 用于渲染数学公式
 */
export function MDKatex(options: KatexOptions = {}): MarkedExtension {
  const defaults: KatexOptions = {
    throwOnError: false,
    errorColor: '#cc0000',
    macros: {},
    colorIsTextColor: false,
    maxSize: Infinity,
    maxExpand: 1000,
    fleqn: false,
    trust: true,
    strict: 'warn',
    output: 'html',
    nonStandard: false,
  };

  const opts = { ...defaults, ...options };

  return {
    extensions: [
      // 内联数学公式 $...$
      {
        name: 'inlineMath',
        level: 'inline',
        start(src: string) {
          return src.indexOf('$');
        },
        tokenizer(src: string) {
          const match = src.match(/^\$+([^$\n]+?)\$+/);
          if (match) {
            return {
              type: 'inlineMath',
              raw: match[0],
              text: match[1].trim(),
            };
          }
          return false;
        },
        renderer(token: any) {
          try {
            // 实际项目中应导入KaTeX库并使用renderToString方法
            // 这里仅作示例
            return `<span class="katex-inline">${token.text}</span>`;
          } catch (error) {
            if (opts.throwOnError) {
              throw error;
            }
            return `<span class="katex-error" style="color:${opts.errorColor}">
              ${error instanceof Error ? error.message : String(error)}
            </span>`;
          }
        }
      },
      
      // 块级数学公式 $$...$$
      {
        name: 'blockMath',
        level: 'block',
        start(src: string) {
          return src.indexOf('$$');
        },
        tokenizer(src: string) {
          const match = src.match(/^\$\$([\s\S]+?)\$\$/);
          if (match) {
            return {
              type: 'blockMath',
              raw: match[0],
              text: match[1].trim(),
            };
          }
          return false;
        },
        renderer(token: any) {
          try {
            // 实际项目中应导入KaTeX库并使用renderToString方法
            return `<div class="katex-block">${token.text}</div>`;
          } catch (error) {
            if (opts.throwOnError) {
              throw error;
            }
            return `<div class="katex-error" style="color:${opts.errorColor}">
              ${error instanceof Error ? error.message : String(error)}
            </div>`;
          }
        }
      }
    ]
  };
}
