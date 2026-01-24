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

        // Start Product Feed Update Scheduler
        const { updateProductDatabase } = require('./services/productService');

        const scheduleUkMidnightUpdate = () => {
            const now = new Date();
            // Get current wall-clock time in London
            const ukTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/London" }));

            // Calculate next midnight relative to London wall-clock
            const nextMidnight = new Date(ukTime);
            nextMidnight.setHours(24, 0, 0, 0);

            const delay = nextMidnight.getTime() - ukTime.getTime();

            console.log(`🕒 Server Time: ${now.toLocaleTimeString()}`);
            console.log(`🇬🇧 UK Time: ${ukTime.toLocaleTimeString()}`);
            const hours = Math.floor(delay / (1000 * 60 * 60));
            const minutes = Math.floor((delay % (1000 * 60 * 60)) / (1000 * 60));
            console.log(`⏳ Next Product Update scheduled in ${hours}h ${minutes}m (at 00:00 UK Time).`);

            setTimeout(() => {
                console.log('⏰ It is 00:00 UK Time! Starting Daily Product Update...');
                updateProductDatabase();

                // Then repeat every 24 hours
                setInterval(() => {
                    console.log('⏰ Starting Daily Product Update (24h Interval)...');
                    updateProductDatabase();
                }, 24 * 60 * 60 * 1000);
            }, delay);
        };

        // Run the scheduler
        scheduleUkMidnightUpdate();

    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
