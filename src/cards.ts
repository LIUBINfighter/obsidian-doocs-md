import { ItemView, WorkspaceLeaf, MarkdownView, MarkdownRenderer, setIcon, Notice, TFile } from "obsidian";
import Md2Cards from "./main";

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
		// 使用二级标题作为分隔符
		this.cards = content.split(/^## /m).filter(Boolean);
		
		// 如果第一段不是以## 开头，需要特殊处理
		if (!content.trim().startsWith('## ')) {
			if (this.cards.length > 0) {
				// 如果有卡片，将第一段内容添加## 前缀
				this.cards[0] = '## ' + this.cards[0];
			}
		} else {
			// 如果内容以## 开头，为所有卡片添加## 前缀
			this.cards = this.cards.map(card => '## ' + card);
		}
		
		// 重置当前卡片索引
		this.currentCardIndex = 0;
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
		
		// 添加文件路径指示
		if (this.lastActiveMarkdownFile) {
			const pathIndicator = this.previewEl.createDiv({ cls: "md-notes-file-path" });
			pathIndicator.setText(`预览: ${this.lastActiveMarkdownFile.basename}`);
		}
		
		// 检查是否有卡片
		if (this.cards.length === 0) {
			const noCardsEl = this.previewEl.createDiv({ cls: 'md-notes-no-cards' });
			noCardsEl.setText("未找到卡片内容，请确保文档中有二级标题(## )");
			return;
		}
		
		// 创建渲染容器
		const renderContainer = this.previewEl.createDiv({ cls: "md-notes-render" });
		
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
		
		// 工具栏左侧 - 长宽比选择器
		const leftSection = this.toolbarEl.createDiv({ cls: "md-notes-toolbar-section" });
		
		// 比例选择标签
		const ratioLabel = leftSection.createDiv({ cls: "md-notes-toolbar-label" });
		ratioLabel.setText("预览比例：");
		
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
		const widthLabel = widthControls.createDiv({ cls: "md-notes-toolbar-label" });
		widthLabel.setText("宽度：");
		
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
		
		new Notice("卡片导出功能正在开发中");
		// 在此实现导出图片功能
		// 这里需要使用HTML-to-Image或类似库来实现
	}
}
