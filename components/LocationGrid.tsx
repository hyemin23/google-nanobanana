
import React from 'react';
import { LOCATIONS } from '../constants/ugcPresets';

interface LocationGridProps {
  selectedIds: string[];
  onToggle: (id: string) => void;
}

const LocationGrid: React.FC<LocationGridProps> = ({ selectedIds, onToggle }) => {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-6 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
      {LOCATIONS.map((loc) => {
        const isSelected = selectedIds.includes(loc.id);
        return (
          <button
            key={loc.id}
            onClick={() => onToggle(loc.id)}
            className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all text-center ${
              isSelected 
                ? 'bg-white border-white text-black shadow-xl scale-[1.03]' 
                : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/30 hover:bg-white/[0.08]'
            }`}
          >
            <span className="text-2xl">{loc.icon}</span>
            <span className="text-[9px] font-black uppercase tracking-tighter leading-tight break-words h-6 flex items-center justify-center">
              {loc.name}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default LocationGrid;
