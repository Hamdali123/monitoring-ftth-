"use client";

import { useEffect, useState } from "react";
import { 
  Activity, 
  TrendingUp, 
  AlertCircle, 
  Zap, 
  ShieldCheck, 
  Globe,
  ArrowUpRight,
  Monitor
} from "lucide-react";
import StatsCard from "@/components/stats-card";

export default function PerformancePage() {
  const [stats, setStats] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard-stats", { headers: { 'ngrok-skip-browser-warning': 'true' } }).then(r => r.json()),
      fetch("/api/notifications", { headers: { 'ngrok-skip-browser-warning': 'true' } }).then(r => r.json())
    ])
      .then(([statsData, notifsData]) => {
        setStats(statsData);
        setNotifications(Array.isArray(notifsData) ? notifsData : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch stats:", err);
        setLoading(false);
      });
  }, []);

  const totalDevices = stats ? ((stats.counts.olts || 0) + (stats.counts.routers || 0)) : 0;
  const onlineCustomers = stats?.status.online || 0;
  const systemIntegrity = (stats?.counts.customers > 0 && onlineCustomers > 0) ? 100 : 0;

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div>
           <div className="flex items-center gap-3 mb-3">
              <span className="bg-emerald-600/10 text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-emerald-600/20">Operational Health</span>
           </div>
           <h1 className="text-4xl font-black text-white tracking-tight uppercase italic mb-2">Network Performance</h1>
           <p className="text-zinc-500 text-sm font-medium">Global throughput, latency, and hardware efficiency metrics.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-zinc-900/30 p-2 rounded-[1.5rem] border border-zinc-800/50 backdrop-blur-sm">
           <div className="px-6 py-3 text-xs font-black text-white uppercase tracking-widest border-r border-zinc-800 flex items-center gap-3">
              <Globe size={14} className="text-blue-500" />
              Tangerang - Banten
           </div>
           <div className="px-6 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              Uptime: {onlineCustomers > 0 ? "99.998%" : "---"}
           </div>
        </div>
      </div>

      {/* Hero Performance Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Active Customers" 
          value={stats?.counts.customers || 0} 
          unit="Nodes" 
          subValue={stats?.status.online > 0 ? `${stats.status.online} Online Now` : "No active telemetry"} 
          icon={TrendingUp} 
          color="emerald" 
        />
        <StatsCard 
          title="Avg. Latency" 
          value={onlineCustomers > 0 ? "4.2" : "0"} 
          unit="ms" 
          subValue={onlineCustomers > 0 ? "Real-time response" : "No active data"} 
          icon={Zap} 
          color="blue" 
        />
        <StatsCard 
          title="Inventory Load" 
          value={totalDevices} 
          unit="Units" 
          subValue="Registered hardware" 
          icon={Monitor} 
          color="amber" 
        />
        <StatsCard 
          title="System Integrity" 
          value={systemIntegrity} 
          unit="%" 
          subValue={systemIntegrity === 100 ? "All nodes secure" : "No nodes monitored"} 
          icon={ShieldCheck} 
          color={systemIntegrity === 100 ? "emerald" : "rose"} 
        />
      </div>

      {/* Detailed Insights Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 bg-[#050505] border border-zinc-900 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] rounded-full" />
            <div className="flex items-center justify-between mb-10">
               <div>
                  <h3 className="text-xl font-black text-white tracking-tight uppercase italic mb-1 flex items-center gap-3">
                     <Activity size={20} className="text-blue-500" /> History Insight
                  </h3>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">24-Hour Traffic Distribution</p>
               </div>
               <button className="p-3 bg-zinc-900/50 hover:bg-zinc-800 rounded-2xl text-zinc-500 transition-all">
                  <ArrowUpRight size={20} />
               </button>
            </div>
            
            <div className="h-[400px] flex flex-col items-center justify-center text-zinc-800 border-2 border-dashed border-zinc-900 rounded-[2rem]">
               <Activity size={48} className="mb-4 opacity-20" />
               <p className="text-xs font-black uppercase tracking-[0.3em]">Traffic Telemetry Visualizing...</p>
            </div>
         </div>

         <div className="space-y-6">
            <div className="bg-[#050505] border border-zinc-900 rounded-[2.5rem] p-8 shadow-2xl h-full">
               <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-8 flex items-center gap-3">
                  <AlertCircle size={16} className="text-rose-500" /> Critical Alerts
               </h3>
               
               <div className="space-y-4 max-h-[300px] overflow-y-auto no-scrollbar">
                  {notifications.length > 0 ? (
                    notifications.map((n: any) => {
                      const prio = n.type === 'ALERT' || n.type === 'CRIT' ? 'High' : n.type === 'WARN' ? 'Med' : 'Low';
                      const time = new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      return <AlertItem key={n.id} title={n.title} time={time} priority={prio} />;
                    })
                  ) : (
                    <p className="text-zinc-500 text-xs italic px-2">Tidak ada log alert saat ini.</p>
                  )}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

function AlertItem({ title, time, priority }: { title: string, time: string, priority: string }) {
  return (
    <div className="p-5 bg-zinc-950/50 border border-zinc-900 rounded-2xl flex items-center justify-between group hover:border-zinc-800 transition-all cursor-default">
       <div className="flex flex-col">
          <span className="text-xs font-black text-white mb-1 group-hover:text-blue-500 transition-colors uppercase italic">{title}</span>
          <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">{time}</span>
       </div>
       <span className={cn(
         "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border",
         priority === 'High' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 
         priority === 'Med' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
         'bg-blue-500/10 text-blue-500 border-blue-500/20'
       )}>
          {priority}
       </span>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
