import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import * as fs from 'fs';
import * as path from 'path';
import db from '../db/client';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Product interface for database results
interface Product {
    product_name: string;
    product_url: string;
    image_url: string;
    price: string;
    currency: string;
    rrp_price?: string;
    savings_percent?: string;
    category?: string;
}

// Clothing details extracted from image
interface ClothingDetails {
    title: string;
    type: string;        // dress, shirt, pants, etc.
    color: string;       // primary color
    pattern: string;     // solid, floral, striped, etc.
    material: string;    // cotton, silk, denim, etc.
    style: string;       // casual, formal, etc.
    gender: string;      // women, men, unisex
}

// Search products from database with Pitod brand boosting
// 🔹 SYNONYM MAP: Manual semantic mapping for common fashion mis-matches
// Solves: "Pant" -> "Joggers", "Shoe" -> "Sneakers"
const SYNONYM_MAP: Record<string, string[]> = {
    'pant': ['trousers', 'joggers', 'jeans', 'chinos', 'slacks'],
    'pants': ['trousers', 'joggers', 'jeans', 'chinos', 'slacks'],
    'trousers': ['pant', 'pants', 'slacks'],
    'shirt': ['t-shirt', 'tee', 'top', 'blouse', 'polo'],
    'shoe': ['shoes', 'sneaker', 'sneakers', 'boot', 'boots'],
    'shoes': ['shoe', 'sneaker', 'sneakers', 'boot', 'boots'],
    'sneaker': ['sneakers', 'shoe', 'shoes', 'kicks'],
    'sneakers': ['sneaker', 'shoe', 'shoes', 'kicks'],
    'shirts': ['t-shirt', 'top', 'blouse', 'polo', 'button-down'],
    'jacket': ['coat', 'blazer', 'hoodie', 'cardigan', 'outerwear', 'vest'],
    'jackets': ['coat', 'blazer', 'hoodie', 'cardigan', 'outerwear', 'vest'],
    'short': ['shorts', 'boxers', 'trunks'],
    'dress': ['gown', 'frock', 'jumpsuit', 'romper'],
    'dresses': ['gown', 'frock', 'jumpsuit', 'romper'],
};

// 🔹 PRODUCT CATEGORY MAP: Enforce strict category matching for ambiguous terms
// Solves: "Shoe" -> Must be in "Footwear" or "Shoes" category (Excludes "Furniture" -> Shoe Rack)
const PRODUCT_CATEGORY_MAP: Record<string, string[]> = {
    'shoe': ['footwear', 'shoes', 'boots', 'sandals', 'sneakers'],
    'shoes': ['footwear', 'shoes', 'boots', 'sandals', 'sneakers'],
    'sneaker': ['footwear', 'shoes', 'sneakers', 'trainers'],
    'sneakers': ['footwear', 'shoes', 'sneakers', 'trainers'],
    'boot': ['footwear', 'boots', 'shoes'],
    'boots': ['footwear', 'boots', 'shoes'],
    'bag': ['accessories', 'handbags', 'bags', 'luggage'],
    'bags': ['accessories', 'handbags', 'bags', 'luggage'],
    'watch': ['accessories', 'watches', 'jewellery', 'jewelry'],
    'shirt': ['tops', 'clothing', 'apparel', 'shirts'],
    'pants': ['bottoms', 'clothing', 'apparel', 'pants', 'trousers', 'jeans'],
    'shorts': ['clothing', 'apparel', 'shorts', 'bottoms'],
};

// =====================================================================
// DYNAMIC PRODUCT TYPE DETECTION
// Priority: Check whitelist of known product types first.
// Fallback: Use SQL to find which word in the query is an actual product.
// =====================================================================

// Whitelist of core fashion product types (Nouns)
// It is safer to define what IS a product than what IS NOT.
const KNOWN_PRODUCT_TYPES = [
    // Tops
    'shirt', 't-shirt', 'tshirt', 'tee', 'top', 'blouse', 'tunic', 'hoodie', 'sweatshirt',
    'sweater', 'cardigan', 'jumper', 'jacket', 'coat', 'blazer', 'vest', 'waistcoat', 'suit', 'tuxedo',
    'polo', 'tank', 'camisole', 'knitwear', 'fleece',

    // Bottoms
    'pant', 'pants', 'trouser', 'trousers', 'jean', 'jeans', 'chino', 'chinos',
    'legging', 'leggings', 'jogger', 'joggers', 'short', 'shorts', 'skirt', 'skirts', 'skort', 'cargo',

    // Full Body
    'dress', 'jumpsuit', 'romper', 'gown', 'robe', 'onesie', 'dungarees',

    // Shoes
    'shoe', 'shoes', 'sneaker', 'sneakers', 'boot', 'boots', 'sandal', 'sandals',
    'slipper', 'slippers', 'loafer', 'loafers', 'heel', 'heels', 'flat', 'flats',
    'pump', 'pumps', 'trainer', 'trainers', 'runner', 'runners', 'slides', 'mules',

    // Accessories
    'bag', 'bags', 'backpack', 'wallet', 'belt', 'hat', 'cap', 'beanie', 'scarf', 'glove', 'gloves',
    'tie', 'bowtie', 'watch', 'sunglass', 'sunglasses', 'glasses', 'jewelry', 'ring',
    'necklace', 'bracelet', 'earring', 'cufflink', 'sock', 'socks'
];

/**
 * DYNAMIC: Find the product type word from the search query by checking database
 * Example: "Green and White Casual Sneakers" -> "Sneakers" (because products with "Sneakers" exist)
 * Returns: { productKeyword: string | null, otherWords: string[] }
 */
async function findProductKeywordFromQuery(searchTerm: string): Promise<{ productKeyword: string | null, otherWords: string[] }> {
    // Extract unique words from search term (remove common words)
    // REFINED STOP WORDS: Used as fallback filter
    const stopWords = [
        'and', 'or', 'the', 'a', 'an', 'in', 'on', 'for', 'with', 'of', 'to', 'is', 'are',
        'color', 'pattern', 'material', 'style', 'size',
        'mens', 'womens', 'men', 'women', 'classic', 'retro', 'vintage', 'modern',
        'formal', 'casual', 'smart', 'party', 'summer', 'winter', 'spring', 'fall', 'autumn',
        'new', 'sale', 'best', 'top', 'cheap', 'expensive', 'high', 'low',
        'tailored', 'slim', 'fit', 'running', 'gym', 'skinny', 'oversized', 'regular', 'loose', 'straight',
        'cotton', 'denim', 'leather', 'wool', 'silk', 'linen', 'polyester', 'nylon',
        'striped', 'checked', 'floral', 'printed', 'plain', 'solid',
        'wedding', 'office', 'work', 'beach', 'night', 'day',
        'premium', 'luxury', 'original', 'authentic', 'basic', 'essential'
    ];
    const words = searchTerm
        .toLowerCase()
        .replace(/[^a-z\s]/g, '') // Remove non-letters (keep spaces for splitting)
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.includes(w));

    if (words.length === 0) {
        return { productKeyword: null, otherWords: [] };
    }

    // STRATEGY 1: Check Whitelist (Priority)
    // If we find a known product type, assume that is the main keyword.
    // Example: "Men's Classic Blazer" -> "Blazer" is in known list.
    for (const word of words) {
        // Handle singular/plural basics (simple check)
        const singular = word.endsWith('s') ? word.slice(0, -1) : word;

        if (KNOWN_PRODUCT_TYPES.includes(word) || KNOWN_PRODUCT_TYPES.includes(singular)) {
            // Fix: Only use singular if it is a valid known type! 
            // Otherwise keep original (e.g. 'dress' -> not 'dres')
            const finalKeyword = KNOWN_PRODUCT_TYPES.includes(singular) ? singular : word;

            console.log(`🎯 [Priority Match] Found known product type: "${word}" (Using: "${finalKeyword}")`);
            const otherWords = words.filter(w => w !== word);
            return { productKeyword: finalKeyword.toLowerCase(), otherWords };
        }
    }

    // STRATEGY 2: Fallback to Database Frequency (The existing logic)
    // If no known type found, verify against DB.
    let bestKeyword: string | null = null;
    let maxMatches = 0;

    for (const word of words) {
        try {
            const result = await db.query(
                `SELECT COUNT(*) as cnt FROM products WHERE name ILIKE $1`,
                [`%${word}%`]
            );
            const count = parseInt(result.rows[0]?.cnt || '0');

            // Product type keywords typically match many products (e.g., "sneaker" matches 50+ products)
            // Adjectives like "green", "casual" match fewer or across categories
            if (count > maxMatches && count >= 3) { // At least 3 products match
                maxMatches = count;
                bestKeyword = word;
            }
        } catch (err) {
            console.warn(`⚠️ Error checking word "${word}":`, err);
        }
    }

    // Filter out the product keyword from other words
    const otherWords = words.filter(w => w !== bestKeyword);

    console.log(`🔍 [Dynamic Detection] Product keyword: "${bestKeyword}" (${maxMatches} matches), Adjectives: [${otherWords.join(', ')}]`);

    return { productKeyword: bestKeyword, otherWords };
}

/**
 * Parse search term to extract just the main product name
 * Handles comma-separated attribute strings like:
 * "Green and White Casual Sneakers, Color: white and dark green, Pattern: solid"
 * Returns: "Green and White Casual Sneakers"
 */
function extractMainProductName(searchTerm: string): string {
    // If the term contains commas, it's likely attribute format - take only the first part
    if (searchTerm.includes(',')) {
        const mainPart = searchTerm.split(',')[0].trim();
        console.log(`🔧 [Parse] Extracted main product from comma-separated query: "${mainPart}"`);
        return mainPart;
    }
    return searchTerm;
}

// SIMPLIFIED: Removed complex 50/50 pagination mixing which caused overlap bugs
export async function searchProducts(
    searchTerm: string,
    limit: number = 10,
    offset: number = 0,
    userGender?: string
): Promise<Product[]> {
    // STEP 1: Extract main product name before any comma-separated attributes
    const cleanedSearchTerm = extractMainProductName(searchTerm);
    return executeSearchQuery(cleanedSearchTerm, limit, offset, null, userGender);
}

// Internal helper to execute the actual SQL
async function executeSearchQuery(
    searchTerm: string,
    limit: number,
    offset: number,
    brandMode: 'only_pitod' | 'exclude_pitod' | null = null,
    userGender?: string
): Promise<Product[]> {
    try {
        let brandClause = '';
        if (brandMode === 'only_pitod') {
            brandClause = "AND brand = 'Pitod'";
        } else if (brandMode === 'exclude_pitod') {
            brandClause = "AND brand != 'Pitod'";
        }

        // Gender filtering: Smart Logic
        // 1. Match explicit gender column (Male/Female/Unisex)
        // 2. OR fallback to Title Inference: If title doesn't strictly say the opposite gender, assume it's valid.
        let genderClause = '';
        if (userGender) {
            const isMale = /male|men|boy/i.test(userGender);
            const isFemale = /female|women|girl/i.test(userGender);

            if (isMale) {
                // Show: DB says Male/Unisex OR (DB is Null/Other AND Title does NOT contain Women/Girl)
                genderClause = `AND (
                    (gender ILIKE 'Male' OR gender ILIKE 'Unisex' OR gender ILIKE 'Men%') 
                    OR 
                    (name NOT ILIKE '%Women%' AND name NOT ILIKE '%Girl%' AND name NOT ILIKE '%Female%')
                )`;
            } else if (isFemale) {
                // Show: DB says Female/Unisex OR (DB is Null/Other AND Title does NOT contain Men/Boy)
                genderClause = `AND (
                    (gender ILIKE 'Female' OR gender ILIKE 'Unisex' OR gender ILIKE 'Women%') 
                    OR 
                    (name NOT ILIKE '%Men%' AND name NOT ILIKE '%Boy%' AND name NOT ILIKE '%Male%')
                )`;
            }
        }

        // DYNAMIC PRODUCT DETECTION: Find the main product keyword.
        // We also CLEAN the query here to remove metadata labels which break strict search
        // e.g. "Crimson Nike Shoes, Color: Red" -> "Crimson Nike Shoes Red"
        let cleanedSearchTerm = searchTerm
            .replace(/Color:|Pattern:|Material:|Style:|Gender:|Size:/gi, '')
            .replace(/,/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        console.log(`🧹 Cleaned Search Term: "${cleanedSearchTerm}" (Original: "${searchTerm}")`);

        const { productKeyword, otherWords } = await findProductKeywordFromQuery(cleanedSearchTerm);

        // Product keyword filter: Strict mode first
        let productKeywordClause = '';
        let categoryClause = '';

        if (productKeyword) {
            productKeywordClause = `AND name ILIKE '%${productKeyword}%'`;
            console.log(`🎯 [Strict Filter] Only returning products containing: "${productKeyword}"`);

            // 🛡️ CATEGORY FILTERING: Enforce strict category match if defined
            const validCategories = PRODUCT_CATEGORY_MAP[productKeyword] || [];
            if (validCategories.length > 0) {
                // e.g. AND (category ILIKE '%footwear%' OR category ILIKE '%shoes%')
                const conditions = validCategories.map(cat => `category ILIKE '%${cat}%'`).join(' OR ');
                categoryClause = `AND (${conditions})`;
                console.log(`🛡️ [Category Filter] Restricting to categories: ${validCategories.join(', ')}`);
            }
        } else {
            console.log(`ℹ️ [Standard Filter] No specific product keyword detected, using full search.`);
        }


        // Helper to run query with specific TSVECTOR function
        const runQuery = async (tsQueryFunc: string, queryText: string, isRelaxed: boolean = false) => {
            // BRAND DIVERSITY SORTING Logic
            const sql = `
                WITH ranked_matches AS (
                    SELECT 
                        name, 
                        link, 
                        image_url, 
                        price, 
                        brand,
                        old_price as rrp_price,
                        ts_rank(search_vector, ${tsQueryFunc}('english', $1)) as rank,
                        TRIM(split_part(name, '|', 1)) as base_name
                    FROM products
                    WHERE search_vector @@ ${tsQueryFunc}('english', $1)
                    ${brandClause}
                    ${genderClause}
                    ${productKeywordClause}
                    ${categoryClause}
                ),
                unique_products AS (
                    SELECT DISTINCT ON (base_name) *
                    FROM ranked_matches
                    ORDER BY base_name, rank DESC
                ),
                brand_ranked_products AS (
                    SELECT *,
                    ROW_NUMBER() OVER (PARTITION BY brand ORDER BY rank DESC) as brand_local_rank
                    FROM unique_products
                )
                SELECT * 
                FROM brand_ranked_products
                ORDER BY brand_local_rank ASC, rank DESC
                LIMIT $2 OFFSET $3
            `;
            return await db.query(sql, [queryText, limit, offset]);
        };

        // 1. Attempt STRICT search (matches ALL terms in cleaned query)
        console.log(`🔍 [Strict] searching for: "${cleanedSearchTerm}" (offset=${offset})`);
        let result = await runQuery('plainto_tsquery', cleanedSearchTerm);
        console.log(`🔍 [Strict] found ${result.rows.length} results`);

        // Fallback 1: Brand + Product Keyword Fallback (Smart Semi-Relaxed)
        // If strict search yields 0, try searching "Brand + Product" (e.g. "Nike Shoes")
        // This preserves the most important context.
        if (result.rows.length === 0 && productKeyword && offset === 0) {
            // Detect brand from cleaned term
            const words = cleanedSearchTerm.split(' ');
            // Simple heuristic: Take first word as brand if it's not the product keyword? 
            // Better: Check if any word is NOT the product keyword.
            // For now, let's try to construct a query with remaining words + product keyword

            // Let's assume the first word is often the Brand/Adjective we want to keep.
            // Actually, we can just try `plainto_tsquery` on otherWords + productKeyword?
            if (otherWords.length > 0) {
                const semiRelaxedQuery = `${otherWords.slice(0, 2).join(' ')} ${productKeyword}`;
                console.log(`⚠️ [Fallback 1] Strict failed. Trying Brand/Type: "${semiRelaxedQuery}"`);
                result = await runQuery('plainto_tsquery', semiRelaxedQuery);
                console.log(`✅ [Fallback 1] Found ${result.rows.length} results`);
            }
        }


        // Fallback 1: Product Keyword Fallback (Smart Relaxed)
        // If strict search yields 0, try searching JUST the main product keyword (ignoring adjectives)
        if (result.rows.length === 0 && productKeyword && offset === 0) {
            console.log(`⚠️ [Fallback] Strict search returned 0. Trying relaxed search for product type: "${productKeyword}"`);

            // Relaxed Query: Just search for the product keyword (e.g., "Sneakers")
            // This ignores "White", "Canvas", "Casual" etc. to show SOME relevant results.

            // Keep Gender & Brand filters active!
            const fallbackSql = `
                WITH ranked_matches AS (
                    SELECT 
                        name, 
                        link, 
                        image_url, 
                        price, 
                        brand,
                        old_price as rrp_price,
                        ts_rank(search_vector, plainto_tsquery('english', $1)) as rank,
                        TRIM(split_part(name, '|', 1)) as base_name
                    FROM products
                    WHERE plainto_tsquery('english', $1) @@ search_vector
                    ${genderClause}
                    ${brandClause}
                    ${categoryClause}
                ),
                unique_products AS (
                    SELECT DISTINCT ON (base_name) *
                    FROM ranked_matches
                    ORDER BY base_name, rank DESC
                )
                SELECT * FROM unique_products
                ORDER BY rank DESC
                LIMIT $2 OFFSET $3
            `;

            console.log(`🔄 executing fallback SQL...`);
            const fallbackRes = await db.query(fallbackSql, [productKeyword, limit, offset]);

            if (fallbackRes.rows.length > 0) {
                console.log(`✅ [Fallback] Relaxed search found ${fallbackRes.rows.length} results`);
                result = fallbackRes;
            } else {
                console.log(`✅ [Fallback] Relaxed search found 0 results`);
            }
        }

        // MAP DB COLUMNS TO INTERFACE
        // The DB has 'name' and 'link', but Product interface needs 'product_name' and 'product_url'
        return result.rows.map(row => ({
            ...row,
            product_name: row.name,
            product_url: row.link
        }));

    } catch (error) {
        console.error('❌ Error executing search query:', error);
        return [];
    }
}


// Search multiple products in parallel (Batch Search)
export async function searchMultipleProducts(
    queries: string[],
    limit: number = 5,
    offset: number = 0,
    userGender?: string
): Promise<Record<string, Product[]>> {
    try {
        const results: Record<string, Product[]> = {};

        // Execute all searches in parallel
        const promises = queries.map(query => searchProducts(query, limit, offset, userGender));
        const searchResults = await Promise.all(promises);

        // Map results back to their query keys
        queries.forEach((query, index) => {
            results[query] = searchResults[index];
        });

        return results;
    } catch (error) {
        console.error('Error searching multiple products:', error);
        return {};
    }
}

// Professional flat-lay prompt for isolating clothing items
const FLAT_LAY_PROMPT = `
Isolate and regenerate the main clothing item from the provided image.

TRANSFORMATION GOAL:
Transform this into a premium, studio-quality "Knolling" style flat lay photography.
The item should be neatly arranged, unfolded, and centered on a pristine white background.

ACTIONS:
- Remove any person, model, body parts completely.
- Remove the original background entirely.
- Fix any wrinkles or messiness; make the item look pressed and new.
- Arrange the item symmetrically (or naturally balanced) as if for a high-end fashion catalog.

STYLE GUIDE:
- Photography: Top-down 90-degree flat lay (Knolling style).
- Background: Pure solid white (#FFFFFF). No gradients.
- Lighting: Soft, diffused studio lighting. No harsh shadows. Subtle drop shadow only.
- Quality: 4k, Hyper-realistic, Minimalist, Clean of any clutter.
- Texture: Highlight the premium fabric texture.

STRICT PROHIBITIONS:
- NO hands, feet, faces, or skin.
- NO mannequins or invisible ghosts.
- NO hangers, tags, or packaging.
- NO text, watermarks, or logos.
- NO extra props unless they are part of the outfit.
`;

export const imageGenerationService = {
    /**
     * Generates a "Flat Lay" replica using gpt-image-1 edit API
     * Also extracts clothing details and searches for matching products
     */
    generateFlatLayReplica: async (imageBuffer: Buffer, userGender?: string): Promise<{
        imageUrl: string;
        localPath: string;
        title: string;
        details: ClothingDetails;
        suggestedProducts: Product[];
        searchQuery: string;
        category: string;
    }> => {
        try {
            console.log("👗 Processing image for flat-lay generation...");

            // 1. Analyze with GPT-4 Vision to get detailed clothing info
            const base64Image = imageBuffer.toString('base64');
            console.log("👀 Analyzing clothing item with GPT-4 Vision...");

            const visionResponse = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: `You are an expert fashion analyst. Analyze this image and extract detailed information about the main clothing item.

Return your response in this EXACT JSON format:
{
    "title": "Creative product title (e.g., Emerald Floral Silk Wrap Dress)",
    "type": "clothing type (dress/shirt/pants/skirt/jacket/top/shorts/etc.)",
    "color": "primary color (e.g., red, navy blue, emerald green)",
    "pattern": "pattern type (solid/floral/striped/checkered/printed/embroidered)",
    "material": "fabric type (cotton/silk/denim/linen/polyester/wool/chiffon)",
    "style": "style category (casual/formal/party/streetwear/vintage/minimalist)",
    "gender": "target gender (women/men/unisex)"
}

RULES:
- Be specific about colors (not just "blue", say "navy blue" or "royal blue")
- Be accurate about the clothing type
- Return ONLY valid JSON, no other text`
                            },
                            {
                                type: "image_url",
                                image_url: { "url": `data:image/png;base64,${base64Image}` }
                            },
                        ],
                    },
                ],
                max_tokens: 200,
            });

            // Parse the JSON response
            let details: ClothingDetails;
            const rawContent = visionResponse.choices[0].message.content?.trim() || "{}";

            try {
                // Try to extract JSON from the response
                const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    details = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error("No JSON found");
                }
            } catch (parseError) {
                console.warn("⚠️ Could not parse JSON, using defaults");
                details = {
                    title: "Fashion Item",
                    type: "clothing",
                    color: "neutral",
                    pattern: "solid",
                    material: "cotton",
                    style: "casual",
                    gender: "unisex"
                };
            }

            console.log(`📝 Extracted Details:`, JSON.stringify(details, null, 2));

            // 2. Generate flat-lay using gpt-image-1 edit API
            console.log("🎨 Generating flat-lay with GPT Image Edit...");

            // Determine mimetype based on buffer signature
            let mimeType: "image/png" | "image/jpeg" | "image/webp" = "image/png";
            if (imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8) {
                mimeType = "image/jpeg";
            } else if (imageBuffer[0] === 0x52 && imageBuffer[1] === 0x49) {
                mimeType = "image/webp";
            }

            const response = await openai.images.edit({
                model: "gpt-image-1-mini",
                quality: "low",
                image: await toFile(imageBuffer, "input.png", { type: mimeType }),
                prompt: FLAT_LAY_PROMPT,
                size: "1024x1024",
                // response_format: "b64_json",
            });

            // gpt-image-1 returns base64, not URL
            if (!response.data || response.data.length === 0) {
                throw new Error("No image data returned from OpenAI");
            }

            let imageBase64: string;

            if (response.data[0].b64_json) {
                imageBase64 = response.data[0].b64_json;
            } else if (response.data[0].url) {
                console.log("⚠️ Received URL instead of Base64 (Flat Lay), fetching image...");
                const imgUrl = response.data[0].url;
                const fetchResponse = await fetch(imgUrl);
                const arrayBuffer = await fetchResponse.arrayBuffer();
                imageBase64 = Buffer.from(arrayBuffer).toString('base64');
            } else {
                throw new Error("No base64 image data or URL in response");
            }

            // 3. Save the image locally
            const fileName = `flatlay_${Date.now()}.png`;
            const uploadDir = path.join(process.cwd(), 'uploads', 'generated');

            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const filePath = path.join(uploadDir, fileName);
            const imageBufferOutput = Buffer.from(imageBase64, 'base64');
            fs.writeFileSync(filePath, imageBufferOutput);

            // Return full URL with backend host from env
            const localPath = `/uploads/generated/${fileName}`;
            const backendUrl = process.env.HOST || 'http://localhost:8081';
            const imageUrl = `${backendUrl}${localPath}`;

            console.log("✅ Flat-lay image generated successfully!");
            console.log(`📁 Saved to: ${filePath}`);
            console.log(`🔗 Full URL: ${imageUrl}`);

            // 4. Search for matching products from Awin database
            console.log("🛍️ Searching for matching products...");

            // Logic to prioritize User Gender if available and not 'unisex'
            // If the user is specifically 'Male', we should search for 'Men' items even if the item looks unisex.
            let searchGender = details.gender;
            if (userGender && userGender !== 'Unisex') {
                // Map 'Male' -> 'Men', 'Female' -> 'Women' to match common e-commerce terms if needed
                // But usually 'Male'/'Female' works if the search engine supports it.
                // Let's assume the DB uses 'Men'/'Women' or 'Male'/'Female'.
                // Awin feeds often use 'Men'/'Women'.
                if (userGender.toLowerCase() === 'male') searchGender = 'men';
                else if (userGender.toLowerCase() === 'female') searchGender = 'women';
                else searchGender = userGender;

                console.log(`👤 User gender '${userGender}' overrides detected '${details.gender}' -> Using '${searchGender}'`);
            }

            // Build search query from extracted details
            // OPTIMIZED: Remove 'style' and 'material' from primary query as they are often too specific for strict AND search
            let searchQuery = `${searchGender} ${details.color} ${details.pattern} ${details.type}`.trim();

            // SANITIZE: Remove commas, 'and', and extra spaces to improve strict search
            searchQuery = searchQuery.replace(/,/g, '').replace(/\band\b/gi, '').replace(/\s+/g, ' ').trim();

            console.log(`🔍 Search Query (Optimized & Sanitized): "${searchQuery}"`);

            let suggestedProducts = await searchProducts(searchQuery, 10);

            // Fallback: Try simpler search if no results
            if (suggestedProducts.length === 0) {
                const fallbackQuery = `${searchGender} ${details.color} ${details.type}`;
                console.log(`⚠️ No results. Trying fallback query: "${fallbackQuery}"`);
                suggestedProducts = await searchProducts(fallbackQuery, 10);
            }

            // Fallback 2: Just search by type with gender
            if (suggestedProducts.length === 0) {
                const fallbackTypeQuery = `${searchGender} ${details.type}`;
                console.log(`⚠️ Still no results. Trying type only with gender: "${fallbackTypeQuery}"`);
                suggestedProducts = await searchProducts(fallbackTypeQuery, 10);
            }

            console.log(`📦 Found ${suggestedProducts.length} matching products`);

            // Determine broader category for Wardrobe UI mapping
            // RULE: Shoes should be in "Lowerwear" per user request (instead of its own category or Upperwear)
            let category = "Upperwear"; // Default fallback
            const lowerType = (details.type || "").toLowerCase();

            if (/shoe|sneaker|boot|sandal|loafer|heel|flat|slipper/i.test(lowerType)) {
                category = "Lowerwear";
            } else if (/pant|jean|trouser|short|skirt|legged/i.test(lowerType)) {
                category = "Lowerwear";
            } else if (/bag|watch|hat|cap|scarf|glove|glass|jewelry|necklace|ring/i.test(lowerType)) {
                category = "Accessories";
            }

            return {
                imageUrl,
                localPath,
                title: details.title,
                details,
                suggestedProducts,
                searchQuery, // Return query so client can fetch more pages
                category
            };

        } catch (error: any) {
            console.error("❌ Error in generateFlatLayReplica:", error);
            throw new Error(error.message || "Failed to generate image");
        }
    }
};
