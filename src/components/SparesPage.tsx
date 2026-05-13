import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { SparePart } from '../types';
import { Package, AlertTriangle, Plus, Search, Edit2, Trash2, X, ArrowDown, Check, Download } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

export default function SparesPage() {
  const [spares, setSpares] = useState<SparePart[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    stock: 0,
    threshold: 5,
    isCritical: false
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'spares'), (snapshot) => {
      setSpares(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SparePart)));
    });
    return () => unsub();
  }, []);

  const handleAddSpare = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'spares'), {
        ...formData,
        updatedAt: serverTimestamp()
      });
      setShowAddForm(false);
      setFormData({ name: '', stock: 0, threshold: 5, isCritical: false });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStock = async (id: string, newStock: number) => {
    await updateDoc(doc(db, 'spares', id), {
      stock: newStock,
      updatedAt: serverTimestamp()
    });
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws) as any[];

      for (const item of data) {
        if (item.name && item.stock !== undefined) {
          // Check if spare exists, else create
          const existing = spares.find(s => s.name.toLowerCase() === item.name.toLowerCase());
          if (existing) {
            await updateStock(existing.id, item.stock);
          } else {
            await addDoc(collection(db, 'spares'), {
              name: item.name,
              stock: item.stock,
              threshold: item.threshold || 5,
              isCritical: item.isCritical || false,
              updatedAt: serverTimestamp()
            });
          }
        }
      }
      alert("Inventory updated successfully from Excel!");
    };
    reader.readAsBinaryString(file);
  };

  const filteredSpares = spares.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search parts by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/5 outline-none shadow-sm transition-all"
          />
        </div>
        <div className="flex gap-3">
          <label className="bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-slate-200 transition-all cursor-pointer">
            <Download className="w-5 h-5 rotate-180" />
            Import Excel
            <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleExcelImport} />
          </label>
          <button 
            onClick={() => setShowAddForm(true)}
            className="bg-[#1a2b48] text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-[#253d66] transition-all shadow-xl shadow-blue-900/10 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Register Spare Part
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredSpares.map((spare) => (
            <motion.div 
              key={spare.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
            >
              {spare.stock <= spare.threshold && (
                <div className="absolute top-4 right-4 animate-bounce">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
              )}
              
              <div className="flex items-center gap-4 mb-6">
                <div className={cn(
                  "p-3 rounded-2xl",
                  spare.isCritical ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500"
                )}>
                  <Package className="w-6 h-6" />
                </div>
                <div>
                   <h4 className="font-bold text-slate-800 text-lg leading-tight">{spare.name}</h4>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                     {spare.isCritical ? 'High Criticality' : 'Consumable Spare'}
                   </p>
                </div>
              </div>

              <div className="flex items-end justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Available Stock</p>
                  <div className={cn(
                    "text-3xl font-black italic",
                    spare.stock <= spare.threshold ? "text-red-500" : "text-slate-800"
                  )}>
                    {spare.stock}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                   <button 
                    onClick={() => updateStock(spare.id, spare.stock + 1)}
                    className="p-1 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                   >
                     + ADD
                   </button>
                   <button 
                    onClick={() => spare.stock > 0 && updateStock(spare.id, spare.stock - 1)}
                    disabled={spare.stock === 0}
                    className="p-1 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
                   >
                     - REMOVE
                   </button>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-[10px] font-medium text-slate-400">
                <span>Threshold: {spare.threshold} Units</span>
                <span>ID: {spare.id.slice(0, 8)}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
             <div className="p-6 bg-[#1a2b48] text-white flex items-center justify-between">
                <h3 className="font-bold">Register New Material</h3>
                <button onClick={() => setShowAddForm(false)} className="p-2 hover:bg-white/10 rounded-lg"><X className="w-5 h-5" /></button>
             </div>
             <form onSubmit={handleAddSpare} className="p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Material Name</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    placeholder="e.g. Servo Motor AX-42"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Initial Stock</label>
                    <input 
                      type="number" 
                      required 
                      value={formData.stock}
                      onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Reorder Level</label>
                    <input 
                      type="number" 
                      required 
                      value={formData.threshold}
                      onChange={(e) => setFormData({...formData, threshold: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={cn(
                    "w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center",
                    formData.isCritical ? "bg-red-500 border-red-500" : "border-slate-200 bg-slate-50 group-hover:border-slate-300"
                  )}>
                    {formData.isCritical && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={formData.isCritical}
                    onChange={(e) => setFormData({...formData, isCritical: e.target.checked})}
                  />
                  <span className="text-sm font-bold text-slate-600">Mark as Critical Spare</span>
                </label>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                   {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'INITIALIZE INVENTORY RECORD'}
                </button>
             </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
