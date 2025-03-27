import { App, PluginSettingTab, Setting } from 'obsidian';
import Md2Cards from './main';
import { getAllStyles, switchStyle, applyGlobalStyles } from './assets';

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
		
		// 样式选择设置
		new Setting(containerEl)
			.setName('卡片样式')
			.setDesc('选择预设的卡片样式模板')
			.addDropdown(dropdown => {
				// 添加所有可用样式
				const styles = getAllStyles();
				styles.forEach(style => {
					dropdown.addOption(style.id, style.name);
				});
				
				dropdown.setValue(this.plugin.settings.styleId)
					.onChange(async (value) => {
						this.plugin.settings.styleId = value;
						
						// 切换样式
						if (switchStyle(value)) {
							// 应用全局样式
							applyGlobalStyles(document.body);
							
							// 如果视图存在，刷新视图
							if (this.plugin.view) {
								this.plugin.view.updatePreviewFromActiveFile();
							}
						}
						
						await this.plugin.saveSettings();
					});
			});
		
		// 主题选择设置
		new Setting(containerEl)
			.setName('导出主题')
			.setDesc('选择导出图片时使用的Obsidian主题')
			.addDropdown(dropdown => {
				// 添加所有可用主题
				const themes = this.plugin.themeLoader.getThemes();
				themes.forEach(theme => {
					dropdown.addOption(theme.name, theme.name);
				});
				
				dropdown.setValue(this.plugin.settings.themeName)
					.onChange(async (value) => {
						this.plugin.settings.themeName = value;
						await this.plugin.saveSettings();
					});
			})
			.addExtraButton(button => 
				button
					.setIcon('refresh')
					.setTooltip('刷新主题列表')
					.onClick(async () => {
						await this.plugin.themeLoader.loadThemes();
						this.display();
					})
			);

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
			
		// 导出设置标题
		containerEl.createEl('h3', { text: '导出设置' });
		
		// 社交卡片设置
		new Setting(containerEl)
			.setName('社交卡片样式')
			.setDesc('导出图片时使用社交媒体卡片样式，包含作者信息和水印')
			.addToggle(toggle => 
				toggle
					.setValue(this.plugin.settings.exportSettings.socialCard)
					.onChange(async (value) => {
						this.plugin.settings.exportSettings.socialCard = value;
						await this.plugin.saveSettings();
					})
			);
		
		// 作者名称设置
		new Setting(containerEl)
			.setName('作者名称')
			.setDesc('导出图片时显示的作者名称')
			.addText(text => 
				text
					.setPlaceholder('请输入作者名称')
					.setValue(this.plugin.settings.exportSettings.authorName)
					.onChange(async (value) => {
						this.plugin.settings.exportSettings.authorName = value;
						await this.plugin.saveSettings();
					})
			);
		
		// 作者头像URL
		new Setting(containerEl)
			.setName('作者头像URL')
			.setDesc('导出图片时显示的作者头像URL')
			.addText(text => 
				text
					.setPlaceholder('请输入头像图片URL')
					.setValue(this.plugin.settings.exportSettings.authorAvatar)
					.onChange(async (value) => {
						this.plugin.settings.exportSettings.authorAvatar = value;
						await this.plugin.saveSettings();
					})
			);
		
		// 水印文本
		new Setting(containerEl)
			.setName('水印文本')
			.setDesc('导出图片时添加的水印文本')
			.addText(text => 
				text
					.setPlaceholder('Made with Obsidian')
					.setValue(this.plugin.settings.exportSettings.watermarkText)
					.onChange(async (value) => {
						this.plugin.settings.exportSettings.watermarkText = value;
						await this.plugin.saveSettings();
					})
			);
		
		// 圆角大小
		new Setting(containerEl)
			.setName('圆角大小')
			.setDesc('导出图片的圆角大小 (0-20)')
			.addSlider(slider => 
				slider
					.setLimits(0, 20, 1)
					.setValue(this.plugin.settings.exportSettings.borderRadius)
					.setDynamicTooltip()
					.onChange(async (value) => {
						this.plugin.settings.exportSettings.borderRadius = value;
						await this.plugin.saveSettings();
					})
			);
		
		// 是否添加边框
		new Setting(containerEl)
			.setName('添加边框')
			.setDesc('导出图片时是否添加边框')
			.addToggle(toggle => 
				toggle
					.setValue(this.plugin.settings.exportSettings.addBorder)
					.onChange(async (value) => {
						this.plugin.settings.exportSettings.addBorder = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
