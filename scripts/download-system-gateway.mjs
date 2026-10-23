import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TARGET_DIR = path.resolve(__dirname, '..', 'Resources', 'Cards', 'System Gateway');

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

console.log('Fetching card data from NetrunnerDB...');
const response = await fetch('https://netrunnerdb.com/api/2.0/public/cards');
if (!response.ok) {
  throw new Error(`Failed to fetch cards: ${response.statusText}`);
}

const json = await response.json();
const allCards = json.data;

// Filter System Gateway cards (pack_code === 'sg')
const sgCards = allCards.filter(c => c.pack_code === 'sg');
console.log(`Found ${sgCards.length} System Gateway cards.`);

// Save card metadata JSON
const jsonFilePath = path.join(TARGET_DIR, 'system-gateway-cards.json');
fs.writeFileSync(jsonFilePath, JSON.stringify(sgCards, null, 2), 'utf-8');
console.log(`Saved JSON metadata to: ${jsonFilePath}`);

// Card images aren't downloaded: the app loads them from NetrunnerDB at runtime.
