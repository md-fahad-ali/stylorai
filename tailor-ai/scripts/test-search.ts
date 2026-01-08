
import db from '../src/db/client';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testSearch() {
    console.log('Testing Product Search...');

    // Test the failed case from user
    // "Winter" "Minimalist" "Monochrome"
    // Top: likely "Jacket" or "Sweater"
    // Bottom: likely "Pants"
    // Gender: Unspecified (implies Unisex/Female usually in feed) or pulled from user profile

    const queries = [
        "Winter Jacket Monochrome",
        "Winter Pants Monochrome",
        "Sweater Black",
        "Jeans Blue",
        "Male Casual T-Shirt",
        "Female Dress"
    ];

    for (const q of queries) {
        console.log(`\n--- Searching: "${q}" ---`);
        try {
            // Replicate the query used in outfitImageGenerator
            const query = `
                SELECT product_name, price, rank
                FROM (
                    SELECT product_name, price,
                        ts_rank(
                            to_tsvector('english', product_name || ' ' || COALESCE(description, '') || ' ' || COALESCE(keywords, '')),
                            plainto_tsquery('english', $1)
                        ) as rank
                    FROM products
                    WHERE to_tsvector('english', product_name || ' ' || COALESCE(description, '') || ' ' || COALESCE(keywords, '')) @@ plainto_tsquery('english', $1)
                ) ranked
                ORDER BY rank DESC
                LIMIT 3
            `;
            const res = await db.query(query, [q]);

            if (res.rows.length === 0) {
                console.log('🔴 No results found.');
            } else {
                res.rows.forEach(r => console.log(`🟢 [${r.rank.toFixed(2)}] ${r.product_name} (${r.price})`));
            }

        } catch (e: any) {
            console.error('Error:', e.message);
        }
    }

    process.exit(0);
}

testSearch();
