import React, { useEffect } from 'react';
import { DetailedLocationInfo, CatchablePokemonInfo, LocationDetailsDisplayProps } from '../types';
import { PokemonName } from './PokemonName'; 

const DetailCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; isEmpty?: boolean; emptyText?: string }> = ({ title, icon, children, isEmpty = false, emptyText = "None notable." }) => (
  <div className="bg-slate-800/70 p-6 rounded-xl shadow-xl hover:shadow-2xl transition-shadow duration-300 backdrop-blur-sm border border-slate-700">
    <h3 className="text-2xl font-semibold mb-4 text-sky-400 flex items-center">
      {icon}
      <span className="ml-2">{title}</span>
    </h3>
    {isEmpty ? <p className="text-slate-400 italic">{emptyText}</p> : children}
  </div>
);

const ConditionBadge: React.FC<{ conditions?: string }> = ({ conditions }) => {
  if (!conditions || conditions.trim() === "" || conditions.trim().toLowerCase() === "standard encounter" || conditions.trim().toLowerCase() === "tall grass") {
    return null; 
  }

  let icon = "";
  let bgColor = "bg-slate-600";
  let textColor = "text-slate-100";
  let text = conditions;

  const lowerConditions = conditions.toLowerCase();

  if (lowerConditions.includes("day")) { icon = "☀️"; bgColor = "bg-yellow-500/30"; textColor = "text-yellow-200"; text="Day"; }
  else if (lowerConditions.includes("night")) { icon = "🌙"; bgColor = "bg-indigo-500/30"; textColor = "text-indigo-200"; text="Night"; }
  else if (lowerConditions.includes("fish")) { icon = "🎣"; bgColor = "bg-blue-500/30"; textColor = "text-blue-200"; text="Fishing";}
  else if (lowerConditions.includes("surf")) { icon = "🌊"; bgColor = "bg-sky-500/30"; textColor = "text-sky-200"; text="Surfing"; }
  else if (lowerConditions.includes("sos")) { icon = "✨"; bgColor = "bg-purple-500/30"; textColor = "text-purple-200"; text="SOS"; }
  else if (lowerConditions.includes("gift")) { icon = "🎁"; bgColor = "bg-pink-500/30"; textColor = "text-pink-200"; text="Gift"; }
  else if (lowerConditions.includes("tree") || lowerConditions.includes("berry")) { icon = "🌳"; bgColor = "bg-lime-500/30"; textColor = "text-lime-200"; text="Tree"; }
  else { 
    icon = "ⓘ"; 
    bgColor = "bg-gray-500/30";
    textColor = "text-gray-200";
  }
  
  return (
    <span 
        className={`ml-2 px-2.5 py-1 rounded-full text-xs font-semibold ${bgColor} ${textColor} inline-flex items-center whitespace-nowrap`}
        title={conditions} 
    >
      {icon} <span className="ml-1">{text}</span>
    </span>
  );
};

const IconEvent = () => <span className="text-yellow-400">✨</span>;

export const LocationDetailsDisplay: React.FC<LocationDetailsDisplayProps> = ({ 
    details, 
    IconPokeball, 
    IconTrainer, 
    IconItem, 
    onPokemonNameClick,
    currentLocationId,
    onSetCurrentLocation,
    selectedLocationNodeId,
    onTriggerStarterSelection
}) => {
  useEffect(() => {
    const styleId = 'pixelated-sprite-style';
    if (document.getElementById(styleId)) return;
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.innerHTML = `.pixelated-sprite { image-rendering: pixelated; image-rendering: -moz-crisp-edges; image-rendering: crisp-edges; }`;
    document.head.appendChild(styleElement);
  }, []);

  const isStarterLocation = selectedLocationNodeId === 'prologue-cabo-poco';

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center mb-4">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">
          {details.locationName}
        </h1>
        <button
          onClick={() => onSetCurrentLocation(selectedLocationNodeId)}
          className={`ml-4 p-2 rounded-full text-2xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500
            ${currentLocationId === selectedLocationNodeId ? 'text-yellow-400 hover:text-yellow-300' : 'text-slate-500 hover:text-yellow-400'}
          `}
          aria-label={currentLocationId === selectedLocationNodeId ? `Unmark ${details.locationName} as current` : `Mark ${details.locationName} as current`}
          title={currentLocationId === selectedLocationNodeId ? `Unmark as current` : `Mark as current`}
        >
          {currentLocationId === selectedLocationNodeId ? '⭐' : '☆'}
        </button>
      </div>

      <div className="space-y-8">
        {details.summary && (
          <div className="bg-slate-800/70 p-6 rounded-xl shadow-xl backdrop-blur-sm border border-slate-700">
            <h2 className="text-2xl font-semibold mb-3 text-sky-300">Location Summary</h2>
            <p className="text-slate-300 leading-relaxed">{details.summary}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DetailCard title="Catchable Pokémon" icon={<IconPokeball />} isEmpty={!details.catchablePokemon.length} emptyText="No new Pokémon reported here.">
            <ul className="space-y-2">
              {details.catchablePokemon.map((pokemon: CatchablePokemonInfo, index) => (
                <li key={`${pokemon.pokemonId}-${index}`} className="flex items-center bg-slate-700/50 p-3 rounded-md hover:bg-slate-600/50 transition-colors">
                  {pokemon.pokemonId ? (
                    <img
                      src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.pokemonId}.png`}
                      alt=""
                      className="w-8 h-8 mr-3 pixelated-sprite"
                      loading="lazy"
                      aria-hidden="true"
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.onerror = null;
                        target.src = '/favicon.png'; // Fallback to pokeball icon
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 mr-3 flex-shrink-0"><IconPokeball /></div> // Fallback for missing ID
                  )}
                  <PokemonName pokemonName={pokemon.name} onClick={onPokemonNameClick} />
                  <ConditionBadge conditions={pokemon.conditions} />
                </li>
              ))}
            </ul>
          </DetailCard>

          <DetailCard title="Notable Trainers" icon={<IconTrainer />} isEmpty={!details.trainers.length} emptyText="No challenging trainers listed.">
            <ul className="space-y-3">
              {details.trainers.map((trainer, index) => (
                <li key={index} className="bg-slate-700/50 p-3 rounded-md hover:bg-slate-600/50 transition-colors">
                  <p className="font-semibold text-slate-100">{trainer.name}</p>
                  <p className="text-sm text-slate-300">
                    Strongest: {trainer.strongestPokemonName} (Lv. {trainer.strongestPokemonLevel})
                  </p>
                  {trainer.notes && <p className="text-xs text-slate-400 italic mt-1">Note: {trainer.notes}</p>}
                </li>
              ))}
            </ul>
          </DetailCard>

          <DetailCard title="Items Found" icon={<IconItem />} isEmpty={!details.items.length} emptyText="No special items reported here.">
            <ul className="space-y-3">
              {details.items.map((item, index) => (
                <li key={index} className="bg-slate-700/50 p-3 rounded-md hover:bg-slate-600/50 transition-colors">
                  <p className="font-semibold text-slate-100">{item.name}</p>
                  <p className="text-sm text-slate-300">{item.locationDescription}</p>
                </li>
              ))}
            </ul>
          </DetailCard>

          <DetailCard title="Key Events & Interactions" icon={<IconEvent />} isEmpty={!details.keyEvents.length} emptyText="No special events reported.">
            <ul className="space-y-3">
              {details.keyEvents.map((event, index) => {
                const isStarterChoice = event.name.toLowerCase().includes('starter');
                if (isStarterLocation && isStarterChoice && onTriggerStarterSelection) {
                   return (
                    <li key={index} className="bg-slate-700/50 p-3 rounded-md hover:bg-emerald-600/50 transition-colors">
                      <button
                        onClick={onTriggerStarterSelection}
                        className="w-full text-left font-semibold text-emerald-300 hover:text-emerald-200 focus:outline-none"
                        aria-label="Choose your starter Pokémon"
                      >
                        <p className="font-semibold text-emerald-200 flex items-center">
                            <span title="Event" className="mr-2 text-purple-300">🎉</span>
                            {event.name} &raquo;
                        </p>
                        <p className="text-sm text-slate-300 mt-1 font-normal">{event.description}</p>
                      </button>
                    </li>
                  );
                }
                return (
                  <li key={index} className="bg-slate-700/50 p-3 rounded-md">
                    <p className="font-semibold text-slate-100 flex items-center">
                        {event.type === 'Reward' && <span title="Reward" className="mr-2 text-yellow-300">🏆</span>}
                        {event.type === 'Event' && <span title="Event" className="mr-2 text-purple-300">🎉</span>}
                        {event.type === 'Interaction' && <span title="Interaction" className="mr-2 text-sky-300">💬</span>}
                        {event.name}
                    </p>
                    <p className="text-sm text-slate-300 mt-1">{event.description}</p>
                  </li>
                );
              })}
            </ul>
          </DetailCard>
        </div>
      </div>
    </div>
  );
};