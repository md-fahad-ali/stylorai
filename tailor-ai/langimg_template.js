require('dotenv').config();
const fs = require('fs');
const { DallEAPIWrapper } = require("@langchain/openai");

// 1. The Fixed Template (CONSTANTS)
// By keeping this EXACTLY the same, DALL-E tries to maintain the style.
const BASE_STYLE = `
Style: Professional Minimalist E-Commerce Flat Lay.
Background: Clean pure white (#FFFFFF).
Lighting: Soft studio lighting, natural drop shadows, no harsh contrast.
Camera Angle: Directly overhead (Top-Down).
Composition: Neat, organized, plenty of negative space.
Vibe: High-end, Pinterest-aesthetic, Clean.
`;

const tool = new DallEAPIWrapper({
    n: 1,
    model: "dall-e-3", // DALL-E 3 is best for following strict templates
    apiKey: process.env.OPENAI_API_KEY,
    size: "1024x1024",
    style: "natural", // 'natural' is often better for realistic looking photos than 'vivid'
    quality: "hd",
});

async function generateConsistentImage(itemName, color, material) {
    try {
        console.log(`🎨 Generating: ${itemName} in ${color}...`);

        // 2. Injecting Variables into the Template
        const prompt = `
${BASE_STYLE}

Subject: A single ${itemName}.
Color: ${color}.
Material: ${material}.

Placement: Centered perfectly in the frame.
Ensure the entire item is visible.
Do not add any other accessories or text.
Just the ${itemName} on the white background.
`;

        const imageUrl = await tool.invoke(prompt);
        console.log(`✅ Generated URL for ${itemName}:`, imageUrl);

        // Save file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `content_${itemName.replace(/\s+/g, '_')}_${timestamp}.png`;

        await downloadAndSave(imageUrl, filename);
        return filename;

    } catch (error) {
        console.error("Error:", error);
    }
}

async function downloadAndSave(url, filename) {
    const response = await fetch(url);
    const blob = await response.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());
    fs.writeFileSync(filename, buffer);
    console.log(`💾 Saved: ${filename}`);
}

async function main() {
    // Generate two different items with the SAME style
    await generateConsistentImage("Hoodie", "Forest Green", "Cotton");
    await generateConsistentImage("Denim Jacket", "Light Blue", "Denim");
}

main();
