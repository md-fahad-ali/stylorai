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
    temperature: z.number().min(0).max(1).optional()
});

interface FashionDNARequest {
    season?: string[];
    style?: string[];
    preferencesColor?: string[];
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
            body_type: fashionData.bodyType,
            skin_tone: fashionData.skinTone
        };

        try {
            // Save preferences to database first
            console.log('💾 Saving fashion preferences for user:', user.id);
            await FashionPreferencesModel.upsert(user.id, preferencesToSave);
            console.log('✅ Preferences saved successfully');

            console.log('🎨 Generating outfit image for user preferences...');
            const { imageUrl, title, description, products } = await generateOutfitImage(fashionData);

            // Prepare response
            const response = {
                success: true,
                message: 'Fashion DNA preferences received and outfit image generated successfully',
                userId: user.id,
                userEmail: user.email,
                receivedData: {
                    season: fashionData.season || [],
                    style: fashionData.style || [],
                    preferencesColor: fashionData.preferencesColor || [],
                    bodyType: fashionData.bodyType || '',
                    skinTone: fashionData.skinTone || ''
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

            // Print/Return the response body
            console.log('Response:', JSON.stringify(response, null, 2));

            return reply.status(200).send(response);

        } catch (error) {
            console.error('Error generating outfit image:', error);

            // Still return success with fashion data even if image generation fails
            const response = {
                success: true,
                message: 'Fashion DNA preferences received (image generation pending)',
                userId: user.id,
                userEmail: user.email,
                receivedData: {
                    season: fashionData.season || [],
                    style: fashionData.style || [],
                    preferencesColor: fashionData.preferencesColor || [],
                    bodyType: fashionData.bodyType || '',
                    skinTone: fashionData.skinTone || ''
                },
                generatedImage: null,
                error: 'Image generation failed, please try again',
                timestamp: new Date().toISOString()
            };

            return reply.status(200).send(response);
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

            if (!savedPreferences) {
                return reply.status(404).send({
                    error: 'No saved preferences found',
                    message: 'Please save your fashion preferences first using POST /user/fashion-preferences/update'
                });
            }


            console.log('✅ Found user profile:', {
                gender: userData.gender,
                birthdate: userData.birthdate
            });
            console.log('✅ Found saved preferences:', JSON.stringify(savedPreferences, null, 2));

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
                    season: savedPreferences.season,
                    // If option is provided, use it; otherwise use saved styles
                    style: selectedOption ? [selectedOption] : savedPreferences.style,
                    preferencesColor: savedPreferences.preferences_color,
                    bodyType: savedPreferences.body_type || undefined,
                    skinTone: savedPreferences.skin_tone || undefined,
                    gender: userData.gender || undefined,
                    birthdate: userData.birthdate || undefined
                };

                // Generate outfit image
                console.log('🎨 Generating outfit image from saved preferences and profile...');
                const { imageUrl, title, description, products } = await generateOutfitImage(fashionData, temperature);

                // Prepare response
                const response = {
                    success: true,
                    message: 'Outfit image generated from your saved preferences',
                    userId: user.id,
                    userEmail: user.email,
                    usedPreferences: {
                        season: savedPreferences.season,
                        style: savedPreferences.style,
                        preferencesColor: savedPreferences.preferences_color,
                        bodyType: savedPreferences.body_type,
                        skinTone: savedPreferences.skin_tone
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

            // 4. Call Service
            // Dynamic import to avoid circular dep issues if any, or just import at top if clean
            // Imported normally at top
            const { imageGenerationService } = require('../services/imageGenerationService');

            console.log('🖼️ Processing uploaded image for Flat Lay generation...');
            const result = await imageGenerationService.generateFlatLayReplica(buffer);

            // 5. Save to Wardrobe
            const savedItem = await WardrobeModel.create({
                user_id: user.id,
                image_path: result.localPath,
                title: result.title
            });

            console.log(`✅ Saved new wardrobe item: ${savedItem.id} for user ${user.id}`);

            return reply.status(200).send({
                success: true,
                message: 'Flat lay image generated and saved to wardrobe successfully',
                data: savedItem,
                imageUrl: result.imageUrl,
                localPath: result.localPath,
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
            console.log(items);
            return reply.status(200).send({
                success: true,
                count: items.length,
                items: items
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

    // GET: Search products with pagination (Supports Single or Multi-Product Search)
    searchProducts: async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            const queryParams = req.query as Record<string, string>;
            const { limit, offset, queries, query } = queryParams;

            const limitNum = limit ? parseInt(limit) : 5; // Default limit per product
            const offsetNum = offset ? parseInt(offset) : 0;

            // 1. Check for "Multi-Product" search
            // Support 'queries' param (comma separated) OR 'productN' params
            let productQueries: string[] = [];

            if (queries) {
                // Easy mode: ?queries=watch,shirt,shoes
                productQueries = queries.split(',').map(q => q.trim()).filter(q => q.length > 0);
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
                const results = await searchMultipleProducts(productQueries, limitNum, offsetNum);

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

            const products = await searchProducts(query, limitNum, offsetNum);

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
