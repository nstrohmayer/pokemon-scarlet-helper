


import React, { useState, useEffect, useCallback } from 'react';
import { PokemonDetailLookupProps, PokemonDetailData, PokemonEvolutionStep, PokemonMoveInfo, PokemonBaseStat } from '../types';
import { fetchPokemonDetails, fetchAllPokemonNames, fetchPokemonGenerationInsights } from '../services/pokeApiService';

const TypeBadge: React.FC<{ type: string; className?: string }> = ({ type, className = '' }) => {
    const typeColors: Record<string, string> = {
        Normal: 'bg-gray-400 text-black', Fighting: 'bg-red-700 text-white', Flying: 'bg-sky-300 text-black',
        Poison: 'bg-purple-600 text-white', Ground: 'bg-yellow-600 text-black', Rock: 'bg-yellow-700 text-white',
        Bug: 'bg-lime-500 text-white', Ghost: 'bg-indigo-700 text-white', Steel: 'bg-slate-400 text-white', Fire: 'bg-orange-500 text-white',
        Water: 'bg-blue-500 text-white', Grass: 'bg-green-500 text-white', Electric: 'bg-yellow-400 text-black',
        Psychic: 'bg-pink-500 text-white', Ice: 'bg-cyan-300 text-black', Dragon: 'bg-indigo-500 text-white',
        Dark: 'bg-neutral-700 text-white', Fairy: 'bg-pink-300 text-black',
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${typeColors[type] || 'bg-gray-500 text-white'} ${className}`}>{type}</span>;
};

const StatBar: React.FC<{ stat: PokemonBaseStat }> = ({ stat }) => {
  const percentage = Math.min((stat.value / 255) * 100, 100);
  let barColor = 'bg-sky-500';
  if (stat.value < 60) barColor = 'bg-red-500';
  else if (stat.value < 90) barColor = 'bg-yellow-500';
  else if (stat.value < 120) barColor = 'bg-green-500';
  
  return (
    <div className="mb-1.5">
      <div className="flex justify-between text-xs text-slate-300 mb-0.5">
        <span className="font-medium">{stat.name}</span>
        <span>{stat.value}</span>
      </div>
      <div className="w-full bg-slate-600 rounded-full h-2">
        <div className={`h-2 rounded-full ${barColor} transition-all duration-500 ease-out`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
};

const FullEvolutionDisplay: React.FC<{ evolutionInfo: PokemonDetailData['evolutions'], onPokemonClick: (id: number) => void }> = ({ evolutionInfo, onPokemonClick }) => {
    if (!evolutionInfo) return <p className="text-sm text-slate-400 italic">This Pokémon does not evolve.</p>;

    const stages: (PokemonEvolutionStep & { isCurrent: boolean })[] = [];
    if (evolutionInfo.previousStage) {
        stages.push({ ...evolutionInfo.previousStage, trigger: '', conditions: [], isCurrent: false });
    }
    stages.push({ ...evolutionInfo.currentStage, trigger: '', conditions: [], isCurrent: true });
    stages.push(...evolutionInfo.nextStages.map(s => ({...s, isCurrent: false})));
    
    return (
        <div className="flex items-center justify-center flex-wrap gap-x-2 gap-y-4">
            {stages.map((stage, index) => (
                <React.Fragment key={stage.id}>
                    {index > 0 && <span className="text-2xl text-slate-500 mx-1 self-center">&rarr;</span>}
                    <div className="flex flex-col items-center text-center">
                        <button 
                            onClick={() => onPokemonClick(stage.id)} 
                            disabled={stage.isCurrent}
                            className={`p-2 rounded-lg transition-colors duration-200 ${stage.isCurrent ? 'bg-sky-700/50' : 'hover:bg-slate-600/50'}`}
                            aria-label={`View details for ${stage.name}`}
                        >
                            <img src={stage.spriteUrl || '/favicon.png'} alt={stage.name} className="w-20 h-20 pixelated-sprite" />
                            <p className={`font-semibold text-sm mt-1 ${stage.isCurrent ? 'text-sky-300' : 'text-slate-200'}`}>{stage.name}</p>
                            <div className="text-xs text-slate-400 capitalize min-h-[2.5rem]">
                                {stage.trigger && <p>{stage.trigger}</p>}
                                {stage.conditions.map(c => <p key={c}>{c}</p>)}
                            </div>
                        </button>
                    </div>
                </React.Fragment>
            ))}
        </div>
    );
};


export const PokemonDetailLookup: React.FC<PokemonDetailLookupProps> = ({ onAbilityClick, onMoveClick }) => {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);
    
    const [allPokemonNames, setAllPokemonNames] = useState<string[]>([]);

    const [pokemon, setPokemon] = useState<PokemonDetailData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const names = await fetchAllPokemonNames();
                setAllPokemonNames(names);
            } catch (err) {
                console.error("Failed to load initial lookup data", err);
                setError("Could not load essential data. Please refresh the page.");
            }
        };
        loadInitialData();
    }, []);

    // Effect for handling Escape key to close suggestions
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsSuggestionsVisible(false);
            }
        };

        if (isSuggestionsVisible) {
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isSuggestionsVisible]);


    const handleSearch = useCallback(async (pokemonNameOrId: string | number) => {
        if (!pokemonNameOrId) return;
        
        setIsLoading(true);
        setError(null);
        setPokemon(null);
        setIsSuggestionsVisible(false);
        setQuery(typeof pokemonNameOrId === 'string' ? pokemonNameOrId : '');

        try {
            const details = await fetchPokemonDetails(pokemonNameOrId);
            setPokemon(details);
            
            // Asynchronously fetch and update generation insights
            try {
                const insights = await fetchPokemonGenerationInsights(details.name);
                setPokemon(prevDetails => prevDetails ? { ...prevDetails, generationInsights: insights } : null);
            } catch (insightsError) {
                console.warn(`Could not fetch Gen 9 insights for ${details.name}:`, insightsError);
                setPokemon(prevDetails => prevDetails ? { ...prevDetails, generationInsights: null } : null);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : `Could not find details for "${pokemonNameOrId}".`);
            setPokemon(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);
        if (value.length > 1) {
            const filtered = allPokemonNames.filter(name => name.toLowerCase().includes(value.toLowerCase())).slice(0, 7);
            setSuggestions(filtered);
            setIsSuggestionsVisible(true);
        } else {
            setSuggestions([]);
            setIsSuggestionsVisible(false);
        }
    };
    
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSearch(query);
    };

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-sky-300">Pokémon Pokedex</h2>
            <form onSubmit={handleFormSubmit} className="relative max-w-md">
                <input
                    type="text"
                    value={query}
                    onChange={handleQueryChange}
                    onFocus={() => setIsSuggestionsVisible(true)}
                    onBlur={() => setTimeout(() => setIsSuggestionsVisible(false), 200)}
                    placeholder="Search for a Pokémon by name..."
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-md px-4 py-2 text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 outline-none transition-colors"
                />
                {isSuggestionsVisible && suggestions.length > 0 && (
                    <ul className="absolute top-full mt-1 w-full bg-slate-600 border border-slate-500 rounded-md shadow-lg z-20 overflow-hidden">
                        {suggestions.map(s => (
                            <li key={s}>
                                <button 
                                    onMouseDown={() => handleSearch(s)} 
                                    className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-sky-600 cursor-pointer"
                                >
                                    {s}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </form>
            
            <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700 min-h-[60vh]">
                {isLoading && (
                    <div className="flex flex-col items-center justify-center h-full pt-16">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-sky-400"></div>
                        <p className="mt-4 text-slate-300">Fetching Pokémon Data...</p>
                    </div>
                )}
                {error && !isLoading && <p className="text-red-400 text-center pt-16">{error}</p>}
                {!pokemon && !isLoading && !error && (
                    <p className="text-slate-400 text-center pt-16">Search for a Pokémon to see its details.</p>
                )}
                {pokemon && (
                    <div className="animate-fadeIn space-y-6">
                        {/* Header */}
                        <div className="text-center">
                            <h3 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">{pokemon.name}</h3>
                            <p className="text-slate-400 italic">{pokemon.genus}</p>
                            <div className="flex justify-center gap-2 mt-2">
                                {pokemon.types.map(t => <TypeBadge key={t} type={t} className="px-3 py-1 text-sm" />)}
                            </div>
                        </div>

                        {/* Sprites & Core Info */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1 space-y-4">
                                <div className="bg-slate-700/50 p-4 rounded-lg">
                                    <h4 className="font-bold text-sky-300 mb-2 text-center">Sprite Comparison</h4>
                                    <div className="flex justify-around items-center">
                                        <div className="text-center">
                                            <img src={pokemon.spriteUrl || '/favicon.png'} alt={`${pokemon.name} default sprite`} className="w-28 h-28 pixelated-sprite"/>
                                            <p className="text-sm text-slate-300 mt-1">Default</p>
                                        </div>
                                        <div className="text-center">
                                            <img src={pokemon.shinySpriteUrl || '/favicon.png'} alt={`${pokemon.name} shiny sprite`} className="w-28 h-28 pixelated-sprite"/>
                                            <p className="text-sm text-yellow-300 mt-1">Shiny</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-slate-700/50 p-4 rounded-lg">
                                    <h4 className="font-bold text-sky-300 mb-2">Base Stats</h4>
                                    {pokemon.baseStats.map(stat => <StatBar key={stat.name} stat={stat} />)}
                                </div>
                                <div className="bg-slate-700/50 p-4 rounded-lg">
                                    <h4 className="font-bold text-sky-300 mb-2">Abilities</h4>
                                    <ul className="space-y-1">
                                        {pokemon.abilities.map(ability => (
                                            <li key={ability.rawName}>
                                                <button onClick={() => onAbilityClick(ability.rawName)} className="text-slate-300 hover:text-sky-300 hover:underline">
                                                    {ability.displayName}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-slate-700/50 p-4 rounded-lg">
                                    <h4 className="font-bold text-sky-300 mb-3 text-center">Evolution Line</h4>
                                    <FullEvolutionDisplay evolutionInfo={pokemon.evolutions} onPokemonClick={(id) => handleSearch(id)} />
                                </div>
                                
                                {pokemon.generationInsights === undefined ? (
                                    <div className="bg-slate-700/50 p-4 rounded-lg text-center text-slate-400 italic">Loading Paldea Info...</div>
                                ) : pokemon.generationInsights ? (
                                    <div className="bg-slate-700/50 p-4 rounded-lg">
                                        <h4 className="font-bold text-sky-300 mb-2">Availability in Paldea</h4>
                                        <ul className="space-y-2">
                                            {pokemon.generationInsights.availability.map(loc => (
                                                <li key={loc.area} className="text-sm text-slate-300">
                                                    <strong className="text-slate-100">{loc.area}:</strong> {loc.notes}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : null}
                                
                                <div className="bg-slate-700/50 p-4 rounded-lg">
                                    <h4 className="font-bold text-sky-300 mb-2">Key Level-Up Moves (Gen 9)</h4>
                                    <ul className="space-y-1.5 max-h-64 overflow-y-auto pr-2">
                                        {pokemon.moves.map(move => (
                                            <li key={move.name} className="text-sm">
                                                <button onClick={() => onMoveClick(move.name, move.rawName || '')} className="text-slate-300 hover:text-sky-300 hover:underline">
                                                    <strong className="text-slate-100 mr-2">Lvl {move.levelLearnedAt}:</strong>{move.name}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};