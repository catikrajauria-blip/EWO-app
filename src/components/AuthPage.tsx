import React, { useState } from 'react';
import { auth, db } from '../services/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Shield, Lock, Mail, User, ArrowRight, Truck } from 'lucide-react';
import { cn } from '../lib/utils';

type AuthMode = 'login' | 'register';

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'production' | 'maintenance'>('production');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Auto-create profile if first time
      const user = result.user;
      const isAutoApproved = [
        'prod@vecv.in', 
        'maint@vecv.in', 
        'admin@vecv.in', 
        'catikrajauria@gmail.com'
      ].includes(user.email?.toLowerCase() || '');

      let assignedRole: 'production' | 'maintenance' | 'admin' = 'production';
      if (user.email?.toLowerCase() === 'admin@vecv.in' || user.email?.toLowerCase() === 'catikrajauria@gmail.com') assignedRole = 'admin';

      // We use setDoc with { merge: true } so we don't overwrite if it exists, 
      // but if it's new it gets the default role
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        name: user.displayName,
        role: assignedRole,
        isApproved: isAutoApproved,
        status: isAutoApproved ? 'approved' : 'pending',
        createdAt: serverTimestamp(),
      }, { merge: true });

    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Google Login is disabled. Please use email/password or Quick Access demos below.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        
        // Create user profile
        const isAutoApproved = [
          'prod@vecv.in', 
          'maint@vecv.in', 
          'admin@vecv.in', 
          'catikrajauria@gmail.com'
        ].includes(email.toLowerCase());

        let assignedRole: 'production' | 'maintenance' | 'admin' = role;
        if (email.toLowerCase() === 'admin@vecv.in' || email.toLowerCase() === 'catikrajauria@gmail.com') assignedRole = 'admin';
        if (email.toLowerCase() === 'prod@vecv.in') assignedRole = 'production';
        if (email.toLowerCase() === 'maint@vecv.in') assignedRole = 'maintenance';

        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email,
          displayName: name,
          name: name,
          role: assignedRole,
          isApproved: isAutoApproved,
          status: isAutoApproved ? 'approved' : 'pending',
          createdAt: serverTimestamp(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Login providers are disabled. Please enable Email/Password and Google in your Firebase Console.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoRole: 'production' | 'maintenance' | 'admin') => {
    setEmail(demoEmail);
    setPassword('pass-123');
    setName(demoRole.charAt(0).toUpperCase() + demoRole.slice(1) + ' User');
    setRole(demoRole === 'admin' ? 'maintenance' : demoRole);
    setMode('login');
  };

  return (
    <div className="min-h-screen w-full bg-[#f4f7f9] flex flex-col items-center justify-center p-4 sm:p-8 font-sans overflow-y-auto">
      <div className="max-w-md w-full py-10 relative z-10">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#1a2b48] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-900/10 scale-110">
            <Truck className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">VECV EWO Manager</h1>
          <p className="text-slate-500 text-sm mt-1">Emergency Work Order System</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 transition-all shrink-0">
          <div className="flex bg-slate-100 p-1 rounded-xl mb-8">
            <button
              onClick={() => setMode('login')}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                mode === 'login' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"
              )}
            >
              LOGIN
            </button>
            <button
              onClick={() => setMode('register')}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                mode === 'register' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"
              )}
            >
              REGISTER
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
                    placeholder="Enter your name"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
                  placeholder="name@vecv.in"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div className="space-y-1 pt-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assign Department</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('production')}
                    className={cn(
                      "flex-1 py-3 border rounded-xl text-xs font-bold transition-all",
                      role === 'production' ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    PRODUCTION
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('maintenance')}
                    className={cn(
                      "flex-1 py-3 border rounded-xl text-xs font-bold transition-all",
                      role === 'maintenance' ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    MAINTENANCE
                  </button>
                </div>
              </div>
            )}

            {error && <p className="text-red-500 text-[10px] font-bold uppercase">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? 'PROCESSING...' : mode === 'login' ? 'ACCESS DASHBOARD' : 'CREATE ACCOUNT'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-[10px] font-bold">
                <span className="bg-white px-4 text-slate-400 uppercase tracking-widest">OR</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-xs shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {loading ? 'CONNECTING...' : 'CONTINUE WITH GOOGLE'}
            </button>
          </form>

          <div className="mt-8 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-[10px] font-bold">
                <span className="bg-white px-4 text-slate-400 uppercase tracking-widest">QUICK ACCESS (PASS: pass-123)</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => fillDemo('prod@vecv.in', 'production')}
                className="py-2.5 bg-slate-50 hover:bg-blue-600 text-[10px] font-bold rounded-xl border border-slate-100 transition-all text-slate-500 hover:text-white"
              >
                PROD
              </button>
              <button 
                onClick={() => fillDemo('maint@vecv.in', 'maintenance')}
                className="py-2.5 bg-slate-50 hover:bg-orange-600 text-[10px] font-bold rounded-xl border border-slate-100 transition-all text-slate-500 hover:text-white"
              >
                MAINT
              </button>
              <button 
                onClick={() => fillDemo('admin@vecv.in', 'admin')}
                className="py-2.5 bg-slate-50 hover:bg-slate-800 text-[10px] font-bold rounded-xl border border-slate-100 transition-all text-slate-500 hover:text-white"
              >
                ADMIN
              </button>
            </div>
            
            <p className="text-[9px] text-center text-slate-400 font-medium italic">
              Note: If "User not found", please switch to REGISTER tab with these same credentials once to auto-create & auto-approve.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
