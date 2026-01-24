import fs from 'fs';
import zlib from 'zlib';
import { parse } from 'csv-parse';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'tailorai_db',
    port: parseInt(process.env.DB_PORT || '5432'),
});

// Get file path from command line or use default
const feedPath = process.argv[2] || '/Users/macm1/Downloads/datafeed_2674098 (3).csv.gz';
const brandName = process.argv[3] || 'House-of-Sneakers';

console.log(`📦 Importing from: ${feedPath}`);
console.log(`🏷️  Brand: ${brandName}`);

const processFeed = async () => {
    console.log('🔄 Starting brand import (WITHOUT clearing existing data)...');

    if (!fs.existsSync(feedPath)) {
        console.error(`❌ File not found: ${feedPath}`);
        process.exit(1);
    }

    const parser = fs
        .createReadStream(feedPath)
        .pipe(zlib.createGunzip())
        .pipe(parse({
            columns: true,
            skip_empty_lines: true,
            relax_quotes: true
        }));

    let count = 0;
    let skipped = 0;

    for await (const record of parser) {
        // Extract fields from Awin format
        const productId = record.aw_product_id || record.merchant_product_id;
        const name = record.product_name;
        const price = parseFloat(record.search_price?.replace(/[^\d.]/g, '')) || 0;
        const link = record.aw_deep_link || record.merchant_deep_link;
        const description = record.description || '';
        const imageUrl = record.merchant_image_url || record.aw_image_url;

        // Additional fields
        const gender = record.custom_1 || ''; // Might need adjustment
        const color = record.colour || '';
        const material = record.custom_2 || '';
        const size = record.size_stock_status || '';
        const category = record.merchant_category || record.product_type || '';
        const pattern = '';
        const availability = record.stock_status || (record.in_stock === '1' ? 'in stock' : 'out of stock');
        const oldPrice = record.rrp_price || record.product_price_old || '';

        // Skip if missing required fields
        if (!productId || !name || !link) {
            skipped++;
            continue;
        }

        // Fashion filtering (shoes are fashion!)
        const nameL = name.toLowerCase();
        const isFashion = nameL.includes('shoe') || nameL.includes('sneaker') ||
            nameL.includes('boot') || nameL.includes('jordan') ||
            nameL.includes('nike') || nameL.includes('adidas');

        if (!isFashion) {
            skipped++;
            continue;
        }

        try {
            // Generate unique product_id if missing
            const finalProductId = productId || `hos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            await pool.query(
                `INSERT INTO products 
                (product_id, brand, name, price, link, description, image_url, gender, color, material, size, category, pattern, availability, old_price) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                ON CONFLICT (product_id) DO UPDATE 
                SET price = EXCLUDED.price,
                    old_price = EXCLUDED.old_price,
                    availability = EXCLUDED.availability,
                    image_url = EXCLUDED.image_url`,
                [finalProductId, brandName, name, price, link, description, imageUrl, gender, color, material, size, category, pattern, availability, oldPrice]
            );
            count++;
            if (count % 100 === 0) {
                console.log(`✅ Imported ${count} products...`);
            }
        } catch (err: any) {
            console.error(`❌ Error importing product ${productId}:`, err.message);
        }
    }

    console.log('------------------------------------------------');
    console.log(`🎉 Import Complete!`);
    console.log(`   ✅ Imported: ${count} products`);
    console.log(`   ⏭️  Skipped: ${skipped} products (non-fashion or missing data)`);
    await pool.end();
};

processFeed().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});
