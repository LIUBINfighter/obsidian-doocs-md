import { Component } from "obsidian";

/**
 * 微信公众号格式解析器
 * 将Markdown转换为微信公众号适用的HTML格式
 */
export class WechatParser {
    /**
     * 解析Markdown为微信公众号格式的HTML
     * @param markdown Markdown内容
     * @returns 格式化的HTML
     */
    static parse(markdown: string): string {
        // 1. 处理标题
        let html = markdown
            .replace(/^# (.*$)/gm, '<h1 style="font-size: 24px; font-weight: bold; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 20px;">$1</h1>')
            .replace(/^## (.*$)/gm, '<h2 style="font-size: 20px; font-weight: bold; margin: 15px 0;">$1</h2>')
            .replace(/^### (.*$)/gm, '<h3 style="font-size: 18px; font-weight: bold; margin: 15px 0;">$1</h3>')
            .replace(/^#### (.*$)/gm, '<h4 style="font-size: 16px; font-weight: bold; margin: 10px 0;">$1</h4>')
            .replace(/^##### (.*$)/gm, '<h5 style="font-size: 15px; font-weight: bold; margin: 10px 0;">$1</h5>')
            .replace(/^###### (.*$)/gm, '<h6 style="font-size: 14px; font-weight: bold; margin: 10px 0;">$1</h6>');
        
        // 2. 处理加粗和斜体
        html = html
            .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: bold;">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em style="font-style: italic;">$1</em>');
        
        // 3. 处理链接
        html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" style="color: #576b95; text-decoration: none;">$1</a>');
        
        // 4. 处理列表
        // 将无序列表项转换为带样式的列表
        html = html.replace(/^\- (.*$)/gm, '<li style="margin-bottom: 5px; list-style-type: disc; margin-left: 20px;">$1</li>');
        // 将有序列表项转换为带样式的列表
        html = html.replace(/^\d+\. (.*$)/gm, '<li style="margin-bottom: 5px; list-style-type: decimal; margin-left: 20px;">$1</li>');
        
        // 5. 处理代码块 - 微信代码块样式
        html = html.replace(/```(.*?)\n([\s\S]*?)```/gm, (match, language, code) => {
            return `
<pre style="background-color: #f8f8f8; border-radius: 5px; padding: 10px; font-family: Consolas,Monaco,Andale Mono,Ubuntu Mono,monospace; font-size: 14px; line-height: 1.5; overflow: auto; margin: 10px 0;">
<code style="color: #333;">${this.escapeHtml(code.trim())}</code>
</pre>
            `;
        });
        
        // 6. 处理行内代码
        html = html.replace(/`(.*?)`/g, '<code style="background-color: #f8f8f8; border-radius: 3px; padding: 2px 5px; font-family: Consolas,Monaco,Andale Mono,Ubuntu Mono,monospace; font-size: 90%; color: #c7254e;">$1</code>');
        
        // 7. 处理引用
        html = html.replace(/^> (.*$)/gm, '<blockquote style="padding: 10px 15px; background-color: #f9f9f9; border-left: 4px solid #dfe2e5; color: #777; margin: 10px 0;">$1</blockquote>');
        
        // 8. 处理分隔线
        html = html.replace(/^\-\-\-$/gm, '<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">');
        
        // 9. 处理换行和段落
        const paragraphs = html.split('\n\n');
        html = paragraphs.map(p => {
            if (
                p.startsWith('<h') || 
                p.startsWith('<li') || 
                p.startsWith('<blockquote') || 
                p.startsWith('<pre') || 
                p.startsWith('<hr')
            ) {
                return p;
            }
            return `<p style="margin-bottom: 16px; line-height: 1.7; color: #333;">${p.replace(/\n/g, '<br>')}</p>`;
        }).join('\n');
        
        // 10. 包装为微信公众号文章样式
        return `
<div style="max-width: 100%; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; font-size: 16px; color: #333; line-height: 1.6; word-wrap: break-word; background-color: #fff; padding: 16px;">
    ${html}
</div>
        `;
    }
    
    /**
     * 转义HTML特殊字符
     * @param text 原始文本
     * @returns 转义后的文本
     */
    private static escapeHtml(text: string): string {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
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
}
