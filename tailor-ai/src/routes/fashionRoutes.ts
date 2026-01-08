import { FastifyInstance } from 'fastify';
import fashionController from '../controllers/fashionController';

async function fashionRoutes(fastify: FastifyInstance) {
    // POST /fashion/dna - Submit Fashion DNA (Secured with JWT)
    fastify.post('/dna', fashionController.submitFashionDNA);

    // POST /fashion/generate - Generate outfit from saved preferences
    fastify.post('/generate', fashionController.generateFromSavedPreferences);

    // POST /fashion/generate-flat-lay - Generate flat lay from uploaded image
    fastify.post('/generate-flat-lay', fashionController.generateFlatLay);

    // GET /fashion/wardrobe - Get all wardrobe items
    fastify.get('/wardrobe', fashionController.getWardrobe);

    // GET /fashion/search - Search products with pagination
    fastify.get('/search', fashionController.searchProducts);

    // Favorites Routes
    fastify.post('/favorite', fashionController.addToFavorites);
    fastify.get('/favorites', fashionController.getFavorites);
    fastify.delete('/favorite/:id', fashionController.removeFromFavorites);

    // Favorite Outfits Routes (Snapshots)
    fastify.post('/outfit/favorite', fashionController.addToFavoriteOutfits);
    fastify.get('/outfit/favorites', fashionController.getFavoriteOutfits);
    fastify.delete('/outfit/favorite/:id', fashionController.deleteFavoriteOutfit);
}

export default fashionRoutes;
