

import React from 'react';
import { LikedPokemonDisplayProps } from '../types';

const LikedPokemonCard: React.FC<{ pokemonId: number; onClick: (id: number) => void }> = ({ pokemonId, onClick }) => {
    const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
    const artworkUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`;

    return (
        <button
            onClick={() => onClick(pokemonId)}
            className="p-2 bg-slate-700/50 rounded-lg flex items-center justify-center aspect-square transition-all duration-200 hover:bg-sky-700/50 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-500"
            aria-label={`View details for Pokémon #${pokemonId}`}
        >
            <img
                src={artworkUrl}
                alt={`Pokémon #${pokemonId}`}
                className="pixelated-sprite w-full h-full object-contain"
                loading="lazy"
                onError={(e) => {
                    // Fallback to the default sprite if official artwork fails
                    const target = e.currentTarget as HTMLImageElement;
                    if (target.src !== spriteUrl) { // Prevent infinite loops
                        target.onerror = null; 
                        target.src = spriteUrl;
                    }
                }}
            />
        </button>
    );
};

export const LikedPokemonDisplay: React.FC<LikedPokemonDisplayProps> = ({ likedPokemonIds, onPokemonClick }) => {
    return (
        <div className="bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700">
            {likedPokemonIds.length > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                    {likedPokemonIds.map(id => (
                        <LikedPokemonCard key={id} pokemonId={id} onClick={onPokemonClick} />
                    ))}
                </div>
            ) : (
                <p className="text-center text-slate-400 italic py-4">
                    You haven't liked any Pokémon yet. Use the "Team Prospector" to find and like some!
                </p>
            )}
        </div>
    );
};