import { useState, useEffect } from 'react';
import { Palette, Bell, User } from 'lucide-react';

export function Settings() {
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
    const [notifications, setNotifications] = useState(true);

    // Profile states
    const [fullName, setFullName] = useState('Admin User');
    const [email, setEmail] = useState('admin@stylorai.com');
    const [role, setRole] = useState('Administrator');
    const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);

    // Load profile from database on mount
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/dashboard/admin/profile`);
                const data = await response.json();

                if (data.success && data.profile) {
                    setFullName(data.profile.full_name);
                    setEmail(data.profile.email);
                    setRole(data.profile.role);
                    setTheme(data.profile.theme || 'system');
                    setNotifications(data.profile.notifications);

                    // Apply theme
                    applyTheme(data.profile.theme || 'system');
                }
            } catch (error) {
                console.error('Failed to load profile:', error);
            }
        };

        loadProfile();
    }, []);

    const handleProfileSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/dashboard/admin/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: fullName,
                    email: email,
                    role: role,
                    theme: theme,
                    notifications: notifications
                })
            });

            const data = await response.json();

            if (data.success) {
                setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
                setTimeout(() => setProfileMessage({ type: '', text: '' }), 3000);
            } else {
                setProfileMessage({ type: 'error', text: 'Failed to update profile' });
            }
        } catch (error) {
            setProfileMessage({ type: 'error', text: 'Network error. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else if (newTheme === 'light') {
            document.documentElement.classList.remove('dark');
        } else {
            // System theme
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
    };

    const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
        setTheme(newTheme);
        applyTheme(newTheme);

        // Save to database
        try {
            await fetch(`${import.meta.env.VITE_API_URL}/dashboard/admin/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ theme: newTheme })
            });
        } catch (error) {
            console.error('Failed to save theme:', error);
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-8 py-5">
                <h1 className="text-[20px] tracking-tight mb-1">Settings</h1>
                <p className="text-[13px] text-gray-500">Customize your dashboard preferences</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-4xl space-y-6">

                    {/* Profile Section */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                                <User className="w-5 h-5 text-gray-700" />
                            </div>
                            <div>
                                <h2 className="text-[16px] font-medium">Profile</h2>
                                <p className="text-[13px] text-gray-500">Update your personal information</p>
                            </div>
                        </div>

                        {profileMessage.text && (
                            <div className={`mb-4 p-3 rounded-lg text-[13px] ${profileMessage.type === 'success'
                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                                }`}>
                                {profileMessage.text}
                            </div>
                        )}

                        <form onSubmit={handleProfileSave} className="space-y-4">
                            <div>
                                <label className="block text-[13px] font-medium mb-2">Full Name</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[13px] font-medium mb-2">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[13px] font-medium mb-2">Role</label>
                                <input
                                    type="text"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2.5 bg-black text-white rounded-xl text-[13px] hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </form>
                    </div>

                    {/* Appearance Section */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                                <Palette className="w-5 h-5 text-gray-700" />
                            </div>
                            <div>
                                <h2 className="text-[16px] font-medium">Appearance</h2>
                                <p className="text-[13px] text-gray-500">Customize how the dashboard looks</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[13px] font-medium mb-3">Theme</label>
                            <div className="grid grid-cols-3 gap-3">
                                {(['light', 'dark', 'system'] as const).map((themeOption) => (
                                    <button
                                        key={themeOption}
                                        type="button"
                                        onClick={() => handleThemeChange(themeOption)}
                                        className={`px-4 py-3 rounded-xl border-2 text-[13px] transition-all ${theme === themeOption
                                                ? 'border-black bg-gray-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        {themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[12px] text-gray-400 mt-2">
                                {theme === 'system' && 'Automatically switch between light and dark based on system preference'}
                                {theme === 'light' && 'Always use light theme'}
                                {theme === 'dark' && 'Always use dark theme'}
                            </p>
                        </div>
                    </div>

                    {/* Preferences Section */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                                <Bell className="w-5 h-5 text-gray-700" />
                            </div>
                            <div>
                                <h2 className="text-[16px] font-medium">Notifications</h2>
                                <p className="text-[13px] text-gray-500">Manage notification settings</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[13px] font-medium">Email Notifications</p>
                                <p className="text-[12px] text-gray-500">Receive updates about your account</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setNotifications(!notifications)}
                                className={`relative w-12 h-6 rounded-full transition-colors ${notifications ? 'bg-black' : 'bg-gray-200'
                                    }`}
                            >
                                <span
                                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${notifications ? 'translate-x-6' : ''
                                        }`}
                                />
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
