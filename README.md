# KFile 文件管理（file_viewer）

Kooboo 模块：基于 `k.file` 与 `k.api` 的文件浏览、编辑与上传界面。

## 安装（Zip 包）

在 Kooboo 后台将本模块以 **Zip 包** 形式导入即可使用，无需从源码构建。

1. 使用打包好的 **`dist/kfile_viewer.zip`**
2. 在 Kooboo 中进入 **模块** 管理，选择 **导入**（或“从 Zip 安装”）
3. 上传 `kfile_viewer.zip`，导入完成后即可在站点中使用该插件

导入后，通过对应模块的 View 页面（如 `kfile_viewer/view/index`）访问文件管理界面。

## 功能

- **浏览**：左侧文件夹树、中间文件列表（网格/列表切换）、路径面包屑（根目录/xxx）
- **排序**：按名称、大小、时间升序/降序
- **预览**：右侧面板预览文本/图片，Markdown 渲染
- **编辑**：文本文件内联编辑并保存
- **操作**：新建文件夹、新建文件、上传文件、重命名、删除
- **反馈**：顶栏错误条、上传进度（当前文件名与 n/m）、加载骨架与空态

## 技术栈

- **前端**：Vue 3（CDN）、Tailwind CSS、Axios、Vue Router、marked（Markdown）
- **后端**：Kooboo `k.api` + `k.file`，通过 `api/files` 暴露接口

## 项目结构

```
file_viewer/
├── package.json
├── playwright.config.ts    # E2E 配置
├── e2e/
│   └── file-viewer.spec.ts # Playwright 测试
└── src/module/kfile_viewer/
    ├── api/files.ts        # k.api 路由：subFolders、folderFiles、read、write、createFolder、delete、rename、writeBinary 等
    ├── js/
    │   ├── store.js        # 全局状态与逻辑（createStore）
    │   ├── http.js         # Axios 封装
    │   ├── vue-router.js
    │   └── ...
    ├── view/
    │   ├── index.html      # 入口页，定义 API 基路径、组件注册、全局样式
    │   ├── main.html       # 根布局（header + tree + list + preview + modals）
    │   ├── app-header.html
    │   ├── file-tree.html
    │   ├── file-list.html
    │   ├── preview-panel.html
    │   └── modals.html
    └── root/
        └── Module.config
```

## 开发

### 安装与同步

```bash
pnpm install
pnpm dev   # 监听并同步到 Kooboo（kb sync）
```

### 访问与 API 基路径

- 默认：根据当前页面路径推导 API 基路径（`/xxx/view/index` → `xxx/api/files`）。
- 自定义：URL 加 `?apiBase=绝对路径`，例如 `?apiBase=/myapp/api/files`。

## 测试

```bash
pnpm test       # 单元测试（Vitest）
pnpm test:e2e   # E2E（Playwright）
```

E2E 默认 `baseURL` 为 `https://file_viewer.localkooboo.com`，可通过环境变量覆盖：

```bash
KFILE_BASE_URL=https://your-site.com pnpm test:e2e
```

## 使用说明

- 路径显示为「根目录 / 子文件夹 / …」，点击可快速跳转。
- 弹窗支持 Esc 关闭、打开时焦点自动到输入框；新建/重命名名称不可包含 `/`。
- 文件列表支持网格/列表视图、按名称/大小/时间排序；不同扩展名有不同图标颜色。
