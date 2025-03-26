/**
 * MD2Cards样式管理器
 * 用于管理和切换不同的卡片样式
 */

// 样式模板接口
export interface CardStyleTemplate {
    id: string;           // 样式唯一标识
    name: string;         // 样式名称
    description: string;  // 样式描述
    author?: string;      // 作者(可选)
    
    // CSS类前缀，用于避免样式冲突
    prefix?: string;
    
    // 样式CSS文本，可以使用obsidian变量
    css: string;
    
    // 获取特定元素的自定义类名
    getClass(element: StyleElements, defaultClass: string): string;
    
    // 应用额外样式到特定元素
    applyCustomStyle?(element: HTMLElement, elementType: StyleElements): void;
}

// 可定制样式的元素类型
export enum StyleElements {
    Container,       // 主容器
    Toolbar,         // 工具栏
    PreviewBox,      // 预览框
    Pagination,      // 分页控件
    Button,          // 按钮
    Select           // 下拉选择框
}

// 注册的样式列表
const registeredStyles: Map<string, CardStyleTemplate> = new Map();

// 默认样式ID
let defaultStyleId: string = 'default';
let currentStyleId: string = defaultStyleId;

/**
 * 注册一个新样式
 * @param style 样式模板
 */
export function registerStyle(style: CardStyleTemplate): void {
    if (registeredStyles.has(style.id)) {
        console.warn(`样式 ${style.id} 已存在，将被覆盖`);
    }
    registeredStyles.set(style.id, style);
}

/**
 * 获取当前样式
 * @returns 当前使用的样式模板
 */
export function getCurrentStyle(): CardStyleTemplate | undefined {
    return registeredStyles.get(currentStyleId);
}

/**
 * 获取所有已注册的样式
 * @returns 样式ID和名称的列表
 */
export function getAllStyles(): {id: string, name: string}[] {
    const result: {id: string, name: string}[] = [];
    registeredStyles.forEach((style) => {
        result.push({id: style.id, name: style.name});
    });
    return result;
}

/**
 * 设置默认样式
 * @param styleId 样式ID
 */
export function setDefaultStyle(styleId: string): void {
    if (!registeredStyles.has(styleId)) {
        console.error(`样式 ${styleId} 不存在，无法设置为默认样式`);
        return;
    }
    defaultStyleId = styleId;
}

/**
 * 切换到指定样式
 * @param styleId 样式ID
 * @returns 是否切换成功
 */
export function switchStyle(styleId: string): boolean {
    if (!registeredStyles.has(styleId)) {
        console.error(`样式 ${styleId} 不存在，无法切换`);
        return false;
    }
    currentStyleId = styleId;
    return true;
}

/**
 * 获取指定元素的样式类名
 * @param element 元素类型
 * @param defaultClass 默认类名
 * @returns 完整的类名
 */
export function getStyleClass(element: StyleElements, defaultClass: string): string {
    const style = getCurrentStyle();
    if (!style) {
        return defaultClass;
    }
    return style.getClass(element, defaultClass);
}

/**
 * 应用全局样式表
 * @param containerEl 要添加样式的容器元素
 */
export function applyGlobalStyles(containerEl: HTMLElement): void {
    // 清除旧样式
    const oldStyle = containerEl.querySelector('#md2cards-custom-styles');
    if (oldStyle) {
        oldStyle.remove();
    }

    const style = getCurrentStyle();
    if (!style) return;

    // 创建样式元素
    const styleEl = document.createElement('style');
    styleEl.id = 'md2cards-custom-styles';
    styleEl.textContent = style.css;
    containerEl.appendChild(styleEl);
}

// 导出默认样式类
export { default as DefaultStyle } from './default-style';
