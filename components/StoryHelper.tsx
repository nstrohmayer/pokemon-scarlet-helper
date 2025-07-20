

import React, { useState, useEffect, useRef } from 'react';
import { StoryHelperProps, ChatMessage, GameLocationNode, BattleStrategyDetails } from '../types';
import { FormattedResponse } from './FormattedResponse';
import { fetchBattleStrategyFromGemini } from '../services/geminiService';

const ChatBubble: React.FC<{ message: ChatMessage; gameLocations: StoryHelperProps['gameLocations']; onPokemonNameClick: StoryHelperProps['onPokemonNameClick']; onLocationNameClick: StoryHelperProps['onLocationNameClick']; }> = ({ message, ...formattedResponseProps }) => {
    const isUser = message.role === 'user';
    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-md lg:max-w-lg px-4 py-2 rounded-xl ${isUser ? 'bg-sky-600 text-white' : 'bg-slate-600/50 text-slate-200'}`}>
                {isUser ? (
                    <p>{message.text}</p>
                ) : (
                    <FormattedResponse responseText={message.text} {...formattedResponseProps} />
                )}
            </div>
        </div>
    );
};

export const StoryHelper: React.FC<Omit<StoryHelperProps, 'apiKeyMissing'>> = ({
  checkpoints,
  gameLocations,
  customGoals,
  addCustomGoal,
  toggleCustomGoal,
  deleteCustomGoal,
  addCustomGoalWithAi,
  isAiGoalLoading,
  aiGoalError,
  chatHistory,
  sendChatMessage,
  isChatLoading,
  chatError,
  onPokemonNameClick,
  onLocationNameClick,
  completedBattles,
  toggleBattleCompletion,
}) => {
    const [newGoalText, setNewGoalText] = useState('');
    const [chatInput, setChatInput] = useState('');
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // State for expandable battles
    const [expandedBattleId, setExpandedBattleId] = useState<string | null>(null);
    const [battleStrategies, setBattleStrategies] = useState<Record<string, BattleStrategyDetails>>({});
    const [isLoadingStrategy, setIsLoadingStrategy] = useState<boolean>(false);
    const [strategyError, setStrategyError] = useState<string | null>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory, isChatLoading]);

    const handleAddGoalSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addCustomGoal(newGoalText);
        setNewGoalText('');
    };
    
    const handleAddGoalWithAi = () => {
        addCustomGoalWithAi(newGoalText);
        setNewGoalText('');
    };

    const handleChatSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (chatInput.trim()) {
            sendChatMessage(chatInput.trim());
            setChatInput('');
        }
    };
    
    const handleToggleBattleExpand = async (battleNode: GameLocationNode) => {
        const battleId = battleNode.id;
        if (expandedBattleId === battleId) {
            setExpandedBattleId(null);
        } else {
            setStrategyError(null);
            setExpandedBattleId(battleId);
            if (!battleStrategies[battleId]) {
                setIsLoadingStrategy(true);
                try {
                    const details = await fetchBattleStrategyFromGemini(battleNode);
                    setBattleStrategies(prev => ({...prev, [battleId]: details}));
                } catch(err) {
                    const errorMsg = err instanceof Error ? err.message : 'Failed to load strategy.';
                    setStrategyError(errorMsg);
                    console.error(errorMsg);
                } finally {
                    setIsLoadingStrategy(false);
                }
            }
        }
    };


    const significantBattles = checkpoints.filter(c => c.significantBattleLevel);
    const nextBattleIndex = significantBattles.findIndex(b => !completedBattles.has(b.id));

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

    return (
        <div className="space-y-8">
            {/* Major Battles Checklist */}
            <section>
                <h2 className="text-2xl font-bold text-sky-300 mb-4">Major Battles</h2>
                <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700 max-h-[40rem] overflow-y-auto">
                    {significantBattles.length > 0 ? (
                        <ul className="space-y-2">
                            {significantBattles.map((battle, index) => {
                                const isCompleted = completedBattles.has(battle.id);
                                const isNextUp = index === nextBattleIndex;
                                const isExpanded = expandedBattleId === battle.id;
                                const strategy = battleStrategies[battle.id];

                                return (
                                    <li key={battle.id} className={`bg-slate-700/50 rounded-lg transition-all duration-300 ${isNextUp ? 'ring-2 ring-sky-500' : ''} ${isExpanded ? 'bg-slate-700' : ''}`}>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                id={`battle-${battle.id}`}
                                                checked={isCompleted}
                                                onChange={() => toggleBattleCompletion(battle.id)}
                                                className="w-5 h-5 bg-slate-600 border-slate-500 rounded text-sky-500 focus:ring-sky-500 cursor-pointer flex-shrink-0 ml-3"
                                            />
                                            <button 
                                                onClick={() => handleToggleBattleExpand(battle)}
                                                className="flex-grow flex items-center justify-between text-left p-3"
                                                aria-expanded={isExpanded}
                                                aria-controls={`battle-details-${battle.id}`}
                                            >
                                                <label htmlFor={`battle-${battle.id}`} className={`flex-grow cursor-pointer ${isCompleted ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                                                    <span className="font-semibold">{battle.significantBattleName}</span>
                                                    <span className="text-sm text-slate-400"> - {battle.name} (Lvl Cap: {battle.significantBattleLevel})</span>
                                                </label>
                                                <div className="flex items-center">
                                                    {isNextUp && <span className="text-xs font-bold text-yellow-300 bg-yellow-400/20 px-2 py-1 rounded-full mr-3 hidden sm:block">Next Up</span>}
                                                    <span className={`transform transition-transform duration-200 text-sky-400 text-xl ${isExpanded ? 'rotate-90' : ''}`} aria-hidden="true">&#x25B6;</span>
                                                </div>
                                            </button>
                                        </div>
                                        {isExpanded && (
                                            <div id={`battle-details-${battle.id}`} className="px-4 pt-3 pb-4 border-t border-slate-600/50 animate-fadeIn space-y-4">
                                                {isLoadingStrategy && (
                                                    <div className="flex items-center justify-center gap-2 text-slate-300">
                                                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-sky-400"></div>
                                                        <span>Loading Strategy...</span>
                                                    </div>
                                                )}
                                                {strategyError && !isLoadingStrategy && <p className="text-red-400 text-sm text-center">{strategyError}</p>}
                                                {!isLoadingStrategy && strategy && (
                                                    <div className="space-y-4 text-sm">
                                                        {strategy.puzzleInformation && (
                                                            <div>
                                                                <h4 className="font-bold text-sky-300 mb-1">Challenge</h4>
                                                                <p className="text-slate-300 leading-relaxed text-xs">{strategy.puzzleInformation}</p>
                                                            </div>
                                                        )}
                                                        {strategy.keyOpponentPokemon && strategy.keyOpponentPokemon.length > 0 && (
                                                            <div>
                                                                <h4 className="font-bold text-sky-300 mb-2">Key Pokémon</h4>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                    {strategy.keyOpponentPokemon.map(pkmn => (
                                                                        <div key={pkmn.name} className="bg-slate-800/60 p-2 rounded-md">
                                                                            <p className="font-semibold text-slate-100">{pkmn.name}</p>
                                                                            <p className="text-xs text-slate-400">{pkmn.typeInfo}</p>
                                                                            <p className="text-xs text-slate-300 italic mt-1">{pkmn.notes}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                         {strategy.recommendedPokemonTypes && strategy.recommendedPokemonTypes.length > 0 && (
                                                            <div>
                                                                <h4 className="font-bold text-sky-300 mb-2">Recommended Types</h4>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {strategy.recommendedPokemonTypes.map(type => <TypeBadge key={type} type={type} />)}
                                                                </div>
                                                            </div>
                                                        )}
                                                         {strategy.nuzlockeTips && (
                                                            <div>
                                                                <h4 className="font-bold text-sky-300 mb-1">Nuzlocke Tips</h4>
                                                                <div className="text-slate-300 text-xs leading-relaxed">
                                                                    <FormattedResponse
                                                                        responseText={strategy.nuzlockeTips}
                                                                        gameLocations={gameLocations}
                                                                        onPokemonNameClick={onPokemonNameClick}
                                                                        onLocationNameClick={onLocationNameClick}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="text-slate-400 italic text-center">No significant battles defined in the game progression.</p>
                    )}
                </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Custom Goals */}
                <div className="space-y-8">
                    <section>
                        <h2 className="text-2xl font-bold text-sky-300 mb-4">Custom Goals</h2>
                        <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700">
                            <form onSubmit={handleAddGoalSubmit} className="flex flex-col gap-2 mb-4">
                                <input
                                    type="text"
                                    value={newGoalText}
                                    onChange={(e) => setNewGoalText(e.target.value)}
                                    placeholder="e.g., Beat the first gym"
                                    className="flex-grow bg-slate-700/50 border border-slate-600 rounded-md px-3 py-2 text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 outline-none transition-colors"
                                />
                                <div className="flex gap-2">
                                    <button type="submit" className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md shadow-sm transition-colors disabled:opacity-50" disabled={!newGoalText.trim()}>
                                        Add
                                    </button>
                                     <button type="button" onClick={handleAddGoalWithAi} className="flex-1 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-md shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2" disabled={!newGoalText.trim()}>
                                        Add Goal
                                    </button>
                                </div>
                                 {aiGoalError && <p className="text-red-400 text-xs mt-1">{aiGoalError}</p>}
                            </form>
                            <ul className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                {customGoals.length > 0 ? customGoals.map(goal => (
                                    <li key={goal.id} className="bg-slate-700/40 p-2 rounded-md group">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id={`goal-${goal.id}`}
                                                checked={goal.isCompleted}
                                                onChange={() => toggleCustomGoal(goal.id)}
                                                className="w-5 h-5 bg-slate-600 border-slate-500 rounded text-sky-500 focus:ring-sky-500 cursor-pointer flex-shrink-0"
                                            />
                                            <label htmlFor={`goal-${goal.id}`} className={`flex-grow text-sm cursor-pointer ${goal.isCompleted ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                                                {goal.text}
                                            </label>
                                            <button onClick={() => deleteCustomGoal(goal.id)} className="text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-lg" aria-label={`Delete goal: ${goal.text}`}>
                                                &times;
                                            </button>
                                        </div>
                                        {goal.aiNotes && (
                                            <div className="mt-2 ml-7 pl-3 text-xs border-l-2 border-slate-600 text-slate-400 space-y-1">
                                                {(goal.aiLevel !== undefined && goal.aiLevel > 0) && (
                                                    <div><strong>Lvl Cap:</strong> <span className="text-yellow-300">{goal.aiLevel}</span></div>
                                                )}
                                                {(goal.aiPokemonCount !== undefined && goal.aiPokemonCount > 0) && (
                                                    <div><strong>Opponents:</strong> {goal.aiPokemonCount} Pokémon</div>
                                                )}
                                                <p className="italic text-slate-300">{goal.aiNotes}</p>
                                            </div>
                                        )}
                                    </li>
                                )) : <p className="text-slate-400 italic text-sm text-center">No custom goals yet.</p>}
                            </ul>
                        </div>
                    </section>
                </div>

                {/* Right Column: AI Chat Helper */}
                <section>
                    <h2 className="text-2xl font-bold text-sky-300 mb-4">Chat with Story Helper</h2>
                     <div className="bg-slate-800/70 p-4 rounded-xl border border-slate-700 h-full flex flex-col min-h-[400px]">
                        <>
                        <div ref={chatContainerRef} className="flex-grow space-y-4 overflow-y-auto pr-2 mb-4">
                            {chatHistory.length === 0 && !isChatLoading && (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-slate-400 text-center">Ask a question about what to do next!</p>
                                </div>
                            )}
                            {chatHistory.map((msg, index) => (
                                <ChatBubble 
                                    key={index}
                                    message={msg}
                                    gameLocations={gameLocations}
                                    onPokemonNameClick={onPokemonNameClick}
                                    onLocationNameClick={onLocationNameClick}
                                />
                            ))}
                            {isChatLoading && (
                                <div className="flex justify-start">
                                    <div className="max-w-md lg:max-w-lg px-4 py-2 rounded-xl bg-slate-600/50 text-slate-200">
                                        <div className="flex items-center gap-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-sky-400"></div>
                                            <span className="text-sm italic">AI is typing...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                             {chatError && <p className="text-red-400 text-sm">{chatError}</p>}
                        </div>
                        <form onSubmit={handleChatSubmit} className="flex gap-2 mt-auto">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                placeholder="Ask for advice..."
                                className="flex-grow bg-slate-700/50 border border-slate-600 rounded-md px-3 py-2 text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-purple-500 outline-none transition-colors"
                                disabled={isChatLoading}
                            />
                            <button
                                type="submit"
                                disabled={isChatLoading || !chatInput.trim()}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-md shadow-sm transition-colors disabled:opacity-50"
                            >
                                Send
                            </button>
                        </form>
                        </>
                    </div>
                </section>
            </div>
        </div>
    );
};