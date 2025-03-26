import { ItemView, WorkspaceLeaf, MarkdownView, MarkdownRenderer, setIcon, Notice, TFile, Slider } from "obsidian";
import DoocsMd from "./main";

// 定义视图类型
export const VIEW_TYPE_DOOCS_PREVIEW = 'doocs-md-preview';

// 预览视图类
export class DoocsMdPreviewView extends ItemView {
	private plugin: DoocsMd;
	private toolbarEl: HTMLElement;
	private previewEl: HTMLElement;
	private widthControlsEl: HTMLElement;
	private isFocused: boolean = false;
	private updateDebounceTimeout: number | null = null;
	private debounceDelay: number = 1000; // 1秒的防抖延迟
	
	// 记录最后活动的Markdown文件
	private lastActiveMarkdownFile: TFile | null = null;
	private lastContent: string = "";
	
	// 可用的预览框长宽比例选项
	private aspectRatioOptions = [
		{ ratio: 'auto', baseWidth: 800, label: '自适应' },
		{ ratio: '16:9', baseWidth: 375, label: '16:9 (主流手机)' },
		{ ratio: '9:19.5', baseWidth: 375, label: '9:19.5 (iPhone X+)' },
		{ ratio: '9:20', baseWidth: 375, label: '9:20 (全面屏手机)' },
		{ ratio: '3:4', baseWidth: 768, label: '3:4 (iPad竖屏)' },
		{ ratio: '4:3', baseWidth: 768, label: '4:3 (iPad横屏)' },
		{ ratio: '2:3', baseWidth: 768, label: '2:3 (Surface竖屏)' },
		{ ratio: '1:1', baseWidth: 500, label: '1:1 (正方形)' }
	];
	
	// 宽度缩放因子 (默认为1.0)
	private widthScale: number = 1.0;

	constructor(leaf: WorkspaceLeaf, plugin: DoocsMd) {
		super(leaf);
		this.plugin = plugin;
		
		// 从设置中读取宽度缩放因子
		this.widthScale = this.plugin.settings.widthScale || 1.0;
	}

	getViewType(): string {
		return VIEW_TYPE_DOOCS_PREVIEW;
	}

	getDisplayText(): string {
		return "Doocs MD 预览";
	}

	async onOpen() {
		const { containerEl } = this;
		containerEl.empty();
		
		// 创建工具栏
		this.toolbarEl = containerEl.createDiv({ cls: "doocs-md-toolbar" });
		this.createToolbar();
		
		// 创建预览容器
		this.previewEl = containerEl.createDiv({ cls: "doocs-md-preview-container" });
		this.applyPreviewSize();
		
		// 添加焦点事件监听
		this.registerDomEvent(this.containerEl, 'focusin', () => {
			this.isFocused = true;
			this.containerEl.addClass('doocs-md-view-focused');
		});
		
		this.registerDomEvent(this.containerEl, 'focusout', (e) => {
			// 检查焦点是否移出了预览视图
			if (!this.containerEl.contains(e.relatedTarget as Node)) {
				this.isFocused = false;
				this.containerEl.removeClass('doocs-md-view-focused');
			}
		});
		
		// 监听活动文件变化
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				// 获取当前活动视图
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				
				// 如果当前活动的是Markdown视图，则更新最后活动的Markdown文件
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
				
				// 确认编辑器变化发生在Markdown视图中
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
			// 通过文件路径打开文件内容
			try {
				content = await this.app.vault.read(this.lastActiveMarkdownFile);
				filePath = this.lastActiveMarkdownFile.path;
				this.lastContent = content;
			} catch (error) {
				console.error("无法读取最后活动的Markdown文件:", error);
				// 如果无法读取，使用上次的内容
				content = this.lastContent;
				filePath = this.lastActiveMarkdownFile.path;
			}
		}
		
		// 如果没有内容可以预览，显示提示
		if (!content) {
			this.showNoFileMessage();
			return;
		}
		
		this.renderMarkdown(content, filePath);
	}
	
	// 显示无文件消息
	showNoFileMessage() {
		this.previewEl.empty();
		const noFileEl = this.previewEl.createDiv({ cls: 'doocs-md-no-file' });
		noFileEl.setText("没有打开的Markdown文件");
	}
	
	// 渲染Markdown内容
	async renderMarkdown(content: string, filePath: string) {
		// 清空旧内容
		this.previewEl.empty();
		
		// 添加文件路径指示
		if (this.lastActiveMarkdownFile) {
			const pathIndicator = this.previewEl.createDiv({ cls: "doocs-md-file-path" });
			pathIndicator.setText(`预览: ${this.lastActiveMarkdownFile.basename}`);
		}
		
		// 创建渲染容器
		const renderContainer = this.previewEl.createDiv({ cls: "doocs-md-render" });
		
		try {
			// 使用Obsidian的Markdown渲染器进行渲染
			await MarkdownRenderer.renderMarkdown(
				content,
				renderContainer,
				filePath,
				this
			);
		} catch (error) {
			// 如果渲染失败，使用简单的备用解析器
			console.error("Markdown渲染失败:", error);
			renderContainer.innerHTML = this.fallbackParseMarkdown(content);
		}
	}
	
	// 创建工具栏
	createToolbar() {
		this.toolbarEl.empty();
		
		// 工具栏标题
		const titleEl = this.toolbarEl.createDiv({ cls: "doocs-md-toolbar-title" });
		titleEl.setText("预览比例：");
		
		// 长宽比选择器
		const ratioSelectEl = this.toolbarEl.createDiv({ cls: "doocs-md-toolbar-ratios" });
		
		// 添加长宽比选项
		this.aspectRatioOptions.forEach(option => {
			const ratioBtn = ratioSelectEl.createEl("button", { 
				cls: "doocs-md-ratio-btn",
				text: option.label
			});
			
			// 如果是当前选中的比例，添加active类
			if (this.plugin.settings.aspectRatio === option.ratio) {
				ratioBtn.addClass("active");
			}
			
			ratioBtn.addEventListener("click", () => {
				// 更新设置
				this.plugin.settings.aspectRatio = option.ratio;
				this.plugin.settings.baseWidth = option.baseWidth;
				this.plugin.saveSettings();
				
				// 移除所有按钮的active类
				ratioSelectEl.findAll(".doocs-md-ratio-btn").forEach(btn => 
					btn.removeClass("active"));
				
				// 为当前按钮添加active类
				ratioBtn.addClass("active");
				
				// 应用新尺寸
				this.applyPreviewSize();
				
				// 提示用户
				new Notice(`预览比例已设置为${option.label}`);
			});
		});
		
		// 添加聚焦状态指示器
		const focusIndicator = this.toolbarEl.createDiv({ cls: "doocs-md-focus-indicator" });
		focusIndicator.setText("预览聚焦时将暂停自动更新");
		
		// 刷新按钮
		const refreshBtn = this.toolbarEl.createEl("button", { 
			cls: "doocs-md-refresh-btn",
			attr: { title: "刷新预览" }
		});
		setIcon(refreshBtn, "refresh-cw");
		refreshBtn.addEventListener("click", () => {
			// 强制刷新，无论是否聚焦
			this.updatePreviewFromActiveFile();
			new Notice("预览已刷新");
		});
		
		// 创建宽度调整控件容器
		this.widthControlsEl = this.toolbarEl.createDiv({ cls: "doocs-md-width-controls" });
		this.createWidthControls();
	}
	
	// 创建宽度调整控件
	createWidthControls() {
		this.widthControlsEl.empty();
		
		// 宽度控制标题
		const widthTitleEl = this.widthControlsEl.createDiv({ cls: "doocs-md-width-title" });
		widthTitleEl.setText("预览宽度：");
		
		// 创建宽度显示
		const widthValueEl = this.widthControlsEl.createDiv({ cls: "doocs-md-width-value" });
		widthValueEl.setText(`${Math.round(this.widthScale * 100)}%`);
		
		// 创建减小宽度按钮
		const decreaseBtn = this.widthControlsEl.createEl("button", {
			cls: "doocs-md-width-btn",
			text: "-"
		});
		
		// 创建增加宽度按钮
		const increaseBtn = this.widthControlsEl.createEl("button", {
			cls: "doocs-md-width-btn",
			text: "+"
		});
		
		// 减小宽度事件
		decreaseBtn.addEventListener("click", () => {
			// 限制最小缩放为0.5 (50%)
			this.widthScale = Math.max(0.5, this.widthScale - 0.1);
			this.updateWidthScale();
		});
		
		// 增加宽度事件
		increaseBtn.addEventListener("click", () => {
			// 限制最大缩放为2.0 (200%)
			this.widthScale = Math.min(2.0, this.widthScale + 0.1);
			this.updateWidthScale();
		});
		
		// 重置宽度按钮
		const resetBtn = this.widthControlsEl.createEl("button", {
			cls: "doocs-md-width-reset-btn",
			text: "重置"
		});
		
		resetBtn.addEventListener("click", () => {
			this.widthScale = 1.0;
			this.updateWidthScale();
		});
	}
	
	// 更新宽度缩放
	updateWidthScale() {
		// 更新宽度显示
		const widthValueEl = this.widthControlsEl.querySelector(".doocs-md-width-value");
		if (widthValueEl) {
			widthValueEl.setText(`${Math.round(this.widthScale * 100)}%`);
		}
		
		// 保存设置
		this.plugin.settings.widthScale = this.widthScale;
		this.plugin.saveSettings();
		
		// 应用新尺寸
		this.applyPreviewSize();
	}
	
	// 应用预览尺寸
	applyPreviewSize() {
		if (!this.previewEl) return;
		
		const { aspectRatio, baseWidth } = this.plugin.settings;
		
		// 调整后的宽度
		const scaledWidth = baseWidth * this.widthScale;
		
		if (aspectRatio === 'auto') {
			// 自适应模式
			this.previewEl.style.width = `${scaledWidth}px`;
			this.previewEl.style.height = 'auto';
			this.previewEl.style.maxHeight = "none";
			this.previewEl.style.overflow = "visible";
		} else { //- 注意：我们使用高宽比例格式 (h:w)，而不是宽高比 (w:h)
			// 计算宽高比
			const [widthRatio, heightRatio] = aspectRatio.split(':').map(Number);
			// 根据比例计算高度
			const height = (scaledWidth * heightRatio) / widthRatio;
			
			this.previewEl.style.width = `${scaledWidth}px`;
			this.previewEl.style.height = `${height}px`;
			this.previewEl.style.overflow = "auto";
		}
		
		// 中心对齐预览容器
		this.previewEl.style.margin = "0 auto";
	}

	// 备用的简单Markdown解析器
	fallbackParseMarkdown(markdown: string): string {
		let html = markdown
			// 标题
			.replace(/^# (.*$)/gm, '<h1>$1</h1>')
			.replace(/^## (.*$)/gm, '<h2>$1</h2>')
			.replace(/^### (.*$)/gm, '<h3>$1</h3>')
			// 加粗
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			// 斜体
			.replace(/\*(.*?)\*/g, '<em>$1</em>')
			// 链接
			.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
			// 列表
			.replace(/^\- (.*$)/gm, '<li>$1</li>')
			// 代码块
			.replace(/```(.*?)\n([\s\S]*?)```/gm, '<pre><code class="language-$1">$2</code></pre>')
			// 行内代码
			.replace(/`(.*?)`/g, '<code>$1</code>');
		
		// 换行处理
		html = `<div>${html.split('\n').join('<br>')}</div>`;
		
		return html;
	}
}
