import { App, Plugin } from 'obsidian';
import { DoocsMdPreviewView, VIEW_TYPE_DOOCS_PREVIEW } from './doocs-md-view';
import { activateView } from './activateView';

interface DoocsMdSettings {
	mySetting: string;
	previewWidth: string;
	previewHeight: string;
	
	// 预览比例相关设置
	aspectRatio: string;
	baseWidth: number;
	
	// 背景主题设置
	previewTheme: 'light' | 'dark';
}

const DEFAULT_SETTINGS: DoocsMdSettings = {
	mySetting: 'default',
	previewWidth: '100%',
	previewHeight: 'auto',
	
	// 默认长宽比设置
	aspectRatio: '9:16',
	baseWidth: 375,
	
	// 默认背景主题
	previewTheme: 'light'
}

export default class DoocsMd extends Plugin {
	settings: DoocsMdSettings;
	view: DoocsMdPreviewView;

	async onload() {
		await this.loadSettings();
		
		// 注册预览视图
		this.registerView(
			VIEW_TYPE_DOOCS_PREVIEW,
			(leaf) => (this.view = new DoocsMdPreviewView(leaf, this))
		);

		// 添加命令以打开预览视图
		this.addCommand({
			id: 'open-doocs-preview',
			name: '打开Doocs预览',
			callback: () => activateView(this.app)
			});
		
		// 添加ribbon图标
		this.addRibbonIcon('eye', 'Doocs MD 预览', (evt: MouseEvent) => {
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
