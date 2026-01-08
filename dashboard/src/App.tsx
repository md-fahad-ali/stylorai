import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { UsersManagement } from './components/UsersManagement';
import { ContentPages } from './components/ContentPages';
import { Products } from './components/Products';
import { Analytics } from './components/Analytics';
import { Settings } from './components/Settings';
import { Login } from './components/Login';

export default function App() {
  console.log('App component mounting...');
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    console.log('App useEffect running...');
    // Check if user is already logged in
    const authStatus = localStorage.getItem('isAuthenticated');
    console.log('Auth status from localStorage:', authStatus);
    setIsAuthenticated(authStatus === 'true');

    // Load and apply theme
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
    const themeToApply = savedTheme || 'system';

    if (themeToApply === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (themeToApply === 'light') {
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
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    setIsAuthenticated(false);
    setCurrentPage('dashboard');
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} onLogout={handleLogout} />
      <main className="min-h-screen transition-all duration-300" style={{ marginLeft: '280px' }}>
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'users' && <UsersManagement />}
        {currentPage === 'products' && <Products />}
        {currentPage === 'analytics' && <Analytics />}
        {currentPage === 'content' && <ContentPages />}
        {currentPage === 'settings' && <Settings />}
      </main>
    </div>
  );
}