
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

const feedPath = path.join(__dirname, '../feed.csv.gz');

const mapHeaderToColumn = (header: string): string | null => {
    const h = header.toLowerCase().trim();
    if (h === 'product_name') return 'product_name';
    if (h === 'aw_product_id') return 'product_id';
    if (h === 'description') return 'description';
    if (h === 'merchant_deep_link' || h === 'aw_deep_link') return 'product_url'; // Prefer aw_deep_link usually
    if (h === 'merchant_image_url' || h === 'aw_image_url') return 'image_url';
    if (h === 'search_price') return 'price';
    if (h === 'currency') return 'currency';
    if (h === 'merchant_category' || h === 'category_name') return 'category';
    if (h === 'merchant_name') return 'advertiser_name';
    if (h === 'keywords') return 'keywords';
    if (h === 'specifications') return 'specifications';
    if (h === 'rrp_price') return 'rrp_price';
    if (h === 'savings_percent') return 'savings_percent';
    if (h === 'merchant_product_category_path') return 'merchant_category_path';
    return null;
};

const processFeed = async () => {
    console.log('Starting feed import...');

    // Ensure table exists (in case init.sql didn't run yet)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            product_id VARCHAR(255) UNIQUE NOT NULL, 
            product_name TEXT NOT NULL,
            description TEXT,
            product_url TEXT NOT NULL,
            image_url TEXT,
            price DECIMAL(10, 2),
            currency VARCHAR(10),
            category VARCHAR(255),
            advertiser_name VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Add new columns if they don't exist
        ALTER TABLE products ADD COLUMN IF NOT EXISTS keywords TEXT;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS specifications TEXT;
        ALTER TABLE products ADD COLUMN IF NOT EXISTS rrp_price DECIMAL(10, 2);
        ALTER TABLE products ADD COLUMN IF NOT EXISTS savings_percent DECIMAL(5, 2);
        ALTER TABLE products ADD COLUMN IF NOT EXISTS merchant_category_path TEXT;

        -- Update Full Text Search Index
        DROP INDEX IF EXISTS idx_products_full_search;
        CREATE INDEX IF NOT EXISTS idx_products_full_search ON products USING GIN (to_tsvector('english', product_name || ' ' || COALESCE(keywords, '') || ' ' || COALESCE(description, '')));
    `);


    const parser = fs
        .createReadStream(feedPath)
        .pipe(zlib.createGunzip())
        .pipe(parse({
            columns: true,
            skip_empty_lines: true,
            relax_quotes: true
        }));

    let count = 0;

    for await (const record of parser) {
        // Map record keys to our DB columns
        const product: any = {};
        for (const key of Object.keys(record)) {
            const dbCol = mapHeaderToColumn(key);
            if (dbCol) {
                product[dbCol] = record[key];
            }
        }

        if (!product.product_id || !product.product_name) {
            continue;
        }

        // Filter for fashion-related categories only
        const category = (product.category || '').toLowerCase();
        const name = (product.product_name || '').toLowerCase();

        const fashionKeywords = ['clothing', 'shoes', 'accessories', 'bag', 'dress', 'shirt', 'pants', 'jeans', 'jacket', 'coat', 'top', 'bottom', 'skirt', 'sweater', 'hoodie', 'fashion', 'men', 'women'];
        const strictExcludeKeywords = ['home', 'improvement', 'electronics', 'furniture', 'lighting', 'garden', 'toy', 'lamp', 'led', 'light', 'bulb', 'usb', 'cleaner', 'organizer', 'hook', 'fan', 'automobile', 'motorcycle', 'car', 'vehicle', 'part', 'sticker', 'repair', 'computer', 'office', 'education', 'supply', 'stationery', 'keyboard', 'mouse', 'laptop', 'baby', 'kid', 'child', 'boy', 'girl', 'toddler'];

        const isExcluded = strictExcludeKeywords.some(keyword => category.includes(keyword) || name.includes(keyword));
        if (isExcluded) {
            continue;
        }

        const isFashion = fashionKeywords.some(keyword => category.includes(keyword) || name.includes(keyword));

        if (!isFashion) {
            continue;
        }

        try {
            await pool.query(
                `INSERT INTO products (
                    product_id, product_name, description, product_url, image_url, 
                    price, currency, category, advertiser_name,
                    keywords, specifications, rrp_price, savings_percent, merchant_category_path
                )
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                 ON CONFLICT (product_id) DO UPDATE 
                 SET price = EXCLUDED.price, 
                     rrp_price = EXCLUDED.rrp_price,
                     savings_percent = EXCLUDED.savings_percent,
                     image_url = EXCLUDED.image_url,
                     keywords = EXCLUDED.keywords,
                     updated_at = CURRENT_TIMESTAMP`,
                [
                    product.product_id,
                    product.product_name,
                    product.description,
                    product.product_url,
                    product.image_url,
                    parseFloat(product.price) || 0,
                    product.currency,
                    product.category,
                    'Voghion Global',
                    product.keywords,
                    product.specifications,
                    parseFloat(product.rrp_price) || null,
                    parseFloat(product.savings_percent) || null,
                    product.merchant_category_path
                ]
            );
            count++;
            if (count % 100 === 0) {
                console.log(`Imported ${count} products...`);
            }
        } catch (err) {
            console.error(`Error importing product ${product.product_id}:`, err);
        }
    }

    console.log(`Finished! Total imported: ${count}`);
    await pool.end();
};

processFeed().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
