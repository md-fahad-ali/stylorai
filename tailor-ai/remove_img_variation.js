require('dotenv').config();
const fs = require('fs');
const OpenAI = require('openai');
const sharp = require('sharp');

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const INPUT_IMAGE = 'input_woman.jpg';
const PROCESSED_IMAGE = 'input_square.png';

async function main() {
    try {
        console.log("🔄 Step 1: Converting image to Square PNG (Required for DALL-E 2)...");

        // DALL-E 2 requires PNG, <4MB, Square
        await sharp(INPUT_IMAGE)
            .resize(1024, 1024, { fit: 'cover' })
            .toFormat('png')
            .toFile(PROCESSED_IMAGE);

        console.log("✅ Image prepared.");

        console.log("🎨 Step 2: Sending image to DALL-E 2 (createVariation)...");
        console.log("NOTE: This API sees the image but will generate a 'Similar' dress, not the exact pixels.");

        const response = await openai.images.createVariation({
            image: fs.createReadStream(PROCESSED_IMAGE),
            n: 1,
            size: "1024x1024",
            response_format: "url"
        });

        const imageUrl = response.data[0].url;
        console.log("✅ Success! Variation URL:", imageUrl);

        // Save it
        const imgResponse = await fetch(imageUrl);
        const arrayBuffer = await imgResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync('dress_variation.png', buffer);
        console.log("💾 Saved to dress_variation.png");

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

main();
