require('dotenv').config();
const fs = require('fs');
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const INPUT_IMAGE = 'woman2.webp';

async function main() {
    console.log("👀 Analyzing EXACT pattern details with GPT-4 Vision...");

    // Read and encode image
    const imageBuffer = fs.readFileSync(INPUT_IMAGE);
    const base64Image = imageBuffer.toString('base64');

    // 1. Get an extremely specific pattern analysis
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: "Identify the floral pattern on this dress. Describe: 1. Background color (hex code approximation). 2. Flower types, sizes, and colors. 3. Density of the pattern. 4. Fabric texture. Be extremely precise because I need to replicate this fabric." },
                    {
                        type: "image_url",
                        image_url: { "url": `data:image/png;base64,${base64Image}` }
                    },
                ],
            },
        ],
        max_tokens: 300,
    });

    const fabricDescription = response.choices[0].message.content;
    console.log("📝 Fabric DNA:", fabricDescription);

    // 2. Generate using DALL-E 3 with the specific fabric DNA
    console.log("🎨 Regeneration with Texture Matching...");

    const prompt = `Professional flat lay photography of a dress with this exact fabric: ${fabricDescription}.
    
    The dress style is a long-sleeve wrap dress.
    CRITICAL:
    - The pattern MUST match the description perfectly.
    - Top-down view. Flat lay on white.
    - No mannequin.
    - Photorealistic texture.`;

    const imgGen = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "hd",
        style: "natural"
    });

    const url = imgGen.data[0].url;
    console.log("✅ New Image URL:", url);

    // Save
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    fs.writeFileSync('dress_pattern_match.png', Buffer.from(arrayBuffer));
    console.log("💾 Saved to dress_pattern_match.png");
}

main();
