import { App, Notice } from 'obsidian';
import * as path from 'path';

export interface Theme {
    name: string;
    cssPath: string;
    folderPath: string;
    isDefault?: boolean;
}

/**
 * 主题加载器类，用于读取和管理Obsidian主题
 */
export class ThemeLoader {
    private app: App;
    private themes: Theme[] = [];
    private currentTheme: string = '';
    
    /**
     * 构造函数
     * @param app Obsidian App实例
     */
    constructor(app: App) {
        this.app = app;
    }
    
    /**
     * 获取所有主题列表
     * @returns 主题列表
     */
    getThemes(): Theme[] {
        return this.themes;
    }
    
    /**
     * 获取当前主题
     * @returns 当前主题名称
     */
    getCurrentTheme(): string {
        return this.currentTheme;
    }
    
    /**
     * 设置当前主题
     * @param themeName 主题名称
     */
    setCurrentTheme(themeName: string): void {
        this.currentTheme = themeName;
    }
    
    /**
     * 读取所有主题
     * @returns 是否成功读取
     */
    async loadThemes(): Promise<boolean> {
        try {
            // 清空现有主题列表
            this.themes = [];
            
            // 添加默认主题
            this.addDefaultThemes();
            
            // 获取主题文件夹路径
            const themesPath = path.join(this.app.vault.adapter.basePath, '.obsidian', 'themes');
            
            // 检查themes文件夹是否存在
            const exists = await this.app.vault.adapter.exists(themesPath);
            if (!exists) {
                console.warn("主题文件夹不存在:", themesPath);
                return true; // 文件夹不存在，但不是错误
            }
            
            // 读取主题文件夹下的所有文件夹
            const themeFolders = await this.listThemeFolders(themesPath);
            
            // 处理每个主题文件夹
            for (const folder of themeFolders) {
                const folderPath = path.join(themesPath, folder);
                
                // 检查主题CSS文件是否存在
                const cssPath = path.join(folderPath, 'theme.css');
                const cssExists = await this.app.vault.adapter.exists(cssPath);
                
                if (cssExists) {
                    // 添加到主题列表
                    this.themes.push({
                        name: folder,
                        cssPath: cssPath,
                        folderPath: folderPath
                    });
                }
            }
            
            // 获取当前活动主题
            this.currentTheme = this.app.vault.getConfig('theme') || 'default';
            
            return true;
        } catch (error) {
            console.error("加载主题失败:", error);
            new Notice("加载主题失败，请查看控制台了解详情");
            return false;
        }
    }
    
    /**
     * 添加默认主题
     */
    private addDefaultThemes(): void {
        // 添加Obsidian默认亮色主题
        this.themes.push({
            name: 'default',
            cssPath: '',
            folderPath: '',
            isDefault: true
        });
        
        // 添加Obsidian默认暗色主题
        this.themes.push({
            name: 'obsidian',
            cssPath: '',
            folderPath: '',
            isDefault: true
        });
    }
    
    /**
     * 列出主题文件夹下的所有文件夹
     * @param themesPath 主题文件夹路径
     * @returns 文件夹名称列表
     */
    private async listThemeFolders(themesPath: string): Promise<string[]> {
        // 获取主题文件夹下的所有文件和文件夹
        const items = await this.app.vault.adapter.list(themesPath);
        
        // 过滤出文件夹
        return items.folders.map(folder => {
            // 提取文件夹名称
            const parts = folder.split(path.sep);
            return parts[parts.length - 1];
        });
    }
    
    /**
     * 读取主题CSS内容
     * @param themeName 主题名称
     * @returns CSS内容
     */
    async getThemeCSS(themeName: string): Promise<string | null> {
        try {
            // 查找主题
            const theme = this.themes.find(t => t.name === themeName);
            
            // 如果是默认主题或找不到主题，返回空字符串
            if (!theme || theme.isDefault) {
                return '';
            }
            
            // 读取主题CSS文件
            return await this.app.vault.adapter.read(theme.cssPath);
        } catch (error) {
            console.error(`读取主题 ${themeName} 的CSS失败:`, error);
            return null;
        }
    }
}
