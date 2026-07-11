'use client';
import React from 'react';

interface ScanMetricsProps {
  sitesScanned: number;
  socialNetworksScanned: number;
  platformsScanned: number;
  feedsScanned: number;
  totalSources?: number;
}

const ScanMetrics: React.FC<ScanMetricsProps> = ({
  sitesScanned, socialNetworksScanned, platformsScanned, feedsScanned, totalSources,
}) => {
  const total = totalSources || sitesScanned + socialNetworksScanned + platformsScanned + feedsScanned;

  const metrics = [
    { label: 'Sites & ATS',        value: sitesScanned,           icon: '🌐', color: 'text-[#D4AF37]' },
    { label: 'Réseaux sociaux',    value: socialNetworksScanned,  icon: '💬', color: 'text-blue-400' },
    { label: 'Plateformes tech',   value: platformsScanned,       icon: '⚙️', color: 'text-green-400' },
    { label: 'Flux RSS',           value: feedsScanned,           icon: '📡', color: 'text-purple-400' },
  ];

  return (
    <div className="bg-[#111111] border border-[#D4AF37]/30 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">
          ⚡ Scan Metrics
        </span>
        <span className="text-xs text-gray-500">
          {total > 0 ? (
            <><span className="text-[#D4AF37] font-bold">{total.toLocaleString()}</span> résultats bruts analysés</>
          ) : 'Lance un scan pour voir les stats'}
        </span>
      </div>

      {/* Grid métriques */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map(({ label, value, icon, color }) => (
          <div key={label} className="bg-black/40 rounded-lg p-3 flex items-center gap-3">
            <span className="text-lg">{icon}</span>
            <div>
              <div className={`text-xl font-bold ${value > 0 ? color : 'text-gray-600'}`}>
                {value.toLocaleString()}
              </div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Barre de progression visuelle */}
      {total > 0 && (
        <div className="mt-3 flex gap-1 h-1 rounded-full overflow-hidden">
          {metrics.map(({ value, color }) => (
            <div
              key={color}
              className={`h-full ${color.replace('text-', 'bg-')} transition-all`}
              style={{ width: `${total > 0 ? (value / total) * 100 : 25}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ScanMetrics;
