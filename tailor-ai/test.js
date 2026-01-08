import OpenAI from "openai";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Paths
const INPUT_IMAGE = path.resolve("./woman.webp");
const OUTPUT_DIR = path.resolve("output");
const OUTPUT_IMAGE = path.join(OUTPUT_DIR, "dress.png");

// Prompt used for dress isolation
const PROMPT = `
Isolate and regenerate only the dress from the provided image.

Remove the woman completely.
Remove face, body, arms, legs, hair, hands.
Remove original background.

Generate a flat lay product image of the dress only, placed naturally as if prepared for an e-commerce catalog.

PRESERVE:
- Original dress design
- Fabric type
- Embroidery placement
- Print pattern and colors
- Dress length and silhouette

STYLE:
- Top-down flat lay photography
- Pure white background
- Soft realistic shadow
- Clean minimalist e-commerce style
- High-resolution product image

RULES:
- No human
- No mannequin
- No hanger
- No text
- No logo
- No watermark
`;

async function generateDress() {
    console.log("👗 Generating dress flat-lay image...");

    if (!fs.existsSync(INPUT_IMAGE)) {
        throw new Error("❌ input/woman.jpg not found");
    }

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const imageBuffer = fs.readFileSync(INPUT_IMAGE);

    const { toFile } = await import("openai/uploads");

    const response = await openai.images.edit({
        model: "gpt-image-1",
        image: await toFile(imageBuffer, "woman.webp", { type: "image/webp" }),
        prompt: PROMPT,
        size: "1024x1024",
    });

    const base64Image = response.data[0]?.b64_json;

    if (!base64Image) {
        throw new Error("❌ No image returned");
    }

    const finalImage = Buffer.from(base64Image, "base64");
    fs.writeFileSync(OUTPUT_IMAGE, finalImage);

    console.log("✅ Dress image generated!");
    console.log("📁 Saved to:", OUTPUT_IMAGE);
}

generateDress().catch(console.error);
