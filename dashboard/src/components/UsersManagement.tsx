import { useState, useEffect } from 'react';
import {
  Search,
  Trash2,
  X,
  Mail,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export function UsersManagement() {
  const [users, setUsers] = useState<{
    id: string | number;
    name: string;
    email: string;
    joinDate: string;
    status: string;
    initials: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Pagination State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [profileName, setProfileName] = useState('Admin User');
  const [profileEmail, setProfileEmail] = useState('admin@stylo.ai');
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const limit = 5;

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<typeof users[0] | null>(null);

  // Debounce Search Term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch Users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        q: debouncedSearch
      });

      const response = await fetch(`${import.meta.env.VITE_API_URL}/dashboard/users?${query.toString()}`);
      const data = await response.json();

      if (data.success) {
        // Format dates if needed
        const formattedUsers = data.users.map((u: any) => ({
          ...u,
          joinDate: new Date(u.joinDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        }));
        setUsers(formattedUsers);

        if (data.pagination) {
          setTotalPages(data.pagination.totalPages);
          setTotalUsersCount(data.pagination.total);
        }
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

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
      } catch (error) {
        console.error('Failed to fetch admin profile:', error);
      }
    };
    fetchData();
    fetchUsers();
  }, [currentPage, debouncedSearch]);

  const handleDeleteClick = (user: typeof users[0]) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/dashboard/users/${selectedUser.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        // Refresh list
        fetchUsers();
        // Also refresh stats if needed
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
    } finally {
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setSelectedUser(null);
  };

  // Stats State
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    avgOutfits: 0
  });

  const fetchStats = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/dashboard/stats`);
      const data = await response.json();
      if (data.success) {
        const s = data.stats;
        const total = s.totalUsers.value;
        const active = s.activeUsers.value;
        const inactive = total - active;
        const generated = s.outfitsGenerated.value;
        const avg = total > 0 ? Math.round(generated / total) : 0;

        setStats({
          totalUsers: total,
          activeUsers: active,
          inactiveUsers: inactive,
          avgOutfits: avg
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);


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
          <h1 className="text-[28px] mb-2">Users Management</h1>
          <p className="text-gray-500 text-[15px]">Manage your app users and their activities</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="text-[13px] text-gray-500 tracking-wide uppercase mb-3">Total Users</div>
            <div className="text-[32px] tracking-tight">{stats.totalUsers.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="text-[13px] text-gray-500 tracking-wide uppercase mb-3">Active Users</div>
            <div className="text-[32px] tracking-tight">{stats.activeUsers.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="text-[13px] text-gray-500 tracking-wide uppercase mb-3">Inactive Users</div>
            <div className="text-[32px] tracking-tight">{stats.inactiveUsers.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="text-[13px] text-gray-500 tracking-wide uppercase mb-3">Avg Outfits/User</div>
            <div className="text-[32px] tracking-tight">{stats.avgOutfits.toLocaleString()}</div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h3 className="text-[17px] tracking-tight">All Users</h3>
              <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-500">{totalUsersCount} total</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[16px] h-[16px] text-gray-400" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Search users..."
                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black w-[240px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-gray-500">Loading users...</div>
            ) : (
              <>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-4 px-4 text-[13px] text-gray-500 uppercase tracking-wide">User</th>
                      <th className="text-left py-4 px-4 text-[13px] text-gray-500 uppercase tracking-wide">Contact</th>
                      <th className="text-left py-4 px-4 text-[13px] text-gray-500 uppercase tracking-wide">Join Date</th>
                      <th className="text-left py-4 px-4 text-[13px] text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="text-left py-4 px-4 text-[13px] text-gray-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, index) => (
                      <tr key={index} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white text-xs">
                              {user.initials}
                            </div>
                            <div>
                              <div className="text-[14px]">{user.name}</div>
                              <div className="text-[13px] text-gray-400">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2 text-[14px] text-gray-600">
                            <Mail className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                            {user.email}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2 text-[14px] text-gray-600">
                            <Calendar className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                            {user.joinDate}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex px-3 py-1.5 rounded-lg text-[12px] tracking-wide bg-black text-white">
                            {user.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" onClick={() => handleDeleteClick(user)}>
                            <Trash2 className="w-4 h-4 text-gray-400 hover:text-black" strokeWidth={1.5} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500">
                          No users found matching your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between border-t border-gray-100 px-4 py-4">
                  <div className="text-sm text-gray-500">
                    Page {currentPage} of {totalPages || 1}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="p-2 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        {isDeleteDialogOpen && (
          <div className="fixed inset-0 backdrop-blur-md bg-white/30 flex items-center justify-center z-50" onClick={handleCancelDelete}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-[17px] tracking-tight">Delete User</h3>
                  <button
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                    onClick={handleCancelDelete}
                  >
                    <X className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <p className="text-red-500 text-[13px] font-medium mb-2 uppercase tracking-wide border border-red-100 bg-red-50 p-2 rounded-lg text-center">Warning: This action is permanent</p>
                <p className="text-gray-600 text-[15px] mb-2 mt-4">
                  Are you sure you want to delete this user?
                </p>
                <div className="bg-gray-50 rounded-xl p-4 mt-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white text-xs">
                      {selectedUser?.initials}
                    </div>
                    <div>
                      <div className="text-[14px]">{selectedUser?.name}</div>
                      <div className="text-[13px] text-gray-400">{selectedUser?.email}</div>
                    </div>
                  </div>
                </div>
                <p className="text-gray-500 text-[13px] mt-4">
                  This will delete all of the user's data including generated outfits and preferences.
                </p>
              </div>

              <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  className="px-5 py-2.5 hover:bg-gray-100 rounded-xl transition-colors text-[14px] text-gray-700"
                  onClick={handleCancelDelete}
                >
                  Cancel
                </button>
                <button
                  className="px-5 py-2.5 bg-black text-white hover:bg-gray-800 rounded-xl transition-colors text-[14px]"
                  onClick={handleConfirmDelete}
                >
                  Delete User
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
