

import React from 'react';
import { HuntingListDisplayProps } from '../types';

export const HuntingListDisplay: React.FC<HuntingListDisplayProps> = ({ huntingList, onPokemonClick, onRemoveFromHunt }) => {
    const areas = Object.keys(huntingList);

    return (
        <div className="bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700">
            {areas.length > 0 ? (
                <div className="space-y-4">
                    {areas.map(area => (
                        <div key={area}>
                            <h3 className="text-lg font-semibold text-sky-300 border-b border-slate-600 pb-1 mb-2">
                                {area}
                            </h3>
                            <ul className="space-y-1">
                                {huntingList[area].map(pokemon => (
                                    <li key={pokemon.pokemonId} className="flex items-center justify-between bg-slate-700/40 p-2 rounded-md group animate-fadeIn">
                                        <button 
                                            onClick={() => onPokemonClick(pokemon.pokemonId)}
                                            className="flex items-center gap-3 flex-grow text-left hover:text-sky-400 focus:text-sky-400 transition-colors"
                                        >
                                            <img
                                                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.pokemonId}.png`}
                                                alt={pokemon.pokemonName}
                                                className="w-8 h-8 pixelated-sprite bg-slate-600/50 rounded-full"
                                                loading="lazy"
                                            />
                                            <span className="font-medium text-slate-200">{pokemon.pokemonName}</span>
                                        </button>
                                        <button 
                                            onClick={() => onRemoveFromHunt(pokemon.pokemonId, area)}
                                            className="text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-lg"
                                            aria-label={`Remove ${pokemon.pokemonName} from hunt in ${area}`}
                                        >
                                            &times;
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-center text-slate-400 italic py-4">
                    Your hunting list is empty. Find a Pokémon you want and add it to the hunt from its detail page!
                </p>
            )}
        </div>
    );
};