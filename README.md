# Two Sum Index

Track daily solve trends for LeetCode Problem #1 "Two Sum".

## Features

- Automatically fetch Two Sum submission statistics from LeetCode every hour
- Store historical data and display trends
- Visualize daily new accepted submissions

## Data Source

Data is fetched via LeetCode GraphQL API, updated hourly.

## Tech Stack

- **Data Fetching**: Node.js + LeetCode GraphQL API
- **Scheduled Tasks**: GitHub Actions
- **Frontend**: HTML + Chart.js
- **Hosting**: GitHub Pages

## Local Development

1. Clone the repository
2. Run the data fetching script manually:
   ```bash
   node scripts/fetch-leetcode-stats.js
   ```
3. Preview the page with any HTTP server:
   ```bash
   npx serve .
   ```

## Deployment

1. Push code to GitHub
2. Enable GitHub Pages in Repository Settings -> Pages
3. Select Source: Deploy from branch, Branch: main, Folder: / (root)
4. Manually trigger the workflow in Actions to fetch initial data

## License

MIT
