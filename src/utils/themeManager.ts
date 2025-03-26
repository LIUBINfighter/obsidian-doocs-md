import { setIcon, Notice } from "obsidian";
import DoocsMd from "../main";

/**
 * 主题管理器类
 * 负责处理预览区域的主题切换和应用
 */
export class ThemeManager {
    /**
     * 应用主题到预览容器
     * @param previewEl 预览容器元素
     * @param theme 主题名称
     */
    static applyTheme(previewEl: HTMLElement, theme: 'light' | 'dark'): void {
        if (!previewEl) return;
        
        // 移除所有主题类
        previewEl.removeClass('doocs-md-theme-light');
        previewEl.removeClass('doocs-md-theme-dark');
        
        // 添加当前主题类
        previewEl.addClass(`doocs-md-theme-${theme}`);
    }
    
    /**
     * 切换主题并保存设置
     * @param plugin 插件实例
     * @param previewEl 预览容器元素
     * @returns 新的主题
     */
    static toggleTheme(plugin: DoocsMd, previewEl: HTMLElement): 'light' | 'dark' {
        // 切换设置中的主题
        const newTheme = plugin.settings.previewTheme === 'light' ? 'dark' : 'light';
        plugin.settings.previewTheme = newTheme;
        
        // 保存设置
        plugin.saveSettings();
        
        // 应用新主题
        this.applyTheme(previewEl, newTheme);
        
        // 提示用户
        new Notice(`预览背景已切换为${newTheme === 'light' ? '亮色' : '暗色'}`);
        
        return newTheme;
    }
    
    /**
     * 设置主题按钮图标
     * @param button 按钮元素
     * @param theme 当前主题
     */
    static setThemeButtonIcon(button: HTMLElement, theme: 'light' | 'dark'): void {
        // 清空按钮内容
        button.empty();
        
        // 根据当前主题设置图标
        setIcon(button, theme === 'light' ? "sun" : "moon");
    }
}
