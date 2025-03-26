import { Notice } from "obsidian";

/**
 * 剪贴板管理器
 * 负责处理内容的复制
 */
export class ClipboardManager {
    /**
     * 复制HTML内容到剪贴板
     * @param element 包含HTML内容的元素
     * @returns 是否复制成功
     */
    static async copyHtmlFromElement(element: HTMLElement | null): Promise<boolean> {
        if (!element) {
            new Notice("没有找到要复制的元素");
            return false;
        }
        
        try {
            // 获取HTML内容
            const htmlContent = element.innerHTML;
            
            // 检查内容是否为空
            if (!htmlContent.trim()) {
                new Notice("没有内容可复制");
                return false;
            }
            
            // 复制到剪贴板
            await navigator.clipboard.writeText(htmlContent);
            
            // 显示成功通知
            new Notice("HTML已复制到剪贴板");
            return true;
        } catch (error) {
            console.error("复制HTML失败:", error);
            new Notice("复制HTML失败: " + error);
            return false;
        }
    }
    
    /**
     * 复制文本到剪贴板
     * @param text 要复制的文本
     * @returns 是否复制成功
     */
    static async copyText(text: string): Promise<boolean> {
        if (!text.trim()) {
            new Notice("没有内容可复制");
            return false;
        }
        
        try {
            await navigator.clipboard.writeText(text);
            new Notice("文本已复制到剪贴板");
            return true;
        } catch (error) {
            console.error("复制文本失败:", error);
            new Notice("复制文本失败: " + error);
            return false;
        }
    }
}
