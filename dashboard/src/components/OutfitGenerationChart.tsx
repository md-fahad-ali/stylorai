import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

interface OutfitGenerationChartProps {
  data: { day: string; outfits: number }[];
}

export function OutfitGenerationChart({ data }: OutfitGenerationChartProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <h3 className="text-[17px] mb-8 tracking-tight">Outfit Generation - Last 7 Days</h3>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            ticks={[0, 25, 50, 75, 100]} // This static array might obscure real data range if small/large. Better let it auto-scale or dynamic.
            // Removing ticks prop to allow auto-scale, or pass simplified count.
            allowDecimals={false}
            dx={-10}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #f0f0f0',
              borderRadius: '12px',
              fontSize: '12px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
            cursor={{ fill: 'rgba(0, 0, 0, 0.03)' }}
          />
          <Bar
            dataKey="outfits"
            fill="#000000"
            radius={[6, 6, 0, 0]}
            maxBarSize={50}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}