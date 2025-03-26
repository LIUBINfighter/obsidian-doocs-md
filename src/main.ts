import { App, Plugin } from 'obsidian';
import { Md2CardsPreviewView, VIEW_TYPE_DOOCS_PREVIEW } from './cards';
import { activateView } from './activateView';

interface Md2CardsSettings {
	mySetting: string;
	previewWidth: string;
	previewHeight: string;
	
	// 新增长宽比相关设置
	aspectRatio: string;
	baseWidth: number;
	widthScale: number;
}

const DEFAULT_SETTINGS: Md2CardsSettings = {
	mySetting: 'default',
	previewWidth: '100%',
	previewHeight: 'auto',
	
	// 默认长宽比设置
	aspectRatio: '16:9',
	baseWidth: 375,
	widthScale: 1.0
}

export default class Md2Cards extends Plugin {
	settings: Md2CardsSettings;
	view: Md2CardsPreviewView;

	async onload() {
		await this.loadSettings();
		
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
	}

	onunload() {
		// 插件卸载时执行的代码
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
