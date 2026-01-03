# Nuance 🎯

**AI-powered English Learning Assistant** — Extract, Analyze, Master

Nuance 是一款智能英语学习浏览器扩展，帮助你从任何英文网页中提取并学习有价值的语言知识点。

![WXT](https://img.shields.io/badge/WXT-0.20-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ 功能特点

### 🔍 智能内容提取

- 使用 [Mozilla Readability](https://github.com/mozilla/readability) 自动提取网页正文
- 过滤广告、导航等干扰内容，专注于核心文章

### 🤖 AI 深度分析

基于 DeepSeek AI 对文本进行三维度语言分析：

| 类别         | 说明                                 | 示例                                     |
| ------------ | ------------------------------------ | ---------------------------------------- |
| **习惯用法** | 地道习语、短语动词、固定搭配         | "running out of time", "make a decision" |
| **核心语法** | 倒装句、虚拟语气、定语从句等进阶句型 | 分词短语、强调句                         |
| **核心词汇** | B1-C2 级别词汇，含中文释义和语境     | 按难度等级标注                           |

### 🎨 现代化界面

- 简洁优雅的侧边栏设计
- 分类标签页快速切换
- 点击卡片高亮原文定位

### 📍 智能高亮

- 一键定位：点击分析卡片，自动在网页中高亮对应句子
- 平滑滚动到目标位置
- 柔和的高亮动画效果

## 📦 安装

### 前置要求

- Node.js 18+
- pnpm (推荐) 或 npm

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
# Chrome
pnpm dev

# Firefox
pnpm dev:firefox
```

运行后会自动打开带有扩展的 Chrome/Firefox 浏览器。

### 生产构建

```bash
# Chrome
pnpm build

# Firefox
pnpm build:firefox
```

构建产物位于 `.output/chrome-mv3` 或 `.output/firefox-mv3`。

### 打包发布

```bash
# Chrome
pnpm zip

# Firefox
pnpm zip:firefox
```

## 🚀 使用指南

### 1. 配置 API Key

1. 点击扩展图标打开侧边栏
2. 点击右上角 ⚙️ 设置按钮
3. 输入你的 [DeepSeek API Key](https://platform.deepseek.com/api_keys)
4. 点击保存

> 💡 DeepSeek API 价格实惠，非常适合个人学习使用

### 2. 分析文章

1. 打开任意英文文章页面（新闻、博客、论文等）
2. 点击浏览器工具栏中的 Nuance 图标
3. 在侧边栏中点击 **"Analyze Page"** 按钮
4. 等待 10-30 秒，AI 将完成深度分析

### 3. 学习内容

- **Idioms** 标签：查看习惯用法和固定搭配
- **Syntax** 标签：学习复杂句型结构
- **Vocabulary** 标签：掌握核心词汇

点击任意卡片，原文中对应内容会被高亮显示并自动滚动到视野内。

## 🛠️ 技术架构

```
nuance-extension/
├── entrypoints/
│   ├── background.ts      # Service Worker - API 调用、消息路由
│   ├── content.ts         # Content Script - 内容提取、高亮功能
│   └── sidepanel/         # 侧边栏 React 应用
│       ├── App.tsx        # 主组件
│       ├── index.html     # 侧边栏 HTML 入口
│       ├── main.tsx       # React 挂载入口
│       ├── components/    # UI 组件
│       └── styles.css     # 样式文件
├── lib/
│   ├── messages.ts        # 消息类型定义
│   ├── prompts.ts         # AI Prompt 模板
│   └── storage.ts         # 存储管理
├── public/
│   └── icon/              # 扩展图标
├── landing/               # 产品落地页（本地预览）
└── wxt.config.ts          # WXT 配置
```

### 核心技术栈

- **[WXT](https://wxt.dev/)** - 现代浏览器扩展开发框架
- **React 19** - UI 框架
- **TypeScript** - 类型安全
- **Mozilla Readability** - 网页正文提取
- **DeepSeek API** - AI 文本分析

### 扩展权限

| 权限        | 用途                    |
| ----------- | ----------------------- |
| `storage`   | 存储 API Key 和分析历史 |
| `activeTab` | 访问当前标签页内容      |
| `sidePanel` | 显示侧边栏界面          |

## 📋 NPM Scripts

| 命令                 | 说明                    |
| -------------------- | ----------------------- |
| `pnpm dev`           | 启动 Chrome 开发服务器  |
| `pnpm dev:firefox`   | 启动 Firefox 开发服务器 |
| `pnpm build`         | 构建 Chrome 生产版本    |
| `pnpm build:firefox` | 构建 Firefox 生产版本   |
| `pnpm zip`           | 打包 Chrome 扩展        |
| `pnpm zip:firefox`   | 打包 Firefox 扩展       |
| `pnpm compile`       | TypeScript 类型检查     |
| `pnpm landing`       | 本地预览 landing 页面   |

## 🔧 配置说明

### 环境变量

项目支持多环境配置，按优先级加载：

```
.env.development.chrome.local  # 开发环境 Chrome 本地配置
.env.development.chrome        # 开发环境 Chrome 配置
.env.chrome.local              # Chrome 本地配置
.env.chrome                    # Chrome 配置
.env.development.local         # 开发环境本地配置
.env.development               # 开发环境配置
.env.local                     # 本地配置
.env                           # 通用配置
```

### WXT 配置

查看 `wxt.config.ts` 了解完整配置：

```ts
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Nuance",
    description: "AI-powered English learning assistant",
    permissions: ["storage", "activeTab", "sidePanel"],
    // ...
  },
});
```

## 📚 API 文档

### 消息通信

- 消息类型与载荷

  - `EXTRACT_CONTENT`: 从内容脚本提取正文，响应包含 `title | content | textContent | url`
  - `ANALYZE_TEXT`: 后台调用 DeepSeek 进行分析，响应为 `AnalysisResult`
  - `HIGHLIGHT_TEXT`: 在页面中高亮指定文本，响应包含 `found`
  - `CLEAR_HIGHLIGHTS`: 清除页面所有高亮

- 交互序列

```
Sidepanel -> Background: EXTRACT_CONTENT
Background -> Content: EXTRACT_CONTENT
Content -> Background: ExtractContentResponse
Background -> Sidepanel: ExtractContentResponse

Sidepanel -> Background: ANALYZE_TEXT
Background -> DeepSeek API: POST /chat/completions
DeepSeek API -> Background: JSON (AnalysisResult)
Background -> Sidepanel: AnalyzeTextResponse

Sidepanel -> Background: HIGHLIGHT_TEXT
Background -> Content: HIGHLIGHT_TEXT
Content -> Background: HighlightTextResponse
Background -> Sidepanel: HighlightTextResponse
```

### 代码示例

提取与分析：

```ts
const extract = await browser.runtime.sendMessage({ type: "EXTRACT_CONTENT" });
const analyze = await browser.runtime.sendMessage({
  type: "ANALYZE_TEXT",
  text: extract.data!.textContent,
});
```

高亮与清除：

```ts
await browser.runtime.sendMessage({ type: "CLEAR_HIGHLIGHTS" });
await browser.runtime.sendMessage({ type: "HIGHLIGHT_TEXT", text: someText });
```

### DeepSeek 接口

- 端点：`POST https://api.deepseek.com/chat/completions`
- 模型：`deepseek-chat`
- 请求体示例：

```json
{
  "model": "deepseek-chat",
  "messages": [
    { "role": "system", "content": "<系统提示词>" },
    { "role": "user", "content": "<构造后的分析提示词>" }
  ],
  "temperature": 0.3,
  "response_format": { "type": "json_object" }
}
```

- 响应数据：从 `choices[0].message.content` 解析为 JSON，结构如下：

```json
{
  "idioms": [{ "expression": "", "meaning": "", "example": "" }],
  "syntax": [{ "sentence": "", "structure": "", "explanation": "" }],
  "vocabulary": [{ "word": "", "level": "B1", "definition": "", "context": "" }]
}
```

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 提交 Pull Request
