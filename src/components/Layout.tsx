import React from 'react';
import { useAuth } from './AuthProvider';
import { 
  LayoutDashboard, 
  Settings, 
  Package, 
  FileText, 
  LogOut,
  Bell,
  TrendingUp
} from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const { profile, signOut } = useAuth();

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'reports', icon: FileText, label: 'Reports' },
    { id: 'spares', icon: Package, label: 'Spares' },
    ...(profile?.role === 'admin' ? [{ id: 'admin', icon: Settings, label: 'Admin' }] : []),
  ];

  return (
    <div className="flex flex-col sm:flex-row min-h-screen w-full bg-[#f4f7f9] text-slate-900 font-sans overflow-x-hidden">
      {/* Sidebar Navigation (Desktop) */}
      <nav className="hidden sm:flex w-20 bg-[#1a2b48] flex-col items-center py-8 flex-shrink-0">
        <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xl mb-10">
          VE
        </div>
        
        <div className="flex flex-col gap-8 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "p-3 rounded-xl transition-all duration-200 group relative",
                  isActive ? "bg-blue-600 shadow-lg" : "hover:bg-white/10"
                )}
              >
                <Icon className={cn("w-6 h-6", isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
              </button>
            );
          })}
        </div>

        <button 
          onClick={() => signOut()}
          className="p-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col bg-white">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-slate-700 capitalize">
              {activeTab} Overview
            </h1>
            <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full uppercase">
              {profile?.role} Access
            </span>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-sm font-bold text-slate-700">{profile?.displayName}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{profile?.role}</p>
            </div>
            <div className="w-10 h-10 bg-slate-200 rounded-full border-2 border-white shadow-sm overflow-hidden flex items-center justify-center font-bold text-slate-500">
              {profile?.displayName?.charAt(0)}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 pb-20 sm:pb-8">
          {children}
        </div>

        {/* Footer */}
        <footer className="h-10 bg-white border-t border-slate-200 px-8 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          <div className="flex gap-6">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Systems Active</span>
            <span className="flex items-center gap-1 transition-opacity duration-1000"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> VECV EWO V1.4</span>
          </div>
          <div>Volvo Group | VE Commercial Vehicles</div>
        </footer>
      </main>

      {/* Bottom Nav (Mobile) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-[#1a2b48] h-16 flex items-center justify-around px-4 z-50 border-t border-white/10">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "p-2 rounded-lg transition-all",
                isActive ? "text-blue-400" : "text-slate-400"
              )}
            >
              <Icon className="w-6 h-6" />
            </button>
          );
        })}
        <button 
          onClick={() => signOut()}
          className="p-2 text-slate-400"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </nav>
    </div>
  );
}
