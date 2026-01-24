import fs from 'fs';
import axios from 'axios';
import zlib from 'zlib';
import csv from 'csv-parser';
import path from 'path';

const TARGET_BRANDS: { [key: string]: string } = {
    '57411': 'Coast',
    '29337': 'Pitod'
};

const DATAFEEDS_FILE = path.join(__dirname, '../../datafeeds.csv');

async function inspectFeeds() {
    console.log('🔍 Inspecting Feed Headers...');

    const feedUrls: { id: string, name: string, url: string }[] = [];

    if (!fs.existsSync(DATAFEEDS_FILE)) {
        console.error(`❌ Datafeeds file not found at: ${DATAFEEDS_FILE}`);
        return;
    }

    // 1. Get URLs
    await new Promise<void>((resolve, reject) => {
        fs.createReadStream(DATAFEEDS_FILE)
            .pipe(csv())
            .on('data', (row: any) => {
                const advId = row['Advertiser ID'];
                if (TARGET_BRANDS[advId]) {
                    feedUrls.push({ id: advId, name: TARGET_BRANDS[advId], url: row.URL });
                }
            })
            .on('end', resolve)
            .on('error', reject);
    });

    // 2. Inspect first row of each
    for (const feed of feedUrls) {
        console.log(`\n📦 Checking headers for ${feed.name}...`);
        try {
            const response = await axios({
                method: 'get',
                url: feed.url,
                responseType: 'stream'
            });

            await new Promise<void>((resolve, reject) => {
                let rowCount = 0;
                const stream = response.data.pipe(zlib.createGunzip()).pipe(csv());

                stream.on('data', (row: any) => {
                    if (rowCount === 0) {
                        console.log(`✅ Available Columns (${feed.name}):`);
                        console.log(Object.keys(row).join(', '));
                        // Also verify if there is an image column specifically
                        const img = row.merchant_image_url || row.image_url || row.large_image || row.Image_url || 'NOT FOUND';
                        console.log(`🖼️ Sample Image Value: ${img}`);
                        stream.destroy(); // Stop after first row
                        resolve();
                    }
                    rowCount++;
                });

                stream.on('error', (err: any) => {
                    // Start of stream might not have data if destroyed early, catch just in case
                    if (rowCount === 0) reject(err);
                });

                stream.on('end', resolve);
            });

        } catch (err: any) {
            console.error(`❌ Failed to inspect ${feed.name}:`, err.message);
        }
    }
}

inspectFeeds();
