const fs = require('fs');
const path = require('path');

const postmanPath = path.join(__dirname, '../postman_collection.json');
const collection = JSON.parse(fs.readFileSync(postmanPath, 'utf8'));

const fashionFolder = collection.item.find(item => item.name === "Fashion");
if (fashionFolder) {
    const dnaRequest = fashionFolder.item.find(item => item.name === "Submit Fashion DNA");
    if (dnaRequest) {
        const payload = {
            "season": ["Spring"],
            "style": ["Smart Casual"],
            "preferencesColor": ["Neutrals"],
            "color": ["red", "indigo"],
            "bodyType": "Athletic",
            "skinTone": "Light-Medium"
        };

        // Update body
        dnaRequest.request.body.raw = JSON.stringify(payload, null, 4);

        // Update description to mention colors
        dnaRequest.request.description = "Submit fashion preferences including 'preferencesColor' and generate outfit image. Returns { imageUrl, title, description, products: [{ title, category }] }. Requires JWT token.";

        console.log('Updated "Submit Fashion DNA" request with new payload.');
    } else {
        console.error('"Submit Fashion DNA" request not found.');
    }

    fs.writeFileSync(postmanPath, JSON.stringify(collection, null, 4));
    console.log('Postman collection updated successfully.');
} else {
    console.error('Fashion folder not found.');
}
