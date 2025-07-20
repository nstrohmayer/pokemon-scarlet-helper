

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PokemonDetailData, AddTeamMemberData, PokemonBaseStat, TeamProspectorProps } from '../types';
import { fetchPokemonDetails, fetchAllPokemonNames } from '../services/pokeApiService';
import { GEN_9_START_ID } from '../constants';

const POKEMON_MAX_ID = 1025; // Gen 9

const calculateStrengthPotential = (stats: PokemonBaseStat[]): number => {
    const total = stats.reduce((acc, stat) => acc + stat.value, 0);
    if (total > 580) return 5;
    if (total > 500) return 4;
    if (total > 410) return 3;
    if (total > 320) return 2;
    return 1;
};

const StarRating: React.FC<{ rating: number }> = ({ rating }) => (
    <div className="flex justify-center my-2" aria-label={`${rating} out of 5 stars`}>
        {[...Array(5)].map((_, i) => (
            <span key={i} className={`text-3xl ${i < rating ? 'text-yellow-400' : 'text-slate-600'}`} role="presentation">★</span>
        ))}
    </div>
);

const TypeBadge: React.FC<{ type: string }> = ({ type }) => {
    const typeColors: Record<string, string> = {
        Normal: 'bg-gray-400 text-black', Fighting: 'bg-red-700 text-white', Flying: 'bg-sky-300 text-black',
        Poison: 'bg-purple-600 text-white', Ground: 'bg-yellow-600 text-black', Rock: 'bg-yellow-700 text-white',
        Bug: 'bg-lime-500 text-white', Ghost: 'bg-indigo-700 text-white', Steel: 'bg-slate-400 text-white', Fire: 'bg-orange-500 text-white',
        Water: 'bg-blue-500 text-white', Grass: 'bg-green-500 text-white', Electric: 'bg-yellow-400 text-black',
        Psychic: 'bg-pink-500 text-white', Ice: 'bg-cyan-300 text-black', Dragon: 'bg-indigo-500 text-white',
        Dark: 'bg-neutral-700 text-white', Fairy: 'bg-pink-300 text-black',
    };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${typeColors[type] || 'bg-gray-500 text-white'}`}>{type}</span>;
}

const FilterButton: React.FC<{ label: string; isActive: boolean; onClick: () => void }> = ({ label, isActive, onClick }) => (
    <button
        onClick={onClick}
        aria-pressed={isActive}
        className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 border-2 ${
            isActive
            ? 'bg-sky-500 text-white border-sky-500 shadow-md'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border-slate-600'
        }`}
    >
        {label}
    </button>
);


export const TeamProspector: React.FC<TeamProspectorProps> = ({ 
    onAbilityClick, 
    likedPokemonMap, 
    onToggleLiked,
    onPokemonClick
}) => {
    const [prospect, setProspect] = useState<PokemonDetailData | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    
    // Filters and Mode
    const [isNewOnly, setIsNewOnly] = useState<boolean>(false);
    const [isFullyEvolvedOnly, setIsFullyEvolvedOnly] = useState<boolean>(false);
    const [showShiny, setShowShiny] = useState<boolean>(false);
    
    // Lookup state
    const [lookupQuery, setLookupQuery] = useState('');
    const [allPokemonNames, setAllPokemonNames] = useState<string[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);

    const isInitialMount = useRef(true);

    useEffect(() => {
        const loadAllNames = async () => {
            try {
                const names = await fetchAllPokemonNames();
                setAllPokemonNames(names);
            } catch (err) {
                console.error("Failed to fetch pokemon names list", err);
            }
        };
        loadAllNames();
    }, []);

    const fetchNewProspect = useCallback(async (isLookup = false, filterOverrides?: { isFullyEvolvedOnly: boolean, isNewOnly: boolean }) => {
        if (!isLookup) {
            setIsLoading(true);
        }
        setError(null);
        setShowShiny(false); // Reset shiny view on new prospect

        const activeNewOnly = filterOverrides?.isNewOnly ?? isNewOnly;
        const activeFullyEvolvedOnly = filterOverrides?.isFullyEvolvedOnly ?? isFullyEvolvedOnly;

        const getRandomId = () => {
            if (activeNewOnly) {
                const range = POKEMON_MAX_ID - GEN_9_START_ID + 1;
                return Math.floor(Math.random() * range) + GEN_9_START_ID;
            }
            return Math.floor(Math.random() * POKEMON_MAX_ID) + 1;
        };

        let attempts = 0;
        const maxAttempts = activeFullyEvolvedOnly ? 50 : 20;

        while(attempts < maxAttempts) {
            attempts++;
            let idToFetch = getRandomId();
            try {
                const data = await fetchPokemonDetails(idToFetch);

                if (activeFullyEvolvedOnly && data.evolutions?.nextStages && data.evolutions.nextStages.length > 0) {
                    continue; // Not fully evolved, try again
                }

                if (data && data.name && data.spriteUrl && data.types.length > 0) {
                    setProspect(data);
                    setIsLoading(false);
                    return; // Success
                }
            } catch (err) {
                console.warn(`Attempt ${attempts}: Failed to fetch prospect with ID ${idToFetch}`, err);
            }
        }
        
        let errorMsg = "Could not find a new Pokémon. Please try again.";
        if(activeNewOnly || activeFullyEvolvedOnly) {
            errorMsg = "Could not find a Pokémon matching your criteria. Please try again or adjust your filters.";
        }
        setError(errorMsg);
        setProspect(null); // Clear any old prospect
        setIsLoading(false);

    }, [isNewOnly, isFullyEvolvedOnly]);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            fetchNewProspect();
        }
    }, [fetchNewProspect]);

    const handleToggleNewOnly = async () => {
        const newFilterState = !isNewOnly;
        setIsNewOnly(newFilterState);
        await fetchNewProspect(false, { isFullyEvolvedOnly, isNewOnly: newFilterState });
    };

    const handleToggleFullyEvolved = async () => {
        const newFilterState = !isFullyEvolvedOnly;
        setIsFullyEvolvedOnly(newFilterState); // Set state immediately for UI feedback

        // If turning the filter ON
        if (newFilterState) {
            setIsLoading(true);
            setError(null);
            // And there's a current prospect that can evolve
            if (prospect && prospect.evolutions?.nextStages && prospect.evolutions.nextStages.length > 0) {
                try {
                    let currentPokemon = prospect;
                    // Traverse up the evolution chain until the final form is found
                    while (currentPokemon.evolutions?.nextStages && currentPokemon.evolutions.nextStages.length > 0) {
                        const nextEvoName = currentPokemon.evolutions.nextStages[0].name;
                        currentPokemon = await fetchPokemonDetails(nextEvoName);
                    }
                    setProspect(currentPokemon);
                } catch (err) {
                    setError("Could not find final evolution. Fetching a random fully-evolved Pokémon instead.");
                    // Fetch a random one that meets the criteria
                    await fetchNewProspect(false, { isFullyEvolvedOnly: true, isNewOnly });
                } finally {
                    setIsLoading(false);
                }
            } else {
                // Current prospect cannot evolve, or there is no prospect.
                // Fetch a random fully evolved Pokémon.
                await fetchNewProspect(false, { isFullyEvolvedOnly: true, isNewOnly });
            }
        } else { // If turning the filter OFF
            await fetchNewProspect(false, { isFullyEvolvedOnly: false, isNewOnly });
        }
    };

    const handleLookupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setLookupQuery(query);
        if (query.length > 1) {
            const filteredSuggestions = allPokemonNames
                .filter(name => name.includes(query.toLowerCase()))
                .slice(0, 7);
            setSuggestions(filteredSuggestions);
            setIsSuggestionsVisible(true);
        } else {
            setSuggestions([]);
            setIsSuggestionsVisible(false);
        }
    };

    const executeLookup = async (pokemonNameToFind: string) => {
        if (!pokemonNameToFind.trim() || isLoading) return;
    
        setLookupQuery(pokemonNameToFind);
        setIsSuggestionsVisible(false);
        setSuggestions([]);
    
        setIsLoading(true);
        setError(null);
        setProspect(null);
    
        try {
            const data = await fetchPokemonDetails(pokemonNameToFind.trim());
            setProspect(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : `Could not find "${pokemonNameToFind.trim()}".`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSuggestionClick = (suggestion: string) => {
        executeLookup(suggestion);
    };

    const handleLookupSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        executeLookup(lookupQuery);
    };

    const handleLike = () => {
        if (!prospect || isLoading) return;
        if (!likedPokemonMap[prospect.id]) {
            onToggleLiked(prospect.id);
        }
        fetchNewProspect();
    };

    const handleDislike = () => {
        if (isLoading) return;
        fetchNewProspect();
    };

    const renderCardContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-sky-400"></div>
                    <p className="mt-4 text-slate-300">Searching for Pokémon...</p>
                </div>
            );
        }
        if (error) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-red-400 font-semibold">{error}</p>
                    <button onClick={() => fetchNewProspect()} className="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-md">Try Again</button>
                </div>
            );
        }

        if (prospect) {
            const strength = calculateStrengthPotential(prospect.baseStats);
            const currentSprite = showShiny ? prospect.shinySpriteUrl : prospect.spriteUrl;
            return (
                 <div className="flex flex-col items-center justify-between h-full p-4 relative">
                    <button onClick={() => onPokemonClick(prospect.id)} className="w-full h-full flex flex-col items-center">
                        <img 
                            src={currentSprite || ''} 
                            alt={prospect.name} 
                            className="w-40 h-40 pixelated-sprite" 
                        />
                        <h3 className="text-2xl font-bold mt-2 text-slate-100">{prospect.name}</h3>
                        <div className="flex justify-center gap-2 mt-2">
                            {prospect.types.map(type => <TypeBadge key={type} type={type} />)}
                        </div>

                        <div className="mt-4">
                            <h4 className="text-sm font-semibold text-slate-300">Strength Potential</h4>
                            <StarRating rating={strength} />
                            <h4 className="text-sm font-semibold text-slate-300 mt-2">Abilities</h4>
                            <ul className="text-xs text-center text-slate-400 space-y-1">
                                {prospect.abilities.map(ability => (
                                    <li key={ability.rawName}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onAbilityClick(ability.rawName); }}
                                            className="hover:text-sky-400 focus:text-sky-400 transition-colors duration-150 hover:underline focus:underline focus:outline-none"
                                            title={`View details for ${ability.displayName}`}
                                        >
                                            {ability.displayName}{ability.isHidden ? ' (Hidden)' : ''}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </button>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700">
            <form onSubmit={handleLookupSubmit} className="relative flex gap-2 mb-3">
                <div className="flex-grow">
                    <input
                        type="text"
                        value={lookupQuery}
                        onChange={handleLookupChange}
                        onFocus={() => { if (suggestions.length > 0) setIsSuggestionsVisible(true); }}
                        onBlur={() => setTimeout(() => setIsSuggestionsVisible(false), 200)}
                        placeholder="Look up a Pokémon by name or ID..."
                        className="w-full bg-slate-700/50 border border-slate-600 rounded-md px-3 py-2 text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 outline-none transition-colors"
                        disabled={isLoading}
                        autoComplete="off"
                    />
                     {isSuggestionsVisible && suggestions.length > 0 && (
                        <ul className="absolute top-full left-0 right-0 mt-1 bg-slate-600 border border-slate-500 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                            {suggestions.map(suggestion => (
                                <li 
                                    key={suggestion}
                                    onMouseDown={() => handleSuggestionClick(suggestion)}
                                    className="px-3 py-2 text-slate-200 hover:bg-sky-600 cursor-pointer"
                                >
                                    {suggestion.split('-').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ')}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <button
                    type="submit"
                    disabled={isLoading || !lookupQuery.trim()}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Find
                </button>
            </form>

            <div className="flex justify-center flex-wrap gap-2 mb-3">
                <FilterButton label="New Pokémon Only" isActive={isNewOnly} onClick={handleToggleNewOnly} />
                <FilterButton label="Fully Evolved Only" isActive={isFullyEvolvedOnly} onClick={handleToggleFullyEvolved} />
            </div>

            <div className="relative h-96 bg-slate-700/50 rounded-lg shadow-inner">
                {renderCardContent()}
            </div>
            <div className="flex justify-around items-center mt-4 gap-4">
                 <button 
                    onClick={handleDislike} 
                    disabled={isLoading}
                    className="w-20 h-20 bg-rose-600/80 hover:bg-rose-600 rounded-full flex items-center justify-center text-white shadow-xl transform transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Dislike and see next Pokémon"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <button 
                    onClick={() => setShowShiny(s => !s)}
                    disabled={isLoading || !prospect?.shinySpriteUrl}
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-xl transform transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed ${
                        showShiny 
                        ? 'bg-yellow-400/80 hover:bg-yellow-400 focus:ring-yellow-300' 
                        : 'bg-slate-600/80 hover:bg-slate-600 focus:ring-sky-400'
                    }`}
                    aria-label={showShiny ? "Show normal variant" : "Show shiny variant"}
                >
                    <span className="text-3xl" role="img" aria-label="sparkles">🌟</span>
                </button>
                <button 
                    onClick={handleLike} 
                    disabled={isLoading || !prospect}
                    className="w-20 h-20 bg-emerald-500/80 hover:bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-xl transform transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Like and see next Pokémon"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                    </svg>
                </button>
            </div>
        </div>
    );
};