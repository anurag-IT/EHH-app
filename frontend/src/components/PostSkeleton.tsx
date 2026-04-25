import React from "react";

export default function PostSkeleton() {
  return (
    <div className="bg-slate-950 border border-white/[0.05] rounded-[1.25rem] md:rounded-[1.5rem] overflow-hidden shadow-2xl mb-4 md:mb-6 max-w-[500px] mx-auto animate-pulse">
      {/* Header */}
      <div className="p-3 md:p-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-slate-800 rounded-full" />
        <div className="flex flex-col gap-2">
          <div className="h-3 w-24 bg-slate-800 rounded" />
          <div className="h-2 w-16 bg-slate-800 rounded" />
        </div>
      </div>

      {/* Caption */}
      <div className="px-4 pb-3 space-y-2">
        <div className="h-3 w-full bg-slate-800 rounded" />
        <div className="h-3 w-3/4 bg-slate-800 rounded" />
      </div>

      {/* Media */}
      <div className="w-full aspect-square bg-slate-900" />

      {/* Footer */}
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-5">
          <div className="w-6 h-6 bg-slate-800 rounded-full" />
          <div className="w-6 h-6 bg-slate-800 rounded-full" />
          <div className="w-6 h-6 bg-slate-800 rounded-full" />
        </div>
        <div className="h-3 w-20 bg-slate-800 rounded" />
      </div>
    </div>
  );
}
