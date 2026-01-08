
interface Activity {
  type: string;
  user: string;
  action: string;
  time: string;
  status: string;
}

interface RecentActivityProps {
  activities: Activity[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <h3 className="text-[17px] mb-6 tracking-tight">Recent Activity</h3>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-4 px-4 text-[13px] text-gray-500 uppercase tracking-wide">Type</th>
              <th className="text-left py-4 px-4 text-[13px] text-gray-500 uppercase tracking-wide">User</th>
              <th className="text-left py-4 px-4 text-[13px] text-gray-500 uppercase tracking-wide">Action</th>
              <th className="text-left py-4 px-4 text-[13px] text-gray-500 uppercase tracking-wide">Time</th>
              <th className="text-left py-4 px-4 text-[13px] text-gray-500 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            {(activities || []).map((activity, index) => (
              <tr key={index} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-4 px-4">
                  <span className="text-[14px] text-gray-900">{activity.type}</span>
                </td>
                <td className="py-4 px-4">
                  <span className="text-[14px] text-gray-900">{activity.user}</span>
                </td>
                <td className="py-4 px-4">
                  <span className="text-[14px] text-gray-600">{activity.action}</span>
                </td>
                <td className="py-4 px-4">
                  <span className="text-[13px] text-gray-400">{activity.time}</span>
                </td>
                <td className="py-4 px-4">
                  <span className={`inline-flex px-3 py-1.5 rounded-lg text-[12px] tracking-wide ${activity.status === 'completed'
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-600'
                    }`}>
                    {activity.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
            {(!activities || activities.length === 0) && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500 text-sm">
                  No recent activity found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}