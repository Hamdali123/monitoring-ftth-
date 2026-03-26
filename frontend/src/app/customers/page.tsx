"use client";

import { useEffect, useState } from "react";
import { 
  Users, 
  Search, 
  Filter, 
  ChevronRight, 
  Wifi, 
  WifiOff, 
  Activity,
  UserCheck
} from "lucide-react";
import CustomerModal from "@/components/customer-modal";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  useEffect(() => {
    fetch("/api/customers", {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
      .then(res => res.json())
      .then(data => {
        setCustomers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.pppoe_username.toLowerCase().includes(search.toLowerCase()) ||
    c.billing_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div>
           <div className="flex items-center gap-3 mb-3">
              <span className="bg-blue-600/10 text-blue-500 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-blue-600/20">CRM Management</span>
           </div>
           <h1 className="text-4xl font-black text-white tracking-tight uppercase italic mb-2">Customer Intelligence</h1>
           <p className="text-zinc-500 text-sm font-medium">Manage subscribers, monitor signal history, and remote provisioning.</p>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="relative group w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search by name, SN, or user..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-900 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-all font-medium" 
              />
           </div>
           <button className="p-4 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800/50 rounded-2xl text-zinc-500 hover:text-white transition-all">
              <Filter size={20} />
           </button>
        </div>
      </div>

      {/* Stats Mini Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-[#050505] border border-zinc-900 p-6 rounded-[2rem] flex items-center gap-6">
            <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500"><UserCheck size={20}/></div>
            <div>
               <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1">Total Subscribers</p>
               <h4 className="text-2xl font-black text-white tracking-tighter italic">{customers.length}</h4>
            </div>
         </div>
         <div className="bg-[#050505] border border-zinc-900 p-6 rounded-[2rem] flex items-center gap-6">
            <div className="w-12 h-12 bg-emerald-600/10 rounded-2xl flex items-center justify-center text-emerald-500"><Wifi size={20}/></div>
            <div>
               <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1">Online Now</p>
               <h4 className="text-2xl font-black text-white tracking-tighter italic">{customers.filter(c => (c.status === 'ONLINE' || c.metrics?.[0]?.status === 'ONLINE')).length}</h4>
            </div>
         </div>
         <div className="bg-[#050505] border border-zinc-900 p-6 rounded-[2rem] flex items-center gap-6">
            <div className="w-12 h-12 bg-rose-600/10 rounded-2xl flex items-center justify-center text-rose-500"><WifiOff size={20}/></div>
            <div>
               <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1">LOS Alerts</p>
               <h4 className="text-2xl font-black text-white tracking-tighter italic">{customers.filter(c => (c.status === 'LOS' || c.metrics?.[0]?.status === 'LOS')).length}</h4>
            </div>
         </div>
      </div>

      {/* Customer Table List */}
      <div className="bg-[#050505] border border-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl">
         <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[900px]">
               <thead>
                  <tr className="border-b border-zinc-900 bg-zinc-950/20 text-nowrap">
                     <th className="px-6 md:px-10 py-6 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Subscriber</th>
                     <th className="px-6 md:px-10 py-6 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">PPPoE Account</th>
                     <th className="px-6 md:px-10 py-6 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Status</th>
                     <th className="px-6 md:px-10 py-6 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Live Signal</th>
                     <th className="px-6 md:px-10 py-6 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-zinc-900/50">
                  {loading ? (
                    [1,2,3,4,5].map(i => <tr key={i} className="animate-pulse px-10 py-6 bg-zinc-900/10 h-24" />)
                  ) : (
                    filtered.map((c) => {
                       const status = c.status || c.metrics?.[0]?.status || 'OFFLINE';
                       const isOnline = status === 'ONLINE';
                       return (
                         <tr key={c.id} className="group hover:bg-zinc-900/20 transition-all cursor-default">
                             <td className="px-6 md:px-10 py-6">
                                <div className="flex items-center gap-4">
                                   <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 font-black text-xs group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all duration-300 shrink-0">
                                      {c.name.slice(0, 2).toUpperCase()}
                                   </div>
                                   <div className="flex flex-col min-w-0">
                                      <span className="text-sm font-black text-white group-hover:text-blue-500 transition-colors italic uppercase truncate">{c.name}</span>
                                      <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest truncate">{c.billing_id}</span>
                                   </div>
                                </div>
                             </td>
                             <td className="px-6 md:px-10 py-6 text-sm font-bold text-zinc-400 font-mono tracking-tighter truncate">{c.pppoe_username}</td>
                             <td className="px-6 md:px-10 py-6">
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${
                                  isOnline ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                }`}>
                                  <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                                  {status}
                                </div>
                             </td>
                             <td className="px-6 md:px-10 py-6 text-nowrap">
                                <div className="flex items-center gap-3">
                                   <Activity size={14} className="text-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]" />
                                   <span className="text-sm font-black text-white italic">{c.rx_live || c.metrics?.[0]?.rx_live || '---'} <small className="text-[10px] not-italic text-zinc-600 font-bold">dBm</small></span>
                                </div>
                             </td>
                             <td className="px-6 md:px-10 py-6">
                                <button 
                                  onClick={() => setSelectedCustomer(c)}
                                  className="flex items-center gap-2 px-5 py-2.5 bg-zinc-950 border border-zinc-900 rounded-2xl text-[10px] font-black text-zinc-600 uppercase tracking-widest hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all whitespace-nowrap"
                                >
                                   Analysis <ChevronRight size={14} />
                                </button>
                             </td>
                         </tr>
                       )
                    })
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {selectedCustomer && (
        <CustomerModal customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} />
      )}
    </div>
  );
}
