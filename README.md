# 高清矿泉水 · 个人工作台

> 一个收拢学生党日常杂事的个人效率面板。纯前端，无构建步骤，双击即用。

## 功能一览

- **主页**：日历待办（可点日期加事项 + 圆点提示）、倒计时、正在读（豆瓣式书架：封面 / 星级 / 进度）
- **创作**：灵感收集 + AI 分析、各平台（小红书 / 抖音 / 公众号）入口、Obsidian / 口袋写作快捷启动
- **英语**：听（听写）/ 说（影子跟读）/ 读（十日精读）/ 写（AI 出题 + 批改 + 短语本）
- **备考**：初中教资 / CATTI 口译 / 每日新闻 时间线 + 书目
- **书架**：星级 / 状态 / 进度 / 标签 / 读后感 / 封面
- **备忘**：朋友生日与送礼记录
- **每周复盘**：AI 生成

## 技术栈

- 纯静态 `HTML / CSS / JS`，双击 `index.html` 即可本地打开
- 数据保存在浏览器 `localStorage`，无需后端、账号或联网
- [DeepSeek](https://platform.deepseek.com) API 提供 AI 能力（key 仅存浏览器本地，不经过任何服务器）

## 本地运行

直接双击 `index.html` 即可，所有数据存在本机浏览器。AI 功能首次使用时在弹窗中填入 DeepSeek API key，仅保存在你自己的浏览器里。

## 部署到 GitHub Pages

1. 把本仓库内容推到 GitHub
2. 进入仓库 `Settings → Pages → Build and deployment → Source`，选 `Deploy from a branch`，分支选 `main`、目录选 `/ (root)`
3. 稍等一两分钟，访问 `https://<你的用户名>.github.io/<仓库名>/`

## 目录结构

```
.
├── index.html
├── styles.css
├── app.js
└── README.md
```

## 说明

数据完全保存在你自己的浏览器（localStorage），换设备不会自动同步，需要时请手动迁移。AI 功能首次使用时在弹窗中填入 DeepSeek API key，仅保存在本机浏览器，不经过任何中间服务器。
