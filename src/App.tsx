import React, { useState } from 'react';
import { AuthProvider, useAuth } from './components/AuthProvider';
import AuthPage from './components/AuthPage';
import Layout from './components/Layout';
import ProductionDashboard from './components/ProductionDashboard';
import MaintenanceDashboard from './components/MaintenanceDashboard';
import AdminDashboard from './components/AdminDashboard';
import ReportsPage from './components/ReportsPage';
import SparesPage from './components/SparesPage';
import { ShieldAlert } from 'lucide-react';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#f4f7f9]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Loading System...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  if (profile && !profile.isApproved) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#f4f7f9] p-4 text-center overflow-y-auto">
        <div className="max-w-md bg-white p-10 rounded-2xl border border-slate-200 shadow-xl">
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Account Pending Approval</h1>
          <p className="text-slate-500 mt-4 leading-relaxed">
            Your account has been created successfully, but an administrator needs to verify and approve your access before you can continue.
          </p>
          <div className="mt-8 pt-8 border-t border-slate-100">
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
            >
              Check Status
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (activeTab === 'reports') return <ReportsPage />;
    if (activeTab === 'spares') return <SparesPage />;
    if (activeTab === 'admin') return <AdminDashboard />;
    
    // Default dashboard based on role
    if (profile?.role === 'production') return <ProductionDashboard />;
    if (profile?.role === 'maintenance') return <MaintenanceDashboard />;
    if (profile?.role === 'admin') return <AdminDashboard />;
    
    return <div className="text-slate-500">Dashboard for {profile?.role} coming soon.</div>;
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
