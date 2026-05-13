import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { EWO } from '../types';
import { FileText, Download, Filter, Calendar, Zap, ClipboardList } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

export default function ReportsPage() {
  const [ewos, setEwos] = useState<EWO[]>([]);
  const [filterShift, setFilterShift] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL');
  
  useEffect(() => {
    const q = query(collection(db, 'ewos'), orderBy('startTime', 'desc'), limit(100));
    return onSnapshot(q, (snapshot) => {
      setEwos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EWO)));
    });
  }, []);

  const filtered = ewos.filter(e => filterShift === 'ALL' || e.shift === filterShift);

  const exportShiftReport = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(e => ({
      EWO_NO: e.id.slice(-6).toUpperCase(),
      Line: e.line,
      Problem: e.problemDescription,
      Started: e.startTime?.toDate?.()?.toLocaleString(),
      Duration: `${e.totalLossMinutes || 0} min`,
      Status: e.status
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Shift_Data");
    XLSX.writeFile(wb, `Shift_Report_${filterShift}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
      <div className="flex bg-white p-6 rounded-2xl border border-slate-200 items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
             <ClipboardList className="w-6 h-6" />
           </div>
           <div>
             <h2 className="text-xl font-bold text-slate-800">Shift Performance Analytics</h2>
             <p className="text-xs text-slate-400 font-medium">Reporting for {format(new Date(), 'dd MMMM yyyy')}</p>
           </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex p-1 bg-slate-100 rounded-xl">
             {['ALL', 'A', 'B', 'C'].map((s) => (
               <button 
                 key={s}
                 onClick={() => setFilterShift(s as any)}
                 className={cn(
                   "px-4 py-1.5 text-[10px] font-bold rounded-lg transition-all",
                   filterShift === s ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                 )}
               >
                 SHIFT {s}
               </button>
             ))}
           </div>
           <button 
            onClick={exportShiftReport}
            className="flex items-center gap-2 bg-[#1a2b48] text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-[#253d66] transition-all"
           >
             <Download className="w-4 h-4" />
             Export Selection
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Shift Total Incidents</p>
           <h3 className="text-2xl font-bold text-slate-800">{filtered.length}</h3>
           <Zap className="absolute -bottom-2 -right-2 w-16 h-16 text-yellow-500 opacity-5 group-hover:rotate-12 transition-transform" />
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Resolution Rate</p>
           <h3 className="text-2xl font-bold text-slate-800">
             {filtered.length > 0 ? ((filtered.filter(e => e.status === 'closed').length / filtered.length) * 100).toFixed(0) : 0}%
           </h3>
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 italic">
            <h4 className="text-sm font-bold text-slate-500">Historical Shift Data Logs</h4>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                 <tr>
                   <th className="px-6 py-4">Report ID</th>
                   <th className="px-6 py-4">Shift</th>
                   <th className="px-6 py-4">Downtime</th>
                   <th className="px-6 py-4">Resolution Status</th>
                   <th className="px-6 py-4 text-right">View</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {filtered.map(e => (
                   <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                     <td className="px-6 py-4 text-xs font-mono text-slate-400 uppercase">#{e.id.slice(0, 8)}</td>
                     <td className="px-6 py-4">
                       <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">SHIFT {e.shift}</span>
                     </td>
                     <td className="px-6 py-4 text-sm font-bold text-slate-700">{e.totalLossMinutes || 0} min</td>
                     <td className="px-6 py-4">
                       <span className={cn(
                        "text-[10px] font-bold uppercase",
                        e.status === 'closed' ? "text-green-500" : "text-amber-500"
                       )}>{e.status}</span>
                     </td>
                     <td className="px-6 py-4 text-right">
                       <button className="text-blue-600 hover:scale-110 p-2 transition-transform">
                         <FileText className="w-4 h-4" />
                       </button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
      </section>
    </div>
  );
}
