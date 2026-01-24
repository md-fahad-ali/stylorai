
import { searchProducts } from '../services/imageGenerationService';
import * as dotenv from 'dotenv';
import path from 'path';
import db from '../db/client';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });






async function runtest() {
    console.log(`\n🕵️ INVESTIGATING IRRELEVANT MATCHES\n`);

    try {
        const items = [
            'Bee Black Organic Cotton Hoodie',
            'KOSY KOALA Round Black Glass Dining Table',
            'LIVIVO 2-Tier Bamboo Shoe Rack'
        ];

        for (const item of items) {
            console.log(`\nChecking: "${item}"`);
            const res = await db.query(`
                SELECT name, category, description, 
                       ts_rank(search_vector, plainto_tsquery('english', 'Shoe')) as rank_shoe
                FROM products 
                WHERE name ILIKE $1
            `, [`%${item}%`]);

            res.rows.forEach(r => {
                console.log(`   Category: ${r.category}`);
                console.log(`   Rank for 'Shoe': ${r.rank_shoe}`);
                // Check if 'Shoe' is in description
                if (r.description && r.description.toLowerCase().includes('shoe')) {
                    console.log(`   ⚠️ Description contains 'shoe'`);
                }
            });
        }

    } catch (e) {
        console.error('❌ DB Query Failed:', e);
    }
    process.exit(0);
}









runtest();
