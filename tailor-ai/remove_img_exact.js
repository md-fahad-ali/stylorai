require('dotenv').config();
const fs = require('fs');
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const INPUT_IMAGE = 'woman2.webp';

async function main() {
    console.log("👀 Analyzing STRUCTURE + PATTERN with GPT-4 Vision...");

    const imageBuffer = fs.readFileSync(INPUT_IMAGE);
    const base64Image = imageBuffer.toString('base64');

    // 1. Get Technical Spec (Cut, Fit, Length, Neckline)
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: "You are an expert fashion curator. Write a detailed technical description of this dress for a high-end catalog. \n\nDescribe exactly:\n1. Top Half: Color, Fabric, Embroidery details.\n2. Bottom Half: Skirt color, print pattern, geometric borders.\n3. Fit & Cut: Neckline, Waistline, Sleeve type.\n\nBe precise about the 'Brown Bodice' vs 'Block Print Skirt' contrast." },
                    {
                        type: "image_url",
                        image_url: { "url": `data:image/png;base64,${base64Image}` }
                    },
                ],
            },
        ],
        max_tokens: 300,
    });

    const technicalPrompt = response.choices[0].message.content;
    console.log("📝 Technical Prompt from Vision:", technicalPrompt);

    // 2. Generate
    console.log("🎨 Generating Exact Replica Candidate...");

    const finalPrompt = `Professional ghost mannequin photography of: ${technicalPrompt}. \n\nIsolated on pure white background. Flat lighting. Fashion catalog style.`;

    const imgGen = await openai.images.generate({
        model: "dall-e-3",
        prompt: finalPrompt,
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
    fs.writeFileSync('dress_exact_replica.png', Buffer.from(arrayBuffer));
    console.log("💾 Saved to dress_exact_replica.png");
}

main();
