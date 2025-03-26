/**
 * 示例卡片样式
 * 展示如何创建一个自定义样式模板
 */

import { CardStyleTemplate, StyleElements } from './index';

// 示例样式模板
const ExampleStyle: CardStyleTemplate = {
    id: 'example',
    name: '示例样式',
    description: '一个用于展示如何创建自定义样式的模板',
    author: '您的名字',
    prefix: 'example-card',

    // CSS文本，使用Obsidian的CSS变量实现主题适配
    css: `
        /* 示例卡片样式 */
        .example-card-container {
            background-color: var(--background-primary);
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            transition: all 0.3s ease;
            border: 1px solid var(--background-modifier-border);
        }
        
        .example-card-container:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
        }
        
        .example-card-toolbar {
            background: linear-gradient(to right, var(--interactive-accent), var(--background-modifier-accent));
            padding: 10px 16px;
            color: var(--text-on-accent);
            border-bottom: 1px solid var(--background-modifier-border);
        }
        
        .example-card-preview {
            padding: 24px;
            background-color: var(--background-primary);
        }
        
        /* 自定义标题样式 */
        .example-card-preview h1, 
        .example-card-preview h2 {
            border-bottom: 2px solid var(--interactive-accent);
            padding-bottom: 6px;
            color: var(--text-accent);
        }
        
        /* 自定义列表样式 */
        .example-card-preview ul li::before {
            content: "★";
            color: var(--interactive-accent);
            display: inline-block;
            width: 1em;
            margin-left: -1em;
        }
        
        /* 自定义按钮样式 */
        .example-card-button {
            background-color: var(--interactive-accent);
            color: var(--text-on-accent);
            border: none;
            border-radius: 20px;
            padding: 6px 12px;
            font-weight: bold;
            transition: all 0.2s ease;
        }
        
        .example-card-button:hover {
            opacity: 0.9;
            transform: scale(1.05);
        }
        
        /* 自定义分页样式 */
        .example-card-pagination {
            background-color: var(--background-secondary-alt);
            border-radius: 20px;
            padding: 8px 16px;
        }
        
        /* 自定义选择框样式 */
        .example-card-select {
            border: 2px solid var(--interactive-accent);
            border-radius: 4px;
            padding: 4px 8px;
            background-color: var(--background-primary);
            color: var(--text-normal);
        }
    `,

    // 获取元素的样式类
    getClass(element: StyleElements, defaultClass: string): string {
        // 根据元素类型返回自定义类名
        switch(element) {
            case StyleElements.Container:
                return `${this.prefix}-container ${defaultClass}`;
            case StyleElements.Toolbar:
                return `${this.prefix}-toolbar ${defaultClass}`;
            case StyleElements.PreviewBox:
                return `${this.prefix}-preview ${defaultClass}`;
            case StyleElements.Pagination:
                return `${this.prefix}-pagination ${defaultClass}`;
            case StyleElements.Button:
                return `${this.prefix}-button ${defaultClass}`;
            case StyleElements.Select:
                return `${this.prefix}-select ${defaultClass}`;
            default:
                return defaultClass;
        }
    },

    // 可选：对元素应用额外的自定义样式
    applyCustomStyle(element: HTMLElement, elementType: StyleElements): void {
        // 这里可以添加额外的样式逻辑
        // 例如为某些元素添加特殊的背景色、边框等
        if (elementType === StyleElements.Container) {
            // 为容器添加特殊样式
        }
    }
};

export default ExampleStyle;
