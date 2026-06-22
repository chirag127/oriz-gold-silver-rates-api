// oriz-gold-silver-rates-api scrape — ToS-conservative posture.
// User-Agent identifies us; rate ≤ 1 fetch / upstream / day; cache aggressively;
// on 403 / CAPTCHA / network fail, write placeholder so /latest.json stays valid.
import { writeFileSync, mkdirSync } from 'node:fs';
import { load } from 'cheerio';

const today = new Date().toISOString().slice(0, 10);
const UA = "oriz-api-bot/0.1 (+https://oriz.in/about; contact: privacy@oriz.in)";
const placeholder = {"source":"placeholder","gold":{},"silver":{}};
const seed = {"source":"placeholder","currency":"INR","unit":"gram","gold_24k":{"mumbai":0,"delhi":0,"bengaluru":0},"silver":{"mumbai":0,"delhi":0,"bengaluru":0}};
const HEADERS = { 'User-Agent': UA, 'Accept': 'application/json, text/html;q=0.9' };

async function safe(fn) { try { return await fn(); } catch (e) { console.error('upstream:', e.message); return null; } }

async function scrape() {
  // MCX bullion close (public ticker). Cheerio over the static page.
  const r = await fetch('https://www.mcxindia.com/market-data/spot-market-price', { headers: HEADERS });
  if (!r.ok) throw new Error('MCX ' + r.status);
  const $ = load(await r.text());
  const get = (name) => {
    let v = 0; $('table tr').each((_, tr) => { const t = $(tr).text(); if (new RegExp(name,'i').test(t)) { const n = t.match(/\d[\d,]*\.\d+/); if (n) v = +n[0].replace(/,/g,''); } });
    return v;
  };
  const gold = get('Gold');
  const silver = get('Silver');
  return { source: 'mcx', currency: 'INR', unit: 'gram',
    gold_24k: { mumbai: gold, delhi: gold, bengaluru: gold },
    silver:   { mumbai: silver, delhi: silver, bengaluru: silver },
  };
}
let result = await safe(scrape) ?? seed;
const payload = { date: today, ...result };
mkdirSync('data', { recursive: true });
writeFileSync('data/' + today + '.json', JSON.stringify(payload, null, 2) + '\n');
writeFileSync('data/latest.json', JSON.stringify(payload, null, 2) + '\n');
console.log('wrote data/latest.json source=', payload.source);
