import { ItemView, WorkspaceLeaf, MarkdownView, MarkdownRenderer, setIcon, Notice, TFile } from "obsidian";
import Md2Cards from "./main";
import { getAllStyles, switchStyle, applyGlobalStyles } from './assets';
import * as domtoimage from 'dom-to-image-more'; // 导入 dom-to-image-more
import { exportCurrentCard, ExportFormat } from './export'; // 引入导出函数

// 定义视图类型
export const VIEW_TYPE_DOOCS_PREVIEW = 'md-notes-preview';

// 预览视图类
export class Md2CardsPreviewView extends ItemView {
	private plugin: Md2Cards;
	private toolbarEl: HTMLElement;
	private previewEl: HTMLElement;
	private paginationEl: HTMLElement;
	private isFocused: boolean = false;
	private updateDebounceTimeout: number | null = null;
	private debounceDelay: number = 1000; // 1秒的防抖延迟
	
	// 记录最后活动的Markdown文件
	private lastActiveMarkdownFile: TFile | null = null;
	private lastContent: string = "";
	
	// 卡片数据
	private cards: string[] = [];
	private currentCardIndex: number = 0;
	
	constructor(leaf: WorkspaceLeaf, plugin: Md2Cards) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_DOOCS_PREVIEW;
	}

	getDisplayText(): string {
		return "md2cards 预览";
	}

	async onOpen() {
		const { containerEl } = this;
		containerEl.empty();
		
		// 创建工具栏
		this.toolbarEl = containerEl.createDiv({ cls: "md-notes-toolbar" });
		this.createToolbar();
		
		// 创建预览容器
		this.previewEl = containerEl.createDiv({ cls: "md-notes-preview-container" });
		this.applyPreviewSize();
		
		// 创建分页控件
		this.paginationEl = containerEl.createDiv({ cls: "md-notes-pagination" });
		
		// 添加焦点事件监听
		this.registerDomEvent(this.containerEl, 'focusin', () => {
			this.isFocused = true;
			this.containerEl.addClass('md-notes-view-focused');
		});
		
		this.registerDomEvent(this.containerEl, 'focusout', (e) => {
			// 检查焦点是否移出了预览视图
			if (!this.containerEl.contains(e.relatedTarget as Node)) {
				this.isFocused = false;
				this.containerEl.removeClass('md-notes-view-focused');
			}
		});
		
		// 监听活动文件变化
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView && activeView.file) {
					this.lastActiveMarkdownFile = activeView.file;
					this.debouncedUpdatePreview();
				}
			})
		);

		// 监听编辑器内容变化
		this.registerEvent(
			this.app.workspace.on('editor-change', (editor) => {
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (activeView && activeView.file) {
					this.lastActiveMarkdownFile = activeView.file;
					this.debouncedUpdatePreview();
				}
			})
		);
		
		// 初始更新预览
		this.updatePreviewFromActiveFile();
	}

	async onClose() {
		// 清除可能存在的防抖计时器
		if (this.updateDebounceTimeout) {
			window.clearTimeout(this.updateDebounceTimeout);
			this.updateDebounceTimeout = null;
		}
		this.containerEl.empty();
	}
	
	// 防抖更新预览
	debouncedUpdatePreview() {
		// 清除现有的计时器
		if (this.updateDebounceTimeout) {
			window.clearTimeout(this.updateDebounceTimeout);
		}
		
		// 设置新的计时器
		this.updateDebounceTimeout = window.setTimeout(() => {
			// 只有在非聚焦状态下才更新，或者用户点击了刷新按钮
			if (!this.isFocused) {
				this.updatePreviewFromActiveFile();
			}
			this.updateDebounceTimeout = null;
		}, this.debounceDelay);
	}
	
	// 从当前活动文件或最后活动的Markdown文件更新预览
	async updatePreviewFromActiveFile() {
		let content = "";
		let filePath = "";
		
		// 首先检查当前活动视图是否是Markdown
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		
		if (activeView && activeView.file) {
			// 当前活动的是Markdown视图
			content = activeView.editor.getValue();
			filePath = activeView.file.path;
			this.lastActiveMarkdownFile = activeView.file;
			this.lastContent = content;
		} else if (this.lastActiveMarkdownFile) {
			// 使用最后一个活动的Markdown文件
			try {
				content = await this.app.vault.read(this.lastActiveMarkdownFile);
				filePath = this.lastActiveMarkdownFile.path;
				this.lastContent = content;
			} catch (error) {
				console.error("无法读取最后活动的Markdown文件:", error);
				content = this.lastContent;
				filePath = this.lastActiveMarkdownFile.path;
			}
		}
		
		// 如果没有内容可以预览，显示提示
		if (!content) {
			this.showNoFileMessage();
			return;
		}
		
		// 解析内容为卡片
		this.parseContentToCards(content);
		
		// 渲染当前卡片
		this.renderCurrentCard(filePath);
		
		// 更新分页控件
		this.updatePagination();
	}
	
	// 将Markdown内容分割为卡片
	parseContentToCards(content: string) {
		// 分割内容
		const segments = content.split(/^## /m);
		
		// 处理分割后的片段
		this.cards = [];
		
		// 处理第一个片段 (可能没有## 前缀)
		if (segments[0].trim() !== '') {
			// 如果文档以## 开头，第一个片段会是空字符串
			// 如果不是空字符串，说明第一个片段是正文开始，不以## 开头
			this.cards.push(segments[0]);
		}
		
		// 处理其余片段 (需要添加## 前缀)
		for (let i = 1; i < segments.length; i++) {
			if (segments[i].trim() !== '') {
				this.cards.push('## ' + segments[i]);
			}
		}
		
		// 重置当前卡片索引
		this.currentCardIndex = 0;
		
		// 如果没有卡片，尝试将整个内容作为一个卡片
		if (this.cards.length === 0 && content.trim() !== '') {
			this.cards.push(content);
		}
	}
	
	// 显示无文件消息
	showNoFileMessage() {
		this.previewEl.empty();
		const noFileEl = this.previewEl.createDiv({ cls: 'md-notes-no-file' });
		noFileEl.setText("没有打开的Markdown文件");
		
		// 清空分页控件
		this.paginationEl.empty();
	}
	
	// 渲染当前卡片
	async renderCurrentCard(filePath: string) {
		// 清空旧内容
		this.previewEl.empty();
		
		// 添加文件路径指示径指示
		// if (this.lastActiveMarkdownFile) {) {
		// 	const pathIndicator = this.previewEl.createDiv({ cls: "md-notes-file-path" });});
		// 	pathIndicator.setText(`预览: ${this.lastActiveMarkdownFile.basename}`);`);
		// }/ }
		
		// 检查是否有卡片
		if (this.cards.length === 0) {
			const noCardsEl = this.previewEl.createDiv({ cls: 'md-notes-no-cards' });
			noCardsEl.setText("未找到卡片内容，请确保文档中有二级标题(## )");
			return;
		}
		
		// 创建渲染容器
		const renderContainer = this.previewEl.createDiv({ cls: "md-notes-render" });
		// 移除 height: 100% 和 overflow: auto 样式
		// renderContainer.style.height = "100%";
		// renderContainer.style.overflow = "auto";
		
		try {
			// 获取当前卡片内容
			const cardContent = this.cards[this.currentCardIndex];
			
			// 使用Obsidian的Markdown渲染器进行渲染
			await MarkdownRenderer.renderMarkdown(
				cardContent,
				renderContainer,
				filePath,
				this
			);
		} catch (error) {
			console.error("Markdown渲染失败:", error);
			renderContainer.innerHTML = "<p>渲染失败，请检查Markdown格式</p>";
		}
	}
	
	// 更新分页控件
	updatePagination() {
		this.paginationEl.empty();
		
		if (this.cards.length <= 1) {
			return; // 只有一个卡片或没有卡片时不显示分页
		}
		
		// 创建分页容器
		const paginationContainer = this.paginationEl.createDiv({ cls: "md-notes-pagination-container" });
		
		// 上一页按钮
		const prevBtn = paginationContainer.createEl("button", { 
			cls: "md-notes-pagination-btn md-notes-prev-btn",
			attr: { title: "上一页" }
		});
		setIcon(prevBtn, "arrow-left");
		prevBtn.addEventListener("click", () => {
			if (this.currentCardIndex > 0) {
				this.currentCardIndex--;
				this.renderCurrentCard(this.lastActiveMarkdownFile?.path || "");
				this.updatePagination();
			}
		});
		
		// 页码指示
		const pageIndicator = paginationContainer.createDiv({ cls: "md-notes-page-indicator" });
		pageIndicator.setText(`${this.currentCardIndex + 1} / ${this.cards.length}`);
		
		// 下一页按钮
		const nextBtn = paginationContainer.createEl("button", { 
			cls: "md-notes-pagination-btn md-notes-next-btn",
			attr: { title: "下一页" }
		});
		setIcon(nextBtn, "arrow-right");
		nextBtn.addEventListener("click", () => {
			if (this.currentCardIndex < this.cards.length - 1) {
				this.currentCardIndex++;
				this.renderCurrentCard(this.lastActiveMarkdownFile?.path || "");
				this.updatePagination();
			}
		});
	}
	
	// 创建工具栏
	createToolbar() {
		this.toolbarEl.empty();
		
		// 工具栏左侧 - 样式选择器
		const leftSection = this.toolbarEl.createDiv({ cls: "md-notes-toolbar-section" });
		
		// 样式选择标签
		// const styleLabel = leftSection.createDiv({ cls: "md-notes-toolbar-label" });
		// styleLabel.setText("样式：");
		
		// 创建样式选择下拉框
		const styleSelect = leftSection.createEl("select", { cls: "md-notes-style-select" });
		
		// 添加所有可用样式
		const styles = getAllStyles();
		styles.forEach(style => {
			const optionEl = styleSelect.createEl("option", { 
				value: style.id,
				text: style.name
			});
			
			if (this.plugin.settings.styleId === style.id) {
				optionEl.selected = true;
			}
		});
		
		// 监听选择变化
		styleSelect.addEventListener("change", () => {
			this.plugin.settings.styleId = styleSelect.value;
			
			// 切换样式
			if (switchStyle(styleSelect.value)) {
				// 应用全局样式
				applyGlobalStyles(document.body);
				
				// 刷新预览
				this.renderCurrentCard(this.lastActiveMarkdownFile?.path || "");
			}
			
			this.plugin.saveSettings();
			new Notice(`样式已切换为 ${styleSelect.options[styleSelect.selectedIndex].text}`);
		});
		
		// 添加分隔符
		const separator = leftSection.createDiv({ cls: "md-notes-toolbar-separator" });
		
		// 添加主题选择器
		// const themeLabel = leftSection.createDiv({ cls: "md-notes-toolbar-label" });
		// themeLabel.setText("主题：");
		
		// 创建主题选择下拉框
		const themeSelect = leftSection.createEl("select", { cls: "md-notes-theme-select" });
		
		// 添加所有可用主题
		const themes = this.plugin.themeLoader.getThemes();
		themes.forEach(theme => {
			const optionEl = themeSelect.createEl("option", { 
				value: theme.name,
				text: theme.name
			});
			
			if (this.plugin.settings.themeName === theme.name) {
				optionEl.selected = true;
			}
		});
		
		// 监听选择变化
		themeSelect.addEventListener("change", () => {
			this.plugin.settings.themeName = themeSelect.value;
			this.plugin.saveSettings();
			new Notice(`主题已切换为 ${themeSelect.value}`);
		});
		
		// 添加另一个分隔符
		const separator2 = leftSection.createDiv({ cls: "md-notes-toolbar-separator" });
		
		// 比例选择标签
		// const ratioLabel = leftSection.createDiv({ cls: "md-notes-toolbar-label" });
		// ratioLabel.setText("预览比例：");
		
		// 创建下拉选择框
		const ratioSelect = leftSection.createEl("select", { cls: "md-notes-ratio-select" });
		
		// 添加选项
		const ratioOptions = [
			{ value: "1:1", label: "1:1 (正方形)" },
			{ value: "3:4", label: "3:4 (竖屏)" },
			{ value: "4:3", label: "4:3 (横屏)" }
		];
		
		ratioOptions.forEach(option => {
			const optionEl = ratioSelect.createEl("option", { 
				value: option.value,
				text: option.label
			});
			
			if (this.plugin.settings.aspectRatio === option.value) {
				optionEl.selected = true;
			}
		});
		
		// 监听选择变化
		ratioSelect.addEventListener("change", () => {
			this.plugin.settings.aspectRatio = ratioSelect.value;
			
			// 根据长宽比设置基础宽度
			if (ratioSelect.value === "1:1") {
				this.plugin.settings.baseWidth = 500;
			} else {
				this.plugin.settings.baseWidth = 768;
			}
			
			this.plugin.saveSettings();
			this.applyPreviewSize();
			new Notice(`预览比例已设置为 ${ratioSelect.value}`);
		});
		
		// 工具栏右侧 - 操作按钮
		const rightSection = this.toolbarEl.createDiv({ cls: "md-notes-toolbar-section" });
		
		// 宽度调整控件
		const widthControls = rightSection.createDiv({ cls: "md-notes-width-controls" });
		
		// 宽度标签
		// const widthLabel = widthControls.createDiv({ cls: "md-notes-toolbar-label" });
		// widthLabel.setText("宽度：");
		
		// 宽度值显示
		const widthValueEl = widthControls.createDiv({ cls: "md-notes-width-value" });
		widthValueEl.setText(`${Math.round(this.plugin.settings.widthScale * 100)}%`);
		
		// 减小宽度按钮
		const decreaseBtn = widthControls.createEl("button", {
			cls: "md-notes-width-btn",
			text: "-"
		});
		
		// 增加宽度按钮
		const increaseBtn = widthControls.createEl("button", {
			cls: "md-notes-width-btn",
			text: "+"
		});
		
		// 减小宽度事件
		decreaseBtn.addEventListener("click", () => {
			// 限制最小缩放为0.5 (50%)
			this.plugin.settings.widthScale = Math.max(0.5, this.plugin.settings.widthScale - 0.1);
			this.updateWidthScale(widthValueEl);
		});
		
		// 增加宽度事件
		increaseBtn.addEventListener("click", () => {
			// 限制最大缩放为2.0 (200%)
			this.plugin.settings.widthScale = Math.min(2.0, this.plugin.settings.widthScale + 0.1);
			this.updateWidthScale(widthValueEl);
		});
		
		// 刷新按钮
		const refreshBtn = rightSection.createEl("button", { 
			cls: "md-notes-refresh-btn",
			attr: { title: "刷新预览" }
		});
		setIcon(refreshBtn, "refresh-cw");
		refreshBtn.addEventListener("click", () => {
			// 强制刷新，无论是否聚焦
			this.updatePreviewFromActiveFile();
			new Notice("预览已刷新");
		});
		
		// 导出图片按钮
		const exportBtn = rightSection.createEl("button", { 
			cls: "md-notes-export-btn",
			attr: { title: "导出所有卡片为图片" }
		});
		setIcon(exportBtn, "download");
		exportBtn.addEventListener("click", () => {
			this.exportAllCardsAsImages();
		});
	}
	
	// 更新宽度缩放
	updateWidthScale(widthValueEl: HTMLElement) {
		// 更新宽度显示
		widthValueEl.setText(`${Math.round(this.plugin.settings.widthScale * 100)}%`);
		
		// 保存设置
		this.plugin.saveSettings();
		
		// 应用新尺寸
		this.applyPreviewSize();
	}
	
	// 应用预览尺寸
	applyPreviewSize() {
		if (!this.previewEl) return;
		
		const { aspectRatio, baseWidth, widthScale } = this.plugin.settings;
		
		// 调整后的宽度
		const scaledWidth = baseWidth * widthScale;
		
		// 计算宽高比
		const [widthRatio, heightRatio] = aspectRatio.split(':').map(Number);
		// 根据比例计算高度
		const height = (scaledWidth * heightRatio) / widthRatio;
		
		this.previewEl.style.width = `${scaledWidth}px`;
		this.previewEl.style.height = `${height}px`;
		this.previewEl.style.overflow = "auto";
		
		// 中心对齐预览容器
		this.previewEl.style.margin = "0 auto";
	}
	
	// 导出所有卡片为图片的方法
	async exportAllCardsAsImages() {
		// 检查是否有卡片
		if (this.cards.length === 0) {
			new Notice("没有可导出的卡片");
			return;
		}
		
		// 检查是否有活动文件
		if (!this.lastActiveMarkdownFile) {
			new Notice("没有活动的Markdown文件");
			return;
		}
		
		// 获取预览容器
		const node = this.previewEl.querySelector(".md-notes-render") as HTMLElement;
		
		if (!node) {
			new Notice("找不到要导出的内容");
			return;
		}
		
		// 获取当前卡片容器的尺寸
		const containerWidth = this.previewEl.clientWidth;
		const containerHeight = this.previewEl.clientHeight;
		
		// 获取当前主题CSS
		const themeCSS = await this.plugin.themeLoader.getThemeCSS(this.plugin.settings.themeName);
		
		// 使用解耦的导出功能导出当前卡片
		await exportCurrentCard(
			node,
			this.lastActiveMarkdownFile,
			this.currentCardIndex,
			ExportFormat.PNG,
			{
				// 缩放比例，提高图片清晰度
				scale: 2,
				// 设置背景色，确保透明元素可见
				backgroundColor: 'white',
				// 传递容器尺寸
				width: containerWidth,
				height: containerHeight,
				// 添加边框和圆角
				borderRadius: this.plugin.settings.exportSettings.borderRadius,
				border: this.plugin.settings.exportSettings.addBorder,
				// 添加社交卡片样式
				socialCard: this.plugin.settings.exportSettings.socialCard,
				// 添加作者信息
				author: {
					name: this.plugin.settings.exportSettings.authorName || '匿名用户',
					avatar: this.plugin.settings.exportSettings.authorAvatar
				},
				// 添加水印
				watermark: {
					text: this.plugin.settings.exportSettings.watermarkText,
					position: 'bottom-right'
				},
				// 添加主题信息
				themeName: this.plugin.settings.themeName,
				// 添加主题样式
				extraStyles: themeCSS || '',
				// 添加自定义CSS
				customCSS: this.plugin.customCSS,
				// 添加分割选项
				split: {
					mode: this.plugin.settings.exportSettings.splitMode || 'fixed',
					height: this.plugin.settings.exportSettings.splitHeight || 1200,
					overlap: this.plugin.settings.exportSettings.splitOverlap || 50
				}
			}
		);
	}
}
