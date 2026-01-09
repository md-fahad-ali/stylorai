import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });
import build from './app';

const app = build({ logger: true, trustProxy: true });

// Import Cleanup Service
const { runCleanup } = require('./services/cleanupService');

const start = async () => {
    try {
        const PORT = parseInt(process.env.PORT || process.env.FASTIFY_PORT || '8081', 10);
        await app.listen({ port: PORT, host: '0.0.0.0' });
        // @ts-ignore
        app.log.info(`Server listening on ${app.server.address().port}`);

        // Start Cleanup Scheduler (Run once now, then every hour)
        runCleanup();
        setInterval(runCleanup, 60 * 60 * 1000); // 1 Hour

    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
