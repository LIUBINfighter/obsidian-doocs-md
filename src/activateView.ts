import { App } from "obsidian";
import { VIEW_TYPE_DOOCS_PREVIEW } from "./doocs-md-view";

// 激活预览视图
export async function activateView(app: App) {
    const { workspace } = app;
    
    // 如果视图已存在，直接激活
    if (workspace.getLeavesOfType(VIEW_TYPE_DOOCS_PREVIEW).length) {
        workspace.revealLeaf(workspace.getLeavesOfType(VIEW_TYPE_DOOCS_PREVIEW)[0]);
        return;
    }

    // 创建右侧视图
    await workspace.getRightLeaf(false).setViewState({
        type: VIEW_TYPE_DOOCS_PREVIEW,
        active: true,
    });
    
    // 激活视图
    workspace.revealLeaf(workspace.getLeavesOfType(VIEW_TYPE_DOOCS_PREVIEW)[0]);
}
