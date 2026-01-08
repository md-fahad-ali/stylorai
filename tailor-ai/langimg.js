require('dotenv').config();
const fs = require('fs');
const { DallEAPIWrapper } = require("@langchain/openai");

async function generatePremiumOutfitImage() {
    try {
        console.log("🎨 Generating premium flat lay image with 3D elements...");

        const premiumPrompt = `Minimal fashion flat lay on a clean white background.

A casual Y2K-inspired outfit arranged neatly with natural spacing,
similar to a Pinterest or H&M outfit layout.

The outfit includes a brown sweatshirt with subtle varsity-style
“Los Angeles California” text, gray straight-leg jeans, white chunky sneakers,
a small black shoulder bag, and black rectangular sunglasses.

The sweatshirt is the main focus, placed slightly to the right.
The jeans are placed vertically on the left.
The sneakers sit at the bottom.
Accessories are arranged simply without clutter.

Top-down view, soft studio lighting, clean shadows.
Modern, minimal, professional e-commerce style.
All items fully visible inside the frame.
`;

        const tool = new DallEAPIWrapper({
            n: 1,
            model: "dall-e-3",
            apiKey: process.env.OPENAI_API_KEY,
            size: "1024x1024",
            style: "natural",
            quality: "hd",
        });

        const imageUrl = await tool.invoke(premiumPrompt);
        console.log("✅ Premium image generated successfully!");
        console.log("🔗 Image URL:", imageUrl);

        // Download and save with timestamp
        const imgResponse = await fetch(imageUrl);
        const blob = await imgResponse.blob();
        const buffer = Buffer.from(await blob.arrayBuffer());

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `premium_outfit_${timestamp}.png`;
        fs.writeFileSync(filename, buffer);
        console.log(`💾 Saved as: ${filename}`);

        return {
            url: imageUrl,
            filename: filename
        };

    } catch (error) {
        console.error("❌ Error:", error.message);
        if (error.response) {
            console.error("API Response:", error.response.data);
        }
        throw error;
    }
}

// Execute
generatePremiumOutfitImage()
    .then(result => {
        console.log("🎉 Generation complete!");
        console.log("📁 File:", result.filename);
    })
    .catch(err => {
        console.error("💥 Failed:", err.message);
    });
