
import * as fs from 'fs';
import * as path from 'path';
import { runCleanup } from '../src/services/cleanupService';

// Mock directories for testing
const MOCK_DIR = path.join(process.cwd(), 'uploads', 'generated');

async function testCleanup() {
    console.log('🧪 Starting Cleanup Test...');

    if (!fs.existsSync(MOCK_DIR)) {
        fs.mkdirSync(MOCK_DIR, { recursive: true });
    }

    // 1. Create a "New" file (should keep)
    const newFile = path.join(MOCK_DIR, 'test_new.png');
    fs.writeFileSync(newFile, 'new file content');
    console.log(`Created NEW file: ${newFile}`);

    // 2. Create an "Old" file (should delete - assuming not in DB)
    const oldFile = path.join(MOCK_DIR, 'test_old_unused.png');
    fs.writeFileSync(oldFile, 'old file content');

    // Manually set mtime to 30 hours ago
    const thirtyHoursAgo = new Date(Date.now() - 30 * 60 * 60 * 1000);
    fs.utimesSync(oldFile, thirtyHoursAgo, thirtyHoursAgo);
    console.log(`Created OLD file (30h ago): ${oldFile}`);

    // 3. Run Cleanup
    console.log('Running cleanup service...');
    await runCleanup();

    // 4. Assertions
    const newExists = fs.existsSync(newFile);
    const oldExists = fs.existsSync(oldFile);

    console.log('--- Results ---');
    console.log(`New File Exists? ${newExists} (Expected: true)`);
    console.log(`Old File Exists? ${oldExists} (Expected: false)`);

    if (newExists && !oldExists) {
        console.log('✅ TEST PASSED');
    } else {
        console.log('❌ TEST FAILED');
    }

    // Cleanup test files
    if (newExists) fs.unlinkSync(newFile);
}

testCleanup();
