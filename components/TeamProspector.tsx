import React, { useState, useEffect, useCallback } from 'react';
import { PokemonDetailData, PokemonBaseStat, TeamProspectorProps, AddTeamMemberData, ProspectorFilters } from '../types';
import { fetchAllPokemonNames } from '../services/pokeApiService';
import { prospectorStateService } from '../services/prospectorStateService';
import { GENERATION_BOUNDARIES, POKEMON_TYPES } from '../constants';


const calculateStrengthPotential = (stats: PokemonBaseStat[]): number => {
    const total = stats.reduce((acc, stat) => acc + stat.value, 0);
    if (total > 580) return 5;
    if (total > 500) return 4;
    if (total > 410) return 3;
    if (total > 320) return 2;
    return 1;
};

const StarRating: React.FC<{ rating: number }> = ({ rating }) => (
    <div className="flex justify-center my-1" aria-label={`${rating} out of 5 stars`}>
        {[...Array(5)].map((_, i) => (
            <span key={i} className={`text-2xl ${i < rating ? 'text-yellow-400' : 'text-slate-600'}`} role="presentation">★</span>
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

const FilterButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; className?: string }> = ({ label, isActive, onClick, className = '' }) => (
    <button
        onClick={onClick}
        aria-pressed={isActive}
        className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 border-2 ${
            isActive
            ? 'bg-sky-500 text-white border-sky-500 shadow-md'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border-slate-600'
        } ${className}`}
    >
        {label}
    </button>
);


export const TeamProspector: React.FC<TeamProspectorProps> = ({ 
    team,
    onAbilityClick, 
    likedPokemonMap, 
    onToggleLiked,
    onPokemonClick,
    onAddToTeam
}) => {
    const [prospectorState, setProspectorState] = useState(prospectorStateService.getState());
    const { prospect, isLoading, error, prospectList, currentIndex } = prospectorState;

    // Local UI State
    const [filters, setFilters] = useState<ProspectorFilters>({
        generation: 9,
        type: null,
        isFullyEvolvedOnly: true,
    });
    const [showShiny, setShowShiny] = useState<boolean>(false);
    
    // State for Search Inputs
    const [lookupQuery, setLookupQuery] = useState('');
    const [flexibleQuery, setFlexibleQuery] = useState('');
    const [allPokemonNames, setAllPokemonNames] = useState<string[]>([]);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);

    // Subscribe to the global service for state updates
    useEffect(() => {
        const unsubscribe = prospectorStateService.subscribe(setProspectorState);
        prospectorStateService.initialize(filters); // Initialize with default filters
        
        const loadAllNames = async () => {
            try {
                const names = await fetchAllPokemonNames();
                setAllPokemonNames(names);
            } catch (err) {
                console.error("Failed to fetch pokemon names list", err);
            }
        };
        loadAllNames();

        return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Effect for handling Escape key to close suggestions
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsSuggestionsVisible(false);
            }
        };
        if (isSuggestionsVisible) document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isSuggestionsVisible]);


    // --- Handlers ---

    const handleFilterChange = useCallback((key: keyof ProspectorFilters, value: any) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        // Use a timeout to debounce the AI call
        const handler = setTimeout(() => {
             prospectorStateService.fetchByFilters(newFilters);
        }, 300);
        return () => clearTimeout(handler);
    }, [filters]);

    const handleSuggestTeammates = () => {
        if (team.length === 0) return;
        prospectorStateService.fetchSuggestions(team);
    };

    const handleLookupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setLookupQuery(query);
        if (query.length > 1) {
            setSuggestions(allPokemonNames.filter(name => name.toLowerCase().includes(query.toLowerCase())).slice(0, 5));
            setIsSuggestionsVisible(true);
        } else {
            setSuggestions([]);
            setIsSuggestionsVisible(false);
        }
    };

    const handleLookupSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!lookupQuery.trim() || isLoading) return;
        prospectorStateService.fetchByName(lookupQuery.trim());
        setIsSuggestionsVisible(false);
    };
    
    const handleSuggestionClick = (suggestion: string) => {
        setLookupQuery(suggestion);
        prospectorStateService.fetchByName(suggestion);
    };

    const handleFlexibleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!flexibleQuery.trim() || isLoading) return;
        prospectorStateService.fetchByPrompt(flexibleQuery.trim());
    };

    const handleLike = () => {
        if (prospect && !isLoading) {
            onToggleLiked(prospect.id);
        }
    };
    
    const handleAddToTeam = () => {
        if (prospect && !isLoading) {
            onAddToTeam({
                species: prospect.name,
                pokemonId: prospect.id,
                level: 1, // Default level, can be changed later
                types: prospect.types,
            });
        }
    };

    const renderCardContent = () => {
        if (isLoading && !prospect) {
            return (
                <div className="flex flex-col items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-sky-400"></div>
                    <p className="mt-4 text-slate-300">Searching for Pokémon...</p>
                </div>
            );
        }
        if (error) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <p className="text-red-400 font-semibold">{error}</p>
                    <button onClick={() => prospectorStateService.fetchByFilters(filters)} className="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-md">
                        Retry
                    </button>
                </div>
            );
        }

        if (prospect) {
            const strength = calculateStrengthPotential(prospect.baseStats);
            const currentSprite = showShiny ? prospect.shinySpriteUrl : prospect.spriteUrl;
            const isLiked = !!likedPokemonMap[prospect.id];

            return (
                 <div className="flex flex-col items-center justify-between h-full p-4 relative group animate-fadeIn">
                    <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                        <button onClick={handleLike} className={`p-2 rounded-full transition-colors ${isLiked ? 'bg-rose-500/80 text-white' : 'bg-slate-600/80 text-rose-300 hover:bg-slate-500/80'}`} aria-label={isLiked ? "Unlike Pokémon" : "Like Pokémon"}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                        </button>
                        <button onClick={handleAddToTeam} className="p-2 rounded-full bg-slate-600/80 text-emerald-300 hover:bg-slate-500/80 transition-colors" aria-label="Add to Team">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        </button>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="relative">
                            <img src={currentSprite || '/favicon.png'} alt={prospect.name} className="w-32 h-32 pixelated-sprite cursor-pointer" onClick={() => onPokemonClick(prospect.id)} />
                            {prospect.shinySpriteUrl && (
                                <button onClick={() => setShowShiny(s => !s)} className={`absolute -top-1 -right-1 p-1 rounded-full text-lg transition-all ${showShiny ? 'text-yellow-400' : 'text-slate-500 hover:text-yellow-400'}`} title="Toggle shiny">🌟</button>
                            )}
                        </div>
                        <h3 className="text-2xl font-bold mt-2 text-sky-300 cursor-pointer" onClick={() => onPokemonClick(prospect.id)}>{prospect.name}</h3>
                        <p className="text-sm text-slate-400 italic mb-2">{prospect.genus}</p>
                        <div className="flex gap-2">{prospect.types.map(t => <TypeBadge key={t} type={t} />)}</div>
                    </div>
                    
                    <div className="text-center">
                        <p className="text-sm font-semibold text-slate-200">Strength Potential</p>
                        <StarRating rating={strength} />
                    </div>

                    <div className="text-center w-full">
                        <h4 className="text-sm font-semibold text-slate-200">Abilities</h4>
                        <ul className="text-xs text-slate-300 space-y-0.5 mt-1">
                            {prospect.abilities.map(ability => (
                                <li key={ability.rawName}>
                                    <button onClick={() => onAbilityClick(ability.rawName)} className="hover:text-sky-400 hover:underline transition-colors">
                                        {ability.displayName}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
         <div className="bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700 space-y-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="flex items-center gap-2">
                         <select
                            value={filters.generation || 'all'}
                            onChange={(e) => handleFilterChange('generation', e.target.value === 'all' ? null : Number(e.target.value))}
                            className="bg-slate-700 text-sm rounded-md py-1.5 pl-2 pr-8 border border-slate-600 focus:ring-2 focus:ring-sky-500 outline-none appearance-none"
                            aria-label="Filter by Generation"
                        >
                            <option value="all">All Gens</option>
                            {GENERATION_BOUNDARIES.map(g => <option key={g.gen} value={g.gen}>Gen {g.gen}</option>)}
                        </select>
                        <button onClick={() => handleFilterChange('generation', 9)} className="px-3 py-1.5 text-xs font-semibold rounded-md bg-purple-600 text-white hover:bg-purple-700 border border-purple-500">
                            Paldea
                        </button>
                    </div>
                    <select
                        value={filters.type || 'all'}
                        onChange={(e) => handleFilterChange('type', e.target.value === 'all' ? null : e.target.value)}
                        className="bg-slate-700 text-sm rounded-md py-1.5 pl-2 pr-8 border border-slate-600 focus:ring-2 focus:ring-sky-500 outline-none appearance-none"
                        aria-label="Filter by Type"
                    >
                        <option value="all">All Types</option>
                        {POKEMON_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                     <FilterButton 
                        label="Fully Evolved" 
                        isActive={filters.isFullyEvolvedOnly} 
                        onClick={() => handleFilterChange('isFullyEvolvedOnly', !filters.isFullyEvolvedOnly)} 
                     />
                    <button
                        onClick={handleSuggestTeammates}
                        disabled={isLoading || team.length === 0}
                        className="px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 border-2 bg-purple-600 text-white hover:bg-purple-700 border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={team.length === 0 ? "Add Pokémon to your team to get suggestions" : "Get AI-powered team suggestions"}
                    >
                        Suggest Teammates ✨
                    </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                     <form onSubmit={handleFlexibleSubmit} className="relative w-full lg:w-auto flex-grow">
                        <input
                            type="text"
                            value={flexibleQuery}
                            onChange={(e) => setFlexibleQuery(e.target.value)}
                            placeholder="Describe Pokémon... (e.g. paradox)"
                            className="bg-slate-700 text-sm rounded-full w-full py-1.5 pl-4 pr-4 border border-slate-600 focus:ring-2 focus:ring-sky-500 outline-none"
                        />
                    </form>
                    <form onSubmit={handleLookupSubmit} className="relative w-full lg:w-auto flex-grow">
                        <input
                            type="text"
                            value={lookupQuery}
                            onChange={handleLookupChange}
                            onFocus={() => setIsSuggestionsVisible(true)}
                            onBlur={() => setTimeout(() => setIsSuggestionsVisible(false), 200)}
                            placeholder="Type name..."
                            className="bg-slate-700 text-sm rounded-full w-full py-1.5 pl-4 pr-4 border border-slate-600 focus:ring-2 focus:ring-sky-500 outline-none"
                        />
                        {isSuggestionsVisible && suggestions.length > 0 && (
                            <ul className="absolute top-full mt-1 w-full bg-slate-600 border border-slate-500 rounded-md shadow-lg z-10 overflow-hidden">
                            {suggestions.map(s => (
                                <li key={s} onMouseDown={() => handleSuggestionClick(s)} className="px-4 py-2 text-sm text-slate-200 hover:bg-sky-600 cursor-pointer">
                                    {s}
                                </li>
                            ))}
                            </ul>
                        )}
                    </form>
                </div>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-4">
                {/* Left Column: List of Prospects */}
                <div className="w-full lg:w-1/3 xl:w-1/4 hidden lg:block">
                    <h3 className="text-lg font-bold text-sky-300 mb-2">
                        Prospects ({prospectList.length})
                    </h3>
                    <div className="bg-slate-700/50 rounded-lg p-2 h-[420px] overflow-y-auto border border-slate-600/50">
                        {(isLoading && prospectList.length === 0) && (
                            <div className="text-center text-slate-400 p-4">Loading list...</div>
                        )}
                        {(error && prospectList.length === 0) && (
                             <div className="text-center text-red-400 p-4">Error loading list.</div>
                        )}
                        {prospectList.length > 0 ? (
                            <ul className="space-y-1">
                                {prospectList.map((p, index) => (
                                    <li key={p.id}>
                                        <button
                                            onClick={() => prospectorStateService.setCurrentIndex(index)}
                                            className={`w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors ${
                                                index === currentIndex
                                                ? 'bg-sky-600 text-white shadow-md'
                                                : 'hover:bg-slate-600/60'
                                            }`}
                                        >
                                            <img 
                                                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`} 
                                                alt="" 
                                                className="w-8 h-8 pixelated-sprite" 
                                                loading="lazy"
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            />
                                            <span className="text-sm font-medium">{p.name}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : !isLoading && !error ? (
                            <div className="text-center text-slate-400 p-4">No Pokémon found.</div>
                        ) : null}
                    </div>
                </div>
                
                {/* Right Column: Prospector Detail Card */}
                <div className="flex-grow">
                    <div className="relative">
                        <button 
                            onClick={() => prospectorStateService.navigate('previous')} 
                            disabled={isLoading || prospectList.length < 2} 
                            className="absolute left-[-1rem] top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center bg-slate-800/80 backdrop-blur-sm border border-slate-600 rounded-full text-slate-200 hover:bg-sky-500/70 hover:text-white hover:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-2xl"
                            aria-label="Previous Pokémon"
                        >
                            ‹
                        </button>
                        <button 
                            onClick={() => prospectorStateService.navigate('next')} 
                            disabled={isLoading || prospectList.length < 2} 
                            className="absolute right-[-1rem] top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center bg-slate-800/80 backdrop-blur-sm border border-slate-600 rounded-full text-slate-200 hover:bg-sky-500/70 hover:text-white hover:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-2xl"
                            aria-label="Next Pokémon"
                        >
                            ›
                        </button>
                        
                        <div className="w-full h-[420px] bg-slate-700/50 rounded-lg shadow-inner overflow-hidden border border-slate-600/50">
                            {renderCardContent()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};