import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { useAuth } from './AuthProvider';
import { EWO, EWOStatus, WhyWhyAnalysis } from '../types';
import { cn } from '../lib/utils';
import { 
  Wrench, 
  Clock, 
  CheckCircle2, 
  History, 
  ChevronRight, 
  X,
  Target,
  Box
} from 'lucide-react';
import { format } from 'date-fns';

export default function MaintenanceDashboard() {
  const { profile } = useAuth();
  const [ewos, setEwos] = useState<EWO[]>([]);
  const [selectedEWO, setSelectedEWO] = useState<EWO | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Resolve form state
  const [actionTaken, setActionTaken] = useState('');
  const [spareParts, setSpareParts] = useState('');
  const [whyWhy, setWhyWhy] = useState<WhyWhyAnalysis>({
    why1: '', why2: '', why3: '', why4: '', why5: ''
  });
  const [countermeasure, setCountermeasure] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'ewos'),
      where('status', 'in', ['open', 'acknowledged', 'resolved', 'reopened']),
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

  const handleAcknowledge = async (ewoId: string) => {
    try {
      await updateDoc(doc(db, 'ewos', ewoId), {
        status: 'acknowledged',
        acknowledgeTime: serverTimestamp(),
        maintenanceUser: auth.currentUser?.uid,
        maintenanceUserName: profile?.displayName || 'Maintenance tech'
      });
    } catch (error) {
      console.error("Acknowledge error:", error);
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEWO || !actionTaken) return;

    setSubmitting(true);
    try {
      const start = selectedEWO.startTime.toDate();
      const now = new Date();
      const downtimeMinutes = Math.floor((now.getTime() - start.getTime()) / (1000 * 60));

      await updateDoc(doc(db, 'ewos', selectedEWO.id), {
        status: 'resolved',
        resolvedTime: serverTimestamp(),
        actionTaken,
        sparePartsUsed: spareParts,
        whyWhy,
        countermeasure,
        targetDate,
        totalLossMinutes: downtimeMinutes // Matching types.ts
      });
      
      setSelectedEWO(null);
      setActionTaken('');
      setSpareParts('');
      setWhyWhy({ why1: '', why2: '', why3: '', why4: '', why5: '' });
      setCountermeasure('');
      setTargetDate('');
    } catch (error) {
      console.error("Resolve error:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const getUrgencyLevel = (ewa: EWO) => {
    if (ewa.status === 'open') {
      const diff = Date.now() - ewa.startTime.toDate().getTime();
      if (diff > 30 * 60 * 1000) return 'text-red-600 bg-red-50 ring-1 ring-red-100'; 
      return 'text-amber-600 bg-amber-50';
    }
    return 'text-slate-500 bg-slate-50';
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Active Maintenance Queue</h2>
          <p className="text-sm text-slate-500">Monitor and resolve machine breakdowns in real-time.</p>
        </div>
        <div className="flex gap-4">
          <StatMini label="Avg Resolution" value="22m" />
          <StatMini label="Acknowledged" value={ewos.filter(e => e.status === 'acknowledged').length} />
          <StatMini label="Pending" value={ewos.filter(e => e.status === 'open').length} />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-7 space-y-4">
          {loading ? (
            <p className="text-slate-400 animate-pulse">Scanning production lines...</p>
          ) : ewos.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center">
              <CheckCircle2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">All lines operational. No active EWOs.</p>
            </div>
          ) : (
            ewos.map((ewo) => (
              <div 
                key={ewo.id}
                className={cn(
                  "bg-white rounded-2xl border p-6 flex items-center justify-between transition-all hover:shadow-lg hover:shadow-slate-200 group cursor-pointer",
                  selectedEWO?.id === ewo.id ? "border-blue-400 ring-2 ring-blue-50" : "border-slate-200"
                )}
                onClick={() => ewo.status !== 'open' && setSelectedEWO(ewo)}
              >
                <div className="flex items-center gap-6">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0", getUrgencyLevel(ewo))}>
                    <Wrench className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-700">{ewo.line.split(' - ')[1]}</h4>
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">{ewo.opNo}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5 font-medium line-clamp-1 max-w-[280px]">{ewo.problemDescription}</p>
                    <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {ewo.startTime?.toDate ? format(ewo.startTime.toDate(), 'HH:mm') : '...'}</span>
                      <span>•</span>
                      <span>Shift {ewo.shift}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {ewo.status === 'open' ? (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleAcknowledge(ewo.id); }}
                      className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
                    >
                      ACKNOWLEDGE
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="text-right">
                      <span className={cn("px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider", 
                        ewo.status === 'acknowledged' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                      )}>
                        {ewo.status}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <aside className="col-span-12 lg:col-span-5">
          {selectedEWO ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-in slide-in-from-right duration-300">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-700">Resolution Detail</h3>
                <button onClick={() => setSelectedEWO(null)} className="p-1 hover:bg-slate-200 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              <form onSubmit={handleResolve} className="p-8 space-y-6">
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-4">
                  <h5 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-2">Selected EWO Information</h5>
                  <div className="text-sm font-bold text-slate-800">{selectedEWO.ewoId}</div>
                  <div className="text-xs text-slate-600 mt-1">{selectedEWO.problemDescription}</div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Action Taken</label>
                    <textarea 
                      required
                      value={actionTaken}
                      onChange={(e) => setActionTaken(e.target.value)}
                      className="w-full h-20 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-all resize-none shadow-inner"
                      placeholder="Maintenance steps performed..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Spare Parts Used</label>
                    <div className="relative">
                      <Box className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input 
                        type="text"
                        value={spareParts}
                        onChange={(e) => setSpareParts(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                        placeholder="Material numbers or names..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Why-Why Analysis (Root Cause)</label>
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <div key={num} className="flex gap-3 items-center">
                          <span className="text-[10px] font-bold text-slate-300 w-4 tracking-tighter">{num}W</span>
                          <input 
                            type="text"
                            value={(whyWhy as any)[`why${num}`]}
                            onChange={(e) => setWhyWhy({...whyWhy, [`why${num}`]: e.target.value})}
                            className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
                            placeholder={num === 1 ? "Symptom..." : `Root of ${num-1}W...`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Countermeasure</label>
                      <input 
                        type="text"
                        value={countermeasure}
                        onChange={(e) => setCountermeasure(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                        placeholder="Preventive action"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Date</label>
                      <input 
                        type="date"
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] shadow-xl shadow-green-200 hover:bg-green-700 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Updating System...' : 'Submit Resolution'}
                </button>
              </form>
            </div>
          ) : (
            <div className="h-full bg-slate-100/50 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center p-12 text-center text-slate-400 min-h-[400px]">
              <History className="w-12 h-12 mb-4 opacity-10" />
              <p className="text-sm font-medium">Select an acknowledged work order to begin resolution.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function StatMini({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="text-right">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">{label}</div>
      <div className="text-xl font-bold text-slate-700 mt-1">{value}</div>
    </div>
  );
}
