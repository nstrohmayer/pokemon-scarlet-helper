

import React, { useState, useMemo } from 'react';
import { TeamMember, TeamManagerProps } from '../types';
import { POKEMON_TYPES, TYPE_EFFECTIVENESS_CHART } from '../constants';
import { fetchPokemonDetails } from '../services/pokeApiService';

const TypeBadge: React.FC<{ type: string; className?: string }> = ({ type, className = '' }) => {
    const typeColors: Record<string, string> = {
        Normal: 'bg-gray-400 text-black', Fighting: 'bg-red-700 text-white', Flying: 'bg-sky-300 text-black',
        Poison: 'bg-purple-600 text-white', Ground: 'bg-yellow-600 text-black', Rock: 'bg-yellow-700 text-white',
        Bug: 'bg-lime-500 text-white', Ghost: 'bg-indigo-700 text-white', Steel: 'bg-slate-400 text-white', Fire: 'bg-orange-500 text-white',
        Water: 'bg-blue-500 text-white', Grass: 'bg-green-500 text-white', Electric: 'bg-yellow-400 text-black',
        Psychic: 'bg-pink-500 text-white', Ice: 'bg-cyan-300 text-black', Dragon: 'bg-indigo-500 text-white',
        Dark: 'bg-neutral-700 text-white', Fairy: 'bg-pink-300 text-black',
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${typeColors[type] || 'bg-gray-500 text-white'} ${className}`}>{type}</span>;
}

const SmogonIcon = () => (
    <svg viewBox="0 0 512 512" fill="currentColor" className="w-4 h-4" aria-hidden="true" role="img">
        <path d="M495.9,233.2c-2.3-6.1-9.9-7.9-15.9-5.6L324.7,290.4c-6.1,2.3-7.9,9.9-5.6,15.9l27.1,71.2 c2.3,6.1,9.9,7.9,15.9,5.6l143.2-53.7c6.1-2.3,7.9-9.9,5.6-15.9L495.9,233.2z M16.1,278.8c2.3,6.1,9.9,7.9,15.9,5.6l155.3-58.2 c6.1-2.3,7.9-9.9,5.6-15.9l-27.1-71.2c-2.3-6.1-9.9-7.9-15.9-5.6L16.7,185.3c-6.1,2.3-7.9,9.9-5.6,15.9L16.1,278.8z"/>
    </svg>
);

interface PokemonTeamCardProps {
   member: TeamMember;
   onRemove: (id: string) => void;
   IconPokeball: React.ElementType;
   onUpdateNickname: (id: string, nickname: string) => void;
   onUpdateLevel: (id: string, level: number) => void;
   onUpdateItem: (id: string, item: string) => void;
   onUpdateMove: (id: string, moveIndex: number, moveName: string) => void;
   onToggleShiny: (id: string) => void;
}

const PokemonTeamCard: React.FC<PokemonTeamCardProps> = ({
    member,
    onRemove,
    IconPokeball,
    onUpdateNickname,
    onUpdateLevel,
    onUpdateItem,
    onUpdateMove,
    onToggleShiny
}) => {
  const spriteBaseUrl = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/";
  const spriteUrl = member.pokemonId
    ? `${spriteBaseUrl}${member.isShiny ? 'shiny/' : ''}${member.pokemonId}.png`
    : null;
    
  const smogonUrl = `https://www.smogon.com/dex/sv/pokemon/${member.species.toLowerCase().replace(/\s+/g, '-')}/`;

  const handleLevelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLevel = parseInt(e.target.value);
    if (!isNaN(newLevel)) {
        onUpdateLevel(member.id, Math.max(1, Math.min(100, newLevel)));
    } else if (e.target.value === '') {
        onUpdateLevel(member.id, 1); // Or handle empty string as desired
    }
  };

  const handleMoveChange = (index: number, value: string) => {
    onUpdateMove(member.id, index, value);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
        event.currentTarget.blur();
    }
  };

  return (
    <div className="bg-slate-700/80 p-3 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 relative group backdrop-blur-sm border border-slate-600/70 text-sm">
      <button
        onClick={() => onRemove(member.id)}
        className="absolute top-1.5 right-1.5 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:outline-none focus:ring-1 focus:ring-red-400 z-10 leading-none"
        aria-label={`Remove ${member.nickname || member.species}`}
      >
        &times;
      </button>

      <div className="flex items-start space-x-3">
        {spriteUrl ? (
          <img 
            src={spriteUrl} 
            alt={member.nickname || member.species} 
            className="w-16 h-16 pixelated-sprite bg-slate-600/50 rounded-md mt-1" 
            onError={(e) => (e.currentTarget.style.display = 'none')} // Hide if sprite fails to load
          />
        ) : (
          <div className="w-16 h-16 bg-slate-600/50 rounded-md flex items-center justify-center mt-1">
            <IconPokeball className="text-3xl text-slate-500" />
          </div>
        )}
        <div className="flex-1 space-y-1.5">
          <input
            type="text"
            value={member.nickname || ''}
            onChange={(e) => onUpdateNickname(member.id, e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Nickname"
            className="w-full bg-slate-800/70 text-slate-100 placeholder-slate-400 px-2 py-1 rounded-md text-base font-semibold border border-slate-600 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none"
          />
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Lvl:</span>
            <input
              type="number"
              value={member.level}
              onChange={handleLevelChange}
              onKeyDown={handleInputKeyDown}
              min="1"
              max="100"
              className="w-16 bg-slate-800/70 text-slate-100 px-2 py-0.5 rounded-md text-xs border border-slate-600 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none"
            />
             <button 
                onClick={() => onToggleShiny(member.id)}
                className={`px-2 py-0.5 text-xs rounded ${member.isShiny ? 'bg-yellow-400 text-black hover:bg-yellow-500' : 'bg-slate-600 text-slate-200 hover:bg-slate-500'} transition-colors`}
                title={member.isShiny ? "Make Non-Shiny" : "Make Shiny"}
            >
                {member.isShiny ? '🌟 Shiny' : 'Normal'}
            </button>
            <a
                href={smogonUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full transition-colors flex items-center justify-center"
                title={`View ${member.species} strategy on Smogon`}
                aria-label={`View ${member.species} strategy on Smogon`}
            >
                <SmogonIcon />
            </a>
          </div>
          <p className="text-xs text-sky-300">{member.species}</p>
        </div>
      </div>
      
      <div className="mt-2 space-y-1">
        <input
            type="text"
            value={member.heldItem || ''}
            onChange={(e) => onUpdateItem(member.id, e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Held Item"
            className="w-full bg-slate-800/70 text-slate-100 placeholder-slate-400 px-2 py-1 rounded-md text-xs border border-slate-600 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none"
        />
        <div className="grid grid-cols-2 gap-1.5">
            {(member.moves || ['', '', '', '']).slice(0,4).map((move, index) => (
                <input
                    key={index}
                    type="text"
                    value={move}
                    onChange={(e) => handleMoveChange(index, e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder={`Move ${index + 1}`}
                    className="w-full bg-slate-800/70 text-slate-100 placeholder-slate-400 px-2 py-1 rounded-md text-xs border border-slate-600 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none"
                />
            ))}
        </div>
      </div>
    </div>
  );
};


export const TeamManager: React.FC<TeamManagerProps> = ({ 
    team, 
    setTeam,
    onRemoveTeamMember, 
    IconPokeball,
    levelCap,
    nextBattleName,
    nextBattleLocation,
    nextBattlePokemonCount,
    onUpdateTeamMemberNickname,
    onUpdateTeamMemberLevel,
    onUpdateTeamMemberItem,
    onUpdateTeamMemberMove,
    onToggleTeamMemberShiny
}) => {
    const [isEditMode, setIsEditMode] = useState(false);
    const [teamAsText, setTeamAsText] = useState('');
    const [isLoadingImport, setIsLoadingImport] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);

    const teamWeaknesses = useMemo(() => {
        const weaknesses: Record<string, { count: number; effectiveness: number[] }> = {};
        const allTypes = POKEMON_TYPES;

        for (const attackingType of allTypes) {
            for (const member of team) {
                if (!member.types || member.types.length === 0) continue;

                const memberTypes = member.types.map(t => t.charAt(0).toUpperCase() + t.slice(1));
                
                let totalMultiplier = 1;
                for (const defendingType of memberTypes) {
                    const effectiveness = TYPE_EFFECTIVENESS_CHART[attackingType]?.[defendingType];
                    if (effectiveness !== undefined) {
                        totalMultiplier *= effectiveness;
                    }
                }

                if (totalMultiplier >= 2) {
                    if (!weaknesses[attackingType]) {
                        weaknesses[attackingType] = { count: 0, effectiveness: [] };
                    }
                    weaknesses[attackingType].count++;
                    weaknesses[attackingType].effectiveness.push(totalMultiplier);
                }
            }
        }
        return weaknesses;
    }, [team]);
    
    const formatTeamToText = (teamToFormat: TeamMember[]): string => {
        return teamToFormat.map(member => {
            const nameLine = member.nickname && member.nickname.toLowerCase() !== member.species.toLowerCase()
                ? `${member.nickname} (${member.species})`
                : member.species;
            const itemLine = member.heldItem ? ` @ ${member.heldItem}` : '';
            const levelLine = `Level: ${member.level}`;
            const shinyLine = member.isShiny ? 'Shiny: Yes' : '';
            const moves = (member.moves || ['', '', '', ''])
                .filter(move => move && move.trim() !== "")
                .map(move => `- ${move}`)
                .join('\n');

            return [
                nameLine + itemLine,
                levelLine,
                shinyLine,
                moves
            ].filter(Boolean).join('\n');
        }).join('\n\n');
    };

    const handleUpdateTeamFromText = async () => {
        setIsLoadingImport(true);
        setImportError(null);

        const pokemonBlocks = teamAsText.trim().split(/\n\s*\n/);
        if (pokemonBlocks.length > 6) {
            setImportError("You can only import a maximum of 6 Pokémon.");
            setIsLoadingImport(false);
            return;
        }

        try {
            const newTeamPromises = pokemonBlocks.map(async (block) => {
                if (!block.trim()) return null;

                const lines = block.split('\n');
                const firstLine = lines.shift() || '';
                
                let species = '';
                let nickname = '';
                let heldItem = '';

                const itemMatch = firstLine.match(/@\s*(.+)/);
                if (itemMatch) {
                    heldItem = itemMatch[1].trim();
                }
                const namePart = itemMatch ? firstLine.substring(0, itemMatch.index).trim() : firstLine.trim();

                const nicknameMatch = namePart.match(/(.+)\s+\((.+)\)/);
                if (nicknameMatch) {
                    nickname = nicknameMatch[1].trim();
                    species = nicknameMatch[2].trim();
                } else {
                    species = namePart;
                    nickname = species;
                }

                let level = 50; // Default level
                let isShiny = false;
                const moves: string[] = [];

                for (const line of lines) {
                    if (line.toLowerCase().startsWith('level:')) {
                        const parsedLevel = parseInt(line.substring(6).trim());
                        if (!isNaN(parsedLevel)) level = parsedLevel;
                    } else if (line.toLowerCase().startsWith('shiny: yes')) {
                        isShiny = true;
                    } else if (line.startsWith('- ')) {
                        moves.push(line.substring(2).trim());
                    }
                }
                
                const details = await fetchPokemonDetails(species);
                
                const newMember: TeamMember = {
                    id: `${Date.now()}-${details.id}-${Math.random()}`,
                    species: details.name,
                    nickname,
                    level: Math.max(1, Math.min(100, level)),
                    pokemonId: details.id,
                    heldItem,
                    moves: [...moves, '', '', '', ''].slice(0, 4),
                    isShiny,
                    types: details.types,
                };
                return newMember;
            });

            const newTeam = (await Promise.all(newTeamPromises)).filter((m): m is TeamMember => m !== null);
            
            if (newTeam.length > 6) {
                throw new Error("Import resulted in more than 6 Pokémon. Please check your text format.");
            }

            setTeam(newTeam);
            setIsEditMode(false);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during import.";
            setImportError(`Import failed: ${errorMessage}. Please check Pokémon names and format.`);
        } finally {
            setIsLoadingImport(false);
        }
    };

    const handleToggleEditMode = () => {
        if (isEditMode) {
            setIsEditMode(false);
            setImportError(null);
        } else {
            setTeamAsText(formatTeamToText(team));
            setIsEditMode(true);
        }
    };

  return (
    <div className="space-y-6">
      { (levelCap || nextBattleName) && !isEditMode && (
        <div className="bg-slate-700/60 p-3 rounded-lg border border-slate-600/70">
            <h3 className="text-sm font-semibold text-sky-300 mb-1">Next Challenge Info:</h3>
            {nextBattleName && nextBattleLocation && (
                 <p className="text-xs text-slate-200">
                    <span className="font-medium">{nextBattleName}</span> at {nextBattleLocation}
                 </p>
            )}
            {nextBattlePokemonCount && (
                <p className="text-xs text-slate-300">Opponent Pokémon: {nextBattlePokemonCount}</p>
            )}
            {levelCap && (
                <p className="text-xs text-slate-300">Recommended Level Cap: <span className="font-semibold text-yellow-300">{levelCap}</span></p>
            )}
            {!levelCap && !nextBattleName && <p className="text-xs text-slate-400 italic">No specific challenge data found next.</p>}
        </div>
      )}

        <div className="flex justify-end -mb-2">
            <button
                onClick={handleToggleEditMode}
                className="px-4 py-2 text-sm font-semibold rounded-md bg-slate-600 hover:bg-slate-500 text-white transition-colors"
            >
                {isEditMode ? 'View as Cards' : 'Edit as Text'}
            </button>
        </div>

      {isEditMode ? (
        <div className="animate-fadeIn space-y-4">
            <div>
                <label htmlFor="team-text-editor" className="block text-sm font-medium text-slate-300 mb-1">
                    Export your team or paste a new one (Showdown format supported)
                </label>
                <textarea
                    id="team-text-editor"
                    value={teamAsText}
                    onChange={(e) => setTeamAsText(e.target.value)}
                    className="w-full p-3 bg-slate-800/60 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-colors font-mono text-sm"
                    rows={18}
                    placeholder={`Iron Valiant @ Booster Energy\nLevel: 75\n- Moonblast\n- Close Combat\n\n...`}
                    spellCheck="false"
                />
            </div>
            {importError && (
                <div className="bg-red-800/40 border border-red-600 text-red-200 p-3 rounded-lg text-sm">
                    <p className="font-semibold">Import Error:</p>
                    <p>{importError}</p>
                </div>
            )}
            <button
                onClick={handleUpdateTeamFromText}
                disabled={isLoadingImport}
                className="w-full px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md shadow-md transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {isLoadingImport ? (
                    <>
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                        <span>Importing...</span>
                    </>
                ) : (
                    'Update Team from Text'
                )}
            </button>
        </div>
      ) : (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {team.length > 0 ? (
                team.map(member => (
                    <PokemonTeamCard 
                    key={member.id} 
                    member={member} 
                    onRemove={onRemoveTeamMember} 
                    IconPokeball={IconPokeball}
                    onUpdateNickname={onUpdateTeamMemberNickname}
                    onUpdateLevel={onUpdateTeamMemberLevel}
                    onUpdateItem={onUpdateTeamMemberItem}
                    onUpdateMove={onUpdateTeamMemberMove}
                    onToggleShiny={onToggleTeamMemberShiny}
                    />
                ))
                ) : (
                <div className="lg:col-span-2">
                    <p className="text-slate-400 italic text-center py-4">Your team is empty. Add Pokémon or use "Edit as Text" to import a team.</p>
                </div>
                )}
            </div>

            {team.length > 0 && (
                    <div className="mt-6">
                        <h3 className="text-xl font-bold text-emerald-400 mb-3">Team Weaknesses</h3>
                        <div className="bg-slate-700/60 p-4 rounded-lg border border-slate-600/70">
                            {Object.keys(teamWeaknesses).length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-3">
                                    {Object.entries(teamWeaknesses).sort((a,b) => b[1].count - a[1].count).map(([type, data]) => {
                                        const isMajorWeakness = data.effectiveness.some(e => e >= 4);
                                        return (
                                            <div key={type} className="flex items-center gap-2 bg-slate-800/50 p-2 rounded-md">
                                                <TypeBadge type={type} />
                                                <span className={`text-sm font-semibold ${isMajorWeakness ? 'text-red-400' : 'text-slate-200'}`}>
                                                    {data.count}x
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-slate-400 italic">This team has no shared weaknesses!</p>
                            )}
                        </div>
                    </div>
                )}
            </>
        )}
    </div>
  );
};
