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

// Search products from database
export async function searchProducts(searchTerm: string, limit: number = 10, offset: number = 0): Promise<Product[]> {
    try {
        // Convert "women black dress" -> "women | black | dress" for OR logic
        const formattedQuery = searchTerm.trim().split(/\s+/).join(' | ');

        const query = `
            SELECT product_name, product_url, image_url, price, currency, rrp_price, savings_percent,
                   ts_rank(
                       to_tsvector('english', product_name || ' ' || COALESCE(description, '') || ' ' || COALESCE(keywords, '')),
                       to_tsquery('english', $1)
                   ) as rank
            FROM products
            WHERE to_tsvector('english', product_name || ' ' || COALESCE(description, '') || ' ' || COALESCE(keywords, '')) @@ to_tsquery('english', $1)
            ORDER BY rank DESC
            LIMIT $2 OFFSET $3
        `;
        const result = await db.query(query, [formattedQuery, limit, offset]);
        return result.rows;
    } catch (error) {
        console.error('Error searching products:', error);
        return [];
    }
}

// Search multiple products in parallel (Batch Search)
export async function searchMultipleProducts(queries: string[], limit: number = 5, offset: number = 0): Promise<Record<string, Product[]>> {
    try {
        const results: Record<string, Product[]> = {};

        // Execute all searches in parallel
        const promises = queries.map(query => searchProducts(query, limit, offset));
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
    generateFlatLayReplica: async (imageBuffer: Buffer): Promise<{
        imageUrl: string;
        localPath: string;
        title: string;
        details: ClothingDetails;
        suggestedProducts: Product[];
        searchQuery: string;
    }> => {
        try {
            console.log("👗 Processing image for flat-lay generation...");

            // 1. Analyze with GPT-4 Vision to get detailed clothing info
            const base64Image = imageBuffer.toString('base64');
            console.log("👀 Analyzing clothing item with GPT-4 Vision...");

            const visionResponse = await openai.chat.completions.create({
                model: "gpt-4o",
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
                model: "gpt-image-1",
                image: await toFile(imageBuffer, "input.png", { type: mimeType }),
                prompt: FLAT_LAY_PROMPT,
                size: "1024x1024",
            });

            // gpt-image-1 returns base64, not URL
            if (!response.data || response.data.length === 0) {
                throw new Error("No image data returned from OpenAI");
            }

            const imageBase64 = response.data[0].b64_json;
            if (!imageBase64) {
                throw new Error("No base64 image data in response");
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

            // Build search query from extracted details (include material and pattern for better relevance)
            const searchQuery = `${details.gender} ${details.color} ${details.pattern} ${details.type} ${details.style} ${details.material}`.trim();
            console.log(`🔍 Search Query: "${searchQuery}"`);

            let suggestedProducts = await searchProducts(searchQuery, 10);

            // Fallback: Try simpler search if no results
            if (suggestedProducts.length === 0) {
                const fallbackQuery = `${details.color} ${details.type}`;
                console.log(`⚠️ No results. Trying fallback query: "${fallbackQuery}"`);
                suggestedProducts = await searchProducts(fallbackQuery, 10);
            }

            // Fallback 2: Just search by type
            if (suggestedProducts.length === 0) {
                console.log(`⚠️ Still no results. Trying type only: "${details.type}"`);
                suggestedProducts = await searchProducts(details.type, 10);
            }

            console.log(`📦 Found ${suggestedProducts.length} matching products`);

            return {
                imageUrl,
                localPath,
                title: details.title,
                details,
                suggestedProducts,
                searchQuery // Return query so client can fetch more pages
            };

        } catch (error: any) {
            console.error("❌ Error in generateFlatLayReplica:", error);
            throw new Error(error.message || "Failed to generate image");
        }
    }
};
