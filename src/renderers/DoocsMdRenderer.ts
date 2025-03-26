import type { Renderer, RendererObject, Tokens } from 'marked';
import type { IOpts, ThemeStyles, ParseResult } from './types';

import frontMatter from 'front-matter';
import { marked } from 'marked';
import readingTime from 'reading-time';
import hljs from 'highlight.js';
import mermaid from 'mermaid';

import { cloneDeep, toMerged, escapeHtml, getStyleString } from './utils';
import { MDKatex } from './MDKatex';
import markedAlert from './MDAlert';

// 初始化marked配置
marked.setOptions({
  breaks: true,  // 启用换行符转换
});

/**
 * 构建主题样式
 * @param _theme - 基础主题配置
 * @param fonts - 字体设置
 * @param size - 字体大小
 * @param isUseIndent - 是否使用首行缩进
 * @returns 合并后的主题样式对象
 */
function buildTheme({ theme: _theme, fonts, size, isUseIndent }: IOpts): ThemeStyles {
  const theme = cloneDeep(_theme);
  const base = toMerged(theme.base, {
    'font-family': fonts,
    'font-size': size,
  });

  if (isUseIndent) {
    theme.block.p = {
      'text-indent': `2em`,
      ...theme.block.p,
    };
  }

  const mergeStyles = (styles: Record<string, any>): Record<string, any> =>
    Object.fromEntries(
      Object.entries(styles).map(([ele, style]) => [ele, toMerged(base, style)]),
    );
  return {
    ...mergeStyles(theme.inline),
    ...mergeStyles(theme.block),
  } as ThemeStyles;
}

/**
 * 构建额外CSS样式
 * @returns 包含额外样式的HTML字符串
 */
function buildAddition(): string {
  return `
    <style>
      .preview-wrapper pre::before {
        position: absolute;
        top: 0;
        right: 0;
        color: #ccc;
        text-align: center;
        font-size: 0.8em;
        padding: 5px 10px 0;
        line-height: 15px;
        height: 15px;
        font-weight: 600;
      }
    </style>
  `;
}

/**
 * 获取样式字符串
 * @param styleMapping - 主题样式映射
 * @param tokenName - Markdown token名称
 * @param addition - 额外样式字符串
 * @returns 组合后的样式属性字符串
 */
function getStyles(styleMapping: ThemeStyles, tokenName: string, addition: string = ``): string {
  const dict = styleMapping[tokenName as keyof ThemeStyles];
  if (!dict) {
    return ``;
  }
  const styles = getStyleString(dict);
  return `style="${styles}${addition}"`;
}

/**
 * 构建脚注数组HTML
 * @param footnotes - 脚注数组[索引,标题,链接]
 * @returns 格式化后的脚注HTML
 */
function buildFootnoteArray(footnotes: [number, string, string][]): string {
  return footnotes
    .map(([index, title, link]) =>
      link === title
        ? `<code style="font-size: 90%; opacity: 0.6;">[${index}]</code>: <i style="word-break: break-all">${title}</i><br/>`
        : `<code style="font-size: 90%; opacity: 0.6;">[${index}]</code> ${title}: <i style="word-break: break-all">${link}</i><br/>`,
    )
    .join(`\n`);
}

/**
 * 根据legend规则转换文本
 * @param legend - 转换规则
 * @param text - 备选文本
 * @param title - 标题文本
 * @returns 转换后的文本
 */
function transform(legend: string, text: string | null, title: string | null): string {
  const options = legend.split(`-`);
  for (const option of options) {
    if (option === `alt` && text) {
      return text;
    }
    if (option === `title` && title) {
      return title;
    }
  }
  return ``;
}

// macOS窗口按钮风格SVG图标
const macCodeSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" width="45px" height="13px" viewBox="0 0 450 130">
    <ellipse cx="50" cy="65" rx="50" ry="52" stroke="rgb(220,60,54)" stroke-width="2" fill="rgb(237,108,96)" />
    <ellipse cx="225" cy="65" rx="50" ry="52" stroke="rgb(218,151,33)" stroke-width="2" fill="rgb(247,193,81)" />
    <ellipse cx="400" cy="65" rx="50" ry="52" stroke="rgb(27,161,37)" stroke-width="2" fill="rgb(100,200,86)" />
  </svg>
`.trim();

/**
 * 解析Front Matter和Markdown内容
 * @param markdownText - 原始Markdown文本
 * @returns 解析后的对象
 */
function parseFrontMatterAndContent(markdownText: string): ParseResult {
  try {
    const parsed = frontMatter(markdownText);
    const yamlData = parsed.attributes;
    const markdownContent = parsed.body;

    const readingTimeResult = readingTime(markdownContent);

    return {
      yamlData: yamlData as Record<string, any>,
      markdownContent,
      readingTime: readingTimeResult,
    };
  }
  catch (error) {
    console.error(`Error parsing front-matter:`, error);
    return {
      yamlData: {},
      markdownContent: markdownText,
      readingTime: readingTime(markdownText),
    };
  }
}

/**
 * 初始化Markdown渲染器
 * @param opts - 渲染器配置选项
 * @returns 包含渲染器方法和状态管理的对象
 */
export function initRenderer(opts: IOpts) {
  const footnotes: [number, string, string][] = [];
  let footnoteIndex: number = 0;
  let styleMapping: ThemeStyles = buildTheme(opts);
  let codeIndex: number = 0;
  let listIndex: number = 0;
  let isOrdered: boolean = false;

  /**
   * 获取组合样式字符串
   */
  function styles(tag: string, addition: string = ``): string {
    return getStyles(styleMapping, tag, addition);
  }

  /**
   * 生成带样式的HTML内容
   */
  function styledContent(styleLabel: string, content: string, tagName?: string): string {
    const tag = tagName ?? styleLabel;
    const headingAttr = /^h\d$/.test(tag) ? `data-heading="true"` : ``;
    return `<${tag} ${headingAttr} ${styles(styleLabel)}>${content}</${tag}>`;
  }

  /**
   * 添加脚注引用
   */
  function addFootnote(title: string, link: string): number {
    footnotes.push([++footnoteIndex, title, link]);
    return footnoteIndex;
  }

  /**
   * 重置渲染器状态
   */
  function reset(newOpts: Partial<IOpts>): void {
    footnotes.length = 0;     // 清空脚注数组
    footnoteIndex = 0;        // 重置脚注索引
    setOptions(newOpts);      // 应用新配置
  }

  /**
   * 更新配置选项
   */
  function setOptions(newOpts: Partial<IOpts>): void {
    opts = { ...opts, ...newOpts };               // 合并配置
    styleMapping = buildTheme(opts);              // 重建主题映射
    marked.use(markedAlert({ styles: styleMapping })); // 更新marked插件
  }

  /**
   * 构建阅读时间统计组件
   */
  function buildReadingTime(readingTime: ReadTimeResults): string {
    if (!opts.countStatus || !readingTime.words) {
      return ``; // 配置关闭或无有效数据时返回空
    }
    return `
      <blockquote ${styles(`blockquote`)}>
        <p ${styles(`blockquote_p`)}>
          字数 ${readingTime?.words}，阅读大约需 ${Math.ceil(readingTime?.minutes)} 分钟
        </p>
      </blockquote>
    `;
  }

  /**
   * 构建脚注区块
   */
  const buildFootnotes = () => {
    if (!footnotes.length) return ``; // 无脚注时跳过
    
    return styledContent(`h4`, `引用链接`) +       // 标题
           styledContent(`footnotes`, buildFootnoteArray(footnotes), `p`); // 内容列表
  };

  /**
   * Marked.js自定义渲染器配置
   */
  const renderer: RendererObject = {
    // 标题元素渲染
    heading({ tokens, depth }: Tokens.Heading) {
      const text = this.parser.parseInline(tokens);
      const tag = `h${depth}`;
      return styledContent(tag, text);
    },

    // 段落元素渲染
    paragraph({ tokens }: Tokens.Paragraph): string {
      const text = this.parser.parseInline(tokens);
      const isFigureImage = text.includes(`<figure`) && text.includes(`<img`);
      const isEmpty = text.trim() === ``;
      if (isFigureImage || isEmpty) {
        return text;
      }
      return styledContent(`p`, text);
    },

    // 引用块元素渲染
    blockquote({ tokens }: Tokens.Blockquote): string {
      let text = this.parser.parse(tokens);
      text = text.replace(/<p .*?>/g, `<p ${styles(`blockquote_p`)}>`);
      return styledContent(`blockquote`, text);
    },

    // 代码块元素渲染
    code({ text, lang = `` }: Tokens.Code): string {
      if (lang.startsWith(`mermaid`)) {
        clearTimeout(codeIndex);
        codeIndex = setTimeout(() => {
          mermaid.run();
        }, 0) as any as number;
        return `<pre class="mermaid">${text}</pre>`;
      }
      const langText = lang.split(` `)[0];
      const language = hljs.getLanguage(langText) ? langText : `plaintext`;
      let highlighted = hljs.highlight(text, { language }).value;
      // tab to 4 spaces
      highlighted = highlighted.replace(/\t/g, `    `);
      highlighted = highlighted
        .replace(/\r\n/g, `<br/>`)
        .replace(/\n/g, `<br/>`)
        .replace(/(>[^<]+)|(^[^<]+)/g, str => str.replace(/\s/g, `&nbsp;`));
      const span = `<span class="mac-sign" style="padding: 10px 14px 0;" hidden>${macCodeSvg}</span>`;
      const code = `<code class="language-${lang}" ${styles(`code`)}>${highlighted}</code>`;
      return `<pre class="hljs code__pre" ${styles(`code_pre`)}>${span}${code}</pre>`;
    },

    // 行内代码元素渲染
    codespan({ text }: Tokens.Codespan): string {
      const escapedText = escapeHtml(text);
      return styledContent(`codespan`, escapedText, `code`);
    },

    // 列表项元素渲染
    listitem(item: Tokens.ListItem): string {
      const prefix = isOrdered ? `${listIndex + 1}. ` : `• `;
      const content = item.tokens.map(t => (this[t.type as keyof Renderer] as <T>(token: T) => string)(t)).join(``);
      return styledContent(`listitem`, `${prefix}${content}`, `li`);
    },

    // 列表容器元素渲染
    list({ ordered, items, start = 1 }: Tokens.List): string {
      const listItems = [];
      for (let i = 0; i < items.length; i++) {
        isOrdered = ordered;
        listIndex = Number(start) + i - 1;
        const item = items[i];
        listItems.push(this.listitem(item));
      }
      const label = ordered ? `ol` : `ul`;
      return styledContent(label, listItems.join(``));
    },

    // 图片元素渲染
    image({ href, title, text }: Tokens.Image): string {
      const subText = styledContent(`figcaption`, transform(opts.legend!, text, title));
      const figureStyles = styles(`figure`);
      const imgStyles = styles(`image`);
      return `<figure ${figureStyles}><img ${imgStyles} src="${href}" title="${title}" alt="${text}"/>${subText}</figure>`;
    },

    // 链接元素渲染
    link({ href, title, text, tokens }: Tokens.Link): string {
      const parsedText = this.parser.parseInline(tokens);
      if (href.startsWith(`https://mp.weixin.qq.com`)) {
        return `<a href="${href}" title="${title || text}" ${styles(`wx_link`)}>${parsedText}</a>`;
      }
      if (href === text) {
        return parsedText;
      }
      if (opts.citeStatus) {
        const ref = addFootnote(title || text, href);
        return `<span ${styles(`link`)}>${parsedText}<sup>[${ref}]</sup></span>`;
      }
      return styledContent(`link`, parsedText, `span`);
    },

    // 粗体元素渲染
    strong({ tokens }: Tokens.Strong): string {
      return styledContent(`strong`, this.parser.parseInline(tokens));
    },

    // 斜体元素渲染
    em({ tokens }: Tokens.Em): string {
      return styledContent(`em`, this.parser.parseInline(tokens), `span`);
    },

    // 表格元素渲染
    table({ header, rows }: Tokens.Table): string {
      const headerRow = header
        .map(cell => this.tablecell(cell))
        .join(``);
      const body = rows
        .map((row) => {
          const rowContent = row
            .map(cell => this.tablecell(cell))
            .join(``);
          return styledContent(`tr`, rowContent);
        })
        .join(``);
      return `
        <section style="padding:0 8px; max-width: 100%; overflow: auto">
          <table class="preview-table">
            <thead ${styles(`thead`)}>${headerRow}</thead>
            <tbody>${body}</tbody>
          </table>
        </section>
      `;
    },

    // 表格单元格元素渲染
    tablecell(token: Tokens.TableCell): string {
      const text = this.parser.parseInline(token.tokens);
      return styledContent(`td`, text);
    },

    // 水平分割线元素渲染
    hr(_: Tokens.Hr): string {
      return styledContent(`hr`, ``);
    },
  };

  // 应用渲染器配置
  marked.use({ renderer });
  marked.use(MDKatex({ nonStandard: true }));
  marked.use(markedAlert({ styles: styleMapping }));

  // 返回渲染器对象
  return {
    buildAddition,
    buildFootnotes,
    setOptions,
    reset,
    parseFrontMatterAndContent,
    buildReadingTime,
    createContainer(content: string) {
      return styledContent(`container`, content, `section`);
    },
  };
}
