import * as fs from 'fs';
import * as path from 'path';
import db from '../db/client';

const CLEANUP_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
// const CLEANUP_AGE_MS = 60 * 1000; // Testing: 1 minute

const DIRECTORIES_TO_SCAN = [
    path.join(process.cwd(), 'public', 'generated-outfits'),
    path.join(process.cwd(), 'uploads', 'generated')
];

/**
 * Checks if an image is referenced in the database
 */
async function isImageSavedInDB(filename: string): Promise<boolean> {
    try {
        // Only match the filename part to be safe against different path prefixes
        const searchTerm = `%${filename}%`;

        // 1. Check Favorite Outfits
        const favOutfits = await db.query(
            'SELECT 1 FROM favorite_outfits WHERE image_url ILIKE $1 LIMIT 1',
            [searchTerm]
        );
        if (favOutfits.rowCount && favOutfits.rowCount > 0) return true;

        // 2. Check Wardrobe
        const wardrobe = await db.query(
            'SELECT 1 FROM wardrobe WHERE image_path ILIKE $1 OR image_url ILIKE $1 LIMIT 1',
            [searchTerm]
        );
        if (wardrobe.rowCount && wardrobe.rowCount > 0) return true;

        return false;
    } catch (error) {
        // Mock for Testing: If we can't connect to DB in a test script, assume it's NOT saved so we can test deletion logic
        // ONLY do this if specifically flagged, otherwise safety first.
        if (process.env.TEST_MODE === 'true') {
            // console.log(`[Cleanup] Test Mode: DB failed, assuming file ${filename} is NOT saved.`);
            return false;
        }

        console.error(`Error checking DB for file ${filename}:`, error);
        // Safety: If DB fails, assume it's saved to prevent accidental deletion
        return true;
    }
}

export async function runCleanup() {
    console.log('🧹 [Cleanup] Starting image cleanup job...');
    let deletedCount = 0;
    let preservedCount = 0;
    let savedCount = 0;

    for (const dir of DIRECTORIES_TO_SCAN) {
        try {
            if (!fs.existsSync(dir)) {
                // console.log(`[Cleanup] Directory not found (skipping): ${dir}`);
                continue;
            }

            const files = fs.readdirSync(dir);
            const now = Date.now();

            for (const file of files) {
                const filePath = path.join(dir, file);
                try {
                    const stats = fs.statSync(filePath);
                    const fileAge = now - stats.mtime.getTime();

                    if (fileAge > CLEANUP_AGE_MS) {
                        // File is OLD enough to consider deleting

                        // Check Database
                        const isSaved = await isImageSavedInDB(file);

                        if (isSaved) {
                            // console.log(`[Cleanup] Keeping saved file: ${file}`);
                            savedCount++;
                        } else {
                            // DELETE
                            console.log(`[Cleanup] 🗑️ Deleting unused file: ${file}`);
                            fs.unlinkSync(filePath);
                            deletedCount++;
                        }
                    } else {
                        preservedCount++; // New file, keep it
                    }
                } catch (err) {
                    console.error(`[Cleanup] Error processing file ${file}:`, err);
                }
            }
        } catch (dirErr) {
            console.error(`[Cleanup] Error scanning directory ${dir}:`, dirErr);
        }
    }

    console.log(`✨ [Cleanup] Finished. Deleted: ${deletedCount}, Saved/Db: ${savedCount}, New/Preserved: ${preservedCount}`);
}
