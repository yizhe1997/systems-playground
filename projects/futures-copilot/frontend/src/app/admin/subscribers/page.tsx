'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert, Trash2, Edit3, UserCheck, UserX } from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_SUBSCRIBERS = [
  { id: 'usr_1', email: 'alice@example.com', status: 'ACTIVE', tier: 'PRO', joined: 'Apr 01, 2026' },
  { id: 'usr_2', email: 'bob@example.com', status: 'EXPIRED', tier: 'TRIAL', joined: 'Mar 15, 2026' },
  { id: 'usr_3', email: 'charlie@example.com', status: 'ACTIVE', tier: 'PRO', joined: 'Apr 10, 2026' },
];

export default function AdminSubscribersPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { const t = setTimeout(() => setMounted(true), 0); return () => clearTimeout(t); }, []);

  if (!mounted) return null;

  return (
    <div className="w-full relative">
      <main className="max-w-[1200px] mx-auto relative px-4 md:px-8 py-12 lg:py-24">

        {/* Hero Section */}
        <div className="mb-16 flex items-center gap-4">
          <ShieldAlert className="w-8 h-8 text-amber-500" />
          <div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase mb-2">
              Subscriber Control
            </h1>
            <p className="font-mono text-xs uppercase tracking-widest opacity-60">
              Manage access, view payments, and revoke subscriptions.
            </p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center mb-12 border-b border-black dark:border-white pb-4">
          <input 
            type="text" 
            placeholder="SEARCH EMAIL..." 
            className="w-full max-w-sm bg-transparent border-b border-black dark:border-white py-2 font-mono text-sm focus:outline-none focus:border-amber-500 rounded-none placeholder:opacity-30 uppercase" 
          />
          <button className="flex items-center gap-2 px-6 py-2 text-xs font-mono tracking-widest uppercase bg-black text-white dark:bg-white dark:text-black hover:opacity-80 transition-opacity">
            <UserCheck className="w-4 h-4" />
            MANUAL INVITE
          </button>
        </div>

        {/* Subscribers Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left font-mono text-xs uppercase tracking-widest">
            <thead>
              <tr className="border-b border-black dark:border-white">
                <th className="py-4 opacity-60 font-normal">EMAIL</th>
                <th className="py-4 opacity-60 font-normal">TIER</th>
                <th className="py-4 opacity-60 font-normal">STATUS</th>
                <th className="py-4 opacity-60 font-normal">JOINED</th>
                <th className="py-4 opacity-60 font-normal text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_SUBSCRIBERS.map((sub, i) => (
                <motion.tr 
                  key={sub.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-black/20 dark:border-white/20 hover:bg-[#f8f8f8] dark:hover:bg-[#111] transition-colors"
                >
                  <td className="py-6 font-bold">{sub.email}</td>
                  <td className="py-6">{sub.tier}</td>
                  <td className="py-6">
                    <span className={`px-2 py-1 ${sub.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="py-6 opacity-60">{sub.joined}</td>
                  <td className="py-6 text-right flex items-center justify-end gap-4">
                    <button className="hover:opacity-50 transition-opacity" title="Edit">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button className="text-rose-600 dark:text-rose-400 hover:opacity-50 transition-opacity" title="Revoke Access">
                      <UserX className="w-4 h-4" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

      </main>
    </div>
  );
}
