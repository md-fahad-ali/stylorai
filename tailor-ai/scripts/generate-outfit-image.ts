import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import dotenv from "dotenv";

// Load env
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Outfit configuration
const outfitConfig = {
    season: "Winter",
    style: "Casual",
    top: "Brown oversized sweatshirt with subtle typography",
    bottom: "Grey high-waisted wide-leg jeans",
    shoes: "White chunky sneakers",
    accessory1: "Black rectangular sunglasses",
    accessory2: "Small black shoulder handbag",
};

// Build strong fashion flat-lay prompt
function buildPrompt(config: typeof outfitConfig): string {
    return `
Professional fashion flat lay outfit image for a mobile shopping app UI.
A complete ${config.season.toLowerCase()} ${config.style.toLowerCase()} outfit arranged neatly on a pure white background.

OUTFIT DETAILS:
- ${config.top}
- ${config.bottom}
- ${config.shoes}
- ${config.accessory1}
- ${config.accessory2}

STYLE & CAMERA:
- Top-down flat lay photography
- Clean minimalist aesthetic
- Studio lighting
- Soft natural shadows
- Realistic fabric folds and texture
- High-resolution e-commerce product photography
- No mannequin, no human model
- No text, no logo, no watermark

COMPOSITION:
Centered outfit, balanced spacing, modern fashion catalog style.
`;
}

// Download image helper
function downloadImage(url: string, filepath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);
        https
            .get(url, (response) => {
                response.pipe(file);
                file.on("finish", () => {
                    file.close();
                    resolve();
                });
            })
            .on("error", (err) => {
                fs.unlink(filepath, () => { });
                reject(err);
            });
    });
}

// Generate image
async function generateOutfitImage() {
    console.log("🎨 Generating fashion flat-lay image...\n");

    const prompt = buildPrompt(outfitConfig);
    console.log("📝 Prompt:\n", prompt);

    try {
        const response = await openai.images.generate({
            model: "gpt-image-1-mini",
            prompt: prompt,
            size: "1024x1024",
        });

        if (!response.data || response.data.length === 0) {
            throw new Error("No image data returned from OpenAI");
        }

        const imageBase64 = response.data[0].b64_json;

        if (!imageBase64) {
            throw new Error("No base64 image data in response");
        }

        const outputDir = path.resolve(__dirname, "../generated-images");
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const filename = `outfit-${Date.now()}.png`;
        const filepath = path.join(outputDir, filename);

        const imageBuffer = Buffer.from(imageBase64, "base64");
        fs.writeFileSync(filepath, imageBuffer);

        console.log("✅ Image generated successfully!");
        console.log("🎉 Image saved at:", filepath);
    } catch (error: any) {
        console.error("❌ Error generating image:", error.message);
    }
}


// Run
generateOutfitImage();
