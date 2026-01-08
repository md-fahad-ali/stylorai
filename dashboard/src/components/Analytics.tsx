import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Users, Shirt, Upload, Sparkles } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

type TimePeriod = 'day' | 'week' | 'month' | 'year';

const engagementData = [
  { hour: '00:00', engagement: 45 },
  { hour: '04:00', engagement: 23 },
  { hour: '08:00', engagement: 167 },
  { hour: '12:00', engagement: 289 },
  { hour: '16:00', engagement: 334 },
  { hour: '20:00', engagement: 456 },
  { hour: '24:00', engagement: 189 },
];

export function Analytics() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month');
  const [analytics, setAnalytics] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch analytics metrics
        const analyticsRes = await fetch(`${import.meta.env.VITE_API_URL}/dashboard/analytics`);
        const analyticsData = await analyticsRes.json();
        if (analyticsData.success) {
          setAnalytics(analyticsData.analytics);
        }

        // Fetch charts data (user growth, style preferences)
        const chartsRes = await fetch(`${import.meta.env.VITE_API_URL}/dashboard/charts`);
        const chartsData = await chartsRes.json();
        if (chartsData.success) {
          setCharts(chartsData.charts);
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="p-8">Loading analytics...</div>;
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] tracking-tight mb-1">Analytics</h1>
            <p className="text-[13px] text-gray-500">Comprehensive insights and performance metrics</p>
          </div>

          {/* Time Period Filter */}
          <div className="flex gap-2 bg-gray-50 p-1 rounded-xl">
            {(['day', 'week', 'month', 'year'] as TimePeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={`px-4 py-2 rounded-lg text-[13px] transition-all ${timePeriod === period
                  ? 'bg-black text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Revenue"
            value={analytics?.revenue?.value || "$0.00"}
            change={analytics?.revenue?.change || "+0%"}
            trend={analytics?.revenue?.trend || "up"}
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <MetricCard
            title="Avg. Session Time"
            value={analytics?.sessionTime?.value || "0m 0s"}
            change={analytics?.sessionTime?.change || "+0%"}
            trend={analytics?.sessionTime?.trend || "up"}
            icon={<Users className="w-5 h-5" />}
          />
          <MetricCard
            title="Conversion Rate"
            value={analytics?.conversionRate?.value || "0%"}
            change={analytics?.conversionRate?.change || "+0%"}
            trend={analytics?.conversionRate?.trend || "down"}
            icon={<Sparkles className="w-5 h-5" />}
          />
          {/* <MetricCard
            title="Items Uploaded"
            value="45,280"
            change="+15.3%"
            trend="up"
            icon={<Upload className="w-5 h-5" />}
          /> */}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* User Growth Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-[16px] mb-1">User Growth</h3>
            <p className="text-[13px] text-gray-500 mb-6">Total and active users over time</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={charts?.userGrowth || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#737373' }} />
                <YAxis tick={{ fontSize: 12, fill: '#737373' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    fontSize: '13px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '13px' }} />
                <Line type="monotone" dataKey="users" stroke="#1a1a1a" strokeWidth={2} dot={{ fill: '#1a1a1a' }} name="Total Users" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Outfit Generation Chart */}
          {/* <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-[16px] mb-1">Outfit Generation</h3>
            <p className="text-[13px] text-gray-500 mb-6">AI outfits generated this week</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={outfitGenerationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#737373' }} />
                <YAxis tick={{ fontSize: 12, fill: '#737373' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    fontSize: '13px'
                  }}
                />
                <Bar dataKey="outfits" fill="#1a1a1a" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div> */}

          {/* Style Preferences Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-[16px] mb-1">Style Preferences</h3>
            <p className="text-[13px] text-gray-500 mb-6">Most popular fashion styles</p>
            <div className="flex items-center justify-between">
              <ResponsiveContainer width="50%" height={280}>
                <PieChart>
                  <Pie
                    data={charts?.stylePreferences || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {(charts?.stylePreferences || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color || '#000000'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e5e5',
                      borderRadius: '8px',
                      fontSize: '13px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {(charts?.stylePreferences || []).map((item: any, index: number) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color || '#000000' }}
                      />
                      <span className="text-[13px] text-gray-700">{item.name}</span>
                    </div>
                    <span className="text-[13px]">{item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* User Engagement Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-[16px] mb-1">User Engagement</h3>
            <p className="text-[13px] text-gray-500 mb-6">Activity by time of day</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={charts?.userEngagement || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hour" tick={{ fontSize: 12, fill: '#737373' }} />
                <YAxis tick={{ fontSize: 12, fill: '#737373' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    fontSize: '13px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="engagement"
                  stroke="#1a1a1a"
                  strokeWidth={2}
                  dot={{ fill: '#1a1a1a', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* <StatCard title="Wardrobe Completion" value="67%" subtitle="average items uploaded" /> */}
          <StatCard title="Return Rate" value={analytics?.returnRate?.value || "0%"} subtitle={analytics?.returnRate?.subtitle || "weekly active users"} />
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  change,
  trend,
  icon
}: {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-700">
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-[13px] ${trend === 'up' ? 'text-gray-900' : 'text-gray-500'}`}>
          {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span>{change}</span>
        </div>
      </div>
      <h3 className="text-[13px] text-gray-500 mb-1">{title}</h3>
      <p className="text-[28px] tracking-tight">{value}</p>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-[13px] text-gray-500 mb-2">{title}</h3>
      <p className="text-[32px] tracking-tight mb-1">{value}</p>
      <p className="text-[13px] text-gray-400">{subtitle}</p>
    </div>
  );
}
