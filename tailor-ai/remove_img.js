require('dotenv').config();
const fs = require('fs');
const OpenAI = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const INPUT_IMAGE = 'woman2.webp'; // Make sure this file exists!

// 1. First, we use GPT-4 Vision to "See" the dress and describe it perfectly
async function analyzeImage(imagePath) {
    console.log("👀 Analyzing image with GPT-4 Vision...");

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: "Describe this dress in extreme technical detail for a fashion photographer. Mention the exact fabric, texture, neckline, sleeve length, pattern, color, and fit. Do not describe the person or background. Just the garment." },
                    {
                        type: "image_url",
                        image_url: {
                            "url": `data:image/png;base64,${base64Image}`
                        },
                    },
                ],
            },
        ],
        max_tokens: 300,
    });

    const description = response.choices[0].message.content;
    console.log("📝 GPT-4 Description:", description);
    return description;
}

// 2. Then, we use DALL-E 3 to "Generate" that exact dress on a white background
async function generateDressOnWhite(description) {
    console.log("🎨 Generating dress on white background using DALL-E 3...");

    const prompt = `A professional fashion flat lay photography of a detailed dress.
    The dress is: ${description}.
    
    CRITICAL PRESENTATION RULES:
    - Top-down view (Bird's eye view).
    - The dress is laid completely flat on a pristine white background.
    - NO MANNEQUIN. NO MODEL. NO HANGER. NO BODY.
    - The fabric is spread naturally to show the shape fittingly.
    - Sleeves are laid out symmetrically.
    - Pure white background (#FFFFFF).
    - High-end e-commerce quality.`;

    const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "hd",
        style: "natural"
    });

    return response.data[0].url;
}

async function main() {
    try {
        // Step 1: Analyze
        if (!fs.existsSync(INPUT_IMAGE)) {
            console.error(`❌ Input file '${INPUT_IMAGE}' not found. Please add a test image.`);
            return;
        }

        const description = await analyzeImage(INPUT_IMAGE);

        // Step 2: Regenerate
        const imageUrl = await generateDressOnWhite(description);

        console.log("✅ Success! New Image URL:", imageUrl);

        // Save it
        const imgResponse = await fetch(imageUrl);
        const arrayBuffer = await imgResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync('dress_white_bg.png', buffer);
        console.log("💾 Saved to dress_white_bg.png");

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

main();
