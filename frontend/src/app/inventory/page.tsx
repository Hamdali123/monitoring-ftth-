"use client";

import { useEffect, useState } from "react";
import { 
  Box, 
  Server, 
  MapPin, 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2,
  Activity,
  X,
  Save,
  Globe,
  Zap,
  Network,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = 'OLT' | 'ODC' | 'ODP' | 'ROUTER';

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('OLT');
  const [olts, setOlts] = useState<any[]>([]);
  const [odcs, setOdcs] = useState<any[]>([]);
  const [odps, setOdps] = useState<any[]>([]);
  const [routers, setRouters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const fetchData = () => {
    setLoading(true);
    const headers = { 'ngrok-skip-browser-warning': 'true' };
    Promise.all([
      fetch("/api/olts", { headers }).then(r => r.json()),
      fetch("/api/odcs", { headers }).then(r => r.json()),
      fetch("/api/odps", { headers }).then(r => r.json()),
      fetch("/api/routers", { headers }).then(r => r.json())
    ]).then(([oltData, odcData, odpData, routerData]) => {
      setOlts(Array.isArray(oltData) ? oltData : []);
      setOdcs(Array.isArray(odcData) ? odcData : []);
      setOdps(Array.isArray(odpData) ? odpData : []);
      setRouters(Array.isArray(routerData) ? routerData : []);
      setLoading(false);
    }).catch(err => {
      console.error("Inventory fetch error:", err);
      setLoading(false);
    });
  };

  useEffect(() => { fetchData(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/sync", { method: "POST", headers: { 'ngrok-skip-browser-warning': 'true' } });
      fetchData();
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setSyncing(false);
    }
  };

  const handleDiscovery = async () => {
    setDiscovering(true);
    try {
      const res = await fetch("/api/discover", { method: "POST", headers: { 'ngrok-skip-browser-warning': 'true' } });
      const results = await res.json();
      alert(`Discovery Selesai!\nBaru: ${results.newOdcs} ODC, ${results.newOdps} ODP, ${results.newCustomers} Client\nError: ${results.errors?.length || 0}`);
      fetchData();
    } catch (err) {
      console.error("Discovery error:", err);
    } finally {
      setDiscovering(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700 pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 bg-[#050505] p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-zinc-900 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/5 blur-[100px] rounded-full" />
        <div className="relative">
           <div className="flex items-center gap-3 mb-4">
              <span className="bg-emerald-600/10 text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-emerald-600/20">Asset Repository</span>
           </div>
           <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight uppercase italic mb-2">Device Inventory</h1>
           <p className="text-zinc-500 text-sm font-medium">Kelola OLT, Router, ODC Cabinet, dan ODP Terminal.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 relative">
           <button 
             onClick={handleSync}
             disabled={syncing}
             className={cn(
               "flex items-center justify-center gap-3 px-6 md:px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl",
               syncing ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-zinc-950 text-emerald-500 border border-emerald-500/20 hover:border-emerald-500/40"
             )}
           >
            <Activity className={cn("h-4 w-4", syncing && "animate-spin")} />
            {syncing ? "Syncing..." : "Sync Hardware"}
           </button>
           <button 
             onClick={handleDiscovery}
             disabled={discovering}
             className={cn(
               "flex items-center justify-center gap-3 px-6 md:px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl",
               discovering ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20"
             )}
           >
            <Globe className={cn("h-4 w-4", discovering && "animate-spin")} />
            {discovering ? "Discovering..." : "Discover Topology"}
           </button>
           <button 
             onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
             className="flex items-center justify-center gap-3 bg-zinc-950 text-zinc-400 border border-zinc-900 hover:bg-zinc-900 px-6 md:px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
           >
             <Plus className="h-4 w-4" />
             Add Equipment
           </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 bg-[#050505] border border-zinc-900 p-2 rounded-[1.5rem] w-full md:w-fit overflow-x-auto">
        {(['OLT', 'ODC', 'ODP', 'ROUTER'] as Tab[]).map((tab) => {
          const Icon = tab === 'OLT' ? Server : tab === 'ODC' ? Box : tab === 'ODP' ? MapPin : Activity;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex items-center gap-3 px-6 md:px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 shrink-0",
                activeTab === tab 
                  ? "bg-zinc-900 text-white border border-zinc-800 shadow-xl" 
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50"
              )}
            >
              <Icon size={14} className={activeTab === tab ? "text-emerald-500" : "text-zinc-600"} />
              {tab}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 animate-pulse text-zinc-800 gap-4">
             <Activity size={32} className="animate-spin" />
             <p className="text-[10px] font-black uppercase tracking-[0.4em]">Loading Assets...</p>
          </div>
        ) : (
          <div className="bg-[#050505] border border-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl">
              {activeTab === 'OLT' && <InventoryTable columns={["ID", "Name", "IP Address", "Type"]} data={olts} type="OLT" onEdit={openEditModal} onRefresh={fetchData} />}
              {activeTab === 'ODC' && <InventoryTable columns={["ID", "Name", "Location", "ODPs"]} data={odcs} type="ODC" onEdit={openEditModal} onRefresh={fetchData} />}
              {activeTab === 'ODP' && <InventoryTable columns={["ID", "Name", "Parent ID", "Ports"]} data={odps} type="ODP" onEdit={openEditModal} onRefresh={fetchData} />}
              {activeTab === 'ROUTER' && <InventoryTable columns={["ID", "Name", "IP Address", "API Port"]} data={routers} type="ROUTER" onEdit={openEditModal} onRefresh={fetchData} />}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <AddEquipmentModal 
          type={activeTab} 
          initialData={editingItem} 
          onClose={() => { setIsModalOpen(false); setEditingItem(null); }} 
          onRefresh={fetchData} 
        />
      )}
    </div>
  );
}

// ─── Inventory Table ─────────────────────────────────────────────────────────

function InventoryTable({ columns, data, type, onEdit, onRefresh }: {
  columns: string[];
  data: any[];
  type: Tab;
  onEdit: (item: any) => void;
  onRefresh: () => void;
}) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  if (!data.length) return (
    <div className="p-20 text-center text-zinc-700 text-[10px] font-black uppercase tracking-widest italic">
      Tidak ada aset {type} di registry.
    </div>
  );

  const handleDelete = async (id: string) => {
    if (!confirm(`Hapus ${type} ini? Tindakan ini tidak bisa dibatalkan.`)) return;
    const endpoint = type === 'OLT' ? `/api/olts/${id}` : type === 'ROUTER' ? `/api/routers/${id}` : type === 'ODC' ? `/api/odcs/${id}` : `/api/odps/${id}`;
    try {
      const res = await fetch(endpoint, { method: 'DELETE', headers: { 'ngrok-skip-browser-warning': 'true' } });
      if (res.ok) onRefresh();
      else alert("Gagal menghapus aset.");
    } catch (err) { console.error(err); }
  };

  const handleTest = async (item: any) => {
    const endpoint = type === 'OLT' ? `/api/olts/${item.id}/test` : `/api/routers/${item.id}/test`;
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'ngrok-skip-browser-warning': 'true' } });
      const result = await res.json();
      if (result.success) alert(`SUKSES: ${result.message}\n\nDevice: ${result.description || result.board || 'Terhubung'}`);
      else alert(`GAGAL: ${result.error}`);
    } catch (err: any) { alert(`Error Koneksi: ${err.message}`); }
  };

  const handleSyncPppoe = async (item: any) => {
    if (!confirm(`Sync PPPoE dari MikroTik "${item.name}" ke database customer?`)) return;
    try {
      const res = await fetch(`/api/routers/${item.id}/sync`, { method: 'POST', headers: { 'ngrok-skip-browser-warning': 'true' } });
      const result = await res.json();
      if (res.ok) { alert(`Sync Selesai!\n${result.message}`); onRefresh(); }
      else alert(`Sync Gagal: ${result.error}`);
    } catch (err: any) { alert(`Error: ${err.message}`); }
  };

  const handleDiscover = async () => {
    if (!confirm("Jalankan Topology Discovery dari OLT ini?")) return;
    try {
      const res = await fetch('/api/discover', { method: 'POST', headers: { 'ngrok-skip-browser-warning': 'true' } });
      const result = await res.json();
      alert(`Discovery Selesai!\nBaru: ${result.newOdcs} ODC, ${result.newOdps} ODP, ${result.newCustomers} Client`);
      onRefresh();
    } catch (err: any) { alert(err.message); }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left min-w-[800px]">
        <thead>
          <tr className="border-b border-zinc-900 bg-zinc-950/20">
            {columns.map(col => (
              <th key={col} className="px-6 md:px-10 py-6 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">{col}</th>
            ))}
            <th className="px-6 md:px-10 py-6 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-900/50">
          {data.map((item: any) => (
            <tr key={item.id} className="group hover:bg-zinc-900/20 transition-all">
              <td className="px-6 md:px-10 py-6">
                <button
                  onClick={() => { navigator.clipboard.writeText(item.id); }}
                  className="text-[10px] font-mono text-zinc-600 hover:text-blue-500 transition-colors"
                  title="Klik untuk copy ID"
                >
                  {item.id.slice(0, 8)}...
                </button>
              </td>
              <td className="px-6 md:px-10 py-6">
                <span className="text-sm font-black text-white italic group-hover:text-emerald-500 transition-colors uppercase tracking-tight">
                  {item.name}
                </span>
              </td>
              <td className="px-6 md:px-10 py-6">
                <span className="text-sm font-bold text-zinc-400 font-mono tracking-tighter">
                  {(type === 'ODC' || type === 'ODP' || type === 'OLT') && item.location_lat && item.location_long
                    ? `${parseFloat(item.location_lat).toFixed(4)}, ${parseFloat(item.location_long).toFixed(4)}`
                    : item.ip_address || item.odc_id?.slice(0, 8) || '---'}
                </span>
              </td>
              <td className="px-6 md:px-10 py-6">
                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                  {item.type || item.total_ports || item.api_port || '---'}
                </span>
              </td>
              <td className="px-6 md:px-10 py-6 text-right">
                <div className="flex justify-end gap-1">
                  {/* Test Koneksi - OLT & ROUTER */}
                  {(type === 'OLT' || type === 'ROUTER') && (
                    <button
                      onClick={() => handleTest(item)}
                      className="p-2.5 text-zinc-700 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all"
                      title="Test Koneksi"
                    >
                      <Zap size={15} />
                    </button>
                  )}

                  {/* Sync PPPoE - ROUTER only */}
                  {type === 'ROUTER' && (
                    <button
                      onClick={() => handleSyncPppoe(item)}
                      className="p-2.5 text-zinc-700 hover:text-purple-500 hover:bg-purple-500/10 rounded-xl transition-all"
                      title="Sync PPPoE ke Customer DB"
                    >
                      <RefreshCw size={15} />
                    </button>
                  )}

                  {/* Discover Topology - OLT only */}
                  {type === 'OLT' && (
                    <button
                      onClick={handleDiscover}
                      className="p-2.5 text-zinc-700 hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all"
                      title="Discover Topology"
                    >
                      <Network size={15} />
                    </button>
                  )}

                  {/* Settings Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                      className="p-2.5 text-zinc-700 hover:text-white transition-colors"
                    >
                      <MoreVertical size={15} />
                    </button>
                    {openMenuId === item.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                        <div className="absolute right-0 mt-2 w-48 bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl z-20 py-2 animate-in fade-in zoom-in-95 duration-200">
                          <button
                            onClick={() => { onEdit(item); setOpenMenuId(null); }}
                            className="w-full flex items-center gap-3 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all text-left"
                          >
                            <Edit size={14} className="text-blue-500" /> Edit Equipment
                          </button>
                          <button
                            onClick={() => { handleDelete(item.id); setOpenMenuId(null); }}
                            className="w-full flex items-center gap-3 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-all text-left"
                          >
                            <Trash2 size={14} className="text-red-500" /> Delete Asset
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────

function AddEquipmentModal({ type, initialData, onClose, onRefresh }: {
  type: Tab;
  initialData?: any;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [formData, setFormData] = useState<any>({
    name: initialData?.name || "",
    ip_address: initialData?.ip_address || "",
    // OLT fields
    type: initialData?.type || "ZTE",
    snmp_community: initialData?.snmp_community || "public",
    snmp_version: initialData?.snmp_version || "v2c",
    snmp_port: initialData?.snmp_port || "2162",
    telnet_user: initialData?.telnet_user || "",
    telnet_pass: initialData?.telnet_pass || "",
    telnet_port: initialData?.telnet_port || "23",
    // Router fields
    username: initialData?.username || "admin",
    password: initialData?.password || "",
    secret: initialData?.secret || "",
    vpn_address: initialData?.vpn_address || "",
    api_port: initialData?.api_port || "8728",
    // Location
    location_lat: initialData?.location_lat || "-6.158",
    location_long: initialData?.location_long || "106.463",
    // ODP
    total_ports: initialData?.total_ports || "8",
    odc_id: initialData?.odc_id || "",
  });

  const set = (key: string, val: string) => setFormData((p: any) => ({ ...p, [key]: val }));

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const isEdit = !!initialData;
    let endpoint = type === 'OLT' ? '/api/olts' : type === 'ROUTER' ? '/api/routers' : type === 'ODC' ? '/api/odcs' : '/api/odps';
    if (isEdit) endpoint += `/${initialData.id}`;

    try {
      let payload: any = {
        name: formData.name,
        location_lat: parseFloat(formData.location_lat) || 0,
        location_long: parseFloat(formData.location_long) || 0,
      };

      if (type === 'OLT') {
        payload = { ...payload, ip_address: formData.ip_address, type: formData.type, snmp_community: formData.snmp_community, snmp_version: formData.snmp_version, snmp_port: parseInt(formData.snmp_port) || 161, telnet_user: formData.telnet_user, telnet_pass: formData.telnet_pass, telnet_port: parseInt(formData.telnet_port) || 23 };
      } else if (type === 'ROUTER') {
        payload = { ...payload, ip_address: formData.ip_address, username: formData.username, password: formData.password, secret: formData.secret, vpn_address: formData.vpn_address, api_port: parseInt(formData.api_port) || 8728 };
      } else if (type === 'ODP') {
        payload = { ...payload, odc_id: formData.odc_id, total_ports: parseInt(formData.total_ports) || 8 };
      }

      const res = await fetch(endpoint, {
        method: isEdit ? (type === 'ROUTER' ? 'PATCH' : 'PUT') : 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (res.ok) { onRefresh(); onClose(); }
      else alert(`Gagal menyimpan: ${result.error || result.details}`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const inputCls = "w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all";
  const labelCls = "text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1";

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#050505] border border-zinc-900 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-500 my-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight uppercase italic mb-1">
              {initialData ? 'Edit' : 'Add'} {type}
            </h2>
            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
              {initialData ? 'Ubah konfigurasi hardware' : 'Daftarkan hardware baru'}
            </p>
          </div>
          <button onClick={onClose} className="p-3 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-2xl transition-all">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Common Fields */}
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className={labelCls}>Nama Perangkat</label>
              <input required className={inputCls} placeholder="C600-SANWANI" value={formData.name} onChange={e => set('name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>IP Address</label>
              <input required className={`${inputCls} font-mono`} placeholder="103.68.214.1" value={formData.ip_address} onChange={e => set('ip_address', e.target.value)} />
            </div>
          </div>

          {/* OLT Fields */}
          {type === 'OLT' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className={labelCls}>Tipe OLT</label>
                  <select className={inputCls} value={formData.type} onChange={e => set('type', e.target.value)}>
                    <option value="ZTE">ZTE C300/C600</option>
                    <option value="HIOSO">HIOSO EPON</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>SNMP Community</label>
                  <input className={inputCls} value={formData.snmp_community} onChange={e => set('snmp_community', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className={labelCls}>SNMP Version</label>
                  <select className={inputCls} value={formData.snmp_version} onChange={e => set('snmp_version', e.target.value)}>
                    <option value="v2c">v2c</option>
                    <option value="v1">v1</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>SNMP Port</label>
                  <input type="number" className={`${inputCls} font-mono`} placeholder="2162" value={formData.snmp_port} onChange={e => set('snmp_port', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Telnet Port</label>
                  <input type="number" className={`${inputCls} font-mono`} placeholder="2334" value={formData.telnet_port} onChange={e => set('telnet_port', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className={labelCls}>Telnet User</label>
                  <input className={inputCls} value={formData.telnet_user} onChange={e => set('telnet_user', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Telnet Password</label>
                  <input type="password" className={inputCls} value={formData.telnet_pass} onChange={e => set('telnet_pass', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className={labelCls}>Latitude</label>
                  <input required className={`${inputCls} font-mono`} value={formData.location_lat} onChange={e => set('location_lat', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Longitude</label>
                  <input required className={`${inputCls} font-mono`} value={formData.location_long} onChange={e => set('location_long', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* ROUTER Fields */}
          {type === 'ROUTER' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className={labelCls}>Username MikroTik</label>
                  <input required className={inputCls} placeholder="admin" value={formData.username} onChange={e => set('username', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Password MikroTik</label>
                  <input required type="password" className={inputCls} value={formData.password} onChange={e => set('password', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className={labelCls}>VPN / IP Remote (Opsional)</label>
                  <input className={`${inputCls} font-mono`} placeholder="10.24.0.x" value={formData.vpn_address} onChange={e => set('vpn_address', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Radius Secret</label>
                  <input className={inputCls} value={formData.secret} onChange={e => set('secret', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className={labelCls}>API Port</label>
                  <input required type="number" className={`${inputCls} font-mono`} value={formData.api_port} onChange={e => set('api_port', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Latitude</label>
                  <input className={`${inputCls} font-mono`} value={formData.location_lat} onChange={e => set('location_lat', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Longitude</label>
                  <input className={`${inputCls} font-mono`} value={formData.location_long} onChange={e => set('location_long', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* ODC / ODP Fields */}
          {(type === 'ODC' || type === 'ODP') && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className={labelCls}>Latitude</label>
                  <input required className={`${inputCls} font-mono`} value={formData.location_lat} onChange={e => set('location_lat', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Longitude</label>
                  <input required className={`${inputCls} font-mono`} value={formData.location_long} onChange={e => set('location_long', e.target.value)} />
                </div>
              </div>
              {type === 'ODP' && (
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className={labelCls}>Parent ODC (ID)</label>
                    <input required placeholder="UUID ODC" className={inputCls} value={formData.odc_id} onChange={e => set('odc_id', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelCls}>Total Port</label>
                    <input required type="number" className={inputCls} value={formData.total_ports} onChange={e => set('total_ports', e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-6 border-t border-zinc-900 flex justify-end gap-4">
            <button type="button" onClick={onClose} className="px-8 py-3.5 text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors">
              Batal
            </button>
            <button type="submit" className="flex items-center gap-3 px-10 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-900/20">
              <Save size={15} /> Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
