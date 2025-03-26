import { marked } from 'marked';
import hljs from 'highlight.js';

/**
 * 微信公众号格式解析器
 * 负责将Markdown转换为微信公众号适用的HTML格式
 */
export class WechatParser {
    // 默认配置
    private static readonly DEFAULT_CONFIG = {
        // 微信允许的字体大小范围 (px)
        headingSizes: {
            h1: 24,
            h2: 20,
            h3: 18,
            h4: 16,
            h5: 14,
            h6: 13
        },
        
        // 颜色配置
        colors: {
            text: '#3f3f3f',
            heading: '#1e1e1e',
            link: '#576b95', // 微信链接蓝
            code: '#d14',
            blockquote: '#888',
            codeBackground: '#f8f8f8',
            tableHeaderBg: '#f8f8f8'
        },
        
        // 基础样式配置
        styles: {
            fontSize: 15,
            lineHeight: 1.75,
            paragraphSpacing: 20
        }
    };
    
    /**
     * 转义HTML特殊字符
     * 增加类型检查以处理非字符串输入
     */
    private static escapeHtml(text: any): string {
        // 增加类型检查，确保text是字符串
        if (typeof text !== 'string') {
            console.warn("WechatParser.escapeHtml接收到非字符串输入:", text);
            return String(text || ''); // 转换为字符串或使用空字符串
        }
        
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    /**
     * 处理代码高亮
     * 增加更健壮的错误处理
     */
    private static highlightCode(code: any, language: string): string {
        // 确保code是字符串
        if (typeof code !== 'string') {
            console.warn("WechatParser.highlightCode接收到非字符串代码:", code);
            code = String(code || '');
        }
        
        try {
            // 如果是受支持的语言则高亮，否则使用普通格式
            const lang = hljs.getLanguage(language) ? language : 'plaintext';
            return hljs.highlight(code, { language: lang }).value;
        } catch (e) {
            console.error("代码高亮失败:", e);
            return this.escapeHtml(code);
        }
    }
    
    /**
     * 创建自定义渲染器配置
     */
    private static createCustomRenderer(): marked.Renderer {
        const renderer = new marked.Renderer();
        const config = this.DEFAULT_CONFIG;
        
        // 标题渲染
        renderer.heading = (text, level) => {
            const headingSize = config.headingSizes[`h${level}` as keyof typeof config.headingSizes];
            
            return `<h${level} style="
                font-size: ${headingSize}px;
                font-weight: bold;
                line-height: 1.4;
                color: ${config.colors.heading};
                margin-top: ${level === 1 ? 20 : 20}px;
                margin-bottom: ${level === 1 ? 15 : 10}px;
                ${level === 1 ? 'border-bottom: 1px solid #eee; padding-bottom: 10px;' : ''}
            ">${text}</h${level}>`;
        };
        
        // 段落渲染 - 增加类型检查
        renderer.paragraph = (text) => {
            // 增加类型检查，确保text是字符串
            if (typeof text !== 'string') {
                console.warn("Renderer.paragraph接收到非字符串文本:", text);
                text = String(text || '');
            }
            
            // 如果包含图片，不要包装p标签(微信编辑器要求)
            if (text.includes('<img ')) {
                return text;
            }
            
            return `<p style="
                margin-bottom: ${config.styles.paragraphSpacing}px;
                line-height: ${config.styles.lineHeight};
                color: ${config.colors.text};
                font-size: ${config.styles.fontSize}px;
            ">${text}</p>`;
        };
        
        // 链接渲染
        renderer.link = (href, title, text) => {
            const titleAttr = title ? ` title="${title}"` : '';
            
            // 如果是微信域名链接，使用正常的a标签
            if (href.startsWith('https://mp.weixin.qq.com/')) {
                return `<a href="${href}"${titleAttr} style="
                    color: ${config.colors.link};
                    text-decoration: none;
                ">${text}</a>`;
            }
            
            // 其他链接转为span和样式，因为微信会过滤外部链接
            return `<span style="
                color: ${config.colors.link};
                text-decoration: none;
                cursor: pointer;
            " data-url="${href}"${titleAttr}>${text}</span>`;
        };
        
        // 图片渲染
        renderer.image = (href, title, text) => {
            const alt = text || '';
            const titleAttr = title ? ` title="${title}"` : '';
            
            // 微信编辑器要求图片居中，最大宽度100%
            const imgHtml = `<img src="${href}" alt="${alt}"${titleAttr} style="
                max-width: 100%;
                height: auto;
                display: block;
                margin: 10px auto;
                border-radius: 4px;
            "/>`;
            
            // 如果有描述文字，添加图注
            if (title || text) {
                return `<div style="text-align: center; margin: 20px auto;">
                    ${imgHtml}
                    <p style="
                        text-align: center;
                        color: #888;
                        font-size: 14px;
                        margin-top: 5px;
                    ">${title || text}</p>
                </div>`;
            }
            
            return `<div style="text-align: center; margin: 20px auto;">${imgHtml}</div>`;
        };
        
        // 代码块渲染 - 增强类型处理
        renderer.code = (code, language = '', isEscaped) => {
            // 检查输入是否为完整的代码块对象
            if (typeof code === 'object' && code !== null) {
                console.log("接收到代码块对象而非字符串:", code);
                
                // 尝试从对象中提取文本内容
                if (code.text) {
                    console.log("使用代码块对象中的text属性");
                    code = String(code.text);
                } else if (code.raw) {
                    console.log("使用代码块对象中的raw属性");
                    const match = String(code.raw).match(/```.*?\n([\s\S]*?)```/);
                    code = match ? match[1] : String(code.raw);
                } else {
                    code = String(code);
                }
                
                // 如果对象有语言属性，优先使用
                if (code.lang) {
                    language = String(code.lang);
                }
            } else if (typeof code !== 'string') {
                // 其他非字符串类型，直接转换为字符串
                console.warn("Renderer.code接收到非字符串代码:", code);
                code = String(code || '');
            }
            
            let lang = language || 'plaintext';
            let processedCode;
            
            try {
                processedCode = isEscaped ? code : this.escapeHtml(code);
                
                // 尝试高亮代码
                if (lang !== 'plaintext') {
                    processedCode = this.highlightCode(code, lang);
                    
                    // 替换高亮后的HTML转义字符
                    processedCode = processedCode
                        .replace(/&lt;/g, '<span style="color:#9a6e3a;">&lt;</span>')
                        .replace(/&gt;/g, '<span style="color:#9a6e3a;">&gt;</span>');
                }
                
                // 处理空格和换行，确保代码格式正确
                processedCode = processedCode
                    .replace(/\s/g, '&nbsp;')
                    .replace(/\n/g, '<br/>');
            } catch (error) {
                console.error("处理代码块失败:", error);
                processedCode = `处理代码时出错: ${String(error)}`;
            }
            
            // 添加语言标识
            const langLabel = lang !== 'plaintext' ? 
                `<div style="
                    position: absolute;
                    right: 0;
                    top: 0;
                    padding: 2px 8px;
                    font-size: 12px;
                    color: #aaa;
                    background: ${config.colors.codeBackground};
                    border-bottom-left-radius: 4px;
                ">${lang}</div>` : '';
            
            // 微信代码块样式
                // color: ${config.colors.code};
                // word-break: break-all;
                // word-wrap: break-word;
            // ">${code}</code>`;
        };
        
        // 引用块渲染
        renderer.blockquote = (quote) => {
            return `<blockquote style="
                padding: 10px 15px;
                background-color: #f9f9f9;
                border-left: 4px solid #dfe2e5;
                color: ${config.colors.blockquote};
                margin: 15px 0;
                border-radius: 0 4px 4px 0;
            ">${quote}</blockquote>`;
        };
        
        // 强调（粗体）渲染
        renderer.strong = (text) => {
            return `<strong style="font-weight: bold;">${text}</strong>`;
        };
        
        // 斜体渲染
        renderer.em = (text) => {
            return `<em style="font-style: italic;">${text}</em>`;
        };
        
        // 水平线渲染
        renderer.hr = () => {
            return `<hr style="
                height: 1px;
                border: none;
                background-color: #e8e8e8;
                margin: 20px 0;
            "/>`;
        };
        
        // 列表项渲染
        renderer.listitem = (text, task, checked) => {
            // 处理任务列表
            if (task) {
                return `<li style="
                    margin-bottom: 8px;
                    line-height: ${config.styles.lineHeight};
                    color: ${config.colors.text};
                ">${checked ? '✅' : '⬜'} ${text}</li>`;
            }
            
            return `<li style="
                margin-bottom: 8px;
                line-height: ${config.styles.lineHeight};
                color: ${config.colors.text};
            ">${text}</li>`;
        };
        
        // 有序列表渲染
        renderer.list = (body, ordered, start) => {
            const tag = ordered ? 'ol' : 'ul';
            const startAttr = ordered && start !== 1 ? ` start="${start}"` : '';
            
            return `<${tag}${startAttr} style="
                padding-left: 25px;
                margin: 15px 0;
            ">${body}</${tag}>`;
        };
        
        // 表格渲染
        renderer.table = (header, body) => {
            return `<table style="
                width: 100%;
                border-collapse: collapse;
                margin: 15px 0;
                font-size: 14px;
                text-align: left;
                border: 1px solid #e8e8e8;
            ">
                <thead style="background-color: ${config.colors.tableHeaderBg};">
                    ${header}
                </thead>
                <tbody>
                    ${body}
                </tbody>
            </table>`;
        };
        
        // 表格行渲染
        renderer.tablerow = (content) => {
            return `<tr style="border-bottom: 1px solid #e8e8e8;">${content}</tr>`;
        };
        
        // 表格单元格渲染
        renderer.tablecell = (content, { header, align }) => {
            const tag = header ? 'th' : 'td';
            let style = `
                padding: 8px 10px;
                border: 1px solid #e8e8e8;
                font-weight: ${header ? 'bold' : 'normal'};
            `;
            
            if (align) {
                style += `text-align: ${align};`;
            }
            
            return `<${tag} style="${style}">${content}</${tag}>`;
        };
        
        return renderer;
    }
    
    /**
     * 添加页面容器样式
     */
    private static wrapWithContainer(html: string): string {
        const config = this.DEFAULT_CONFIG;
        
        return `<div style="
            max-width: 100%;
            box-sizing: border-box;
            font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif;
            font-size: ${config.styles.fontSize}px;
            color: ${config.colors.text};
            line-height: ${config.styles.lineHeight};
            word-wrap: break-word;
            background-color: #fff;
            padding: 16px;
            word-break: break-word;
        ">${html}</div>`;
    }
    
    /**
     * 生成目录结构
     */
    private static generateTOC(markdown: string): string {
        // 提取所有标题
        const headingRegex = /^(#{1,6})\s+(.+)$/gm;
        const headings: {level: number, text: string}[] = [];
        let match;
        
        while ((match = headingRegex.exec(markdown)) !== null) {
            headings.push({
                level: match[1].length,
                text: match[2].trim()
            });
        }
        
        if (headings.length === 0) {
            return "";
        }
        
        // 生成目录HTML
        let tocHtml = `<div style="
            margin: 20px 0;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 4px;
            font-size: 14px;
            line-height: 1.6;
        ">
        <div style="font-weight: bold; margin-bottom: 10px;">目录：</div>
        <ul style="padding-left: 15px; margin: 0;">`;
        
        headings.forEach(heading => {
            const indent = (heading.level - 1) * 15;
            tocHtml += `<li style="
                list-style-type: disc;
                margin-bottom: 5px;
                padding-left: ${indent}px;
            ">${heading.text}</li>`;
        });
        
        tocHtml += `</ul></div>`;
        return tocHtml;
    }
    
    /**
     * 解析Markdown为微信公众号格式的HTML
     * 增加更健壮的错误处理
     */
    static parse(markdown: string, options: { 
        includeTOC?: boolean, 
        addWatermark?: boolean
    } = {}): string {
        // 确保markdown是字符串
        if (typeof markdown !== 'string') {
            console.warn("WechatParser.parse接收到非字符串输入:", markdown);
            markdown = String(markdown || '');
        }
        
        try {
            // 创建自定义渲染器
            const renderer = this.createCustomRenderer();
            
            // 配置marked选项
            marked.setOptions({
                renderer,
                gfm: true,          // 启用GitHub风格Markdown
                breaks: true,       // 启用回车换行
                pedantic: false,    // 严格符合原始markdown.pl
                smartLists: true,   // 优化列表
                smartypants: false, // 优化标点符号
                xhtml: false        // 关闭严格的XML模式
            });
            
            // 解析Markdown并获取HTML
            let html = marked.parse(markdown);
            
            // 如果需要，添加目录
            if (options.includeTOC) {
                const toc = this.generateTOC(markdown);
                if (toc) {
                    html = toc + html;
                }
            }
            
            // 如果需要，添加水印
            if (options.addWatermark) {
                html += `<div style="
                    text-align: center;
                    margin-top: 40px;
                    color: #888;
                    font-size: 12px;
                ">使用 Obsidian Doocs MD 插件生成</div>`;
            }
            
            // 包装HTML并返回
            return this.wrapWithContainer(html);
        } catch (error) {
            console.error("解析Markdown为微信格式失败:", error);
            return `<div style="color: red; padding: 20px; border: 1px solid #ffcccc;">
                解析Markdown为微信格式失败: ${String(error)}
            </div>`;
        }
    }
    
    /**
     * 将解析后的内容应用到预览容器
     * @param content Markdown内容
     * @param container 目标容器
     */
    static renderToContainer(content: string, container: HTMLElement): void {
        const html = this.parse(content);
        container.innerHTML = html;
    }
    
    /**
     * 复制为微信格式 - 辅助方法
     * 增加更健壮的错误处理
     */
    static async copyAsWechatFormat(content: string): Promise<boolean> {
        try {
            // 确保content是字符串
            if (typeof content !== 'string') {
                console.warn("WechatParser.copyAsWechatFormat接收到非字符串输入:", content);
                content = String(content || '');
            }
            
            const html = this.parse(content);
            
            // 检查html是否为空
            if (!html) {
                console.error("生成的HTML为空");
                return false;
            }
            
            await navigator.clipboard.writeText(html);
            return true;
        } catch (error) {
            console.error("复制微信格式失败:", error);
            // 输出更多调试信息
            console.debug("Content type:", typeof content);
            console.debug("Content preview:", content?.substring?.(0, 100) || content);
            return false;
        }
    }
}
