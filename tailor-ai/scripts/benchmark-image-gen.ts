
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function runBenchmark() {
    console.log("🚀 Starting Image Generation Benchmark...");

    // Representative variables for the prompt
    const season = "Summer";
    const style = "Smart Casual";
    const gender = "Male";
    const ageGroup = "young adult";
    const ageStyleHint = "modern fashionable";
    const randomVariation = "with trendy elements";
    const randomNoise = "benchmark_test_" + Date.now();
    const outfitDetailsSection = `
OUTFIT DETAILS:
- ONE Minimalist Cotton T-SHIRT in neutral tones (beige, gray, brown, black, white), Regular Fit, modern unisex styling
- ONE lightweight chinos or linen pants complementing the top
- ONE pair of clean sneakers
- sleek sunglasses
    `;

    const dynamicPrompt = `
Professional fashion flat lay outfit image for a mobile shopping app.
A complete ${season.toLowerCase()} ${style.toLowerCase()} outfit arranged neatly on a pure white background.

USER CONTEXT:
- Gender: ${gender}
- Age Group: ${ageGroup}

${outfitDetailsSection}

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
- Centered balanced arrangement, modern fashion catalog style, premium look.
VARIATION_ID: ${randomNoise}
`;

    console.log("📝 Using Prompt:\n" + dynamicPrompt);
    console.log("\n⏳ Requesting image from OpenAI (gpt-image-1-mini)...");

    const startTime = Date.now();

    try {
        const response = await openai.images.generate({
            model: 'gpt-image-1-mini',
            prompt: dynamicPrompt,
            size: '1024x1024',
            quality: 'low',
            // response_format: 'b64_json' 
        });

        const duration = (Date.now() - startTime) / 1000;

        console.log(`\n✅ Benchmark Complete!`);
        console.log(`⏱️ Duration: ${duration.toFixed(2)} seconds`);

        if (response.data && response.data.length > 0) {
            if (response.data[0].url) {
                console.log(`🔗 Image URL: ${response.data[0].url}`);
            } else {
                console.log(`📦 B64 Data received (length: ${response.data[0].b64_json?.length})`);
            }
        } else {
            console.log("No data returned.");
        }

    } catch (error) {
        console.error("❌ Benchmark Failed:", error);
    }
}

runBenchmark();
