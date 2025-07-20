import React, { useEffect } from 'react'; // Added useEffect
import { StarterPokemonData, StarterEvolutionStage, StarterSelectionDisplayProps } from '../types';

const TypeBadge: React.FC<{ type: string; className?: string }> = ({ type, className = '' }) => {
    const typeColors: Record<string, string> = {
        Normal: 'bg-gray-400 text-black', Fighting: 'bg-red-700 text-white', Flying: 'bg-sky-300 text-black',
        Poison: 'bg-purple-600 text-white', Ground: 'bg-yellow-600 text-black', Rock: 'bg-yellow-700 text-white',
        Bug: 'bg-lime-500 text-white', Ghost: 'bg-indigo-700 text-white', Steel: 'bg-slate-400 text-white', Fire: 'bg-orange-500 text-white',
        Water: 'bg-blue-500 text-white', Grass: 'bg-green-500 text-white', Electric: 'bg-yellow-400 text-black',
        Psychic: 'bg-pink-500 text-white', Ice: 'bg-cyan-300 text-black', Dragon: 'bg-indigo-500 text-white',
        Dark: 'bg-neutral-700 text-white', Fairy: 'bg-pink-300 text-black',
    };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${typeColors[type] || 'bg-gray-500 text-white'} ${className}`}>{type}</span>;
}

const EvolutionStageCard: React.FC<{ stage: StarterEvolutionStage }> = ({ stage }) => (
    <div className="flex flex-col items-center text-center p-2 bg-slate-700/50 rounded-lg shadow">
        <img 
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${stage.pokeApiId}.png`} 
            alt={stage.name} 
            className="w-16 h-16 pixelated-sprite mb-1"
            onError={(e) => {
                // Fallback to front_default if official-artwork fails
                (e.currentTarget as HTMLImageElement).onerror = null; // Prevent infinite loop
                (e.currentTarget as HTMLImageElement).src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${stage.pokeApiId}.png`;
            }}
        />
        <p className="text-sm font-semibold text-slate-100">{stage.name}</p>
        <div className="flex gap-1 mt-1">
            {stage.types.map(t => <TypeBadge key={t} type={t} className="text-xxs px-1.5 py-0.5" />)}
        </div>
        {stage.method && <p className="text-xs text-slate-400 mt-0.5">{stage.method}</p>}
    </div>
);

const StarterCard: React.FC<{ starter: StarterPokemonData; onSelect: () => void }> = ({ starter, onSelect }) => (
    <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-6 flex flex-col items-center transform hover:scale-105 transition-transform duration-300">
        <h3 className="text-3xl font-bold text-sky-400 mb-3">{starter.name}</h3>
        <img 
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${starter.pokeApiId}.png`} 
            alt={starter.name} 
            className="w-32 h-32 pixelated-sprite mb-3"
            onError={(e) => {
                (e.currentTarget as HTMLImageElement).onerror = null; 
                (e.currentTarget as HTMLImageElement).src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${starter.pokeApiId}.png`;
            }}
        />
        <div className="flex gap-2 mb-4">
            {starter.types.map(t => <TypeBadge key={t} type={t} />)}
        </div>

        <p className="text-sm text-slate-300 mb-4 text-center leading-relaxed h-20 overflow-y-auto custom-scrollbar-thin">
            {starter.description}
        </p>

        <div className="w-full mb-4">
            <h4 className="text-sm font-semibold text-slate-200 mb-1 text-center">Initial Moves:</h4>
            <ul className="space-y-1 text-xs">
                {starter.initialMoves.map(move => (
                    <li key={move.name} className="bg-slate-700/60 p-1.5 rounded-md text-slate-300">
                        <span className="font-medium text-sky-300">{move.name}</span> ({move.type})
                        <p className="text-slate-400 text-xxs">{move.description}</p>
                    </li>
                ))}
            </ul>
        </div>
        
        <div className="w-full mb-5">
            <h4 className="text-sm font-semibold text-slate-200 mb-2 text-center">Evolutions:</h4>
            <div className="grid grid-cols-3 gap-2">
                {starter.evolutions.map(evo => <EvolutionStageCard key={evo.name} stage={evo} />)}
            </div>
        </div>

        <button
            onClick={onSelect}
            className="mt-auto w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-800"
            aria-label={`Choose ${starter.name} as your starter`}
        >
            Choose {starter.name}
        </button>
    </div>
);

export const StarterSelectionDisplay: React.FC<StarterSelectionDisplayProps> = ({ starters, onSelectStarter }) => {
    useEffect(() => {
        const styleIdPixelated = "starter-selection-pixelated-styles";
        if (!document.getElementById(styleIdPixelated)) {
            const styleElementPixelated = document.createElement('style');
            styleElementPixelated.id = styleIdPixelated;
            styleElementPixelated.textContent = `
                .pixelated-sprite { image-rendering: pixelated; image-rendering: -moz-crisp-edges; image-rendering: crisp-edges; }
                .text-xxs { font-size: 0.65rem; }
            `;
            document.head.appendChild(styleElementPixelated);
        }

        const styleIdScrollbar = "starter-selection-scrollbar-styles";
        if (!document.getElementById(styleIdScrollbar)) {
            const styleElementScrollbar = document.createElement('style');
            styleElementScrollbar.id = styleIdScrollbar;
            styleElementScrollbar.innerHTML = `
                .custom-scrollbar-thin::-webkit-scrollbar {
                  width: 5px;
                }
                .custom-scrollbar-thin::-webkit-scrollbar-track {
                  background: rgba(71, 85, 105, 0.5); /* slate-700 with opacity */
                  border-radius: 10px;
                }
                .custom-scrollbar-thin::-webkit-scrollbar-thumb {
                  background: #38bdf8; /* sky-500 */
                  border-radius: 10px;
                }
                .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover {
                  background: #0ea5e9; /* sky-600 */
                }
                .custom-scrollbar-thin {
                  scrollbar-width: thin;
                  scrollbar-color: #38bdf8 rgba(71, 85, 105, 0.5); /* For Firefox */
                }
            `;
            document.head.appendChild(styleElementScrollbar);
        }
    }, []);

    return (
        <div className="p-4 md:p-8 animate-fadeIn">
            {/* Style tag for .pixelated-sprite and .text-xxs removed, now handled by useEffect */}
            <h1 className="text-4xl md:text-5xl font-extrabold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-600">
                Choose Your Partner!
            </h1>
            <p className="text-center text-slate-300 mb-10 max-w-2xl mx-auto">
                Welcome to the world of Pokémon Scarlet and Violet! Your Nuzlocke adventure begins now. Select one of these three Pokémon to be your very first partner.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                {starters.map(starter => (
                    <StarterCard key={starter.id} starter={starter} onSelect={() => onSelectStarter(starter)} />
                ))}
            </div>
        </div>
    );
};