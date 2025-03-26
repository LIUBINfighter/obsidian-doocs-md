import { App, Plugin } from 'obsidian';
import { Md2CardsPreviewView, VIEW_TYPE_DOOCS_PREVIEW } from './cards';
import { activateView } from './activateView';
import { Md2CardsSettingTab } from './setting-tab';
import { registerStyle, DefaultStyle, applyGlobalStyles, switchStyle } from './assets';
import ExampleStyle from './assets/example';

export interface Md2CardsSettings {
	aspectRatio: string; // 长宽比选项: "1:1", "3:4", "4:3"
	baseWidth: number; // 基础宽度
	widthScale: number; // 宽度缩放比例
	exportFolder: string; // 导出图片文件夹
	styleId: string; // 当前使用的样式ID
}

const DEFAULT_SETTINGS: Md2CardsSettings = {
	aspectRatio: '4:3', // 默认长宽比 4:3
	baseWidth: 768,
	widthScale: 1.0,
	exportFolder: 'exports',
	styleId: 'default' // 默认样式
}

export default class Md2Cards extends Plugin {
	settings: Md2CardsSettings;
	view: Md2CardsPreviewView;

	async onload() {
		await this.loadSettings();
		
		// 初始化样式系统
		this.initializeStyles();
		
		// 注册预览视图
		this.registerView(
			VIEW_TYPE_DOOCS_PREVIEW,
			(leaf) => (this.view = new Md2CardsPreviewView(leaf, this))
		);

		// 添加命令以打开预览视图
		this.addCommand({
			id: 'open-card-preview',
			name: '打开卡片Cards预览',
			callback: () => activateView(this.app)
		});
		
		// 添加ribbon图标
		this.addRibbonIcon('eye', 'md2cards 预览', (evt: MouseEvent) => {
			activateView(this.app);
		});

		// 添加设置选项卡
		this.addSettingTab(new Md2CardsSettingTab(this.app, this));
		
		// 应用全局样式
		applyGlobalStyles(document.body);
	}
	
	// 初始化样式系统
	initializeStyles() {
		// 注册默认样式
		registerStyle(DefaultStyle);
		
		// 注册示例样式
		registerStyle(ExampleStyle);
		
		// 切换到保存的样式
		switchStyle(this.settings.styleId);
	}

	onunload() {
		// 清理样式
		const styleEl = document.getElementById('md2cards-custom-styles');
		if (styleEl) styleEl.remove();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
