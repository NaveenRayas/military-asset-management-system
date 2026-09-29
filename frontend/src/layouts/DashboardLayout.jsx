import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  ArrowLeftRight,
  ClipboardList,
  Shield,
  Building2,
  Users,
  History,
  LogOut,
  Menu,
  X,
  Radio,
  FileCode,
} from 'lucide-react';
import Badge from '../components/common/Badge';

const DashboardLayout = () => {
  const { user, logout, isAdmin, isCommander, isLogistics } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Purchases', path: '/purchases', icon: ShoppingCart },
    { name: 'Transfers', path: '/transfers', icon: ArrowLeftRight },
    { name: 'Assignments & Use', path: '/assignments', icon: ClipboardList },
    { name: 'Equipment & Stock', path: '/equipment', icon: Shield },
    ...(isAdmin
      ? [
          { name: 'Military Bases', path: '/bases', icon: Building2 },
          { name: 'User Management', path: '/users', icon: Users },
        ]
      : []),
    { name: 'Audit Trails', path: '/audit-logs', icon: History },
  ];

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Desktop & Mobile Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900/95 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-600/20 text-sky-400 border border-sky-500/30">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="font-extrabold tracking-wider font-mono text-sm text-white">MAMS CORE</span>
              <span className="block text-[10px] text-slate-400 font-mono tracking-widest uppercase">Asset Command</span>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-slate-500">
            Logistics & Command
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium font-mono transition-all ${
                  isActive
                    ? 'bg-sky-600/20 text-sky-300 border border-sky-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}

          {/* Quick API Docs Link */}
          <div className="pt-6 px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-slate-500">
            Developer Resources
          </div>
          <a
            href="http://localhost:8000/api/docs/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-mono text-slate-400 hover:text-sky-300 hover:bg-slate-800/40 transition-colors"
          >
            <FileCode className="w-4 h-4 text-emerald-400" />
            <span>Interactive API Docs</span>
          </a>
        </nav>

        {/* User Card in Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono font-bold text-sky-400">
              {user?.first_name ? user.first_name[0] : (user?.email?.[0] || 'U').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate">{user?.full_name || user?.email}</p>
              <p className="text-[10px] text-slate-400 truncate font-mono">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Badge>{user?.role}</Badge>
            <button
              onClick={handleLogout}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-mono hover:underline"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Navbar */}
        <header className="h-16 bg-slate-900/80 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-md flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 hidden sm:inline">
                Network Status: <span className="text-emerald-400 font-semibold">Operational (Secure)</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Active Base Badge */}
            {user?.base_details ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300">
                <Building2 className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-semibold text-white">{user.base_details.name}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-white">Central Command (All Bases)</span>
              </div>
            )}
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
