import { ItemView, WorkspaceLeaf, MarkdownView, MarkdownRenderer, setIcon, Notice } from "obsidian";
import DoocsMd from "./main";

// 定义视图类型
export const VIEW_TYPE_DOOCS_PREVIEW = 'doocs-md-preview';

// 预览视图类
export class DoocsMdPreviewView extends ItemView {
	private plugin: DoocsMd;
	private contentEl: HTMLElement;
	private toolbarEl: HTMLElement;
	private previewEl: HTMLElement;
	
	// 可用的预览框尺寸比例选项
	private sizeOptions = [
		{ width: '100%', height: 'auto', label: '自适应' },
		{ width: '800px', height: 'auto', label: '800px宽' },
		{ width: '600px', height: 'auto', label: '600px宽' },
		{ width: '414px', height: '736px', label: '手机尺寸' },
		{ width: '768px', height: '1024px', label: '平板尺寸' }
	];

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
		this.applyPreviewSize();
		
		// 更新视图内容
		this.updatePreview();

		// 监听活动文件变化
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				this.updatePreview();
			})
		);

		// 监听编辑器内容变化
		this.registerEvent(
			this.app.workspace.on('editor-change', (editor) => {
				this.updatePreview();
			})
		);
	}

	async onClose() {
		this.containerEl.empty();
	}
	
	// 创建工具栏
	createToolbar() {
		this.toolbarEl.empty();
		
		// 工具栏标题
		const titleEl = this.toolbarEl.createDiv({ cls: "doocs-md-toolbar-title" });
		titleEl.setText("预览尺寸：");
		
		// 尺寸选择器
		const sizeSelectEl = this.toolbarEl.createDiv({ cls: "doocs-md-toolbar-sizes" });
		
		// 添加尺寸选项
		this.sizeOptions.forEach(option => {
			const sizeBtn = sizeSelectEl.createEl("button", { 
				cls: "doocs-md-size-btn",
				text: option.label
			});
			
			// 如果是当前选中的尺寸，添加active类
			if (this.plugin.settings.previewWidth === option.width && 
				this.plugin.settings.previewHeight === option.height) {
				sizeBtn.addClass("active");
			}
			
			sizeBtn.addEventListener("click", () => {
				// 更新设置
				this.plugin.settings.previewWidth = option.width;
				this.plugin.settings.previewHeight = option.height;
				this.plugin.saveSettings();
				
				// 移除所有按钮的active类
				sizeSelectEl.findAll(".doocs-md-size-btn").forEach(btn => 
					btn.removeClass("active"));
				
				// 为当前按钮添加active类
				sizeBtn.addClass("active");
				
				// 应用新尺寸
				this.applyPreviewSize();
				
				// 提示用户
				new Notice(`预览尺寸已设置为${option.label}`);
			});
		});
		
		// 刷新按钮
		const refreshBtn = this.toolbarEl.createEl("button", { 
			cls: "doocs-md-refresh-btn",
			attr: { title: "刷新预览" }
		});
		setIcon(refreshBtn, "refresh-cw");
		refreshBtn.addEventListener("click", () => {
			this.updatePreview();
			new Notice("预览已刷新");
		});
	}
	
	// 应用预览尺寸
	applyPreviewSize() {
		if (this.previewEl) {
			this.previewEl.style.width = this.plugin.settings.previewWidth;
			this.previewEl.style.height = this.plugin.settings.previewHeight;
			
			// 如果高度是auto，添加额外的样式处理
			if (this.plugin.settings.previewHeight === 'auto') {
				this.previewEl.style.maxHeight = "none";
				this.previewEl.style.overflow = "visible";
			} else {
				this.previewEl.style.overflow = "auto";
			}
		}
	}

	// 更新预览内容
	async updatePreview() {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		
		if (!activeView) {
			this.previewEl.innerHTML = "<div class='doocs-md-no-file'>没有打开的Markdown文件</div>";
			return;
		}

		const editor = activeView.editor;
		const content = editor.getValue();
		
		// 清空旧内容
		this.previewEl.empty();
		
		// 创建渲染容器
		const renderContainer = this.previewEl.createDiv({ cls: "doocs-md-render" });
		
		try {
			// 使用Obsidian的Markdown渲染器进行渲染
			await MarkdownRenderer.renderMarkdown(
				content,
				renderContainer,
				activeView.file.path,
				this
			);
		} catch (error) {
			// 如果渲染失败，使用简单的备用解析器
			console.error("Markdown渲染失败:", error);
			renderContainer.innerHTML = this.fallbackParseMarkdown(content);
		}
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
