'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Eye, EyeOff, AlertCircle, Brain } from 'lucide-react';
import { loginTenant } from '@/lib/tenant';

export default function LoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const tenant = loginTenant(email, password);
    setLoading(false);
    if (!tenant) {
      setError('Invalid email or password. Please try again.');
      return;
    }
    router.replace('/dashboard');
  }

  function fillDemo(email: string, pw: string) {
    setEmail(email);
    setPassword(pw);
    setError('');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-navyMid to-navy flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gold rounded-2xl shadow-xl mb-4">
            <Sparkles className="w-7 h-7 text-navy" />
          </div>
          <h1 className="font-sora font-bold text-3xl text-white">SchoolOS</h1>
          <p className="text-ice/60 text-sm mt-1 font-dm-sans">AI-Powered School ERP Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="font-sora font-semibold text-xl text-gray-900 mb-1">School Admin Login</h2>
          <p className="text-sm text-gray-400 font-dm-sans mb-6">Sign in with your school credentials</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                School Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@yourschool.edu.in"
                required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-dm-sans focus:outline-none focus:ring-2 focus:ring-navy/30 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm font-dm-sans focus:outline-none focus:ring-2 focus:ring-navy/30 transition-all"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-coral text-sm bg-coral/5 border border-coral/20 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy hover:bg-navyMid text-white font-sora font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing in…</>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center mb-3 font-dm-sans">Demo credentials — click to fill</p>
            <div className="space-y-2">
              {[
                { school: 'Sundarban Academy', email: 'admin@sundarbanacademy.edu.in', pw: 'sundarban2026', badge: 'CISCE · Full Suite', color: 'bg-navy/5 hover:bg-navy/10 border-navy/10' },
                { school: 'Muraliganj High School (H.S)', email: 'admin@muraliganjhs.edu.in', pw: 'muraliganj2026', badge: 'WBBSE · Timetable + Academics + HR', color: 'bg-gold/5 hover:bg-gold/10 border-gold/20' },
              ].map(c => (
                <button
                  key={c.email}
                  type="button"
                  onClick={() => fillDemo(c.email, c.pw)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${c.color}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800 font-dm-sans">{c.school}</span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-teal bg-teal/10 px-2 py-0.5 rounded-full">
                      <Brain className="w-2.5 h-2.5" />{c.badge}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{c.email}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-ice/40 text-xs mt-6 font-dm-sans">
          Powered by SchoolOS · Flint De Orient Marketing & Technology
        </p>
      </div>
    </div>
  );
}
