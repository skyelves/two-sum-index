# Two Sum Index

追踪 LeetCode 第一题 "Two Sum" 的每日学习人数变化趋势。

## 功能

- 每日自动从 LeetCode 获取 Two Sum 题目的提交统计
- 存储历史数据，展示趋势变化
- 可视化展示每日新增通过人数和累计通过人数

## 数据来源

数据通过 LeetCode GraphQL API 获取，每日 UTC 00:00 自动更新。

## 技术栈

- **数据获取**: Node.js + LeetCode GraphQL API
- **定时任务**: GitHub Actions
- **前端展示**: HTML + Chart.js
- **托管**: GitHub Pages

## 本地开发

1. 克隆仓库
2. 手动运行数据获取脚本：
   ```bash
   node scripts/fetch-leetcode-stats.js
   ```
3. 使用任意 HTTP 服务器预览页面：
   ```bash
   npx serve .
   ```

## 部署

1. 推送代码到 GitHub
2. 在 Repository Settings -> Pages 中启用 GitHub Pages
3. 选择 Source: Deploy from branch, Branch: main, Folder: / (root)
4. 在 Actions 页面手动触发一次 workflow 获取初始数据

## License

MIT
