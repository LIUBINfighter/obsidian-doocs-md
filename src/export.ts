import * as domtoimage from 'dom-to-image-more';
import { Notice, TFile } from 'obsidian';

// 导出格式枚举
export enum ExportFormat {
    PNG = 'png',
    JPEG = 'jpeg',
    SVG = 'svg'
}

// 导出选项接口
export interface ExportOptions {
    // 导出格式
    format: ExportFormat;
    // 背景颜色 (可选，仅用于透明背景元素)
    backgroundColor?: string;
    // JPEG质量 (仅JPEG格式有效，0-1之间的数值)
    quality?: number;
    // 缩放比例
    scale?: number;
    // 导出文件名 (不含扩展名)
    filename?: string;
    // 导出前的DOM处理函数
    beforeExport?: (node: HTMLElement) => void;
    // 作者信息
    author?: {
        name: string;
        avatar?: string;
    };
    // 添加水印
    watermark?: {
        text: string;
        position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
        color?: string;
    };
    // 圆角大小
    borderRadius?: number;
    // 添加边框
    border?: boolean;
    // 边框颜色
    borderColor?: string;
    // 额外的CSS样式
    extraStyles?: string;
    // 导出为社交媒体卡片风格
    socialCard?: boolean;
    // 主题名称
    themeName?: string;
}

/**
 * 导出DOM元素为图片
 * @param node 要导出的DOM元素
 * @param options 导出选项
 * @returns Promise<void>
 */
export async function exportDomToImage(
    node: HTMLElement, 
    options: ExportOptions
): Promise<void> {
    if (!node) {
        new Notice("找不到要导出的DOM元素");
        return;
    }
    
    try {
        // 创建包装元素，以便添加额外样式
        const wrapper = document.createElement('div');
        const clone = node.cloneNode(true) as HTMLElement;
        wrapper.appendChild(clone);
        
        // 准备DOM元素
        prepareNodeForExport(wrapper, clone, options);
        
        // 根据选择的格式导出图片
        let dataUrl: string;
        
        switch (options.format) {
            case ExportFormat.PNG:
                dataUrl = await domtoimage.toPng(wrapper, {
                    bgcolor: options.backgroundColor,
                    scale: options.scale || 1
                });
                break;
                
            case ExportFormat.JPEG:
                dataUrl = await domtoimage.toJpeg(wrapper, {
                    quality: options.quality || 0.92,
                    bgcolor: options.backgroundColor || '#ffffff',
                    scale: options.scale || 1
                });
                break;
                
            case ExportFormat.SVG:
                dataUrl = await domtoimage.toSvg(wrapper, {
                    bgcolor: options.backgroundColor,
                    scale: options.scale || 1
                });
                break;
                
            default:
                dataUrl = await domtoimage.toPng(wrapper, {
                    bgcolor: options.backgroundColor,
                    scale: options.scale || 1
                });
        }
        
        // 下载图片
        downloadImage(dataUrl, options);
        
        // 成功通知
        const formatName = options.format.toUpperCase();
        new Notice(`成功导出${formatName}图片`);
    } catch (error) {
        console.error("导出图片失败:", error);
        new Notice("导出图片失败，请查看控制台了解详情");
    }
}

/**
 * 处理DOM节点，为导出做准备
 * @param wrapper 外部包装元素
 * @param content 内容元素
 * @param options 导出选项
 */
function prepareNodeForExport(
    wrapper: HTMLElement, 
    content: HTMLElement, 
    options: ExportOptions
): void {
    // 设置包装器样式
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    wrapper.style.maxWidth = '100%';
    wrapper.style.boxSizing = 'border-box';
    wrapper.style.padding = '20px';
    
    // 应用背景色
    if (options.backgroundColor) {
        wrapper.style.backgroundColor = options.backgroundColor;
    } else {
        wrapper.style.backgroundColor = 'white'; // 默认背景色
    }
    
    // 应用圆角
    const borderRadius = options.borderRadius !== undefined ? options.borderRadius : 12;
    wrapper.style.borderRadius = `${borderRadius}px`;
    
    // 应用边框
    if (options.border) {
        wrapper.style.border = `1px solid ${options.borderColor || '#e0e0e0'}`;
    }
    
    // 添加阴影效果
    wrapper.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
    
    // 应用额外样式
    if (options.extraStyles) {
        const styleElement = document.createElement('style');
        styleElement.textContent = options.extraStyles;
        wrapper.appendChild(styleElement);
    }
    
    // 添加作者信息和社交卡片样式
    if (options.socialCard && options.author) {
        addSocialCardElements(wrapper, options);
    }
    
    // 添加水印
    if (options.watermark) {
        addWatermark(wrapper, options.watermark);
    }
    
    // 添加主题标识
    if (options.themeName) {
        addThemeIdentifier(wrapper, options.themeName);
    }
    
    // 调用自定义的DOM处理函数
    if (options.beforeExport) {
        options.beforeExport(content);
    }
}

/**
 * 添加社交卡片元素（作者信息、来源等）
 * @param wrapper 包装元素
 * @param options 导出选项
 */
function addSocialCardElements(wrapper: HTMLElement, options: ExportOptions): void {
    if (!options.author) return;
    
    // 创建底部信息栏
    const footerBar = document.createElement('div');
    footerBar.style.display = 'flex';
    footerBar.style.alignItems = 'center';
    footerBar.style.justifyContent = 'space-between';
    footerBar.style.marginTop = '16px';
    footerBar.style.padding = '12px 16px';
    footerBar.style.borderTop = '1px solid #eaeaea';
    footerBar.style.borderBottomLeftRadius = `${options.borderRadius || 12}px`;
    footerBar.style.borderBottomRightRadius = `${options.borderRadius || 12}px`;
    
    // 创建作者信息区域
    const authorInfo = document.createElement('div');
    authorInfo.style.display = 'flex';
    authorInfo.style.alignItems = 'center';
    authorInfo.style.gap = '10px';
    
    // 添加作者头像
    if (options.author.avatar) {
        const avatar = document.createElement('img');
        avatar.src = options.author.avatar;
        avatar.alt = options.author.name;
        avatar.style.width = '32px';
        avatar.style.height = '32px';
        avatar.style.borderRadius = '50%';
        avatar.style.objectFit = 'cover';
        authorInfo.appendChild(avatar);
    }
    
    // 添加作者名称
    const authorName = document.createElement('span');
    authorName.textContent = options.author.name;
    authorName.style.fontSize = '14px';
    authorName.style.fontWeight = 'bold';
    authorInfo.appendChild(authorName);
    
    footerBar.appendChild(authorInfo);
    
    // 添加Obsidian图标和来源信息
    const sourceInfo = document.createElement('div');
    sourceInfo.style.display = 'flex';
    sourceInfo.style.alignItems = 'center';
    sourceInfo.style.gap = '8px';
    
    // Obsidian logo文本
    const obsidianLabel = document.createElement('span');
    obsidianLabel.textContent = 'Made with Obsidian';
    obsidianLabel.style.fontSize = '12px';
    obsidianLabel.style.color = '#888';
    sourceInfo.appendChild(obsidianLabel);
    
    footerBar.appendChild(sourceInfo);
    
    // 将底部信息栏添加到包装器
    wrapper.appendChild(footerBar);
}

/**
 * 添加水印
 * @param wrapper 包装元素
 * @param watermarkOptions 水印选项
 */
function addWatermark(
    wrapper: HTMLElement, 
    watermarkOptions: { text: string; position?: string; color?: string; }
): void {
    const watermark = document.createElement('div');
    watermark.textContent = watermarkOptions.text;
    watermark.style.position = 'absolute';
    watermark.style.fontSize = '12px';
    watermark.style.opacity = '0.5';
    watermark.style.padding = '4px 8px';
    watermark.style.zIndex = '100';
    watermark.style.pointerEvents = 'none';
    
    if (watermarkOptions.color) {
        watermark.style.color = watermarkOptions.color;
    } else {
        watermark.style.color = '#888';
    }
    
    // 设置水印位置
    switch(watermarkOptions.position) {
        case 'top-left':
            watermark.style.top = '8px';
            watermark.style.left = '8px';
            break;
        case 'top-right':
            watermark.style.top = '8px';
            watermark.style.right = '8px';
            break;
        case 'bottom-left':
            watermark.style.bottom = '8px';
            watermark.style.left = '8px';
            break;
        case 'bottom-right':
        default:
            watermark.style.bottom = '8px';
            watermark.style.right = '8px';
    }
    
    wrapper.appendChild(watermark);
}

/**
 * 添加主题标识
 * @param wrapper 包装元素
 * @param themeName 主题名称
 */
function addThemeIdentifier(wrapper: HTMLElement, themeName: string): void {
    const themeLabel = document.createElement('div');
    themeLabel.textContent = `Theme: ${themeName}`;
    themeLabel.style.position = 'absolute';
    themeLabel.style.top = '8px';
    themeLabel.style.right = '8px';
    themeLabel.style.fontSize = '10px';
    themeLabel.style.color = '#888';
    themeLabel.style.opacity = '0.7';
    themeLabel.style.padding = '2px 4px';
    themeLabel.style.pointerEvents = 'none';
    
    wrapper.appendChild(themeLabel);
}

/**
 * 下载图片
 * @param dataUrl 图片数据URL
 * @param options 导出选项
 */
function downloadImage(dataUrl: string, options: ExportOptions): void {
    // 创建临时链接元素
    const link = document.createElement('a');
    link.href = dataUrl;
    
    // 设置文件名
    const filename = options.filename || `export-${Date.now()}`;
    const extension = options.format === ExportFormat.SVG ? 'svg' : options.format;
    link.download = `${filename}.${extension}`;
    
    // 触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * 导出所有卡片为图片
 * @param nodes 节点列表
 * @param basename 基础文件名
 * @param format 导出格式
 * @param options 额外选项
 */
export async function exportAllCards(
    nodes: HTMLElement[],
    basename: string,
    format: ExportFormat = ExportFormat.PNG,
    options: Partial<ExportOptions> = {}
): Promise<void> {
    if (nodes.length === 0) {
        new Notice("没有可导出的卡片");
        return;
    }
    
    // 计数器
    let successCount = 0;
    
    // 导出每张卡片
    for (let i = 0; i < nodes.length; i++) {
        try {
            await exportDomToImage(nodes[i], {
                format: format,
                backgroundColor: options.backgroundColor,
                quality: options.quality,
                scale: options.scale || 2,
                filename: `${basename}-${i + 1}`,
                beforeExport: options.beforeExport,
                author: options.author,
                watermark: options.watermark,
                borderRadius: options.borderRadius,
                border: options.border,
                borderColor: options.borderColor,
                extraStyles: options.extraStyles,
                socialCard: options.socialCard,
                themeName: options.themeName
            });
            successCount++;
        } catch (error) {
            console.error(`导出第${i + 1}张卡片失败:`, error);
        }
    }
    
    // 显示完成通知
    if (successCount > 0) {
        new Notice(`成功导出${successCount}张卡片图片`);
    } else {
        new Notice("导出失败，请检查控制台");
    }
}

/**
 * 导出当前卡片为图片
 * @param node DOM节点
 * @param file 关联的文件
 * @param cardIndex 卡片索引
 * @param format 导出格式
 * @param options 额外选项
 */
export async function exportCurrentCard(
    node: HTMLElement,
    file: TFile | null,
    cardIndex: number,
    format: ExportFormat = ExportFormat.PNG,
    options: Partial<ExportOptions> = {}
): Promise<void> {
    if (!node) {
        new Notice("找不到要导出的内容");
        return;
    }
    
    if (!file) {
        new Notice("没有关联的文件");
        return;
    }
    
    // 导出当前卡片
    await exportDomToImage(node, {
        format: format,
        backgroundColor: options.backgroundColor,
        quality: options.quality,
        scale: options.scale || 2,
        filename: `${file.basename}-card-${cardIndex + 1}`,
        beforeExport: options.beforeExport,
        author: options.author,
        watermark: options.watermark,
        borderRadius: options.borderRadius,
        border: options.border,
        borderColor: options.borderColor,
        extraStyles: options.extraStyles,
        socialCard: options.socialCard,
        themeName: options.themeName
    });
}
