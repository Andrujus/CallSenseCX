import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, PhoneCall, Settings, LogOut, Menu, X, Bot } from 'lucide-react';
import { MOCK_USER } from '../services/mockData';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Calls', path: '/calls', icon: PhoneCall },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const getPageTitle = () => {
    if (location.pathname === '/') return 'Dashboard';
    if (location.pathname.startsWith('/calls')) return 'Call History';
    if (location.pathname === '/settings') return 'Settings';
    return 'CallSense CX';
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white shadow-xl z-20">
        <div className="flex items-center h-16 px-6 bg-slate-950 border-b border-slate-800">
          <Bot className="h-8 w-8 text-blue-400 mr-3" />
          <span className="text-xl font-bold tracking-tight">CallSense CX</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center mb-4 px-2">
            <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
              {MOCK_USER.name.charAt(0)}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">{MOCK_USER.name}</p>
              <p className="text-xs text-slate-500">Admin</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-2 py-2 text-sm font-medium text-slate-400 rounded-md hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 py-3">
           <div className="flex items-center">
            <Bot className="h-6 w-6 text-blue-600 mr-2" />
            <span className="text-lg font-bold text-slate-900">CallSense</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </header>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-slate-900 bg-opacity-95 pt-20 px-6">
            <nav className="space-y-4">
              {navItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-3 text-base font-medium rounded-lg ${
                      isActive ? 'bg-blue-600 text-white' : 'text-slate-300'
                    }`
                  }
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </NavLink>
              ))}
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-3 text-base font-medium text-slate-300 rounded-lg hover:bg-slate-800"
              >
                <LogOut className="h-5 w-5 mr-3" />
                Sign Out
              </button>
            </nav>
          </div>
        )}

        {/* Desktop Header / Breadcrumb area */}
        <header className="hidden md:flex bg-white border-b border-slate-200 h-16 items-center px-8 justify-between">
          <h1 className="text-2xl font-bold text-slate-800">{getPageTitle()}</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-500">ACME Corp Account</span>
            <div className="h-6 w-px bg-slate-300"></div>
            <span className="text-sm font-medium text-green-600 flex items-center">
              <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
              Voice Bots Active
            </span>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-auto bg-slate-50 p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
