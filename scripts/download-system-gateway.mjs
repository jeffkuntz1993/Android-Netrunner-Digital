import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TARGET_DIR = path.resolve(__dirname, '..', 'Resources', 'Cards', 'System Gateway');
const IMAGES_DIR = path.join(TARGET_DIR, 'images');

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

console.log('Fetching card data from NetrunnerDB...');
const response = await fetch('https://netrunnerdb.com/api/2.0/public/cards');
if (!response.ok) {
  throw new Error(`Failed to fetch cards: ${response.statusText}`);
}

const json = await response.json();
const allCards = json.data;
const imageUrlTemplate = json.imageUrlTemplate || 'https://card-images.netrunnerdb.com/v2/large/{code}.jpg';

// Filter System Gateway cards (pack_code === 'sg')
const sgCards = allCards.filter(c => c.pack_code === 'sg');
console.log(`Found ${sgCards.length} System Gateway cards.`);

// Save card metadata JSON
const jsonFilePath = path.join(TARGET_DIR, 'system-gateway-cards.json');
fs.writeFileSync(jsonFilePath, JSON.stringify(sgCards, null, 2), 'utf-8');
console.log(`Saved JSON metadata to: ${jsonFilePath}`);

// Download card images
console.log(`Downloading ${sgCards.length} card images to ${IMAGES_DIR}...`);
let downloadedCount = 0;
let skippedCount = 0;

for (const card of sgCards) {
  const fileName = `${card.code}.jpg`;
  const filePath = path.join(IMAGES_DIR, fileName);

  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
    skippedCount++;
    continue;
  }

  const imgUrl = imageUrlTemplate.replace('{code}', card.code);
  try {
    const imgRes = await fetch(imgUrl);
    if (!imgRes.ok) {
      console.warn(`Failed to download image for ${card.title} (${card.code}): ${imgRes.status}`);
      continue;
    }
    const arrayBuffer = await imgRes.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
    downloadedCount++;
    if (downloadedCount % 10 === 0 || downloadedCount === sgCards.length) {
      console.log(`Downloaded ${downloadedCount}/${sgCards.length}...`);
    }
  } catch (err) {
    console.error(`Error downloading ${card.title} (${card.code}):`, err.message);
  }
}

console.log(`Finished! Downloaded: ${downloadedCount}, Skipped: ${skippedCount}, Total: ${sgCards.length}`);
