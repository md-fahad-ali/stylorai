# Fashion DNA API Documentation

## Endpoint
**POST** `/fashion/dna`

## Authentication
This endpoint requires JWT authentication. Include the access token in the Authorization header.

## Request Headers
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

## Request Body
Send the fashion preferences as JSON:

```json
{
  "season": ["Spring"],
  "style": ["Smart Casual"],
  "preferencesColor": ["Neutrals"],
  "bodyType": "Athletic",
  "skinTone": "Light-Medium"
}
```

### Field Descriptions
- **season** (array): Selected season(s) - Options: "Spring", "Summer", "Winter", "Autumn"
- **style** (array): Selected style(s) - Options: "Casual", "Smart Casual", "Formal", "Streetwear", "Minimalist", "Party", "Artistic", "Vintage", "Sporty"
- **preferencesColor** (array): Color preferences - Options: "Neutrals", "Warm Tones", "Cool Tones", "Earthy Tones", "Pastels", "Vibrant", "Monochrome", "Jewel Tones", "Metallics"
- **bodyType** (string): Body type - Options: "Curvy", "Athletic", "Slim", "Pear", "Rectangle", "Round"
- **skinTone** (string): Skin tone - Options: "Fair", "Light-Medium", "Medium", "Dark", "Medium-Dark"

## Response (Success - 200)
```json
{
  "success": true,
  "message": "Fashion DNA preferences received and outfit image generated successfully",
  "userId": 123,
  "userEmail": "user@example.com",
  "receivedData": {
    "season": ["Spring"],
    "style": ["Smart Casual"],
    "preferencesColor": ["Neutrals"],
    "bodyType": "Athletic",
    "skinTone": "Light-Medium"
  },
  "generatedImage": {
    "url": "https://oaidalleapiprodscus.blob.core.windows.net/private/...",
    "expiresIn": "2 hours"
  },
  "timestamp": "2025-12-28T19:46:09.000Z"
}
```

### 🎨 Generated Image
The API now automatically generates a personalized outfit flat lay image using DALL-E 3 based on your fashion preferences:
- **Seasonal appropriateness** - Outfit matches the selected season
- **Style matching** - Reflects your chosen style (Casual, Smart Casual, Formal, etc.)
- **Color coordination** - Uses your preferred color palette
- **Professional quality** - High-definition, photorealistic flat lay photography
- **Mobile-optimized** - Vertical composition perfect for mobile displays

### Image URL
- The image URL is valid for **2 hours**
- After that, you'll need to request a new image
- Download and save the image if you need to keep it longer

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized - Please login first"
}
```

### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Please provide fashion DNA preferences"
}
```

### Image Generation Failure
If image generation fails, you'll still receive the fashion data:
```json
{
  "success": true,
  "message": "Fashion DNA preferences received (image generation pending)",
  "userId": 123,
  "userEmail": "user@example.com",
  "receivedData": { ... },
  "generatedImage": null,
  "error": "Image generation failed, please try again",
  "timestamp": "2025-12-28T19:46:09.000Z"
}
```

## Example cURL Request
```bash
curl -X POST http://localhost:3000/fashion/dna \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "season": ["Spring"],
    "style": ["Smart Casual"],
    "preferencesColor": ["Neutrals"],
    "bodyType": "Athletic",
    "skinTone": "Light-Medium"
  }'
```

## Example Mobile/Frontend Request (JavaScript)
```javascript
const submitFashionDNA = async (preferences) => {
  const token = 'YOUR_ACCESS_TOKEN'; // Get from login response
  
  const response = await fetch('http://localhost:3000/fashion/dna', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      season: preferences.season,
      style: preferences.style,
      preferencesColor: preferences.preferencesColor,
      bodyType: preferences.bodyType,
      skinTone: preferences.skinTone
    })
  });
  
  const data = await response.json();
  
  if (data.generatedImage) {
    console.log('Generated Image URL:', data.generatedImage.url);
    // Display the image in your app
    document.getElementById('outfit-image').src = data.generatedImage.url;
  }
  
  return data;
};
```

## 🎯 How It Works

1. **Receive Fashion DNA** - API receives user's style preferences
2. **Generate Dynamic Prompt** - Creates a custom DALL-E prompt based on:
   - Selected season (Spring/Summer/Winter/Autumn)
   - Style preference (Smart Casual, Streetwear, Formal, etc.)
   - Color palette (Neutrals, Warm Tones, Vibrant, etc.)
   - Body type and skin tone
3. **Create Outfit Image** - DALL-E 3 generates a professional flat lay image with:
   - 1 main top garment
   - 1 bottom garment  
   - 1 pair of shoes (exactly 2 shoes)
   - Accessories (bag, sunglasses, jewelry)
4. **Return Results** - API sends back both the data and generated image URL

## 🎨 Image Quality Features

✅ Professional flat lay photography style  
✅ Pure white background  
✅ Vertical mobile-optimized composition  
✅ Perfect alignment and spacing  
✅ No duplicate items (fixes double shoes issue)  
✅ Proper sizing (sweatshirt/top is prominently sized)  
✅ High-definition (1024x1024px)  
✅ Photorealistic quality  
✅ Instagram/Pinterest worthy aesthetic  

## Notes
- Image generation takes approximately 10-30 seconds
- The endpoint is secured with JWT authentication
- Generated images are unique for each request
- Database saving is not yet implemented
- Console logs show both user information and submitted fashion preferences
