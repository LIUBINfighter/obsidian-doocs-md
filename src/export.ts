import { Notice, TFile } from 'obsidian';
import { 
    exportDomToImage,
    ExportFormat as DomExportFormat,
    SplitMode
} from './utils/dom-export';

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
    // 自定义CSS
    customCSS?: string;
    // 导出为社交媒体卡片风格
    socialCard?: boolean;
    // 主题名称
    themeName?: string;
    // 分割选项
    split?: {
        // 分割模式: fixed=固定高度分割，hr=按hr标签分割，auto=自动根据段落分割
        mode: SplitMode;
        // 分割高度（像素）
        height: number;
        // 重叠区域高度（像素）
        overlap: number;
    };
    // 导出元素的尺寸
    width?: number;
    height?: number;
}

// 默认分割设置
const DEFAULT_SPLIT_OPTIONS = {
    mode: 'fixed' as SplitMode,
    height: 1200,
    overlap: 50
};

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
    
    try {
        // 使用新的导出函数导出卡片
        await exportDomToImage(
            node, 
            {
                format: convertFormat(format),
                highResolution: options.scale ? options.scale > 1 : true,
                split: options.split || DEFAULT_SPLIT_OPTIONS,
                author: options.author,
                watermark: options.watermark,
                styleOptions: {
                    borderRadius: options.borderRadius,
                    border: options.border,
                    borderColor: options.borderColor,
                    backgroundColor: options.backgroundColor,
                    width: options.width,
                    height: options.height
                },
                themeName: options.themeName
            },
            `${file.basename}-card-${cardIndex + 1}`
        );
    } catch (error) {
        console.error("导出卡片失败:", error);
        new Notice("导出失败，请查看控制台了解详情");
    }
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
            await exportDomToImage(
                nodes[i], 
                {
                    format: convertFormat(format),
                    highResolution: options.scale ? options.scale > 1 : true,
                    split: options.split || DEFAULT_SPLIT_OPTIONS,
                    author: options.author,
                    watermark: options.watermark,
                    styleOptions: {
                        borderRadius: options.borderRadius,
                        border: options.border,
                        borderColor: options.borderColor,
                        backgroundColor: options.backgroundColor
                    },
                    themeName: options.themeName
                },
                `${basename}-${i + 1}`
            );
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
 * 转换格式枚举
 * @param format 本地格式枚举
 * @returns DOM导出格式枚举
 */
function convertFormat(format: ExportFormat): DomExportFormat {
    switch (format) {
        case ExportFormat.PNG: return 'png' as DomExportFormat;
        case ExportFormat.JPEG: return 'jpeg' as DomExportFormat;
        case ExportFormat.SVG: return 'svg' as DomExportFormat;
        default: return 'png' as DomExportFormat;
    }
}
