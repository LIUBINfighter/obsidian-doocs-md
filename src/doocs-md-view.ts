import { ItemView, WorkspaceLeaf, MarkdownView, setIcon, Notice, TFile } from "obsidian";
import DoocsMd from "./main";
import { MarkdownRender, RenderFormat } from "./render";
import { ThemeManager } from "./utils/themeManager";
import { SizeManager } from "./utils/sizeManager";
import { ClipboardManager } from "./utils/clipboardManager";

// 定义视图类型
export const VIEW_TYPE_DOOCS_PREVIEW = 'doocs-md-preview';

// 预览视图类
export class DoocsMdPreviewView extends ItemView {
	private plugin: DoocsMd;
	private toolbarEl: HTMLElement;
	private previewEl: HTMLElement;
	private isFocused: boolean = false;
	private updateDebounceTimeout: number | null = null;
	private debounceDelay: number = 1000; // 1秒的防抖延迟
	
	// 记录最后活动的Markdown文件
	private lastActiveMarkdownFile: TFile | null = null;
	private lastContent: string = "";
	
	// 当前渲染格式
	private currentFormat: RenderFormat = RenderFormat.DEFAULT;
	
	constructor(leaf: WorkspaceLeaf, plugin: DoocsMd) {
		super(leaf);
		this.plugin = plugin;
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
		SizeManager.applyPreviewSize(
			this.previewEl, 
			this.plugin.settings.aspectRatio,
			this.plugin.settings.baseWidth
		);
		
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
		
		// 初始应用主题
		ThemeManager.applyTheme(this.previewEl, this.plugin.settings.previewTheme);
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
		
		// 使用渲染器渲染内容
		await MarkdownRender.renderMarkdownToElement(
			content, 
			renderContainer, 
			filePath, 
			this,
			this.currentFormat
		);
		
		// 确保主题被应用
		ThemeManager.applyTheme(this.previewEl, this.plugin.settings.previewTheme);
	}
	
	// 创建工具栏
	createToolbar() {
		this.toolbarEl.empty();
		
		// 创建预览比例选择栏
		const ratioContainerEl = this.toolbarEl.createDiv({ cls: "doocs-md-ratio-container" });
		
		// 工具栏标题
		const titleEl = ratioContainerEl.createDiv({ cls: "doocs-md-toolbar-title" });
		titleEl.setText("预览比例：");
		
		// 创建下拉选择框
		const selectEl = ratioContainerEl.createEl("select", { cls: "doocs-md-ratio-select" });
		
		// 添加长宽比选项
		SizeManager.getAspectRatioOptions().forEach(option => {
			const optionEl = selectEl.createEl("option", {
				text: option.label,
				value: option.ratio
			});
			
			// 设置当前选中项
			if (this.plugin.settings.aspectRatio === option.ratio) {
				optionEl.selected = true;
			}
		});
		
		// 下拉框选择事件
		selectEl.addEventListener("change", (e) => {
			const target = e.target as HTMLSelectElement;
			const selectedOption = SizeManager.getOptionByRatio(target.value);
			
			if (selectedOption) {
				// 更新设置
				this.plugin.settings.aspectRatio = selectedOption.ratio;
				this.plugin.settings.baseWidth = selectedOption.baseWidth;
				this.plugin.saveSettings();
				
				// 应用新尺寸
				SizeManager.applyPreviewSize(
					this.previewEl, 
					selectedOption.ratio, 
					selectedOption.baseWidth
				);
				
				// 提示用户
				new Notice(`预览比例已设置为${selectedOption.label}`);
			}
		});
		
		// 创建格式选择下拉框
		const formatSelectEl = this.toolbarEl.createEl("select", { cls: "doocs-md-format-select" });
		
		// 添加格式选项
		const formatOptions = [
			{ value: RenderFormat.DEFAULT, label: "默认格式" },
			{ value: RenderFormat.WECHAT, label: "微信公众号" }
		];
		
		formatOptions.forEach(option => {
			const optionEl = formatSelectEl.createEl("option", {
				text: option.label,
				value: option.value
			});
			
			if (this.currentFormat === option.value) {
				optionEl.selected = true;
			}
		});
		
		// 格式选择事件
		formatSelectEl.addEventListener("change", (e) => {
			const target = e.target as HTMLSelectElement;
			this.currentFormat = target.value as RenderFormat;
			
			// 更新预览
			this.updatePreviewFromActiveFile();
			
			// 如果选择了微信格式，添加额外样式
			if (this.currentFormat === RenderFormat.WECHAT) {
				this.previewEl.addClass("wechat-preview-mode");
				// 移除之前的主题样式
				ThemeManager.applyTheme(this.previewEl, "light");
				// 禁用主题按钮
				const themeBtn = this.toolbarEl.querySelector(".doocs-md-theme-btn") as HTMLElement;
				if (themeBtn) {
					themeBtn.style.opacity = "0.5";
					themeBtn.style.pointerEvents = "none";
				}
				new Notice(`已切换为微信公众号格式预览，固定为浅色主题`);
			} else {
				this.previewEl.removeClass("wechat-preview-mode");
				// 恢复主题按钮
				const themeBtn = this.toolbarEl.querySelector(".doocs-md-theme-btn") as HTMLElement;
				if (themeBtn) {
					themeBtn.style.opacity = "1";
					themeBtn.style.pointerEvents = "auto";
				}
				// 恢复当前主题
				ThemeManager.applyTheme(this.previewEl, this.plugin.settings.previewTheme);
				new Notice(`已切换为默认格式预览`);
			}
		});
		
		// 添加主题切换按钮
		const themeBtn = this.toolbarEl.createEl("button", { 
			cls: "doocs-md-theme-btn",
			attr: { title: "切换背景颜色" }
		});
		
		// 设置主题按钮图标
		ThemeManager.setThemeButtonIcon(themeBtn, this.plugin.settings.previewTheme);
		
		// 切换主题事件
		themeBtn.addEventListener("click", () => {
			// 切换主题并获取新主题
			const newTheme = ThemeManager.toggleTheme(this.plugin, this.previewEl);
			// 更新按钮图标
			ThemeManager.setThemeButtonIcon(themeBtn, newTheme);
		});
		
		// 添加复制HTML按钮
		const copyBtn = this.toolbarEl.createEl("button", { 
			cls: "doocs-md-copy-btn",
			attr: { title: "复制HTML到剪贴板" }
		});
		setIcon(copyBtn, "clipboard-copy");
		
		// 复制HTML事件
		copyBtn.addEventListener("click", () => {
			const renderContainer = this.previewEl.querySelector('.doocs-md-render');
			ClipboardManager.copyHtmlFromElement(renderContainer);
		});
		
		// 添加聚焦状态指示器
		// const focusIndicator = this.toolbarEl.createDiv({ cls: "doocs-md-focus-indicator" });
		// focusIndicator.setText("预览聚焦时将暂停自动更新");
		
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
		
		// 添加新按钮：复制为Markdown
		const copyMdBtn = this.toolbarEl.createEl("button", { 
			cls: "doocs-md-copy-btn",
			attr: { title: "复制美化后的Markdown" }
		});
		setIcon(copyMdBtn, "file-text");
		
		copyMdBtn.addEventListener("click", () => {
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView && activeView.editor) {
				const content = activeView.editor.getValue();
				ClipboardManager.copyText(content);
				new Notice("已复制原始Markdown内容");
			} else if (this.lastContent) {
				ClipboardManager.copyText(this.lastContent);
				new Notice("已复制缓存的Markdown内容");
			} else {
				new Notice("没有找到可复制的Markdown内容");
			}
		});
	}
}
