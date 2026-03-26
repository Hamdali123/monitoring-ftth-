"use client";

import { X, Activity, Wifi, MapPin, History, Zap, Settings, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

interface CustomerModalProps {
  customer: any;
  onClose: () => void;
}

export default function CustomerModal({ customer, onClose }: CustomerModalProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/customers/${customer.id}/history`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        const json = await res.json();
        setHistory(json || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [customer.id]);

  const statusColor = customer.status === "ONLINE" ? "text-emerald-500" : "text-rose-500";
  const statusBg = customer.status === "ONLINE" ? "bg-emerald-500/10" : "bg-rose-500/10";

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-12 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl bg-[#050505] border border-zinc-900 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl overflow-y-auto md:overflow-hidden flex flex-col md:flex-row h-full max-h-[90vh] md:max-h-[850px] animate-in zoom-in-95 duration-500">
        
        {/* Left Side: Identity & Actions */}
        <div className="w-full md:w-2/5 p-6 md:p-12 border-b md:border-b-0 md:border-r border-zinc-900 flex flex-col justify-between shrink-0">
           <div className="space-y-6 md:space-y-10">
              <div className="flex items-center gap-4">
                 <div className="w-16 h-16 bg-zinc-900 rounded-3xl flex items-center justify-center border border-zinc-800 shadow-xl">
                    <Wifi className={statusColor} size={28} />
                 </div>
                 <div>
                    <h2 className="text-3xl font-black text-white tracking-tighter italic uppercase">{customer.name}</h2>
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{customer.billing_id} • {customer.pppoe_username}</p>
                 </div>
              </div>

              <div className="space-y-6">
                 <div className={`inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl border border-white/5 ${statusBg} ${statusColor}`}>
                    <div className={`w-2 h-2 rounded-full animate-pulse ${customer.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span className="text-xs font-black uppercase tracking-widest">{customer.status}</span>
                 </div>

                 <div className="grid grid-cols-1 gap-4">
                    <DetailItem icon={MapPin} label="Coordinates" value={`${customer.location[0].toFixed(5)}, ${customer.location[1].toFixed(5)}`} />
                    <DetailItem icon={Zap} label="Optical Port" value={`ODP ${customer.odp_port}`} />
                    <DetailItem icon={Activity} label="Live Power" value={customer.rx_live ? `${customer.rx_live} dBm` : "N/A"} highlight={true} />
                 </div>
              </div>
           </div>

           <div className="pt-10 border-t border-zinc-900 mt-10">
              <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.2em] mb-4">Remote Control</p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                 <button 
                   onClick={() => window.open(`http://${customer.modem_ip}`, '_blank')}
                   className="flex items-center justify-center gap-2 py-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest hover:bg-zinc-900 transition-all shadow-lg"
                 >
                    <Settings size={14} /> Login Modem
                 </button>
                 <button 
                   onClick={async () => {
                     if (!confirm(`Reboot ONU for ${customer.name}? This will cause a temporary outage.`)) return;
                     const res = await fetch(`/api/customers/${customer.id}/reboot`, { 
                       method: 'POST',
                       headers: { 'ngrok-skip-browser-warning': 'true' }
                     });
                     const data = await res.json();
                     if (res.ok) alert(data.message);
                     else alert(data.error || 'Reboot Failed');
                   }}
                   className="flex items-center justify-center gap-2 py-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-rose-500 hover:border-rose-900/30 transition-all"
                 >
                    <AlertTriangle size={14} /> Reboot
                 </button>
              </div>

              <div className="space-y-4 p-6 bg-zinc-950/50 border border-zinc-900 rounded-3xl">
                 <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                    <Zap size={12} fill="currentColor" /> Security Override
                 </p>
                 <div className="space-y-3">
                    <div className="flex flex-col gap-1.5">
                       <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">PPPoE Password</label>
                       <div className="flex gap-2">
                          <input 
                            type="text" 
                            id="pppoe-pass"
                            placeholder="New Password" 
                            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-[11px] text-white focus:outline-none focus:border-blue-500/50"
                          />
                          <button 
                            onClick={async () => {
                              const pass = (document.getElementById('pppoe-pass') as HTMLInputElement).value;
                              if (!pass) return alert('Enter password');
                              const res = await fetch(`/api/customers/${customer.id}/change-pppoe`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'ngrok-skip-browser-warning': 'true'
                                },
                                body: JSON.stringify({ new_password: pass })
                              });
                              if (res.ok) alert('PPPoE Updated!');
                              else alert('Failed to update PPPoE');
                            }}
                            className="px-4 py-2 bg-blue-600 rounded-xl text-[9px] font-black text-white uppercase tracking-widest hover:bg-blue-500 transition-all"
                          >
                             Push
                          </button>
                       </div>
                    </div>

                    <div className="h-[1px] bg-zinc-900 mx-2" />

                    <div className="flex flex-col gap-1.5">
                       <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">WiFi Password (TR-069)</label>
                       <div className="flex gap-2">
                          <input 
                            type="text" 
                            id="wifi-pass"
                            placeholder="New WiFi Pass" 
                            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-[11px] text-white focus:outline-none focus:border-blue-500/50"
                          />
                          <button 
                            onClick={async () => {
                              const pass = (document.getElementById('wifi-pass') as HTMLInputElement).value;
                              if (!pass) return alert('Enter password');
                              const res = await fetch(`/api/customers/${customer.id}/change-wifi`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'ngrok-skip-browser-warning': 'true'
                                },
                                body: JSON.stringify({ new_ssid: customer.name, new_password: pass })
                              });
                              if (res.ok) alert('WiFi Task Queued!');
                              else alert('ACS Communication Error');
                            }}
                            className="px-4 py-2 bg-blue-600 rounded-xl text-[9px] font-black text-white uppercase tracking-widest hover:bg-blue-500 transition-all"
                          >
                             Push
                          </button>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Right Side: Metrics & History */}
        <div className="flex-1 p-6 md:p-12 bg-zinc-950/20 overflow-y-auto">
           <div className="flex items-center justify-between mb-8 md:mb-10">
              <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-3">
                 <History size={16} /> Signal Intelligence
              </h3>
              <button onClick={onClose} className="p-3 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-2xl transition-all">
                 <X size={20} />
              </button>
           </div>

           {loading ? (
             <div className="space-y-4">
               {[1,2,3,4,5].map(i => <div key={i} className="h-16 w-full bg-zinc-900/40 rounded-2xl animate-pulse" />)}
             </div>
           ) : (
             <div className="space-y-4">
                {history.map((h, i) => (
                  <div key={h.id} className="group flex items-center justify-between p-6 bg-zinc-950/50 border border-zinc-900 rounded-[2rem] hover:border-zinc-800 transition-all">
                     <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-tighter">{new Date(h.created_at).toLocaleDateString()}</span>
                           <span className="text-xs font-black text-white">{new Date(h.created_at).toLocaleTimeString()}</span>
                        </div>
                        <div className="h-8 w-[1px] bg-zinc-900" />
                        <div className="flex flex-col">
                           <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">Status</span>
                           <span className={`text-xs font-black ${h.status === 'ONLINE' ? 'text-emerald-500' : 'text-rose-500'}`}>{h.status}</span>
                        </div>
                     </div>
                     <div className="text-right">
                        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter block mb-1">RX Energy</span>
                        <span className="text-2xl font-black text-white tracking-tighter italic">{h.rx_live || '---'}<small className="text-[10px] not-italic ml-1 text-zinc-500">dBm</small></span>
                     </div>
                  </div>
                ))}
             </div>
           )}
        </div>

      </div>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-4 group">
      <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl group-hover:border-zinc-800 transition-colors shadow-inner">
         <Icon size={14} className="text-zinc-500" />
      </div>
      <div>
         <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest leading-none mb-1">{label}</p>
         <p className={cn(
           "text-sm font-bold tracking-tight",
           highlight ? "text-blue-500" : "text-zinc-300"
         )}>{value}</p>
      </div>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}
