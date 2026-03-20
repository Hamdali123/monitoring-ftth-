"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Search, ListFilter, Map as MapIcon, Layers } from "lucide-react";

const Map = dynamic(() => import("@/components/map"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-zinc-900 animate-pulse flex items-center justify-center rounded-xl">
      <div className="text-zinc-500 flex flex-col items-center gap-3">
        <MapIcon className="h-10 w-10 animate-spin" />
        <span className="text-sm font-medium">Initializing Map Engine...</span>
      </div>
    </div>
  ),
});

export default function MapPage() {
  const [networkData, setNetworkData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:3000/api/network-map")
      .then(res => res.json())
      .then(res => {
        setNetworkData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Map fetch error:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-4 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900 p-4 rounded-xl border border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50 flex items-center gap-2">
            <MapIcon className="h-6 w-6 text-emerald-500" />
            Network GIS Map
          </h1>
          <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest font-semibold">Interactive Topology View</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Locate ODP..."
              className="bg-zinc-800 border border-zinc-700 rounded-lg py-1.5 pl-9 pr-4 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
          </div>
          <button className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-50 transition-colors">
            <Layers className="h-4 w-4" />
          </button>
          <button className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-50 transition-colors">
            <ListFilter className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 relative rounded-xl border border-zinc-800 overflow-hidden shadow-2xl shadow-emerald-500/5">
        <Map data={networkData} onSelectCustomer={() => {}} />
        
        {/* Map Legend Overlay */}
        <div className="absolute bottom-6 right-6 z-[1000] bg-zinc-950/80 backdrop-blur-md border border-zinc-800 p-4 rounded-xl space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <span className="text-xs font-medium text-zinc-300 tracking-wide">Customer Online</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div>
            <span className="text-xs font-medium text-zinc-300 tracking-wide">Customer Offline/LOS</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
            <span className="text-xs font-medium text-zinc-300 tracking-wide">ODP Terminal</span>
          </div>
        </div>

        {/* Floating Actions Overlay */}
        <div className="absolute top-6 left-6 z-[1000] flex flex-col gap-2">
           <div className="bg-zinc-950/80 backdrop-blur-md border border-zinc-800 p-1.5 rounded-lg flex flex-col gap-1 shadow-lg">
              <button className="p-2 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-zinc-50 transition-colors" title="Zoom In">+</button>
              <div className="h-px bg-zinc-800 mx-2"></div>
              <button className="p-2 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-zinc-50 transition-colors" title="Zoom Out">-</button>
           </div>
        </div>
      </div>
    </div>
  );
}
