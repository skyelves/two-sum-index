const https = require('https');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'stats.json');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function getArchiveTimestamps() {
  const now = new Date();
  // Set 'from' date to five years ago (same month)
  const fromDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  
  const from = `${fromDate.getFullYear()}${(fromDate.getMonth() + 1).toString().padStart(2, '0')}`;
  const to = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;

  console.log(`Fetching archive timestamps from Wayback Machine (from ${from} to ${to})...`);
  const url = `https://web.archive.org/cdx/search/cdx?url=leetcode.com/problems/two-sum&output=json&from=${from}&to=${to}&filter=statuscode:200`;
  const data = await fetch(url);
  const rows = JSON.parse(data);

  // The first row is the header, skip it.
  const timestamps = rows.slice(1).map(row => row[1]);

  console.log(`Found ${timestamps.length} archives`);
  return timestamps;
}

function computeAcRate(totalAccepted, totalSubmission) {
  if (!totalSubmission) return 0;
  return Math.round((totalAccepted / totalSubmission) * 10000) / 100;
}

function buildRecord(timestamp, totalAccepted, totalSubmission, acRate, source) {
  const date = `${timestamp.substring(0, 4)}-${timestamp.substring(4, 6)}-${timestamp.substring(6, 8)}`;
  return {
    date,
    totalAccepted,
    totalSubmission,
    acRate: acRate ?? computeAcRate(totalAccepted, totalSubmission),
    timestamp: new Date().toISOString(),
    source
  };
}

function parseAcRate(raw) {
  if (raw == null) return null;
  const num = parseFloat(String(raw).replace('%', ''));
  return Number.isFinite(num) ? num : null;
}

function extractStatsFromHtml(html) {
  const acceptedMatch = html.match(/totalAcceptedRaw\\?["\s:]+(\d+)/);
  const submissionMatch = html.match(/totalSubmissionRaw\\?["\s:]+(\d+)/);
  const acRateMatch = html.match(/acRate\\?["\s:]+([0-9.]+)%?/);

  if (acceptedMatch && submissionMatch) {
    return {
      totalAccepted: parseInt(acceptedMatch[1], 10),
      totalSubmission: parseInt(submissionMatch[1], 10),
      acRate: acRateMatch ? parseAcRate(acRateMatch[1]) : null,
      source: 'wayback-html'
    };
  }

  // Some archives embed stats as an escaped JSON string: "stats":"{\"totalAcceptedRaw\":...}"
  const statsStringMatch = html.match(/"stats"\s*:\s*"((?:\\.|[^"])*)"/);
  if (statsStringMatch) {
    try {
      const unescaped = JSON.parse(`"${statsStringMatch[1]}"`);
      const stats = JSON.parse(unescaped);
      if (stats.totalAcceptedRaw && stats.totalSubmissionRaw) {
        return {
          totalAccepted: parseInt(stats.totalAcceptedRaw, 10),
          totalSubmission: parseInt(stats.totalSubmissionRaw, 10),
          acRate: parseAcRate(stats.acRate),
          source: 'wayback-html'
        };
      }
    } catch {
      // Fall through to API fetch.
    }
  }

  return null;
}

async function fetchStatsFromApi(timestamp) {
  const endpoints = [
    'https://leetcode.com/api/problems/algorithms/',
    'https://leetcode.com/api/problems/all/'
  ];

  for (const endpoint of endpoints) {
    const archiveUrl = `https://web.archive.org/web/${timestamp}id_/${endpoint}`;
    try {
      const data = await fetch(archiveUrl);
      const json = JSON.parse(data);
      const pairs = json.stat_status_pairs || json.statStatusPairs;
      if (!Array.isArray(pairs)) continue;

      const match = pairs.find(({ stat }) => {
        if (!stat) return false;
        return stat.question__title_slug === 'two-sum' ||
          stat.question__title === 'Two Sum' ||
          String(stat.question_id) === '1' ||
          String(stat.frontend_question_id) === '1';
      });

      if (!match || !match.stat) continue;
      const stat = match.stat;
      const totalAccepted = parseInt(
        stat.total_acs ?? stat.totalAccepted ?? stat.totalAcceptedRaw ?? stat.total_accepted,
        10
      );
      const totalSubmission = parseInt(
        stat.total_submitted ?? stat.totalSubmission ?? stat.totalSubmissionRaw ?? stat.total_submission,
        10
      );

      if (Number.isFinite(totalAccepted) && Number.isFinite(totalSubmission)) {
        return {
          totalAccepted,
          totalSubmission,
          acRate: null,
          source: 'wayback-api'
        };
      }
    } catch (e) {
      console.log(`\n[Debug] Error fetching API archive for ${timestamp}: ${e.message}`);
    }
  }

  return null;
}

async function extractStats(timestamp) {
  const url = `https://web.archive.org/web/${timestamp}/https://leetcode.com/problems/two-sum/`;
  try {
    const html = await fetch(url);
    const htmlStats = extractStatsFromHtml(html);
    if (htmlStats) {
      return buildRecord(
        timestamp,
        htmlStats.totalAccepted,
        htmlStats.totalSubmission,
        htmlStats.acRate,
        htmlStats.source
      );
    }

    const apiStats = await fetchStatsFromApi(timestamp);
    if (apiStats) {
      return buildRecord(
        timestamp,
        apiStats.totalAccepted,
        apiStats.totalSubmission,
        apiStats.acRate,
        apiStats.source
      );
    }

    console.log(`\n[Debug] No match found for timestamp ${timestamp}.`);
    console.log(`[Debug] URL: ${url}`);
    console.log(`[Debug] 'totalAcceptedRaw' found: false`);
    console.log(`[Debug] 'totalSubmissionRaw' found: false`);
  } catch (e) {
    console.log(`\n[Debug] Error fetching URL for timestamp ${timestamp}: ${e.message}`);
  }
  return null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  try {
    const timestamps = await getArchiveTimestamps();
    const records = [];

    for (let i = 0; i < timestamps.length; i++) {
      const ts = timestamps[i];
      process.stdout.write(`\rFetching ${i + 1}/${timestamps.length}: ${ts.substring(0,6)}...`);

      const stats = await extractStats(ts);
      if (stats) {
        records.push(stats);
        console.log(` ${stats.totalAccepted.toLocaleString()}`);
      } else {
        console.log(' (no data)');
      }

      await sleep(2000);
    }

    console.log(`\nCollected ${records.length} monthly records`);

    records.sort((a, b) => a.date.localeCompare(b.date));

    const historicalData = {
      questionInfo: {
        questionId: "1",
        title: "Two Sum",
        titleSlug: "two-sum"
      },
      lastUpdated: new Date().toISOString(),
      records: records
    };

    fs.writeFileSync(DATA_FILE, JSON.stringify(historicalData, null, 2));

    console.log(`\nSaved ${records.length} records`);
    console.log('\nFirst 3:');
    records.slice(0, 3).forEach(r => console.log(`  ${r.date}: ${r.totalAccepted.toLocaleString()}`));
    console.log('Last 3:');
    records.slice(-3).forEach(r => console.log(`  ${r.date}: ${r.totalAccepted.toLocaleString()}`));

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
