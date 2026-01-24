import fs from 'fs';
import axios from 'axios';
import zlib from 'zlib';
import csv from 'csv-parser';
import db from '../db/client';
import path from 'path';

// Target Brands mapping
const TARGET_BRANDS: { [key: string]: string } = {
    '57411': 'Coast',
    '29337': 'Pitod'
};

const DATAFEEDS_FILE = path.join(__dirname, '../../datafeeds.csv');

export async function updateProductDatabase() {
    console.log('🔄 Starting Multi-Brand Product Update...');

    try {
        // 1. Clear existing products (as requested)
        await db.query('TRUNCATE TABLE products RESTART IDENTITY');

        // Wrap the stream processing in a Promise
        await new Promise<void>((resolve, reject) => {
            const feedUrls: { id: string, name: string, url: string }[] = [];

            // 2. Read datafeeds.csv to find URLs
            if (!fs.existsSync(DATAFEEDS_FILE)) {
                console.error(`❌ Datafeeds file not found at: ${DATAFEEDS_FILE}`);
                resolve();
                return;
            }

            fs.createReadStream(DATAFEEDS_FILE)
                .pipe(csv())
                .on('data', (row: any) => {
                    const advId = row['Advertiser ID'];
                    if (TARGET_BRANDS[advId]) {
                        feedUrls.push({
                            id: advId,
                            name: TARGET_BRANDS[advId],
                            url: row.URL
                        });
                    }
                })
                .on('end', async () => {
                    if (feedUrls.length === 0) {
                        console.error('❌ No target brand links found in datafeeds.csv.');
                        resolve();
                        return;
                    }

                    console.log(`✅ Found links for ${feedUrls.length} brands.`);

                    // Process feeds sequentially
                    let totalCount = 0;
                    for (const feed of feedUrls) {
                        console.log(`⬇️ Downloading: ${feed.name}...`);
                        try {
                            const count = await downloadAndInsert(feed);
                            totalCount += count;
                            console.log(`   ✅ ${feed.name}: ${count} products added.`);
                        } catch (err: any) {
                            console.error(`   ❌ Error fetching info for ${feed.name}:`, err.message);
                        }
                    }

                    console.log('------------------------------------------------');
                    console.log(`🎉 All done! Total ${totalCount} products saved to database.`);
                    resolve();
                })
                .on('error', (err: any) => reject(err));
        });

    } catch (err: any) {
        console.error('❌ Database initialization error:', err.message);
    }
}

function downloadAndInsert(feed: { id: string, name: string, url: string }): Promise<number> {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await axios({
                method: 'get',
                url: feed.url,
                responseType: 'stream'
            });

            let count = 0;
            const stream = response.data.pipe(zlib.createGunzip()).pipe(csv());

            // We use a buffer or batch approach ideally, but for now standard sequential inserts
            // To prevent overwhelming DB, strictly sequential here might be slow but safe.
            // Using a simple loop mechanism inside the stream events is tricky for async DB.
            // Better to pause/resume or accumulate.
            // Given the context, let's try to insert as we go but handle async properly.
            // A simple way is to use 'for await' on the stream if supported, or good old pause/resume.

            const insertPromise = async (product: any) => {
                // Name: 'product_name' (Awin) vs 'title' (Google/Pitod)
                const name = product.product_name || product.title || product.Name || '';

                // Price Cleaning: Remove " GBP", " USD", etc.
                let rawPrice = product.search_price || product.price || product.Price || '0';
                const price = typeof rawPrice === 'string' ? parseFloat(rawPrice.replace(/[^\d.]/g, '')) || 0 : rawPrice;

                // Product ID (Required by VPS Schema)
                const productId = product.aw_product_id || product.id || product.merchant_product_id || `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                // Link: 'aw_deep_link' (Awin) vs 'link' (Google/Pitod)
                const link = product.aw_deep_link || product.link || product.Deep_link || '';

                // Description: 'description' is common to both
                const desc = product.description || product.Description || '';

                // Image: 'merchant_image_url' (Awin) vs 'image_link' (Google/Pitod)
                const image_url = product.merchant_image_url || product.aw_image_url || product.image_link || product.large_image || '';

                // Extra Fields Mapping

                // Gender: 'Fashion:suitable_for' (Awin) vs 'gender' (Google/Pitod)
                const gender = product.gender || product['Fashion:suitable_for'] || '';

                // Color: 'colour' (Awin) vs 'color' (Google/Pitod)
                const color = product.color || product.colour || '';

                // Material: 'Fashion:material' (Awin) vs 'material' (Google/Pitod)
                const material = product.material || product['Fashion:material'] || '';

                // Size: 'Fashion:size' (Awin) vs 'size' (Google/Pitod)
                const size = product.size || product['Fashion:size'] || '';

                // Category: 'category_name' (Awin) vs 'product_type'/'google_product_category' (Google/Pitod)
                const category = product.category_name || product.merchant_category || product.google_product_category || product.product_type || '';

                // Pattern: 'pattern' (Google/Pitod)
                const pattern = product.pattern || '';

                // Availability: 'stock_status' (Awin) vs 'availability' (Google/Pitod)
                const availability = product.availability || product.stock_status || '';

                // Old Price: 'rrp_price' (Awin) vs 'sale_price' (Google/Pitod logic is usually price=reg, sale_price=sale)
                const old_price = product.rrp_price || product.sale_price || '';

                if (name && link) {
                    await db.query(
                        `INSERT INTO products 
                        (product_id, brand, name, price, link, description, image_url, gender, color, material, size, category, pattern, availability, old_price) 
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
                        [productId, feed.name, name, price, link, desc, image_url, gender, color, material, size, category, pattern, availability, old_price]
                    );
                    count++;
                } else {
                    // Debug: Log why it was skipped (only log first few to avoid spam)
                    if (Math.random() < 0.01) {
                        console.log(`⚠️ Skipped product from ${feed.name}: Name='${name}', Link='${link}'`);
                        console.log('Raw keys:', Object.keys(product));
                    }
                }
            };

            // Pausing stream to handle async DB insert
            for await (const product of stream) {
                await insertPromise(product);
            }

            resolve(count);

        } catch (error) {
            reject(error);
        }
    });
}
