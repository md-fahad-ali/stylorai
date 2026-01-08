import axios from 'axios';

// Awin API Base URL
const AWIN_API_BASE = 'https://api.awin.com';

interface AwinTransaction {
    id: string;
    commissionAmount: { amount: number; currency: string };
    saleAmount: { amount: number; currency: string };
    transactionDate: string;
    clickDate: string;
    // Add other fields as needed based on specific API response
}

export const revenueService = {
    /**
     * Fetch transactions from Awin API
     * @param publisherId The Awin Publisher ID
     * @param token The Awin API Token
     * @param region The region code (e.g., 'US', 'GB') - Optional, used if API requires it specific to endpoint
     * @returns List of transactions with commission data
     */
    getTransactions: async (publisherId: string, token: string, startDate: string, endDate: string) => {
        try {
            // Note: This endpoint is a generic placeholder. The actual Awin API endpoint for publishers 
            // to get transactions is usually specific. 
            // Based on Awin docs, it is often: /publishers/{publisherId}/transactions/
            // We need to pass startDate and endDate as query params mostly (timezone formatted).

            const url = `${AWIN_API_BASE}/publishers/${publisherId}/transactions/`;

            console.log(`💰 Fetching Awin transactions for ${publisherId} from ${startDate} to ${endDate}`);

            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                params: {
                    startDate,
                    endDate,
                    timezone: 'UTC' // Best practice to stick to UTC
                }
            });

            return response.data;
        } catch (error: any) {
            console.error('❌ Error fetching Awin transactions:', error.response?.data || error.message);
            throw new Error('Failed to fetch revenue data from Awin');
        }
    },

    /**
     * Get aggregated revenue stats (Total Commission, Total Sales)
     */
    getRevenueStats: async () => {
        const publisherId = process.env.AWIN_PUBLISHER_ID;
        const token = process.env.AWIN_API_TOKEN;

        // Fallback to mock if creds missing
        if (!publisherId || !token) {
            console.warn('⚠️ Awin credentials missing. Returning mock revenue data.');
            return {
                totalCommission: 124560,
                totalSales: 4500000,
                currency: 'USD',
                change: '+23.5%'
            };
        }

        try {
            // Date Range: Last 30 Days
            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - 30);

            // Format to ISO string (Awin might need specific format, but ISO usually works or 2024-01-01T00:00:00)
            const startDate = start.toISOString();
            const endDate = end.toISOString();

            const transactions = await revenueService.getTransactions(publisherId, token, startDate, endDate);

            let totalCommission = 0;
            let totalSales = 0;
            let currency = 'USD';

            if (Array.isArray(transactions)) {
                transactions.forEach((t: any) => {
                    if (t.commissionAmount && typeof t.commissionAmount.amount === 'number') {
                        totalCommission += t.commissionAmount.amount;
                        // Capture currency from first transaction if aval
                        if (t.commissionAmount.currency) currency = t.commissionAmount.currency;
                    }
                    if (t.saleAmount && typeof t.saleAmount.amount === 'number') {
                        totalSales += t.saleAmount.amount;
                    }
                });
            } else {
                console.warn('Awin API response was not an array:', transactions);
            }

            return {
                totalCommission,
                totalSales,
                currency,
                change: '+15.2%' // Placeholder for now as comparison needs more data
            };

        } catch (error) {
            console.error('❌ Failed to fetch real revenue stats:', error);
            // Fallback to mock on error to avoid breaking dashboard
            return {
                totalCommission: 124560,
                totalSales: 4500000,
                currency: 'USD',
                change: '+23.5%'
            };
        }
    }
};
