import { Notice } from "obsidian";
import { WechatParser } from "../parsers/wechatParser";
import { 
  solveWeChatImage, 
  modifyHtmlStructure, 
  processClipboardContent 
} from "./markdownProcessor";

/**
 * 微信公众号导出工具
 * 用于将Markdown内容导出为微信公众号格式
 */
export class WechatExporter {
  /**
   * 将Markdown内容导出为微信公众号格式HTML
   * @param content Markdown内容
   * @param options 配置选项
   * @returns HTML字符串
   */
  static exportToHtml(content: string, options: {
    includeTOC?: boolean,
    addWatermark?: boolean,
    primaryColor?: string
  } = {}): string {
    const { includeTOC = false, addWatermark = true, primaryColor = "#07C160" } = options;
    
    try {
      // 生成微信公众号格式HTML
      let html = WechatParser.parse(content, { 
        includeTOC, 
        addWatermark 
      });
      
      // 额外处理HTML结构
      html = modifyHtmlStructure(html);
      
      // 处理颜色变量
      html = html.replace(/var\(--md-primary-color\)/g, primaryColor);
      
      return html;
    } catch (error) {
      console.error("导出微信公众号格式失败:", error);
      throw new Error(`导出失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * 将Markdown内容复制为微信公众号格式到剪贴板
   * @param content Markdown内容
   * @returns 是否成功
   */
  static async copyToClipboard(content: string): Promise<boolean> {
    try {
      const html = this.exportToHtml(content, {
        addWatermark: true,
        primaryColor: "#07C160"
      });
      
      await navigator.clipboard.writeText(html);
      new Notice("已复制为微信公众号格式，可直接粘贴到公众号编辑器");
      return true;
    } catch (error) {
      console.error("复制微信公众号格式失败:", error);
      new Notice(`复制失败: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * 下载为微信公众号格式HTML文件
   * @param content Markdown内容
   * @param fileName 文件名(可选)
   */
  static downloadAsHtml(content: string, fileName: string = "wechat-article.html"): void {
    try {
      const html = this.exportToHtml(content);
      
      // 创建完整HTML文档
      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>微信公众号文章</title>
        </head>
        <body>
          ${html}
        </body>
        </html>
      `;
      
      // 创建下载链接
      const downLink = document.createElement("a");
      downLink.download = fileName;
      downLink.style.display = "none";
      
      const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
      downLink.href = URL.createObjectURL(blob);
      
      // 执行下载
      document.body.appendChild(downLink);
      downLink.click();
      document.body.removeChild(downLink);
      
      new Notice(`已下载为${fileName}`);
    } catch (error) {
      console.error("下载微信公众号格式失败:", error);
      new Notice(`下载失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
