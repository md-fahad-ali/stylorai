import {
  LayoutDashboard,
  Users,
  Package,
  BarChart3,
  FileText,
  Settings,
  LogOut
} from 'lucide-react';
import Group from '../imports/Group1171277407';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  onLogout: () => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'content', label: 'Content Pages', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ currentPage, onPageChange, onLogout }: SidebarProps) {
  return (
    <aside className="w-[280px] bg-white border-r border-gray-100 p-6 flex flex-col fixed top-0 left-0 bottom-0 z-50" style={{ height: "100dvh" }}>
      <div className="mb-8">
        <div className="px-2 w-[120px] h-[50px]">
          <Group />
        </div>
      </div>

      <nav className="space-y-1 flex-1 overflow-y-auto -mx-2 px-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                ? 'bg-black text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50 hover:text-black'
                }`}
            >
              <Icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2 : 1.5} />
              <span className="text-[13px]">{item.label}</span>
            </button>
          );
        })}
      </nav>


      {/* Logout Button */}
      <div className="pt-4 mt-auto border-t border-gray-100">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all"
        >
          <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} />
          <span className="text-[13px]">Logout</span>
        </button>
      </div>
    </aside>
  );
}