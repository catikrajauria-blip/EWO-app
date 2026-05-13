import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  updateDoc,
  doc
} from 'firebase/firestore';
import { useAuth } from './AuthProvider';
import { EWO, EWOStatus } from '../types';
import { LINES, OPERATIONS, SHIFTS } from '../constants';
import { cn, formatEwoId } from '../lib/utils';
import { Plus, Clock, CheckCircle2, AlertTriangle, Image as ImageIcon, Search, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

export default function ProductionDashboard() {
  const { profile } = useAuth();
  const [ewos, setEwos] = useState<EWO[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [line, setLine] = useState('');
  const [opNo, setOpNo] = useState('');
  const [shift, setShift] = useState<'A' | 'B' | 'C'>('A');
  const [problemDescription, setProblemDescription] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'ewos'),
      orderBy('startTime', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ewoList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EWO[];
      setEwos(ewoList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateEWO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!line || !opNo || !problemDescription) return;

    setSubmitting(true);
    try {
      const now = new Date();
      await addDoc(collection(db, 'ewos'), {
        ewoId: formatEwoId(now),
        line,
        opNo,
        shift,
        problemDescription,
        operatorName,
        status: 'open',
        startTime: serverTimestamp(),
        createdBy: auth.currentUser?.uid,
        createdByName: profile?.displayName || 'Anonymous',
        machine: line.split(' - ')[0],
      });
      
      // Reset form
      setLine('');
      setOpNo('');
      setProblemDescription('');
      setOperatorName('');
    } catch (error) {
      console.error("Error creating EWO:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseEWO = async (id: string) => {
    try {
      await updateDoc(doc(db, 'ewos', id), {
        status: 'closed',
        closedTime: serverTimestamp(),
        verifiedBy: auth.currentUser?.uid
      });
    } catch (error) {
      console.error("Error closing EWO:", error);
    }
  };

  const handleReopenEWO = async (id: string) => {
    try {
      await updateDoc(doc(db, 'ewos', id), {
        status: 'reopened'
      });
    } catch (error) {
      console.error("Error reopening EWO:", error);
    }
  };

  const generateShiftReport = async () => {
    const shiftEwos = ewos.filter(e => e.shift === shift);
    const totalDowntime = shiftEwos.reduce((acc, curr) => acc + (curr.totalLossMinutes || 0), 0);
    
    try {
      await addDoc(collection(db, 'shiftReports'), {
        date: format(new Date(), 'yyyy-MM-dd'),
        shift,
        productionLead: profile?.displayName || 'Lead',
        breakdownCount: shiftEwos.length,
        totalDowntime,
        createdAt: serverTimestamp(),
        breakdownIds: shiftEwos.map(e => e.id)
      });
      alert(`Shift ${shift} report generated successfully! Total Downtime: ${totalDowntime}m`);
    } catch (error) {
      console.error("Error generating shift report:", error);
    }
  };

  const getStatusColor = (status: EWOStatus) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-700';
      case 'acknowledged': return 'bg-blue-100 text-blue-700';
      case 'resolved': return 'bg-amber-100 text-amber-700';
      case 'closed': return 'bg-green-100 text-green-700';
      case 'reopened': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="grid grid-cols-12 gap-8">
      {/* KPI Overview */}
      <div className="col-span-12 grid grid-cols-4 gap-6">
        <KpiCard label="Open EWOs" value={ewos.filter(e => e.status === 'open' || e.status === 'acknowledged').length} color="red" />
        <KpiCard label="Awaiting Verification" value={ewos.filter(e => e.status === 'resolved').length} color="amber" />
        <KpiCard label="MTTR (Today)" value="18m" color="blue" subtitle="Target < 25m" />
        <KpiCard label="Shift Efficiency" value="94%" color="green" subtitle="Line 04 Lead" />
      </div>

      {/* Main Content: EWO List */}
      <section className="col-span-12 lg:col-span-8 flex flex-col gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[500px]">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-700">Recent Work Orders</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Real-time breakdown monitoring</p>
            </div>
            <button 
              onClick={generateShiftReport}
              className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center gap-2"
            >
              <Search className="w-3.5 h-3.5" />
              Generate Shift Report
            </button>
          </div>
          
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold sticky top-0 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">EWO ID</th>
                  <th className="px-6 py-4">Line / Op</th>
                  <th className="px-6 py-4">Issue</th>
                  <th className="px-6 py-4">StartTime</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={6} className="px-6 py-4 h-12 bg-slate-50/50"></td>
                    </tr>
                  ))
                ) : ewos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No work orders recorded yet.</td>
                  </tr>
                ) : (
                  ewos.map((ewo) => (
                    <tr key={ewo.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="font-mono text-[10px] text-slate-500 uppercase">{ewo.ewoId}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-700 font-medium">{ewo.line.split(' - ')[1]}</div>
                        <div className="text-[10px] text-slate-400 uppercase">{ewo.opNo}</div>
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate font-medium" title={ewo.problemDescription}>
                        {ewo.problemDescription}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-500">
                          {ewo.startTime?.toDate ? format(ewo.startTime.toDate(), 'HH:mm:ss') : '...'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider", getStatusColor(ewo.status))}>
                          {ewo.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {ewo.status === 'resolved' ? (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleCloseEWO(ewo.id)}
                              className="p-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                              title="Confirm Closure"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleReopenEWO(ewo.id)}
                              className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                              title="Reopen Order"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300 font-bold uppercase italic tracking-tighter">In Progress</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Right Section: Creation Form */}
      <aside className="col-span-12 lg:col-span-4 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            Report New Incident
          </h3>
          
          <form onSubmit={handleCreateEWO} className="space-y-5">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Production Line</label>
              <select 
                required
                value={line}
                onChange={(e) => {
                  setLine(e.target.value);
                  setOpNo('');
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-all font-medium"
              >
                <option value="">Select Line</option>
                {LINES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operation Number</label>
              <select 
                required
                disabled={!line}
                value={opNo}
                onChange={(e) => setOpNo(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-all disabled:opacity-50"
              >
                <option value="">Select Op No</option>
                {line && (OPERATIONS as any)[line]?.map((op: string) => <option key={op} value={op}>{op}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Problem Observed</label>
              <textarea 
                required
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-all resize-none" 
                placeholder="Describe machine behavior, error codes..."
              ></textarea>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operator Name</label>
                <input 
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-all"
                  placeholder="In-charge name"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Shift</label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {SHIFTS.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setShift(s)}
                      className={cn(
                        "flex-1 py-1 text-[10px] font-bold rounded-lg transition-all",
                        shift === s ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-[#1a2b48] text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-200 hover:bg-blue-900 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? 'Raising Alert...' : 'Raise EWO Alert'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}

function KpiCard({ label, value, color, subtitle }: { label: string, value: string | number, color: 'blue' | 'green' | 'amber' | 'red', subtitle?: string }) {
  const colors = {
    blue: 'border-blue-200 text-blue-600 bg-blue-50/30',
    green: 'border-green-200 text-green-600 bg-green-50/30',
    amber: 'border-amber-200 text-amber-600 bg-amber-50/30',
    red: 'border-red-200 text-red-600 bg-red-50/30',
  };

  return (
    <div className={cn("p-6 rounded-2xl border shadow-sm transition-transform hover:-translate-y-1 bg-white", colors[color])}>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-slate-800">{value}</h2>
        {subtitle && <span className="text-[10px] text-slate-400 mb-1 font-medium">{subtitle}</span>}
      </div>
    </div>
  );
}
