/**
 * 预览尺寸管理器
 * 负责处理预览区域的尺寸计算和应用
 */
export class SizeManager {
    // 可用的预览框长宽比例选项
    static aspectRatioOptions = [
        { ratio: 'auto', baseWidth: 800, label: '自适应' },
        { ratio: '9:16', baseWidth: 375, label: '9:16 (主流手机)' },
        { ratio: '9:19.5', baseWidth: 375, label: '9:19.5 (iPhone X+)' },
        { ratio: '9:20', baseWidth: 375, label: '9:20 (全面屏手机)' },
        { ratio: '3:4', baseWidth: 768, label: '3:4 (iPad竖屏)' },
        { ratio: '4:3', baseWidth: 768, label: '4:3 (iPad横屏)' },
        { ratio: '2:3', baseWidth: 768, label: '2:3 (Surface竖屏)' },
        { ratio: '1:1', baseWidth: 500, label: '1:1 (正方形)' }
    ];
    
    /**
     * 应用预览尺寸
     * @param previewEl 预览容器元素
     * @param aspectRatio 长宽比
     * @param baseWidth 基础宽度
     */
    static applyPreviewSize(previewEl: HTMLElement, aspectRatio: string, baseWidth: number): void {
        if (!previewEl) return;
        
        if (aspectRatio === 'auto') {
            // 自适应模式
            previewEl.style.width = `${baseWidth}px`;
            previewEl.style.height = 'auto';
            previewEl.style.maxHeight = "none";
            previewEl.style.overflow = "visible";
        } else {
            // 计算宽高比 - 注意：我们使用高宽比例格式 (h:w)，而不是宽高比 (w:h)
            const [widthRatio, heightRatio] = aspectRatio.split(':').map(Number);
            // 根据比例计算高度
            const height = (baseWidth * heightRatio) / widthRatio;
            
            previewEl.style.width = `${baseWidth}px`;
            previewEl.style.height = `${height}px`;
            previewEl.style.overflow = "auto";
        }
        
        // 中心对齐预览容器
        previewEl.style.margin = "0 auto";
    }
    
    /**
     * 获取长宽比例选项
     * @returns 长宽比例选项数组
     */
    static getAspectRatioOptions() {
        return this.aspectRatioOptions;
    }
    
    /**
     * 根据比例名称获取选项
     * @param ratio 比例名称
     * @returns 对应的选项
     */
    static getOptionByRatio(ratio: string) {
        return this.aspectRatioOptions.find(option => option.ratio === ratio);
    }
}
