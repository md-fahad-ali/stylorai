const fs = require('fs');
const path = require('path');

const postmanPath = path.join(__dirname, '../postman_collection.json');
const collection = JSON.parse(fs.readFileSync(postmanPath, 'utf8'));

const cartFolder = {
    "name": "Cart",
    "item": [
        {
            "name": "Add to Cart",
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
                "method": "POST",
                "header": [
                    {
                        "key": "Content-Type",
                        "value": "application/json",
                        "type": "string"
                    }
                ],
                "body": {
                    "mode": "raw",
                    "raw": "{\n    \"title\": \"Sample Product\",\n    \"price\": \"$20.50\",\n    \"buy_now_url\": \"https://example.com/product\",\n    \"image_url\": \"https://example.com/image.jpg\"\n}"
                },
                "url": {
                    "raw": "{{baseUrl}}/cart",
                    "host": [
                        "{{baseUrl}}"
                    ],
                    "path": [
                        "cart"
                    ]
                },
                "description": "Add an item to the user's cart. Requires JWT token."
            },
            "response": []
        },
        {
            "name": "Get Cart",
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
                "header": [],
                "url": {
                    "raw": "{{baseUrl}}/cart",
                    "host": [
                        "{{baseUrl}}"
                    ],
                    "path": [
                        "cart"
                    ]
                },
                "description": "Get all items in the user's cart. Requires JWT token."
            },
            "response": []
        },
        {
            "name": "Remove from Cart",
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
                "method": "DELETE",
                "header": [],
                "url": {
                    "raw": "{{baseUrl}}/cart/1",
                    "host": [
                        "{{baseUrl}}"
                    ],
                    "path": [
                        "cart",
                        "1"
                    ]
                },
                "description": "Remove an item from the cart by ID. Requires JWT token."
            },
            "response": []
        }
    ]
};

// Check if Cart folder already exists to avoid duplicates
const existingCartIndex = collection.item.findIndex(item => item.name === "Cart");
if (existingCartIndex !== -1) {
    collection.item[existingCartIndex] = cartFolder;
    console.log('Updated existing Cart folder.');
} else {
    collection.item.push(cartFolder);
    console.log('Added new Cart folder.');
}

fs.writeFileSync(postmanPath, JSON.stringify(collection, null, 4));
console.log('Postman collection updated successfully.');
