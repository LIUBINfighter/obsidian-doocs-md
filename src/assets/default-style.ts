/**
 * 默认卡片样式
 * 使用Obsidian原生变量，适配各种主题
 */

import { CardStyleTemplate, StyleElements } from './index';

// 默认样式模板
const DefaultStyle: CardStyleTemplate = {
    id: 'default',
    name: '默认样式',
    description: '适配Obsidian原生主题的默认卡片样式',
    author: 'MD2Cards',
    prefix: 'md-notes',

    // 默认CSS样式，使用Obsidian变量
    css: `
        /* 主容器样式 */
        .md-notes-preview-container {
            background-color: var(--background-primary);
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
            overflow: auto;
            padding: 20px;
            margin: 10px auto;
            border: 1px solid var(--background-modifier-border);
        }

        /* 工具栏样式 */
        .md-notes-toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 16px;
            background-color: var(--background-secondary);
            border-bottom: 1px solid var(--background-modifier-border);
            margin-bottom: 10px;
        }

        .md-notes-toolbar-section {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .md-notes-toolbar-label {
            font-size: 14px;
            color: var(--text-normal);
        }

        /* 下拉选择框 */
        .md-notes-ratio-select {
            background-color: var(--background-primary);
            border: 1px solid var(--background-modifier-border);
            border-radius: 4px;
            color: var(--text-normal);
            padding: 4px 8px;
            font-size: 14px;
        }

        /* 宽度控制 */
        .md-notes-width-controls {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .md-notes-width-value {
            font-size: 14px;
            color: var(--text-normal);
            min-width: 40px;
            text-align: center;
        }

        .md-notes-width-btn {
            background-color: var(--interactive-normal);
            color: var(--text-normal);
            border: none;
            border-radius: 4px;
            padding: 4px 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            min-width: 24px;
        }

        .md-notes-width-btn:hover {
            background-color: var(--interactive-hover);
        }

        /* 按钮样式 */
        .md-notes-refresh-btn,
        .md-notes-export-btn {
            background-color: var(--interactive-normal);
            color: var(--text-normal);
            border: none;
            border-radius: 4px;
            padding: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .md-notes-refresh-btn:hover,
        .md-notes-export-btn:hover {
            background-color: var(--interactive-hover);
        }

        /* 分页控件样式 */
        .md-notes-pagination {
            display: flex;
            justify-content: center;
            margin-top: 16px;
        }

        .md-notes-pagination-container {
            display: flex;
            align-items: center;
            gap: 12px;
            background-color: var(--background-secondary);
            padding: 8px 16px;
            border-radius: 8px;
        }

        .md-notes-pagination-btn {
            background-color: var(--interactive-normal);
            color: var(--text-normal);
            border: none;
            border-radius: 4px;
            padding: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .md-notes-pagination-btn:hover {
            background-color: var(--interactive-hover);
        }

        .md-notes-pagination-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .md-notes-page-indicator {
            font-size: 14px;
            color: var(--text-normal);
        }

        /* 状态提示样式 */
        .md-notes-no-file,
        .md-notes-no-cards {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100%;
            font-size: 16px;
            color: var(--text-muted);
            text-align: center;
            padding: 20px;
        }

        .md-notes-file-path {
            font-size: 12px;
            color: var(--text-muted);
            margin-bottom: 10px;
            padding-bottom: 6px;
            border-bottom: 1px solid var(--background-modifier-border);
        }

        /* 渲染容器样式 */
        .md-notes-render {
            height: 100%;
            overflow: auto;
        }

        /* 卡片内容样式增强 */
        .md-notes-render h1 {
            color: var(--text-accent);
            border-bottom: 1px solid var(--background-modifier-border);
            padding-bottom: 0.3em;
        }

        .md-notes-render h2 {
            color: var(--text-accent);
        }

        .md-notes-render a {
            color: var(--text-accent);
            text-decoration: none;
            border-bottom: 1px solid var(--text-accent-hover);
        }
        
        .md-notes-render a:hover {
            color: var(--text-accent-hover);
        }

        .md-notes-render blockquote {
            border-left: 4px solid var(--text-accent);
            margin: 0;
            padding-left: 1em;
            color: var(--text-muted);
        }

        .md-notes-render code {
            background-color: var(--background-secondary);
            padding: 0.2em 0.4em;
            border-radius: 3px;
        }

        /* 聚焦样式 */
        .md-notes-view-focused {
            outline: 2px solid var(--interactive-accent);
        }
    `,

    // 获取元素样式类
    getClass(element: StyleElements, defaultClass: string): string {
        // 默认样式直接使用原始类名
        return defaultClass;
    }
};

export default DefaultStyle;
