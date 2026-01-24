import { FastifyRequest, FastifyReply } from 'fastify';
import db from '../db/client';

import { generateOutfitImage } from '../services/outfitImageGenerator';
import { searchProducts } from '../services/imageGenerationService';
import FashionPreferencesModel from '../models/fashionPreferencesModel';
import UserModel from '../models/userModel';
import WardrobeModel from '../models/wardrobeModel';
import { z } from 'zod';

// Validation schema for image generation request
const GenerateImageSchema = z.object({
    option: z.enum([
        'Casual',
        'Smart Casual',
        'Formal',
        'Streetwear',
        'Minimalist',
        'Party',
        'Artistic',
        'Vintage',
        'Sporty'
    ]).optional(),
    temperature: z.number().optional()
});

interface FashionDNARequest {
    season?: string[];
    style?: string[];
    preferencesColor?: string[];
    color?: string[]; // New field
    bodyType?: string;
    skinTone?: string;
    gender?: string;
    birthdate?: Date | string;
}

const fashionController = {
    // Fashion DNA Submission - Secure POST Endpoint
    submitFashionDNA: async (req: FastifyRequest, reply: FastifyReply) => {
        // Verify JWT token for security
        try {
            await req.jwtVerify();
        } catch (err) {
            return reply.status(401).send({ error: 'Unauthorized - Please login first' });
        }

        const user = (req as any).user || (req as any).jwtUser;
        if (!user) {
            return reply.status(401).send({ error: 'Unauthorized - User not found' });
        }

        // Extract fashion DNA data from request body
        const fashionData = req.body as FashionDNARequest;

        // Validate that at least some data is provided
        if (!fashionData || Object.keys(fashionData).length === 0) {
            return reply.status(400).send({
                error: 'Bad Request',
                message: 'Please provide fashion DNA preferences'
            });
        }

        // Log the received data for debugging
        console.log('=== Fashion DNA Submission ===');
        console.log('User ID:', user.id);
        console.log('User Email:', user.email);
        console.log('Fashion Preferences:', JSON.stringify(fashionData, null, 2));
        console.log('==============================');

        // Filter out non-fashion preference keys (like generic object properties if any)
        // Explicitly map the request body to the model's expected format
        const preferencesToSave = {
            season: fashionData.season || [],
            style: fashionData.style || [],
            preferences_color: fashionData.preferencesColor || [], // Note: DB column is preferences_color
            color: fashionData.color || [], // New field
            body_type: fashionData.bodyType,
            skin_tone: fashionData.skinTone
        };

        try {
            // Save preferences to database first
            console.log('💾 Saving fashion preferences for user:', user.id);
            await FashionPreferencesModel.upsert(user.id, preferencesToSave);
            console.log('✅ Preferences saved successfully (Image generation skipped)');

            // Prepare response - DATA ONLY, NO IMAGE
            const response = {
                success: true,
                message: 'Fashion DNA preferences saved successfully',
                userId: user.id,
                userEmail: user.email,
                receivedData: {
                    season: fashionData.season || [],
                    style: fashionData.style || [],
                    preferencesColor: fashionData.preferencesColor || [],
                    color: fashionData.color || [],
                    bodyType: fashionData.bodyType || '',
                    skinTone: fashionData.skinTone || ''
                },
                timestamp: new Date().toISOString()
            };

            // Print/Return the response body
            console.log('Response:', JSON.stringify(response, null, 2));

            return reply.status(200).send(response);

        } catch (error) {
            console.error('Error saving fashion preferences:', error);
            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to save fashion preferences'
            });
        }
    },

    // Generate Outfit Image from Saved Preferences
    generateFromSavedPreferences: async (req: FastifyRequest, reply: FastifyReply) => {
        // Verify JWT token
        try {
            await req.jwtVerify();
        } catch (err) {
            return reply.status(401).send({ error: 'Unauthorized - Please login first' });
        }

        const user = (req as any).user || (req as any).jwtUser;
        if (!user) {
            return reply.status(401).send({ error: 'Unauthorized - User not found' });
        }

        try {
            // Fetch user's complete profile data
            console.log('📥 Fetching user profile for:', user.id);
            const userData = await UserModel.findById(user.id);

            if (!userData) {
                return reply.status(404).send({
                    error: 'User not found',
                    message: 'Unable to fetch user profile'
                });
            }

            // Fetch user's saved fashion preferences
            console.log('📥 Fetching saved preferences for user:', user.id);
            const savedPreferences = await FashionPreferencesModel.findByUserId(user.id);

            // Fallback for new users without saved preferences
            const defaultPreferences = {
                season: ['Spring'],
                style: ['Casual'],
                preferences_color: ['Neutrals'],
                body_type: 'Average',
                skin_tone: 'Medium',
                user_id: user.id
            };

            const finalPreferences = savedPreferences || defaultPreferences;

            // Re-assign to use finalPreferences downstream (we need to cast or rename usage)
            // But since savedPreferences is const, we'll just redefine the var for usage below or rely on a new var.
            // Actually, let's keep the variable name consistent to minimize code change, but we can't reassign const.
            // So we will use a new variable `prefsToUse` or just change the type of logic above.

            // CLEANER APPROACH:
            const prefsToUse = savedPreferences || {
                season: ['Spring'],
                style: ['Casual'],
                preferences_color: ['Neutrals'],
                body_type: 'Average',
                skin_tone: 'Medium',
                user_id: user.id
            };

            if (!savedPreferences) {
                console.log('⚠️ No saved prefs found, using DEFAULTS for user:', user.id);
            }


            console.log('✅ Found user profile:', {
                gender: userData.gender,
                birthdate: userData.birthdate
            });
            console.log('✅ Found saved preferences:', JSON.stringify(prefsToUse, null, 2));

            // Validate request body with Zod
            try {
                const validatedBody = GenerateImageSchema.parse(req.body || {});

                const selectedOption = validatedBody.option;
                const temperature = validatedBody.temperature ?? 0.7; // Default temperature

                console.log('🎲 Request parameters:', {
                    option: selectedOption || 'Random from saved',
                    temperature
                });

                // Prepare fashion data for image generation (including profile data)
                const fashionData: FashionDNARequest = {
                    season: prefsToUse.season,
                    // If option is provided, use it; otherwise use saved styles
                    style: selectedOption ? [selectedOption] : prefsToUse.style,
                    preferencesColor: prefsToUse.preferences_color,
                    bodyType: prefsToUse.body_type || undefined,
                    skinTone: prefsToUse.skin_tone || undefined,
                    gender: userData.gender || undefined,
                    birthdate: userData.birthdate || undefined
                };

                // Fetch user's wardrobe items
                console.log('👗 Fetching user wardrobe for outfit integration...');
                const wardrobeItems = await WardrobeModel.findByUserId(user.id);

                let selectedWardrobeItems: any[] = [];
                if (wardrobeItems && wardrobeItems.length > 0) {
                    // Balanced Selection Logic
                    // Goal: Pick distinct categories (Top, Bottom, Shoes, Accessory) rather than random mixing

                    const categories = {
                        top: wardrobeItems.filter(i => /shirt|t-shirt|top|jacket|coat|sweater|hoodie/i.test(i.category || i.title || '')),
                        bottom: wardrobeItems.filter(i => /pant|jeans|trousers|short|skirt/i.test(i.category || i.title || '')),
                        shoes: wardrobeItems.filter(i => /shoe|sneaker|boot|sandal|loafer/i.test(i.category || i.title || '')),
                        accessories: wardrobeItems.filter(i => !/shirt|t-shirt|top|jacket|coat|sweater|hoodie|pant|jeans|trousers|short|skirt|shoe|sneaker|boot|sandal|loafer/i.test(i.category || i.title || ''))
                    };

                    const pickRandom = (arr: any[]) => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null;

                    const selectedTop = pickRandom(categories.top);
                    const selectedBottom = pickRandom(categories.bottom);
                    const selectedShoe = pickRandom(categories.shoes);
                    const selectedAccessory = pickRandom(categories.accessories);

                    if (selectedTop) selectedWardrobeItems.push(selectedTop);
                    if (selectedBottom) selectedWardrobeItems.push(selectedBottom);
                    if (selectedShoe) selectedWardrobeItems.push(selectedShoe);
                    if (selectedAccessory) selectedWardrobeItems.push(selectedAccessory);

                    console.log(`✅ Selected Balanced Wardrobe Items: ${selectedWardrobeItems.map(i => i.category).join(', ')}`);
                }

                // Generate outfit image
                console.log('🎨 Generating outfit image from saved preferences and profile...');
                const { imageUrl, title, description, products } = await generateOutfitImage(fashionData, temperature, selectedWardrobeItems);

                // Prepare response
                const response = {
                    success: true,
                    message: 'Outfit image generated from your saved preferences',
                    userId: user.id,
                    userEmail: user.email,
                    usedPreferences: {
                        season: prefsToUse.season,
                        style: prefsToUse.style,
                        preferencesColor: prefsToUse.preferences_color,
                        bodyType: prefsToUse.body_type,
                        skinTone: prefsToUse.skin_tone
                    },
                    generatedImage: {
                        url: imageUrl,
                        title: title,
                        description: description,
                        products: products || [],
                        expiresIn: '2 hours'
                    },
                    timestamp: new Date().toISOString()
                };

                console.log('✅ Image generated successfully!');
                return reply.status(200).send(response);

            } catch (validationError) {
                // Handle Zod validation errors
                if (validationError instanceof z.ZodError) {
                    return reply.status(400).send({
                        success: false,
                        error: 'Invalid request body',
                        details: validationError.issues,
                        timestamp: new Date().toISOString()
                    });
                }
                throw validationError; // Re-throw if not a validation error
            }

        } catch (error) {
            console.error('❌ Error generating outfit image:', error);

            return reply.status(500).send({
                success: false,
                error: 'Failed to generate outfit image',
                message: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
        }
    },


    // NEW: Generate Flat Lay from Uploaded Image
    generateFlatLay: async (req: FastifyRequest, reply: FastifyReply) => {
        // Authenticate User
        try {
            await req.jwtVerify();
        } catch (err) {
            return reply.status(401).send({ error: 'Unauthorized - Please login first' });
        }

        const user = (req as any).user || (req as any).jwtUser;
        if (!user) {
            return reply.status(401).send({ error: 'Unauthorized - User not found' });
        }

        // Validate that user actually exists in DB (to avoid foreign key errors later)
        const userExists = await UserModel.findById(user.id);
        if (!userExists) {
            return reply.status(401).send({
                error: 'Unauthorized - Invalid User',
                message: 'Your session refers to a user that no longer exists. Please login again.'
            });
        }

        try {
            // 1. Validate Content-Type
            if (!req.isMultipart()) {
                return reply.status(400).send({
                    error: 'Invalid Request Type',
                    message: 'Request must be multipart/form-data with an image file.'
                });
            }

            // 2. Get uploaded file
            const data = await req.file();
            if (!data) {
                return reply.status(400).send({ error: 'No image file uploaded' });
            }

            // 2. Limit size (handled by fastify-multipart globally, but good to check)
            // 3. Convert to buffer
            const buffer = await data.toBuffer();

            // [NEW] Save Original Uploaded Image
            const fs = require('fs');
            const path = require('path');
            const originalFileName = `original_${Date.now()}_${data.filename.replace(/[^a-zA-Z0-9.]/g, '')}`;
            const uploadDir = path.join(process.cwd(), 'uploads', 'originals');

            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const originalFilePath = path.join(uploadDir, originalFileName);
            fs.writeFileSync(originalFilePath, buffer);

            // Construct public URL for uploaded image
            const localUploadedPath = `/uploads/originals/${originalFileName}`;
            const backendUrl = process.env.HOST || 'http://localhost:8081';
            const uploadedImageUrl = `${backendUrl}${localUploadedPath}`;

            console.log(`✅ Saved uploaded image to: ${originalFilePath}`);

            // 4. Call Service
            // Dynamic import to avoid circular dep issues if any, or just import at top if clean
            // Imported normally at top
            const { imageGenerationService } = require('../services/imageGenerationService');

            console.log('🖼️ Processing uploaded image for Flat Lay generation...');

            // Pass user gender to service to override vision detection if needed
            const userGender = userExists.gender || 'Unisex';
            const result = await imageGenerationService.generateFlatLayReplica(buffer, userGender);

            // 5. Save to Wardrobe
            const savedItem = await WardrobeModel.create({
                user_id: user.id,
                image_path: result.localPath,
                uploaded_image_path: uploadedImageUrl, // Save FULL URL as requested
                title: result.title,
                category: result.category || result.details.type,
                description: `Color: ${result.details.color}, Pattern: ${result.details.pattern}, Material: ${result.details.material}, Style: ${result.details.style}`,
                details: result.details
            });

            console.log(`✅ Saved new wardrobe item: ${savedItem.id} for user ${user.id}`);

            return reply.status(200).send({
                success: true,
                message: 'Flat lay image generated and saved to wardrobe successfully',
                data: savedItem,
                imageUrl: result.imageUrl,
                localPath: result.localPath,
                uploadedImageUrl: uploadedImageUrl,
                uploadedLocalPath: localUploadedPath,
                title: result.title,
                details: result.details,
                suggestedProducts: result.suggestedProducts,
                searchQuery: result.searchQuery, // For client pagination
                timestamp: new Date().toISOString()
            });

        } catch (error: any) {
            console.error('❌ Error generating flat lay:', error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to generate image',
                details: error.message
            });
        }
    },

    // GET: Fetch all wardrobe items for the user
    getWardrobe: async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            await req.jwtVerify();
        } catch (err) {
            return reply.status(401).send({ error: 'Unauthorized - Please login first' });
        }

        const user = (req as any).user || (req as any).jwtUser;
        if (!user) {
            return reply.status(401).send({ error: 'Unauthorized - User not found' });
        }

        try {
            const items = await WardrobeModel.findByUserId(user.id);

            // Enrich items with full URLs
            const enrichedItems = items.map((item: any) => {
                const backendUrl = process.env.HOST || 'http://localhost:8081';

                // DEBUG LOG
                console.log(`DEBUG: processing item alias=${item.id}, host=${backendUrl}, rawImg=${item.image_path}`);

                // 1. Resolve image_path -> full URL
                let finalImagePath = item.image_path;
                if (finalImagePath && !finalImagePath.startsWith('http')) {
                    finalImagePath = `${backendUrl}${finalImagePath}`;
                }

                // 2. Resolve uploaded_image_path -> full URL
                let finalUploadedUrl = item.uploaded_image_path;
                if (finalUploadedUrl && !finalUploadedUrl.startsWith('http')) {
                    finalUploadedUrl = `${backendUrl}${finalUploadedUrl}`;
                }

                return {
                    ...item,
                    image_path: finalImagePath, // Overwrite with absolute URL
                    imageUrl: finalImagePath,   // Add alias
                    uploadedImageUrl: finalUploadedUrl,
                    uploaded_image_path: finalUploadedUrl // Overwrite with absolute URL
                };
            });

            return reply.status(200).send({
                success: true,
                count: enrichedItems.length,
                items: enrichedItems
            });
        } catch (error: any) {
            console.error('❌ Error fetching wardrobe:', error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to fetch wardrobe items',
                details: error.message
            });
        }
    },

    // GET: Fetch individual wardrobe item by ID
    getWardrobeItemById: async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            await req.jwtVerify();
        } catch (err) {
            return reply.status(401).send({ error: 'Unauthorized - Please login first' });
        }

        const user = (req as any).user || (req as any).jwtUser;
        const { id } = req.params as { id: string };

        try {
            const item = await WardrobeModel.findById(id);

            if (!item) {
                return reply.status(404).send({ error: 'Wardrobe item not found' });
            }

            // Security check: Ensure item belongs to user
            if (Number(item.user_id) !== Number(user.id)) {
                return reply.status(403).send({ error: 'Unauthorized access to this item' });
            }

            // Enrich item with full URLs
            const enrichedItem: any = { ...item };
            const backendUrl = process.env.HOST || 'http://localhost:8081';

            // 1. Resolve image_path -> full URL
            if (enrichedItem.image_path && !enrichedItem.image_path.startsWith('http')) {
                enrichedItem.image_path = `${backendUrl}${enrichedItem.image_path}`;
            }
            enrichedItem.imageUrl = enrichedItem.image_path;

            // 2. Resolve uploaded_image_path -> full URL
            if (enrichedItem.uploaded_image_path && !enrichedItem.uploaded_image_path.startsWith('http')) {
                enrichedItem.uploaded_image_path = `${backendUrl}${enrichedItem.uploaded_image_path}`;
            }
            enrichedItem.uploadedImageUrl = enrichedItem.uploaded_image_path;

            return reply.status(200).send({
                success: true,
                item: enrichedItem
            });

        } catch (error: any) {
            console.error('❌ Error fetching wardrobe item:', error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to fetch wardrobe item',
                details: error.message
            });
        }
    },

    // DELETE: Delete wardrobe item
    deleteWardrobeItem: async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            await req.jwtVerify();
        } catch (err) {
            return reply.status(401).send({ error: 'Unauthorized - Please login first' });
        }

        const user = (req as any).user || (req as any).jwtUser;
        if (!user) {
            return reply.status(401).send({ error: 'Unauthorized - User not found' });
        }

        const { id } = req.params as { id: string };

        try {
            // Verify item exists and belongs to user
            const item = await WardrobeModel.findById(id);

            if (!item) {
                return reply.status(404).send({ error: 'Wardrobe item not found' });
            }

            if (Number(item.user_id) !== Number(user.id)) {
                return reply.status(403).send({ error: 'Unauthorized access to this item' });
            }

            // Delete the item
            const deleted = await WardrobeModel.delete(id, user.id);

            if (deleted) {
                return reply.status(200).send({
                    success: true,
                    message: 'Wardrobe item deleted successfully'
                });
            } else {
                return reply.status(500).send({ error: 'Failed to delete item' });
            }

        } catch (error: any) {
            console.error('❌ Error deleting wardrobe item:', error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to delete wardrobe item',
                details: error.message
            });
        }
    },

    // GET: Search products with pagination (Supports Single or Multi-Product Search)
    searchProducts: async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            // Extract user gender from JWT (optional - if not authenticated, show all)
            let userGender: string | undefined;
            try {
                await req.jwtVerify();
                const user = (req as any).user || (req as any).jwtUser;
                if (user && user.id) {
                    // Fetch user's gender from database
                    const userResult = await db.query('SELECT gender FROM users WHERE id = $1', [user.id]);
                    if (userResult.rows.length > 0) {
                        userGender = userResult.rows[0].gender;
                        console.log(`🔐 Authenticated user (ID: ${user.id}) - Gender: ${userGender}`);
                    }
                }
            } catch (err) {
                // User not authenticated - proceed without gender filter
                console.log('🔓 Unauthenticated search - showing all genders');
            }

            const queryParams = req.query as Record<string, string>;
            const { limit, offset, queries, query } = queryParams;

            const limitNum = limit ? parseInt(limit) : 5; // Default limit per product
            const offsetNum = offset ? parseInt(offset) : 0;

            // 1. Check for "Multi-Product" search
            // Support 'queries' param (comma separated) OR 'productN' params
            let productQueries: string[] = [];

            if (queries) {
                // SMART PARSE: Handle mixed bag of products and attributes
                // Example: "Sneakers, Color: Blue, Shirt, Pattern: Solid"
                // Should become: ["Sneakers, Color: Blue", "Shirt, Pattern: Solid"]

                const rawParts = queries.split(',');
                productQueries = [];

                const attributeRegex = /^\s*(Color|Pattern|Material|Style|Size):/i;

                for (let part of rawParts) {
                    const cleanPart = part.trim();
                    if (cleanPart.length === 0) continue;

                    // If this part looks like an attribute (starts with Color:, Pattern: etc)
                    // AND we have a previous product to attach it to, append it.
                    if (attributeRegex.test(cleanPart) && productQueries.length > 0) {
                        productQueries[productQueries.length - 1] += `, ${cleanPart}`;
                    } else {
                        // Otherwise, it's a new product (e.g., "Sneakers" or "Shirt")
                        productQueries.push(cleanPart);
                    }
                }

                console.log(`ℹ️ [Controller] Smart Parsed Queries:`, productQueries);
            } else {
                // Legacy mode: ?product1=watch&product2=shirt
                Object.keys(queryParams).forEach(key => {
                    if (key.startsWith('product') && queryParams[key]) {
                        productQueries.push(queryParams[key]);
                    }
                });
            }

            if (productQueries.length > 0) {
                console.log(`🔎 Multi-Product Search detected: ${productQueries.length} items`);
                console.log(`keys: ${productQueries.join(', ')}`);

                // Import the new function dynamically or ensure it is imported at top
                const { searchMultipleProducts } = require('../services/imageGenerationService');

                // Get categorized results
                const results = await searchMultipleProducts(productQueries, limitNum, offsetNum, userGender);

                // FLATTEN & INTERLEAVE RESULTS
                // Instead of { "shirt": [A,B], "shoes": [C,D] }, we want [A, C, B, D] mixed.
                const allLists: any[][] = Object.values(results) as any[][];
                const mixedProducts: any[] = [];
                const maxLen = Math.max(...allLists.map(list => list.length));

                for (let i = 0; i < maxLen; i++) {
                    for (const list of allLists) {
                        if (list[i]) {
                            mixedProducts.push(list[i]);
                        }
                    }
                }

                console.log(`✅ Returned ${mixedProducts.length} mixed products`);

                return reply.status(200).send({
                    success: true,
                    mode: 'multi-mixed',
                    count: mixedProducts.length,
                    products: mixedProducts, // Single mixed list
                    pagination: {
                        limit: limitNum * productQueries.length, // Total potential limit
                        offset: offsetNum
                    }
                });
            }

            // 2. Fallback to Standard Single Query
            if (!query) {
                return reply.status(400).send({ error: 'Missing query parameter (queries=... or query=...)' });
            }

            console.log(`🔎 Single Search: "${query}" (limit: ${limitNum}, offset: ${offsetNum})`);

            const products = await searchProducts(query, limitNum, offsetNum, userGender);

            return reply.status(200).send({
                success: true,
                mode: 'single',
                count: products.length,
                products: products,
                pagination: {
                    limit: limitNum,
                    offset: offsetNum,
                    hasMore: products.length === limitNum
                }
            });

        } catch (error: any) {
            console.error('❌ Error in product search:', error);
            return reply.status(500).send({
                success: false,
                error: 'Search failed',
                details: error.message
            });
        }
    },

    // ---------------------------------------------------------
    // SMART FAVORITES SYSTEM
    // ---------------------------------------------------------

    // ADD Favorite
    addToFavorites: async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            await req.jwtVerify();
            const user = (req as any).user || (req as any).jwtUser;

            const { product_name, product_url, image_url, price, search_query } = req.body as any;

            if (!product_url || !product_name) {
                return reply.status(400).send({ error: 'Product URL and Name are required' });
            }

            // Check if already exists
            const existing = await db.query(
                'SELECT id FROM favorites WHERE user_id = $1 AND product_url = $2',
                [user.id, product_url]
            );

            if (existing.rows.length > 0) {
                return reply.status(200).send({ success: true, message: 'Already in favorites', id: existing.rows[0].id });
            }

            const result = await db.query(
                `INSERT INTO favorites (user_id, product_name, product_url, image_url, price, search_query)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [user.id, product_name, product_url, image_url, price, search_query]
            );

            return reply.status(201).send({
                success: true,
                message: 'Added to favorites',
                favorite: result.rows[0]
            });

        } catch (error: any) {
            console.error('❌ Error adding favorite:', error);
            return reply.status(500).send({ success: false, error: 'Failed to add favorite' });
        }
    },

    // GET Favorites
    getFavorites: async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            await req.jwtVerify();
            const user = (req as any).user || (req as any).jwtUser;

            const result = await db.query(
                'SELECT * FROM favorites WHERE user_id = $1 ORDER BY created_at DESC',
                [user.id]
            );

            return reply.status(200).send({
                success: true,
                count: result.rows.length,
                favorites: result.rows
            });

        } catch (error: any) {
            console.error('❌ Error fetching favorites:', error);
            return reply.status(500).send({ success: false, error: 'Failed to fetch favorites' });
        }
    },

    // REMOVE Favorite
    removeFromFavorites: async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            await req.jwtVerify();
            const user = (req as any).user || (req as any).jwtUser;
            const { id } = req.params as { id: string };

            await db.query(
                'DELETE FROM favorites WHERE id = $1 AND user_id = $2',
                [id, user.id]
            );

            return reply.status(200).send({ success: true, message: 'Removed from favorites' });

        } catch (error: any) {
            console.error('❌ Error removing favorite:', error);
            return reply.status(500).send({ success: false, error: 'Failed to removing favorite' });
        }
    },

    // -------------------------------------------------------------
    // Favorite Outfits (Snapshot)
    // -------------------------------------------------------------

    // Add Outfit to Favorites
    addToFavoriteOutfits: async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            await req.jwtVerify();
            const user = (req as any).user || (req as any).jwtUser;
            const body = req.body as any;
            const { image_url, title, description, products } = body;

            if (!image_url) {
                return reply.status(400).send({ error: 'Missing required fields: image_url' });
            }

            // Save entire outfit snapshot
            const result = await db.query(
                `INSERT INTO favorite_outfits (user_id, image_url, title, description, products)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING *`,
                [user.id, image_url, title, description, JSON.stringify(products || [])]
            );

            return reply.status(201).send({
                success: true,
                message: 'Outfit saved to favorites',
                favoriteOutfit: result.rows[0]
            });

        } catch (error) {
            console.error('Error adding favorite outfit:', error);
            return reply.status(500).send({ error: 'Internal Server Error' });
        }
    },

    // Get Favorite Outfits
    getFavoriteOutfits: async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            await req.jwtVerify();
            const user = (req as any).user || (req as any).jwtUser;

            const result = await db.query(
                `SELECT * FROM favorite_outfits WHERE user_id = $1 ORDER BY created_at DESC`,
                [user.id]
            );

            return reply.status(200).send({
                success: true,
                outfits: result.rows
            });

        } catch (error) {
            console.error('Error fetching favorite outfits:', error);
            return reply.status(500).send({ error: 'Internal Server Error' });
        }
    },

    // Remove Outfit from Favorites
    deleteFavoriteOutfit: async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            await req.jwtVerify();
            const user = (req as any).user || (req as any).jwtUser;
            const { id } = req.params as any;

            const result = await db.query(
                `DELETE FROM favorite_outfits WHERE id = $1 AND user_id = $2 RETURNING id`,
                [id, user.id]
            );

            if (result.rowCount === 0) {
                return reply.status(404).send({ error: 'Favorite outfit not found or unauthorized' });
            }

            return reply.status(200).send({
                success: true,
                message: 'Outfit removed from favorites',
                id
            });

        } catch (error) {
            console.error('Error removing favorite outfit:', error);
            return reply.status(500).send({ error: 'Internal Server Error' });
        }
    }
};

export default fashionController;
