import dotenv from 'dotenv';
import path from 'path';
// Load env vars first
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { updateProductDatabase } from '../services/productService';
import db from '../db/client';

async function runManualUpdate() {
    console.log('🚀 Manually triggering product update...');

    try {
        await updateProductDatabase();
        console.log('✅ Manual update complete.');
    } catch (error) {
        console.error('❌ Manual update failed:', error);
    } finally {
        // Close DB connection so script exits
        await db.pool.end();
    }
}

runManualUpdate();
