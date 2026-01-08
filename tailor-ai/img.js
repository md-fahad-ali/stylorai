require('dotenv').config();
const fs = require('fs');
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function generatePremiumOutfitImage() {
    try {
        console.log("🎨 Generating premium flat lay image with precise composition...");

        const premiumPrompt = `Create a professional fashion outfit flat lay photograph. Pure white background. Top-down bird's eye view.

CRITICAL POSITIONING - LEFT vs RIGHT (viewer's perspective looking at image):

═══════════════════════════════════
║        TOP CENTER:                ║
║    Black sunglasses               ║
║                                   ║
║  LEFT SIDE    │   RIGHT SIDE      ║
║  (viewer's    │   (viewer's       ║
║   left)       │    right)         ║
║               │                   ║
║  Gray jeans   │   Brown           ║
║  folded       │   sweatshirt      ║
║  vertically   │   (LARGEST        ║
║               │    item)          ║
║               │                   ║
║  BOTTOM LEFT: │                   ║
║  One pair     │                   ║
║  sneakers     │   CENTER:         ║
║  (2 shoes)    │   Black bag       ║
║               │   + jewelry       ║
═══════════════════════════════════

EXACT ITEM SPECIFICATIONS:

1. BLACK RECTANGULAR SUNGLASSES
   - Position: TOP CENTER, horizontal
   - Size: Small accessory

2. GRAY WIDE-LEG JEANS (LEFT SIDE)
   - Position: LEFT side of image (viewer's left)
   - Orientation: Vertical, folded to show full length
   - Color: Solid gray denim throughout
   - Takes up: Left third of composition

3. BROWN OVERSIZED SWEATSHIRT (RIGHT SIDE - HERO ITEM)
   - Position: RIGHT side of image (viewer's right)
   - Text: "LOS ANGELES CALIFORNIA" in white collegiate letters
   - Color: SOLID BROWN throughout - both sleeves MUST be brown, body MUST be brown
   - NO mixed colors, NO gray sleeves, NO color variations
   - Size: LARGEST item - 40-50% of total image area
   - Layout: Laid flat, sleeves spread naturally
   - This is the MAIN FOCAL POINT

4. WHITE/GRAY CHUNKY SNEAKERS (BOTTOM LEFT)
   - Position: Bottom left area
   - Count: Show EXACTLY ONE PAIR = 2 individual shoes (left + right shoe)
   - NEVER show 4 shoes, NEVER duplicate
   - Style: New Balance 530 aesthetic, chunky retro design

5. BLACK SHOULDER BAG
   - Position: Center area, below sweatshirt
   - Style: Small curved black bag
   - Size: Medium accessory

6. SILVER JEWELRY
   - Necklace: Delicate silver chain
   - Bracelet or hoop earrings: Simple silver
   - Position: Arranged near bag in center/bottom

CRITICAL COLOR RULES:
- Sweatshirt: 100% SOLID BROWN (chocolate brown) - NO gray parts, NO mixed sleeves
- Jeans: 100% SOLID GRAY denim
- Shoes: White/gray mix (chunky sneaker aesthetic)
- Background: Pure white #FFFFFF

ABSOLUTE POSITIONING RULES:
- LEFT SIDE (viewer's left) = JEANS ONLY
- RIGHT SIDE (viewer's right) = SWEATSHIRT ONLY
- DO NOT swap these positions
- DO NOT put jeans on right
- DO NOT put sweatshirt on left

LAYOUT REQUIREMENTS:
1. Vertical mobile-friendly composition
2. Clean spacing between all items
3. All items completely within frame
4. Nothing cut off at edges
5. Pure white background with no shadows on background
6. Professional studio lighting with soft shadows only on items
7. Sweatshirt is the LARGEST and most prominent item
8. Perfect alignment like Pinterest/Instagram flat lay

STYLE:
- Modern minimalist flat lay
- Professional product photography
- Y2K casual streetwear aesthetic
- Photorealistic quality
- Instagram-worthy composition
- All items coordinate as a wearable outfit

WHAT TO AVOID:
❌ Do NOT make sweatshirt with gray or mixed-color sleeves
❌ Do NOT put jeans on the right side
❌ Do NOT put sweatshirt on the left side
❌ Do NOT show more than 2 shoes (one pair)
❌ Do NOT make sweatshirt small
❌ Do NOT overlap items unnecessarily
❌ Do NOT cut items at frame edges
❌ Do NOT add shadows to white background`;

        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: premiumPrompt,
            n: 1,
            size: "1024x1024",
            style: "natural",
            quality: "hd",
        });

        const imageUrl = response.data[0].url;
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