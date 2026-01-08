import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

interface StylePreferencesChartProps {
  data: { name: string; value: number; color: string }[];
}

export function StylePreferencesChart({ data }: StylePreferencesChartProps) {
  // Fallback if data is empty to avoid broken chart or show empty state
  const hasData = data && data.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <h3 className="text-[17px] mb-8 tracking-tight">Style Preferences</h3>

      <ResponsiveContainer width="100%" height={300}>
        {hasData ? (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Legend
              verticalAlign="middle"
              align="right"
              layout="vertical"
              iconType="circle"
              formatter={(value, entry: any) => (
                <span className="text-[13px] text-gray-700">
                  {value} <span className="text-gray-400">{entry.payload.value}%</span>
                </span>
              )}
            />
          </PieChart>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            No style data available
          </div>
        )}
      </ResponsiveContainer>
    </div>
  );
}