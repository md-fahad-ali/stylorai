import { FastifyInstance } from 'fastify';
import dashboardController from '../controllers/dashboardController';

async function dashboardRoutes(fastify: FastifyInstance, options: any) {
    // GET /dashboard/stats - Get dashboard statistics
    fastify.get('/stats', dashboardController.getStats);

    // GET /dashboard/charts - Get dashboard charts data
    fastify.get('/charts', dashboardController.getDashboardCharts);

    // In Progress Page - Matches /dashboard/in-progress
    // @ts-ignore
    fastify.get('/in-progress', { onRequest: [fastify.authenticate] }, async (req, reply) => {
        const projects = [
            {
                id: 1,
                title: "Vali apartment",
                location: "Texas, USA",
                progress: 70,
                timeLeft: "~2 hours remaining",
                status: "Generating layout...",
                startDate: "June 23, 2025",
                image: "https://placehold.co/150x150/png"
            },
            {
                id: 2,
                title: "Vali apartment",
                location: "Texas, USA",
                progress: 70,
                timeLeft: "~2 hours remaining",
                status: "Generating layout...",
                startDate: "June 23, 2025",
                image: "https://placehold.co/150x150/png"
            },
            {
                id: 3,
                title: "Vali apartment",
                location: "Texas, USA",
                progress: 70,
                timeLeft: "~2 hours remaining",
                status: "Generating layout...",
                startDate: "June 23, 2025",
                image: "https://placehold.co/150x150/png"
            },
            {
                id: 4,
                title: "Vali apartment",
                location: "Texas, USA",
                progress: 70,
                timeLeft: "~2 hours remaining",
                status: "Generating layout...",
                startDate: "June 23, 2025",
                image: "https://placehold.co/150x150/png"
            }
        ];
        return reply.view('inprogress', { title: 'Projects In Progress', user: req.user, projects });
    });

    // GET /dashboard/users - List all users
    fastify.get('/users', dashboardController.getAllUsers);

    // DELETE /dashboard/users/:id - Delete a user
    // DELETE /dashboard/users/:id - Delete a user
    fastify.delete('/users/:id', dashboardController.deleteUser);

    // GET /dashboard/analytics
    fastify.get('/analytics', dashboardController.getAnalytics);

    // Admin Profile
    fastify.get('/admin/profile', dashboardController.getAdminProfile);
    fastify.put('/admin/profile', dashboardController.updateAdminProfile);
}

export default dashboardRoutes;
