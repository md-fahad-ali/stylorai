import {
  TrendingUp,
  Users,
  Search,
  Upload,
  DollarSign
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { StatsCard } from './StatsCard';
import { UserGrowthChart } from './UserGrowthChart';
import { StylePreferencesChart } from './StylePreferencesChart';
// import { OutfitGenerationChart } from './OutfitGenerationChart';
import { RecentActivity } from './RecentActivity';

interface DashboardStats {
  totalUsers: { value: number; change: string; trend: 'up' | 'down' };
  activeUsers: { value: number; change: string; trend: 'up' | 'down' };
  outfitsGenerated: { value: number; change: string; trend: 'up' | 'down' };
  wardrobeUploads: { value: number; change: string; trend: 'up' | 'down' };
  revenue: { value: string; change: string; trend: 'up' | 'down' };
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartsData, setChartsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState('Admin User');
  const [profileEmail, setProfileEmail] = useState('admin@stylo.ai');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch admin profile from API
        const profileRes = await fetch(`${import.meta.env.VITE_API_URL}/dashboard/admin/profile`);
        const profileData = await profileRes.json();
        if (profileData.success && profileData.profile) {
          setProfileName(profileData.profile.full_name);
          setProfileEmail(profileData.profile.email);
        }

        // Fetch Stats
        const statsRes = await fetch(`${import.meta.env.VITE_API_URL}/dashboard/stats`);
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats(statsData.stats);
        }

        // Fetch Charts Data
        const chartsRes = await fetch(`${import.meta.env.VITE_API_URL}/dashboard/charts`);
        const chartsJson = await chartsRes.json();
        if (chartsJson.success) {
          setChartsData(chartsJson.charts);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8">Loading stats...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-8 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center text-white text-xs">
                AU
              </div>
              <div className="text-right">
                <div className="text-sm">{profileName}</div>
                <div className="text-xs text-gray-400">{profileEmail}</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-[28px] mb-2">Dashboard v1.1</h1>
          <p className="text-gray-500 text-[15px]">Welcome back! Here's what's happening with your AI fashion app.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Users"
            value={stats?.totalUsers.value.toLocaleString() || "0"}
            change={stats?.totalUsers.change || "0%"}
            icon={Users}
            trend={stats?.totalUsers.trend || "up"}
          />
          <StatsCard
            title="Active Users"
            value={stats?.activeUsers.value.toLocaleString() || "0"}
            change={stats?.activeUsers.change || "0%"}
            icon={TrendingUp}
            trend={stats?.activeUsers.trend || "up"}
          />
          <StatsCard
            title="Revenue (Awin)"
            value={stats?.revenue?.value || "$0.00"}
            change={stats?.revenue?.change || "+0%"}
            icon={DollarSign}
            trend={stats?.revenue?.trend || "up"}
          />
          <StatsCard
            title="Wardrobe Uploads"
            value={stats?.wardrobeUploads.value.toLocaleString() || "0"}
            change={stats?.wardrobeUploads.change || "0%"}
            icon={Upload}
            trend={stats?.wardrobeUploads.trend || "up"}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <UserGrowthChart data={chartsData?.userGrowth || []} />
          <StylePreferencesChart data={chartsData?.stylePreferences || []} />
        </div>

        {/* Outfit Generation Chart */}
        <div className="mb-6">
          {/* <OutfitGenerationChart data={chartsData?.outfitGeneration || []} /> */}
        </div>

        {/* Recent Activity */}
        <RecentActivity activities={chartsData?.recentActivity || []} />
      </div>
    </div>
  );
}