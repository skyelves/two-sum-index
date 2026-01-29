const https = require('https');
const fs = require('fs');
const path = require('path');

const LEETCODE_GRAPHQL_URL = 'leetcode.com';
const DATA_FILE = path.join(__dirname, '..', 'data', 'stats.json');

const query = `
query questionStats($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionId
    title
    titleSlug
    stats
  }
}
`;

function fetchLeetCodeStats() {
  const postData = JSON.stringify({
    query: query,
    variables: { titleSlug: 'two-sum' }
  });

  const options = {
    hostname: LEETCODE_GRAPHQL_URL,
    path: '/graphql',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Referer': 'https://leetcode.com/problems/two-sum/',
      'Origin': 'https://leetcode.com'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.errors) {
            reject(new Error(JSON.stringify(result.errors)));
            return;
          }
          resolve(result.data.question);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  try {
    console.log('Fetching LeetCode stats for Two Sum...');

    // 获取 LeetCode 数据
    const questionData = await fetchLeetCodeStats();
    const stats = JSON.parse(questionData.stats);

    console.log('Raw stats:', stats);

    // 读取现有数据
    let historicalData = {
      questionInfo: null,
      lastUpdated: null,
      records: []
    };

    if (fs.existsSync(DATA_FILE)) {
      const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
      historicalData = JSON.parse(fileContent);
    }

    // 创建今日记录
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const newRecord = {
      date: today,
      totalAccepted: stats.totalAcceptedRaw,
      totalSubmission: stats.totalSubmissionRaw,
      acRate: parseFloat(stats.acRate),
      timestamp: new Date().toISOString()
    };

    // 检查是否已有今日数据，避免重复
    const existingIndex = historicalData.records.findIndex(r => r.date === today);
    if (existingIndex >= 0) {
      console.log('Updating existing record for today...');
      historicalData.records[existingIndex] = newRecord;
    } else {
      console.log('Adding new record for today...');
      historicalData.records.push(newRecord);
    }

    // 按日期排序
    historicalData.records.sort((a, b) => a.date.localeCompare(b.date));

    // 更新元数据
    historicalData.lastUpdated = new Date().toISOString();
    historicalData.questionInfo = {
      questionId: questionData.questionId,
      title: questionData.title,
      titleSlug: questionData.titleSlug
    };

    // 确保 data 目录存在
    const dataDir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // 写入文件
    fs.writeFileSync(DATA_FILE, JSON.stringify(historicalData, null, 2));

    console.log('\n=== Stats Updated Successfully ===');
    console.log(`Date: ${today}`);
    console.log(`Total Accepted: ${stats.totalAcceptedRaw.toLocaleString()}`);
    console.log(`Total Submissions: ${stats.totalSubmissionRaw.toLocaleString()}`);
    console.log(`AC Rate: ${stats.acRate}`);
    console.log(`Total Records: ${historicalData.records.length}`);

  } catch (error) {
    console.error('Error fetching stats:', error);
    process.exit(1);
  }
}

main();
