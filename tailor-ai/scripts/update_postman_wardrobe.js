const fs = require('fs');
const path = require('path');

const postmanPath = path.join(__dirname, '../postman_collection.json');
const collection = JSON.parse(fs.readFileSync(postmanPath, 'utf8'));

// Define the new request item
const getWardrobeItemById = {
    "name": "Get Wardrobe Item by ID",
    "request": {
        "auth": {
            "type": "bearer",
            "bearer": [
                {
                    "key": "token",
                    "value": "{{jwtToken}}",
                    "type": "string"
                }
            ]
        },
        "method": "GET",
        "header": [
            {
                "key": "Accept",
                "value": "application/json",
                "type": "string"
            }
        ],
        "url": {
            "raw": "{{baseUrl}}/fashion/wardrobe/1",
            "host": [
                "{{baseUrl}}"
            ],
            "path": [
                "fashion",
                "wardrobe",
                "1"
            ]
        },
        "description": "Get individual wardrobe item details by ID, including category, description, and deep analysis details for Awin search."
    },
    "response": []
};

// Find the Fashion folder
const fashionFolder = collection.item.find(item => item.name === "Fashion");

if (fashionFolder) {
    // Check if it already exists
    const existingIndex = fashionFolder.item.findIndex(item => item.name === "Get Wardrobe Item by ID");

    if (existingIndex !== -1) {
        fashionFolder.item[existingIndex] = getWardrobeItemById;
        console.log('Updated existing "Get Wardrobe Item by ID" request.');
    } else {
        // Insert it after "Get Wardrobe" if found, otherwise append
        const getWardrobeIndex = fashionFolder.item.findIndex(item => item.name === "Get Wardrobe");
        if (getWardrobeIndex !== -1) {
            fashionFolder.item.splice(getWardrobeIndex + 1, 0, getWardrobeItemById);
        } else {
            fashionFolder.item.push(getWardrobeItemById);
        }
        console.log('Added "Get Wardrobe Item by ID" request.');
    }

    fs.writeFileSync(postmanPath, JSON.stringify(collection, null, 4));
    console.log('Postman collection updated successfully.');
} else {
    console.error('Fashion folder not found in collection.');
}
