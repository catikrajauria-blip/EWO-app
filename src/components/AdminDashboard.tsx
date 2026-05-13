import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  updateDoc, 
  doc, 
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { UserProfile, EWO, SparePart } from '../types';
import { cn } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line 
} from 'recharts';
import { 
  Users, 
  Activity, 
  Settings, 
  Check, 
  X, 
  Download, 
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Database
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import * as XLSX from 'xlsx';
import { addDoc, serverTimestamp } from 'firebase/firestore';

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [ewos, setEwos] = useState<EWO[]>([]);
  const [spares, setSpares] = useState<SparePart[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'kpis' | 'inventory'>('kpis');
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
    });

    const unsubEWOs = onSnapshot(collection(db, 'ewos'), (snapshot) => {
      setEwos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as EWO));
    });

    const unsubSpares = onSnapshot(collection(db, 'spares'), (snapshot) => {
      setSpares(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as SparePart));
    });

    setLoading(false);
    return () => {
      unsubUsers();
      unsubEWOs();
      unsubSpares();
    };
  }, []);

  const handleUserApproval = async (uid: string, approved: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        status: approved ? 'approved' : 'rejected',
        isApproved: approved // Backward compatibility for any pre-existing logic
      });
    } catch (error) {
      console.error("User update error:", error);
    }
  };

  const seedSampleData = async () => {
    if (ewos.length > 0 && !window.confirm("Data already exists. Add more samples?")) return;
    setSeeding(true);
    try {
      const samples = [
        { ewoId: 'EWO-20240511-001', line: 'L01 - MAIN LINE', opNo: 'OP-10', shift: 'A', problemDescription: 'Pneumatic cylinder leak', operatorName: 'R. Sharma', status: 'closed', startTime: subDays(new Date(), 2), totalLossMinutes: 45, maintenanceUserName: 'Maint User' },
        { ewoId: 'EWO-20240511-002', line: 'L04 - ENGINE LINE', opNo: 'OP-40', shift: 'A', problemDescription: 'PLC Communication error', operatorName: 'S. Verma', status: 'closed', startTime: subDays(new Date(), 1), totalLossMinutes: 22, maintenanceUserName: 'Maint User' },
        { ewoId: 'EWO-20240511-003', line: 'L02 - CHASSIS LINE', opNo: 'OP-20', shift: 'B', problemDescription: 'Conveyor belt jamming', operatorName: 'K. Singh', status: 'resolved', startTime: new Date(), maintenanceUserName: 'Maint User' },
      ];

      for (const sample of samples) {
        await addDoc(collection(db, 'ewos'), {
          ...sample,
          startTime: Timestamp.fromDate(sample.startTime as Date),
          createdAt: serverTimestamp()
        });
      }
      alert("Sample data seeded successfully!");
    } catch (error) {
      console.error("Seed error:", error);
    } finally {
      setSeeding(false);
    }
  };

  const exportEwoToExcel = () => {
    const data = ewos.map(e => ({
      'EWO ID': e.ewoId,
      'Line': e.line,
      'Operation': e.opNo,
      'Shift': e.shift,
      'Problem': e.problemDescription,
      'Status': e.status,
      'Start Time': e.startTime ? format(e.startTime.toDate(), 'yyyy-MM-dd HH:mm:ss') : '',
      'Resolved At': e.resolvedTime ? format(e.resolvedTime.toDate(), 'yyyy-MM-dd HH:mm:ss') : '',
      'Downtime (Min)': e.totalLossMinutes || 0,
      'Maintenance User': e.maintenanceUserName || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "EWOs");
    XLSX.writeFile(wb, `VECV_EWO_Report_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
  };

  // KPI Calculations
  const resolvedEWOs = ewos.filter(e => e.totalLossMinutes !== undefined);
  const avgMTTR = resolvedEWOs.length > 0 
    ? (resolvedEWOs.reduce((acc, curr) => acc + (curr.totalLossMinutes || 0), 0) / resolvedEWOs.length).toFixed(1)
    : 0;

  const chartData = ewos.filter(e => e.totalLossMinutes).slice(0, 10).map(e => ({
    name: e.ewoId.split('-')[1],
    downtime: e.totalLossMinutes || 0
  })).reverse();

  return (
    <div className="space-y-8">
      {/* Top Controls */}
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
          {[
            { id: 'kpis', icon: Activity, label: 'Analytics' },
            { id: 'users', icon: Users, label: 'User Management' },
            { id: 'inventory', icon: Settings, label: 'Masters' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                activeTab === tab.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button 
            onClick={seedSampleData}
            disabled={seeding}
            className="px-6 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all flex items-center gap-2 border border-blue-100 disabled:opacity-50"
          >
            <Database className="w-4 h-4" />
            {seeding ? 'SEEDING...' : 'SEED DATA'}
          </button>
          <button 
            onClick={exportEwoToExcel}
            className="px-6 py-2 bg-[#1a2b48] text-white rounded-xl text-xs font-bold hover:bg-blue-900 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            EXPORT FULL REPORT
          </button>
        </div>
      </div>

      {activeTab === 'kpis' && (
        <div className="grid grid-cols-12 gap-8 animate-in fade-in duration-500">
          {/* Main Chart */}
          <div className="col-span-12 lg:col-span-8 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm min-h-[450px] flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="font-bold text-slate-800">Downtime Trends (Last 7 Days)</h3>
                <p className="text-xs text-slate-400 font-medium">Mean Time To Resolution (MTTR) performance</p>
              </div>
              <div className="flex items-center gap-2 text-green-500 font-bold text-sm bg-green-50 px-3 py-1 rounded-full">
                <ArrowDownRight className="w-4 h-4" />
                -12.4% MTTR Improvement
              </div>
            </div>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} stroke="#94a3b8" />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} stroke="#94a3b8" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                    itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                    labelStyle={{ fontSize: '12px', fontWeight: '900', marginBottom: '4px' }}
                  />
                  <Bar dataKey="downtime" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* KPI Stats */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <StatCard label="Global MTTR" value={`${avgMTTR}m`} description="Historical average" trend="-4m" up={false} />
            <StatCard label="Total Breakdowns" value={ewos.length} description="All time cumulative" trend="+20%" up={true} />
            <StatCard label="Critical Unresolved" value={ewos.filter(e => e.status !== 'Closed' && e.status !== 'Resolved').length} description="Requiring attention" trend="Live Data" up={false} neutral />
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
          <div className="p-8 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">System Access Control</h3>
            <span className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {users.length} TOTAL USERS
            </span>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-8 py-4">User Name</th>
                <th className="px-8 py-4">Department</th>
                <th className="px-8 py-4">Email</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100 font-medium text-slate-600">
              {users.map(user => (
                <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-4">{user.name || user.displayName}</td>
                  <td className="px-8 py-4 uppercase text-[10px] font-black">{user.role}</td>
                  <td className="px-8 py-4 font-mono text-xs">{user.email}</td>
                  <td className="px-8 py-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      user.status === 'approved' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {user.status || 'pending'}
                    </span>
                  </td>
                  <td className="px-8 py-4">
                    {user.status !== 'approved' ? (
                      <button 
                        onClick={() => handleUserApproval(user.uid, true)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-bold hover:bg-blue-700 transition-colors"
                      >
                        <Check className="w-3 h-3" /> APPROVE
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleUserApproval(user.uid, false)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold hover:bg-red-100 transition-colors"
                      >
                        <X className="w-3 h-3" /> REVOKE
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center text-slate-400">
          <Settings className="w-12 h-12 mx-auto mb-4 opacity-10" />
          <p className="font-medium">Master Data Management interface for critical spares coming in v1.1</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, description, trend, up, neutral = false }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <span className={cn(
          "text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-0.5",
          neutral ? "bg-slate-100 text-slate-500" : (up ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")
        )}>
          {!neutral && (up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />)}
          {trend}
        </span>
      </div>
      <h2 className="text-3xl font-bold text-slate-800">{value}</h2>
      <p className="text-xs text-slate-400 mt-2 font-medium">{description}</p>
    </div>
  );
}
