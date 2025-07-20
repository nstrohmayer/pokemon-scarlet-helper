
import React, { useMemo } from 'react';
import { GameLocationNode } from '../types';

interface GameProgressionTreeProps {
  locations: GameLocationNode[];
  selectedLocationId: string | null;
  onSelectLocation: (location: GameLocationNode) => void;
  currentLocationId: string | null;
  onSetCurrentLocation: (locationId: string) => void;
}

export const GameProgressionTree: React.FC<GameProgressionTreeProps> = ({ 
  locations, 
  selectedLocationId, 
  onSelectLocation,
  currentLocationId,
  onSetCurrentLocation
}) => {

  const handleStarClick = (e: React.MouseEvent, locationId: string) => {
    e.stopPropagation(); // Prevent the location button click
    onSetCurrentLocation(locationId);
  };

  return (
    <>
      {/* Island filter section removed */}
      <nav className="space-y-2">
        {locations.length > 0 ? (
          locations.map((location) => (
            <button
              key={location.id}
              onClick={() => onSelectLocation(location)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-500
                ${selectedLocationId === location.id
                  ? 'bg-sky-600 text-white shadow-lg ring-2 ring-sky-400'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white'
                }
              `}
              aria-current={selectedLocationId === location.id ? "page" : undefined}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className={`mr-3 h-2.5 w-2.5 rounded-full ${selectedLocationId === location.id ? 'bg-white' : 'bg-sky-400'}`}></span>
                  <span className="font-medium">{location.name}</span>
                </div>
                <button
                  onClick={(e) => handleStarClick(e, location.id)}
                  className={`p-1 rounded-full transition-colors text-lg ${currentLocationId === location.id ? 'text-yellow-400 hover:text-yellow-300' : 'text-slate-400 hover:text-yellow-400'}`}
                  aria-label={currentLocationId === location.id ? `Unmark ${location.name} as current` : `Mark ${location.name} as current`}
                  title={currentLocationId === location.id ? `Unmark as current` : `Mark as current`}
                >
                  {currentLocationId === location.id ? '⭐' : '☆'}
                </button>
              </div>
            </button>
          ))
        ) : (
          <p className="text-sm text-slate-400 italic text-center py-3">No locations available.</p>
        )}
      </nav>
    </>
  );
};
