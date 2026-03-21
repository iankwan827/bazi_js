# Extracted Features

这个目录包含了从三板斧项目中提取的核心排盘组件和测试工具。

## 目录结构

- **js/**: 存放核心 JavaScript 逻辑和文档。**此文件夹的内容会同步到 GitHub 仓库 `bazi_js`**。
  - `paipan_node_core.js`: Node.js 环境下的排盘核心。
  - `paipan_node_input.js`: Node.js 环境下的输入处理。
  - `bazi_classes.js`: 八字对象类定义。
  - `ARCHITECTURE.md`: 核心架构说明。
- **test/**: 存放本地测试用的 HTML 页面和测试脚本（不参与同步）。
  - `index.html`: 浏览器演示页面。
  - `test_paipan.js`: Node.js 测试脚本。
  - `test_bazi_classes.js`: 八字类测试脚本。
- `sync_to_github.bat`: 一键同步 `js/` 文件夹内容到 GitHub 的脚本。
- `README.md`: 本说明文件。
