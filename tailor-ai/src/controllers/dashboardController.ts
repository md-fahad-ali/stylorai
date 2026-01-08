import { FastifyRequest, FastifyReply } from 'fastify';
import UserModel from '../models/userModel';
import { revenueService } from '../services/revenueService';
import AdminModel from '../models/adminModel'; // Ensure this model exists
import WardrobeModel from '../models/wardrobeModel';

// Helper for '2 min ago'
function timeAgo(date: Date) {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " min ago";
    return Math.floor(seconds) + " sec ago";
}

const dashboardController = {
    // GET /dashboard/stats
    getStats: async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            // In a real app, you might want these to be parallel promises
            const totalUsers = await UserModel.countAll();
            const totalWardrobeItems = await WardrobeModel.countAll();

            // Mocking some data that we don't track yet
            const activeUsers = Math.floor(totalUsers * 0.82); // Mock 82% active
            const outfitsGenerated = totalWardrobeItems; // Using wardrobe items as proxy for generated outfits

            // Mock growth stats
            const revenueStats = await revenueService.getRevenueStats();
            const stats = {
                totalUsers: {
                    value: totalUsers,
                    change: "+12.5% from last month",
                    trend: "up"
                },
                activeUsers: {
                    value: activeUsers,
                    change: "+8.2% from last month",
                    trend: "up"
                },
                outfitsGenerated: {
                    value: outfitsGenerated,
                    change: "+23.1% from last month",
                    trend: "up"
                },
                wardrobeUploads: {
                    value: totalWardrobeItems,
                    change: "+15.8% from last month",
                    trend: "up"
                },
                revenue: {
                    value: new Intl.NumberFormat('en-US', { style: 'currency', currency: revenueStats.currency }).format(revenueStats.totalCommission),
                    change: revenueStats.change || "+0%",
                    trend: "up"
                }
            };

            return reply.send({
                success: true,
                stats
            });

        } catch (error: any) {
            console.error('❌ Error fetching dashboard stats:', error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to fetch dashboard stats'
            });
        }
    },

    // GET /dashboard/users
    getAllUsers: async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            const { page = 1, limit = 5, q = '' } = req.query as { page?: number; limit?: number; q?: string };
            const offset = (Number(page) - 1) * Number(limit);

            const users = await UserModel.findAll({
                limit: Number(limit),
                offset: offset,
                search: q
            });

            const totalCount = await UserModel.countWithSearch(q);
            const totalPages = Math.ceil(totalCount / Number(limit));

            const formattedUsers = users.map(u => ({
                id: u.id,
                name: u.full_name || 'Unknown',
                email: u.email,
                joinDate: u.created_at,
                status: 'active',
                initials: u.full_name ? u.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??'
            }));

            return reply.send({
                success: true,
                users: formattedUsers,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total: totalCount,
                    totalPages: totalPages
                }
            });
        } catch (error: any) {
            console.error('❌ Error fetching users:', error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to fetch users'
            });
        }
    },

    // DELETE /dashboard/users/:id
    deleteUser: async (req: FastifyRequest, reply: FastifyReply) => {
        const { id } = req.params as { id: string };
        try {
            // 1. Delete Foreign Keys first to avoid constraints
            try {
                // Delete Wardrobe items
                await import('../db/client').then(m => m.default.query('DELETE FROM wardrobe WHERE user_id = $1', [id]));
                // Delete Fashion Preferences
                await import('../db/client').then(m => m.default.query('DELETE FROM fashion_preferences WHERE user_id = $1', [id]));
            } catch (cleanupError) {
                console.warn('⚠️ Warning cleaning up user data:', cleanupError);
                // Continue to try deleting user even if cleanup warns (though DB might still block if cleanup failed)
            }

            // 2. Delete User
            const deleted = await UserModel.delete(id);
            if (deleted) {
                return reply.send({
                    success: true,
                    message: 'User deleted successfully'
                });
            } else {
                return reply.status(404).send({
                    success: false,
                    error: 'User not found'
                });
            }
        } catch (error: any) {
            console.error('❌ Error deleting user:', error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to delete user: ' + (error.message || 'Unknown error')
            });
        }
    },

    // GET /dashboard/charts - Get dynamic chart data
    getDashboardCharts: async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            // 1. User Growth (Users created per month for last 6 months)
            const allUsers = await UserModel.getAll();
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            // Initialize map for last 6 months
            const userGrowthData: { month: string; users: number }[] = [];
            const today = new Date();
            for (let i = 5; i >= 0; i--) {
                const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                userGrowthData.push({ month: months[d.getMonth()], users: 0 });
            }

            // Calculate cumulative users over time
            let cumulativeCount = 0;
            // First, count users before the 6 month window
            const startOfWindow = new Date(today.getFullYear(), today.getMonth() - 5, 1);
            cumulativeCount = allUsers.filter(u => new Date(u.created_at || 0) < startOfWindow).length;

            userGrowthData.forEach((point, index) => {
                const d = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1);
                const nextMonth = new Date(today.getFullYear(), today.getMonth() - (5 - index) + 1, 1);

                const newUsersThisMonth = allUsers.filter(u => {
                    const date = new Date(u.created_at || 0);
                    return date >= d && date < nextMonth;
                }).length;

                cumulativeCount += newUsersThisMonth;
                point.users = cumulativeCount;
            });


            // 2. Style Preferences (from FashionPreferences)
            const { rows: styleRows } = await import('../db/client').then(m => m.default.query(
                `SELECT style FROM fashion_preferences`
            ));

            const styleCounts: Record<string, number> = {};
            let totalStyles = 0;

            styleRows.forEach((row: any) => {
                let styles: string[] = [];
                if (Array.isArray(row.style)) styles = row.style;
                else if (typeof row.style === 'string') {
                    try { styles = JSON.parse(row.style); } catch (e) { }
                }

                styles.forEach(s => {
                    styleCounts[s] = (styleCounts[s] || 0) + 1;
                    totalStyles++;
                });
            });

            const styleChartData = Object.entries(styleCounts)
                .map(([name, count]) => ({
                    name,
                    value: totalStyles > 0 ? Math.round((count / totalStyles) * 100) : 0,
                    color: '#000000'
                }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5); // Top 5

            const colors = ['#000000', '#374151', '#6B7280', '#9CA3AF', '#D1D5DB'];
            styleChartData.forEach((item, index) => {
                item.color = colors[index % colors.length];
            });


            // 3. Outfit Generation (Last 7 Days) - Proxy using Wardrobe Uploads
            // Using raw query to act as simplistic "findAll" for wardrobe to get timestamps
            const { rows: wardrobeRows } = await import('../db/client').then(m => m.default.query(
                `SELECT created_at FROM wardrobe`
            ));

            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const outfitData: { day: string; outfits: number }[] = [];

            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dayName = days[d.getDay()];

                const count = wardrobeRows.filter((row: any) => {
                    const rowDate = new Date(row.created_at);
                    return rowDate.getDate() === d.getDate() &&
                        rowDate.getMonth() === d.getMonth() &&
                        rowDate.getFullYear() === d.getFullYear();
                }).length;

                outfitData.push({ day: dayName, outfits: count });
            }


            // 4. Recent Activity (Signups + Uploads)
            const { rows: activityRows } = await import('../db/client').then(m => m.default.query(
                `
                (SELECT 'User Signup' as type, COALESCE(full_name, email) as user_name, 'New user registration' as action, created_at as time, 'completed' as status FROM users)
                UNION ALL
                (SELECT 'Upload' as type, COALESCE(u.full_name, u.email) as user_name, 'Uploaded wardrobe items' as action, w.created_at as time, 'completed' as status 
                 FROM wardrobe w JOIN users u ON w.user_id = u.id)
                UNION ALL
                (SELECT 
                  CASE WHEN action = 'login' THEN 'User Login'
                       WHEN action = 'logout' THEN 'User Logout'
                       ELSE 'Activity' END as type,
                  COALESCE(u.full_name, u.email) as user_name,
                  CASE WHEN action = 'login' THEN 'System login'
                       WHEN action = 'logout' THEN 'System logout'
                       ELSE action END as action,
                  ua.created_at as time,
                  'completed' as status
                 FROM user_activity ua JOIN users u ON ua.user_id = u.id
                 WHERE action IN ('login', 'logout')
                )
                ORDER BY time DESC LIMIT 10
                `
            ));

            const formattedActivity = activityRows.map((a: any) => ({
                type: a.type,
                user: a.user_name,
                action: a.action,
                time: timeAgo(new Date(a.time)),
                status: a.status
            }));


            return reply.send({
                success: true,
                charts: {
                    userGrowth: userGrowthData,
                    stylePreferences: styleChartData,
                    outfitGeneration: outfitData,
                    recentActivity: formattedActivity,
                    userEngagement: await (async () => {
                        // 5. User Engagement (Activity by time of day) - Real Data
                        const { rows: engagementRows } = await import('../db/client').then(m => m.default.query(
                            `SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count 
                             FROM user_activity 
                             WHERE created_at > NOW() - INTERVAL '30 days'
                             GROUP BY hour`
                        ));

                        const buckets = [0, 4, 8, 12, 16, 20, 24];
                        const engagementMap: Record<number, number> = {};

                        engagementRows.forEach((row: any) => {
                            const h = parseInt(row.hour);
                            // Simple bucketing: nearest bucket? or just assume 4 hour blocks?
                            // Let's just group into the 6 slices 0-4, 4-8 etc.
                            const bucket = Math.floor(h / 4) * 4;
                            engagementMap[bucket] = (engagementMap[bucket] || 0) + parseInt(row.count);
                        });

                        return buckets.map(h => ({
                            hour: `${h.toString().padStart(2, '0')}:00`,
                            engagement: engagementMap[h] || 0
                        }));
                    })()
                }
            });

        } catch (error: any) {
            console.error('❌ Error fetching dashboard charts:', error);
            return reply.status(500).send({
                success: false,
                error: 'Failed to fetch dashboard charts'
            });
        }
    },

    // GET /dashboard/analytics - Get key metrics
    getAnalytics: async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            // Get Revenue Stats
            const revenueStats = await revenueService.getRevenueStats();

            // Mock other stats for now as we don't have tracking for them yet
            const analytics = {
                revenue: {
                    value: new Intl.NumberFormat('en-US', { style: 'currency', currency: revenueStats.currency }).format(revenueStats.totalCommission),
                    change: revenueStats.change || '+0%',
                    trend: 'up'
                },
                sessionTime: {
                    value: '12m 30s',
                    change: '+12%',
                    trend: 'up'
                },
                conversionRate: {
                    value: '2.4%',
                    change: '+4.1%',
                    trend: 'up'
                },
                returnRate: {
                    value: '15%',
                    subtitle: 'weekly active users',
                    trend: 'down'
                }
            };

            return reply.send({ success: true, analytics });
        } catch (error) {
            console.error('Error fetching analytics:', error);
            return reply.status(500).send({ success: false, error: 'Failed to fetch analytics' });
        }
    },

    // GET /dashboard/admin/profile
    getAdminProfile: async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            const settings = await AdminModel.getSettings();
            // Return default structure if null
            return reply.send({
                success: true,
                profile: settings || {
                    full_name: 'Admin User',
                    email: 'admin@stylorai.com',
                    role: 'Administrator',
                    theme: 'system',
                    notifications: true
                }
            });
        } catch (error) {
            console.error('Error getting admin profile:', error);
            return reply.status(500).send({ success: false, error: 'Failed to get admin profile' });
        }
    },

    // PUT /dashboard/admin/profile
    updateAdminProfile: async (req: FastifyRequest, reply: FastifyReply) => {
        try {
            const { full_name, email, role, theme, notifications } = req.body as any;

            const updated = await AdminModel.updateSettings({
                full_name,
                email,
                role,
                theme,
                notifications
            });

            return reply.send({ success: true, profile: updated });
        } catch (error) {
            console.error('Error updating admin profile:', error);
            return reply.status(500).send({ success: false, error: 'Failed to update admin profile' });
        }
    }
};

export default dashboardController;
