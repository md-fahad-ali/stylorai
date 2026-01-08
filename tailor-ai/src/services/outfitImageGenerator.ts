import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

// Removed db import as it is no longer used for product search in this file
// import db from '../db/client';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Interface for the items returned by Vision API
interface OutfitItem {
    title: string;
    category: string;
}

interface FashionDNAData {
    season?: string[];
    style?: string[];
    preferencesColor?: string[];
    bodyType?: string;
    skinTone?: string;
    gender?: string;
    birthdate?: Date | string;
}

export async function generateOutfitImage(fashionData: FashionDNAData, temperature: number = 0.7): Promise<{ imageUrl: string; title: string, description: string; products: any[] }> {
    try {
        console.log('🎨 Generating outfit image based on fashion DNA...');
        console.log('🌡️  Temperature:', temperature);

        // Randomly select from user's preferences for variety
        const seasons = fashionData.season && fashionData.season.length > 0
            ? fashionData.season
            : ['Spring'];
        const styles = fashionData.style && fashionData.style.length > 0
            ? fashionData.style
            : ['Smart Casual'];
        const colorPreferences = fashionData.preferencesColor && fashionData.preferencesColor.length > 0
            ? fashionData.preferencesColor
            : ['Neutrals'];


        // Map temperature to season
        let seasonByTemperature: string;
        if (temperature <= 0.25) {
            seasonByTemperature = 'Winter';
        } else if (temperature <= 0.50) {
            seasonByTemperature = 'Autumn';
        } else if (temperature <= 0.75) {
            seasonByTemperature = 'Spring';
        } else {
            seasonByTemperature = 'Summer';
        }

        const season = seasonByTemperature;
        const style = styles[Math.floor(Math.random() * styles.length)];
        const colorPreference = colorPreferences[Math.floor(Math.random() * colorPreferences.length)];
        const bodyType = fashionData.bodyType || 'Athletic';
        const gender = fashionData.gender || 'Unisex';

        // Calculate age
        let ageGroup = 'young adult';
        if (fashionData.birthdate) {
            const birthDate = new Date(fashionData.birthdate);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();

            if (age < 18) ageGroup = 'teen';
            else if (age >= 18 && age < 30) ageGroup = 'young adult';
            else if (age >= 30 && age < 50) ageGroup = 'adult';
            else ageGroup = 'mature adult';
        }

        console.log(`🌡️  Temperature: ${temperature} → Season: ${season}`);
        console.log(`🎲 Selected: ${season} | ${style} | ${colorPreference} | ${gender} | ${ageGroup}`);

        // ------------------------------------------------------------------
        // RANDOM VARIATION INJECTION (Fabrics, Patterns, Moods, etc.)
        // ------------------------------------------------------------------
        const possibleFabrics = ['Cotton', 'Linen', 'Denim', 'Wool Blend', 'TechFleece', 'Corduroy', 'Jersey', 'Silk', 'Chiffon', 'Canvas'];
        const possiblePatterns = ['Solid', 'Minimalist', 'Striped', 'Textured', 'Gradient', 'Colorblock', 'Checkered'];
        const possibleFits = ['Regular Fit', 'Slim Fit', 'Oversized Fit', 'Boxy Fit', 'Relaxed Fit', 'Tailored Fit'];

        // Helper to pick random element
        const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

        const selectedFabric = pick(possibleFabrics);
        const selectedPattern = pick(possiblePatterns);
        const selectedFit = pick(possibleFits);

        // Generate a random noise suffix to force different seeds in DALL-E
        const randomNoise = Math.random().toString(36).substring(7);

        // Map preferences to outfit descriptions
        const styleDescriptions: Record<string, string> = {
            'Casual': 'relaxed casual outfit with comfortable basics',
            'Smart Casual': 'smart casual outfit with trendy streetwear pieces',
            'Formal': 'semi-formal elegant outfit with polished pieces',
            'Streetwear': 'urban streetwear outfit with bold statement pieces',
            'Minimalist': 'minimalist clean outfit with simple essentials',
            'Party': 'party-ready outfit with eye-catching pieces',
            'Artistic': 'artistic creative outfit with unique artistic flair',
            'Vintage': 'vintage-inspired retro outfit',
            'Sporty': 'sporty athletic outfit with performance wear'
        };

        const colorDescriptions: Record<string, string> = {
            'Neutrals': 'neutral tones (beige, gray, brown, black, white)',
            'Warm Tones': 'warm tones (rust, terracotta, mustard, warm browns)',
            'Cool Tones': 'cool tones (navy, forest green, charcoal, cool grays)',
            'Earthy Tones': 'earthy tones (olive, tan, burnt orange, chocolate)',
            'Pastels': 'soft pastel colors (baby pink, mint, lavender, powder blue)',
            'Vibrant': 'vibrant bold colors (bright red, electric blue, vivid green)',
            'Monochrome': 'monochrome black and white with gray accents',
            'Jewel Tones': 'rich jewel tones (emerald, sapphire, ruby, amethyst)',
            'Metallics': 'metallic accents (silver, gold, bronze details)'
        };

        const styleDesc = styleDescriptions[style] || styleDescriptions['Smart Casual'];
        const colorDesc = colorDescriptions[colorPreference] || colorDescriptions['Neutrals'];

        // Add random variation keywords for more diversity
        const variations = [
            'with unique design details',
            'with modern aesthetic',
            'with contemporary styling',
            'with fresh interpretation',
            'with creative arrangement',
            'with stylish composition',
            'with trendy elements',
            'with fashionable touches'
        ];
        const randomVariation = variations[Math.floor(Math.random() * variations.length)];

        // Season-aware specific garment types
        const topGarmentSpecs: Record<string, { type: string; desc: string }> = {
            'Spring': { type: 'LIGHT JACKET', desc: 'light spring jacket or cardigan' },
            'Summer': { type: 'T-SHIRT', desc: 't-shirt or tank top' },
            'Autumn': { type: 'SWEATER', desc: 'sweater or hoodie' },
            'Fall': { type: 'SWEATER', desc: 'sweater or hoodie' },
            'Winter': { type: 'JACKET', desc: 'heavy jacket or coat' }
        };

        const bottomGarmentSpecs: Record<string, { type: string; desc: string }[]> = {
            'Spring': [{ type: 'JEANS', desc: 'jeans or chinos' }],
            'Summer': [
                { type: 'SHORTS', desc: 'shorts' },
                { type: 'PANTS', desc: 'lightweight chinos or linen pants' }
            ],
            'Autumn': [{ type: 'JEANS', desc: 'jeans or pants' }],
            'Fall': [{ type: 'JEANS', desc: 'jeans or pants' }],
            'Winter': [{ type: 'PANTS', desc: 'thick jeans or wool pants' }]
        };

        const topSpec = topGarmentSpecs[season] || { type: 'SHIRT', desc: 'shirt or sweater' };

        // Randomly select one option for bottoms to ensure variety
        const bottomOptions = bottomGarmentSpecs[season] || [{ type: 'PANTS', desc: 'pants or jeans' }];
        const bottomSpec = bottomOptions[Math.floor(Math.random() * bottomOptions.length)];

        // Build accessory based on season
        const primaryAccessory = (season === 'Summer' || season === 'Spring') ? 'sleek sunglasses' : 'stylish hat or beanie';
        const secondaryAccessory = (gender === 'Female') ? 'elegant handbag or shoulder bag' : 'minimalist watch';

        // Age-appropriate styling hints
        const ageStyleHint = ageGroup === 'teen' ? 'youthful trendy'
            : ageGroup === 'young adult' ? 'modern fashionable'
                : ageGroup === 'adult' ? 'refined sophisticated'
                    : 'classic timeless';

        // Gender-aware fit descriptions
        const fitDescription = gender === 'Female'
            ? 'feminine silhouette with elegant draping'
            : gender === 'Male'
                ? 'masculine tailored fit'
                : 'modern unisex styling';

        // ---------------------------------------------------------
        // 1. CONSTRUCT A DETAILED, DETERMINISTIC PROMPT
        // ---------------------------------------------------------
        // Added Randomness: Fabric, Pattern, Fit, Noise
        const dynamicPrompt = `
Professional fashion flat lay outfit image for a mobile shopping app.
A complete ${season.toLowerCase()} ${style.toLowerCase()} outfit arranged neatly on a pure white background.

OUTFIT DETAILS:
- ONE ${selectedPattern} ${selectedFabric} ${topSpec.desc} in ${colorDesc}, ${selectedFit}, ${fitDescription}
- ONE ${bottomSpec.desc} complementing the top
- ONE pair of ${season === 'Winter' || season === 'Autumn' ? 'boots or sneakers' : 'clean sneakers or loafers'}
- ${primaryAccessory}
- ${secondaryAccessory}

TARGET AUDIENCE: ${ageStyleHint} ${gender.toLowerCase()} fashion ${randomVariation}

PHOTOGRAPHY STYLE:
- Top-down flat lay photography
- Clean minimalist aesthetic
- Studio lighting with soft natural shadows
- Realistic fabric textures and folds
- High-resolution e-commerce product photography
- No mannequin, no human model
- No text, no logo, no watermark
- Each garment unfolded and clearly visible

COMPOSITION:
Centered balanced arrangement, modern fashion catalog style, premium look.
VARIATION_ID: ${randomNoise}
`;

        // ---------------------------------------------------------
        // PARALLEL EXECUTION: Text & Image Start Together
        // ---------------------------------------------------------
        console.log('🚀 Starting SUPER-OPTIMIZED generation workflow (Parallel Text & Image)...');
        const startTime = Date.now();

        // TASK A: Generate Title, Description, AND Items List from the PROMPT
        // This is much faster than analyzing an image.
        const textAnalysisPromise = (async () => {
            const textStart = Date.now();
            console.log('📝 [Start] Text Analysis (gpt-4o-mini)');
            const analysisPrompt = `
            You are a fashion data extractor. Read the following outfit commission prompt and extract the details.

            PROMPT TO ANALYZE:
            "${dynamicPrompt}"

            TASKS:
            1. Create a Creative Title for this outfit.
            2. Write a 2-sentence Description.
            3. Extract the list of items mentioned in the "OUTFIT DETAILS" section and convert them into specific shopping titles.
               
            Return VALID JSON only:
            {
                "title": "Creative Title",
                "description": "Engaging description.",
                "items": [
                    { "title": "Specific Product Title (e.g. Navy Blue Cotton T-Shirt)", "category": "Top" },
                    { "title": "Specific Product Title (e.g. Beige Chino Shorts)", "category": "Bottom" },
                    { "title": "Specific Product Title", "category": "Shoes" },
                    { "title": "Specific Product Title", "category": "Accessories" }
                ]
            }
            `;

            try {
                const response = await openai.chat.completions.create({
                    model: "gpt-4o-mini", // Very fast
                    messages: [
                        { role: "system", content: "You are a JSON generator." },
                        { role: "user", content: analysisPrompt }
                    ],
                    max_tokens: 300,
                    temperature: 0.7,
                    response_format: { type: "json_object" }
                });

                const content = response.choices[0].message.content || "{}";
                const parsed = JSON.parse(content);
                console.log(`✅ [Done] Text Analysis (Title, Desc, Items) took ${((Date.now() - textStart) / 1000).toFixed(2)}s`);
                return parsed;
            } catch (e) {
                console.warn('⚠️ Text analysis failed, using defaults', e);
                return {
                    title: "Generated Outfit",
                    description: "A stylish outfit for you.",
                    items: []
                };
            }
        })();

        // TASK B: Generate Image
        const imageGenPromise = (async () => {
            console.log('🎨 [Start] Image Generation (1024x1024)');
            const startImg = Date.now();
            const imageResponse = await openai.images.generate({
                model: 'gpt-image-1',
                prompt: dynamicPrompt,
                size: '1024x1024',
            });

            if (!imageResponse.data || imageResponse.data.length === 0) {
                throw new Error('Failed to generate image');
            }
            const imageBase64 = imageResponse.data[0].b64_json;
            if (!imageBase64) throw new Error('No base64 data');

            // Save to file
            const outputDir = path.resolve(process.cwd(), 'public/generated-outfits');
            if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

            const filename = `outfit-${Date.now()}.png`;
            const filepath = path.join(outputDir, filename);

            const imageBuffer = Buffer.from(imageBase64, 'base64');
            fs.writeFileSync(filepath, imageBuffer);

            const localPath = `/generated-outfits/${filename}`;
            const backendUrl = process.env.HOST || 'http://localhost:8080';
            const imageUrl = `${backendUrl}${localPath}`;
            console.log(`✅ [Done] Image Generation took ${((Date.now() - startImg) / 1000).toFixed(2)}s`);
            return imageUrl;
        })();

        // Wait for both to finish (Image gen is the bottleneck now)
        const [textResult, imageUrl] = await Promise.all([
            textAnalysisPromise,
            imageGenPromise
        ]);

        const duration = (Date.now() - startTime) / 1000;
        console.log(`🏁 Everything completed in ${duration.toFixed(2)}s`);

        return {
            imageUrl: imageUrl,
            title: textResult.title || "Fashion Outfit",
            description: textResult.description || "A curated look for you.",
            products: textResult.items || []
        };

    } catch (error) {
        console.error('❌ Error generating outfit image:', error);
        throw error;
    }
}
