import { App, PluginSettingTab, Setting } from 'obsidian';
import Md2Cards from './main';

export class Md2CardsSettingTab extends PluginSettingTab {
	plugin: Md2Cards;

	constructor(app: App, plugin: Md2Cards) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'md2cards 设置' });

		// 长宽比设置
		new Setting(containerEl)
			.setName('默认预览比例')
			.setDesc('设置卡片预览的默认长宽比')
			.addDropdown(dropdown => 
				dropdown
					.addOption('1:1', '1:1 (正方形)')
					.addOption('3:4', '3:4 (竖屏)')
					.addOption('4:3', '4:3 (横屏)')
					.setValue(this.plugin.settings.aspectRatio)
					.onChange(async (value) => {
						this.plugin.settings.aspectRatio = value;
						
						// 根据长宽比设置基础宽度
						if (value === "1:1") {
							this.plugin.settings.baseWidth = 500;
						} else {
							this.plugin.settings.baseWidth = 768;
						}
						
						await this.plugin.saveSettings();
					})
			);

		// 预览宽度设置
		new Setting(containerEl)
			.setName('预览宽度缩放')
			.setDesc('调整预览宽度的缩放比例 (0.5 - 2.0)')
			.addSlider(slider => 
				slider
					.setLimits(0.5, 2.0, 0.1)
					.setValue(this.plugin.settings.widthScale)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.widthScale = value;
						await this.plugin.saveSettings();
					})
			)
			.addExtraButton(button => 
				button
					.setIcon('reset')
					.setTooltip('重置为默认值')
					.onClick(async () => {
						this.plugin.settings.widthScale = 1.0;
						await this.plugin.saveSettings();
						this.display();
					})
			);

		// 导出文件夹设置
		new Setting(containerEl)
			.setName('导出文件夹')
			.setDesc('指定导出卡片图片的目标文件夹')
			.addText(text => 
				text
					.setPlaceholder('exports')
					.setValue(this.plugin.settings.exportFolder)
					.onChange(async (value) => {
						this.plugin.settings.exportFolder = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
