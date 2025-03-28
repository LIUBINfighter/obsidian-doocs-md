import { MarkdownRenderer, Component, TFile } from "obsidian";
import { WechatParser } from "./parsers/wechatParser";

/**
 * 渲染格式类型
 */
export enum RenderFormat {
    DEFAULT = "default",
    WECHAT = "wechat"
}

/**
 * Markdown内容渲染器类
 * 负责将Markdown内容渲染为HTML
 */
export class MarkdownRender {
    /**
     * 渲染Markdown内容到指定容器
     * @param content Markdown内容
     * @param container 目标HTML容器
     * @param filePath 文件路径
     * @param component 组件实例
     * @param format 渲染格式
     * @returns Promise
     */
    static async renderMarkdownToElement(
        content: string,
        container: HTMLElement,
        filePath: string,
        component: Component,
        format: RenderFormat = RenderFormat.DEFAULT
    ): Promise<void> {
        try {
            if (format === RenderFormat.WECHAT) {
                // 微信格式预览已不再使用，保留代码仅供参考
                WechatParser.renderToContainer(content, container);
            } else {
                // 使用Obsidian的Markdown渲染器渲染普通HTML
                await MarkdownRenderer.renderMarkdown(
                    content,
                    container,
                    filePath,
                    component
                );
            }
        } catch (error) {
            console.error("Markdown渲染失败:", error);
            container.innerHTML = this.fallbackParseMarkdown(content);
        }
    }

    /**
     * 添加一键复制按钮到微信公众号格式预览中
     * @param container 容器元素
     * @param content 原始Markdown内容
     */
    private static addCopyButton(container: HTMLElement, content: string): void {
        const buttonContainer = document.createElement('div');
        buttonContainer.style.position = 'sticky';
        buttonContainer.style.top = '0';
        buttonContainer.style.textAlign = 'right';
        buttonContainer.style.zIndex = '100';
        buttonContainer.style.marginBottom = '10px';
        buttonContainer.style.padding = '5px';
        buttonContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        
        const copyButton = document.createElement('button');
        copyButton.textContent = '一键复制HTML到微信';
        copyButton.style.backgroundColor = '#07C160';
        copyButton.style.color = 'white';
        copyButton.style.border = 'none';
        copyButton.style.borderRadius = '4px';
        copyButton.style.padding = '6px 12px';
        copyButton.style.cursor = 'pointer';
        copyButton.style.fontSize = '14px';
        
        copyButton.addEventListener('click', async () => {
            const success = await WechatParser.copyAsWechatFormat(content);
            if (success) {
                copyButton.textContent = '复制成功!';
                setTimeout(() => {
                    copyButton.textContent = '一键复制HTML到微信';
                }, 2000);
            } else {
                copyButton.textContent = '复制失败!';
                setTimeout(() => {
                    copyButton.textContent = '一键复制HTML到微信';
                }, 2000);
            }
        });
        
        buttonContainer.appendChild(copyButton);
        container.insertBefore(buttonContainer, container.firstChild);
    }

    /**
     * 备用的简单Markdown解析器
     * 在Obsidian原生渲染失败时使用
     * @param markdown Markdown文本
     * @returns HTML字符串
     */
    static fallbackParseMarkdown(markdown: string): string {
        let html = markdown
            // 标题
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
            .replace(/^##### (.*$)/gm, '<h5>$1</h5>')
            .replace(/^###### (.*$)/gm, '<h6>$1</h6>')
            // 加粗
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // 斜体
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // 链接
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
            // 列表项
            .replace(/^\- (.*$)/gm, '<li>$1</li>')
            // 代码块
            .replace(/```(.*?)\n([\s\S]*?)```/gm, '<pre><code class="language-$1">$2</code></pre>')
            // 行内代码
            .replace(/`(.*?)`/g, '<code>$1</code>')
            // 水平线
            .replace(/^\-\-\-$/gm, '<hr>')
            // 引用块
            .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>');
        
        // 换行处理
        html = `<div class="doocs-md-content">${html.split('\n').join('<br>')}</div>`;
        
        return html;
    }

    /**
     * 获取文件名显示文本
     * @param file 文件对象
     * @returns 显示文本
     */
    static getFileDisplayText(file: TFile | null): string {
        if (!file) return "无文件";
        return `预览: ${file.basename}`;
    }
}
