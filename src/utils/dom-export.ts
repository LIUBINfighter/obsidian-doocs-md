import * as domtoimage from 'dom-to-image-more';
import { Notice, Platform, TFile } from 'obsidian';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// 导出格式类型
export type ExportFormat = 'png' | 'jpeg' | 'svg' | 'pdf';

// 分割模式
export type SplitMode = 'fixed' | 'hr' | 'auto';

// 分割位置接口
export interface SplitPosition {
    startY: number;
    height: number;
}

// 分割选项接口
export interface SplitOptions {
    mode: SplitMode;
    height: number;
    overlap: number;
    totalHeight: number;
}

// 元素测量数据接口
export interface ElementMeasure {
    top: number;
    height: number;
}

// DOM目标接口
export interface DomTarget {
    element: HTMLElement;
    contentElement: HTMLElement;
    setClip: (startY: number, height: number) => void;
    resetClip: () => void;
}

// 导出选项接口
export interface ExportOptions {
    format: ExportFormat;
    highResolution: boolean;
    split: {
        mode: SplitMode;
        height: number;
        overlap: number;
    };
    saveToVault?: boolean;
    author?: {
        name: string;
        avatar?: string;
    };
    watermark?: {
        text: string;
        position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    };
    styleOptions?: {
        borderRadius?: number;
        border?: boolean;
        borderColor?: string;
        backgroundColor?: string;
        width?: number;
        height?: number;
    };
    themeName?: string;
    customCSS?: string;
}

/**
 * 获取元素位置信息
 * @param container 容器元素
 * @param mode 分割模式
 * @returns 元素位置信息数组
 */
export function getElementMeasures(container: HTMLElement, mode: SplitMode): ElementMeasure[] {
    if (mode === 'hr') {
        // 查找所有 hr 元素的位置
        const hrs = container.querySelectorAll('hr');
        return Array.from(hrs).map(hr => {
            const rect = hr.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            return {
                top: rect.top - containerRect.top,
                height: rect.height,
            };
        });
    } else if (mode === 'auto') {
        // 查找所有段落和标题元素的位置
        const paragraphTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'blockquote', 'pre', 'table'];
        const paragraphSelectors = paragraphTags.join(',');
        const paragraphs = Array.from(container.querySelectorAll(paragraphSelectors));
        const containerRect = container.getBoundingClientRect();

        return paragraphs.map((p, index) => {
            const rect = p.getBoundingClientRect();
            const currentTop = rect.top - containerRect.top;

            if (index < paragraphs.length - 1) {
                // 如果不是最后一个元素，高度取到下一个元素的顶部
                const nextRect = paragraphs[index + 1].getBoundingClientRect();
                const nextTop = nextRect.top - containerRect.top;
                return {
                    top: currentTop,
                    height: nextTop - currentTop,
                };
            } else {
                // 最后一个元素使用其实际高度
                return {
                    top: currentTop,
                    height: rect.height,
                };
            }
        });
    }
    return [];
}

/**
 * 计算分割位置
 * @param options 分割选项
 * @param elements 元素测量数据，仅在 hr 和 auto 模式下需要
 * @returns 分割位置数组
 */
export function calculateSplitPositions(
    options: SplitOptions,
    elements?: ElementMeasure[],
): SplitPosition[] {
    const { mode, height, overlap, totalHeight } = options;
    const positions: SplitPosition[] = [];
    if (mode === 'hr' && elements && elements.length > 0) {
        // 按分隔线切割
        let lastY = 0;
        elements.forEach((el, index) => {
            const currentY = el.top;
            if (index === 0) {
                positions.push({ startY: 0, height: currentY });
            } else {
                positions.push({ startY: lastY, height: currentY - lastY });
            }
            lastY = currentY;
        });
        // 添加最后一部分
        if (lastY < totalHeight) {
            positions.push({ startY: lastY, height: totalHeight - lastY });
        }
    } else if (mode === 'auto' && elements && elements.length > 0) {
        // 按段落自动切割
        let currentStartY = 0;
        let currentHeight = 0;

        for (let i = 0; i < elements.length - 1; i++) {
            const item = elements[i];
            currentHeight += item.height + (i === 0 ? item.top : 0);
            if (currentHeight >= height) {
                positions.push({ startY: currentStartY, height: currentHeight });
                currentStartY += currentHeight;
                currentHeight = 0;
                continue;
            }
            const delta = height - currentHeight;
            if (delta < elements[i + 1].height / 2) {
                positions.push({ startY: currentStartY, height: currentHeight });
                currentStartY += currentHeight;
                currentHeight = 0;
            }
        }
        // 添加最后一部分
        if (currentStartY < totalHeight) {
            positions.push({ startY: currentStartY, height: totalHeight - currentStartY });
        }
    } else {
        // 固定高度模式
        // 计算最小分割高度：重叠高度 + 50px
        const minSplitHeight = 2 * overlap + 50;
        // 使用设置的高度和最小高度中的较大值
        const effectiveHeight = Math.max(height, minSplitHeight);
        const firstPageHeight = effectiveHeight;
        const remainingHeight = totalHeight - firstPageHeight;
        const additionalPages = Math.max(0, Math.ceil(remainingHeight / (effectiveHeight - overlap * 2)));

        // 第一页
        positions.push({ startY: 0, height: firstPageHeight });
        let lastY = firstPageHeight;
        // 后续页面
        for (let i = 1; i <= additionalPages; i++) {
            const startY = lastY - overlap;
            const pageHeight = i === additionalPages
                ? totalHeight - startY  // 最后一页：使用实际剩余高度
                : effectiveHeight;      // 其他页：使用设定的分割高度
            positions.push({ startY, height: pageHeight });
            lastY = startY + pageHeight;
        }
    }
    
    // 如果没有分割位置，则使用整个高度
    if (positions.length === 0) {
        positions.push({ startY: 0, height: totalHeight });
    }
    
    return positions;
}

/**
 * 创建DOM目标对象
 * @param element 要导出的DOM元素
 * @returns DOM目标对象
 */
export function createDomTarget(element: HTMLElement, options?: ExportOptions): DomTarget {
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.overflow = 'hidden';
    
    // 克隆元素，避免修改原始元素
    const clone = element.cloneNode(true) as HTMLElement;
    
    // 创建卡片容器结构
    const cardContainer = document.createElement('div');
    cardContainer.className = 'md-notes-preview-container';
    
    // 应用样式选项
    if (options?.styleOptions) {
        // 设置宽度和高度
        if (options.styleOptions.width) {
            cardContainer.style.width = `${options.styleOptions.width}px`;
        } else {
            cardContainer.style.width = `${element.offsetWidth}px`;
        }
        
        if (options.styleOptions.height) {
            cardContainer.style.height = `${options.styleOptions.height}px`;
        }
        
        // 应用其他样式
        cardContainer.style.overflow = 'auto';
        cardContainer.style.margin = '0px auto';
        
        // 设置背景色
        if (options.styleOptions.backgroundColor) {
            cardContainer.style.backgroundColor = options.styleOptions.backgroundColor;
        }
        
        // 设置边框和圆角
        if (options.styleOptions.borderRadius) {
            cardContainer.style.borderRadius = `${options.styleOptions.borderRadius}px`;
        }
        
        if (options.styleOptions.border) {
            cardContainer.style.border = `1px solid ${options.styleOptions.borderColor || 'var(--background-modifier-border)'}`;
        }
    } else {
        // 默认保持原始宽度
        cardContainer.style.width = `${element.offsetWidth}px`;
    }
    
    // 将克隆的内容放入卡片容器
    cardContainer.appendChild(clone);
    
    // 创建样式标签
    const style = document.createElement('style');
    style.textContent = options?.customCSS || '';
    cardContainer.appendChild(style);
    
    // 将卡片容器放入主容器
    container.appendChild(cardContainer);
    
    return {
        element: container,
        contentElement: clone,
        setClip: (startY: number, height: number) => {
            container.style.height = `${height}px`;
            // 调整clip函数来适应新的DOM结构
            cardContainer.style.height = `${height}px`;
            clone.style.transform = `translateY(-${startY}px)`;
        },
        resetClip: () => {
            container.style.height = '';
            cardContainer.style.height = '';
            clone.style.transform = '';
        }
    };
}

/**
 * 获取Blob对象
 * @param element DOM元素
 * @param highResolution 是否高分辨率
 * @param mimeType MIME类型
 * @returns Promise<Blob>
 */
export async function getElementBlob(element: HTMLElement, highResolution: boolean, mimeType: string): Promise<Blob> {
    return await domtoimage.toBlob(element, {
        width: element.clientWidth,
        height: element.clientHeight,
        quality: 0.95,
        scale: highResolution ? 2 : 1,
        bgcolor: '#ffffff',
        style: {
            'transform-origin': 'top left'
        }
    });
}

/**
 * 导出DOM元素为图片
 * @param element 要导出的DOM元素
 * @param options 导出选项
 * @param filename 导出文件名
 */
export async function exportDomToImage(
    element: HTMLElement,
    options: ExportOptions,
    filename: string
): Promise<void> {
    try {
        // 获取元素的实际高度
        const totalHeight = element.scrollHeight;
        
        // 创建DOM目标，传递样式选项
        const target = createDomTarget(element, options);
        document.body.appendChild(target.element);
        
        // 计算分割位置
        const elements = getElementMeasures(target.contentElement, options.split.mode);
        const splitPositions = calculateSplitPositions({
            mode: options.split.mode,
            height: options.split.height,
            overlap: options.split.overlap,
            totalHeight
        }, elements);
        
        // 创建ZIP压缩包
        const zip = new JSZip();
        const blobs: {blob: Blob, name: string}[] = [];
        
        try {
            // 遍历所有分割位置
            for (let i = 0; i < splitPositions.length; i++) {
                const { startY, height } = splitPositions[i];
                
                // 设置裁剪区域
                target.setClip(startY, height);
                
                // 等待20ms以确保渲染完成
                await new Promise(resolve => setTimeout(resolve, 20));
                
                // 获取Blob对象
                const mimeType = getMimeType(options.format);
                const blob = await getElementBlob(target.element, options.highResolution, mimeType);
                
                // 生成文件名
                const partFilename = splitPositions.length > 1 
                    ? `${filename}_${i+1}.${getExtension(options.format)}`
                    : `${filename}.${getExtension(options.format)}`;
                
                blobs.push({ blob, name: partFilename });
            }
            
            // 根据数量决定导出方式
            if (blobs.length === 1) {
                // 只有一个文件，直接下载
                saveAs(blobs[0].blob, blobs[0].name);
                new Notice(`成功导出图片: ${blobs[0].name}`);
            } else {
                // 多个文件，创建ZIP
                for (const { blob, name } of blobs) {
                    zip.file(name, blob);
                }
                
                // 生成并下载ZIP
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                saveAs(zipBlob, `${filename}.zip`);
                new Notice(`成功导出${blobs.length}张图片到ZIP文件`);
            }
        } finally {
            // 恢复原始状态
            target.resetClip();
            // 移除临时元素
            if (target.element.parentNode) {
                target.element.parentNode.removeChild(target.element);
            }
        }
    } catch (error) {
        console.error('导出图片失败:', error);
        new Notice('导出图片失败，请查看控制台了解详情');
    }
}

/**
 * 获取MIME类型
 * @param format 导出格式
 * @returns MIME类型
 */
function getMimeType(format: ExportFormat): string {
    switch (format) {
        case 'png': return 'image/png';
        case 'jpeg': return 'image/jpeg';
        case 'svg': return 'image/svg+xml';
        case 'pdf': return 'application/pdf';
        default: return 'image/png';
    }
}

/**
 * 获取文件扩展名
 * @param format 导出格式
 * @returns 文件扩展名
 */
function getExtension(format: ExportFormat): string {
    switch (format) {
        case 'png': return 'png';
        case 'jpeg': return 'jpg';
        case 'svg': return 'svg';
        case 'pdf': return 'pdf';
        default: return 'png';
    }
}
