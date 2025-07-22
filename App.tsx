

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameLocationNode, AddTeamMemberData, PokemonMoveInfo, StarterPokemonData } from './types';
import { SCARLET_VIOLET_PROGRESSION, SCARLET_VIOLET_STARTERS } from './constants';
import { GameProgressionTree } from './components/GameProgressionTree';
import { LocationDetailsDisplay } from './components/LocationDetailsDisplay';
import { TeamManager } from './components/TeamManager';
import { DetailDisplayController } from './components/DetailDisplayController';
import { NavigatorDisplay } from './components/NavigatorDisplay';
import { StarterSelectionDisplay } from './components/StarterSelectionDisplay';
import { TeamProspector } from './components/TeamProspector';
import { StoryHelper } from './components/StoryHelper';
import { LikedPokemonDisplay } from './components/LikedPokemonDisplay';
import { HuntingListDisplay } from './components/HuntingListDisplay';


import { useTeamManager } from './hooks/useTeamManager';
import { ActiveMainPanelType, useNavigator } from './hooks/useNavigator';
import { useGameProgression } from './hooks/useGameProgression';
import { useDetailBar } from './hooks/useDetailBar';
import { useStoryHelper } from './hooks/useStoryHelper';
import { useBattleTracker } from './hooks/useBattleTracker';
import { usePokemonCollections } from './hooks/usePokemonCollections';


// Placeholder icons - can be moved if they grow
const IconPokeball = () => <span className="text-red-500">◉</span>;
const IconTrainer = () => <span className="text-blue-400">👤</span>;
const IconItem = () => <span className="text-yellow-400">🛍️</span>;
const IconBattle = () => <span className="text-purple-400">⚔️</span>;

const App: React.FC = () => {
  const [apiKeyMissing, setApiKeyMissing] = useState<boolean>(() => {
    const keyMissing = !process.env.API_KEY; 
    if (keyMissing) {
        console.warn("API_KEY (derived from VITE_GEMINI_API_KEY) is missing or empty. Application functionality requiring Gemini API will be limited or unavailable.");
    }
    return keyMissing;
  });

  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState<boolean>(true); 
  const [isMobileView, setIsMobileView] = useState<boolean>(false);
  
  // State for Team Builder tabs
  const [teamBuilderTopTab, setTeamBuilderTopTab] = useState<'management' | 'story'>('management');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)'); // Tailwind's 'md' breakpoint
    
    const handleMediaQueryChange = () => {
      const isNowMobile = !mediaQuery.matches;
      setIsMobileView(isNowMobile); 
      if (!isNowMobile) { // If now desktop
        setIsLeftSidebarCollapsed(false); // Default to expanded on desktop
      } else { // If now mobile
         // Only collapse on mobile if it wasn't explicitly opened
        if (activeMainPanelRef.current !== 'starterSelection') {
             setIsLeftSidebarCollapsed(true);
        }
      }
    };

    handleMediaQueryChange(); 
    mediaQuery.addEventListener('change', handleMediaQueryChange);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaQueryChange);
    };
  }, []);


  const {
    team,
    setTeam, 
    caughtPokemon,
    handleToggleCaughtStatus,
    addTeamMember,
    removeTeamMember,
    handleUpdateTeamMemberNickname,
    handleUpdateTeamMemberLevel,
    handleUpdateTeamMemberItem,
    handleUpdateTeamMemberMove,
    handleToggleTeamMemberShiny,
  } = useTeamManager();

  const {
    likedPokemonMap,
    huntingList,
    toggleLikedPokemon,
    addToHuntingList,
    removeFromHuntingList
  } = usePokemonCollections();
  
  const {
    completedBattles,
    toggleBattleCompletion,
  } = useBattleTracker();

  const {
    activeMainPanel,
    setActiveMainPanel, 
    navigatorUserPrompt,
    navigatorGeminiResponse,
    isLoadingNavigatorQuery,
    navigatorError,
    switchToNavigatorPanel,
    handleNavigatorSubmit,
    handleNavigatorReset,
  } = useNavigator(apiKeyMissing);
  
  // Ref to keep track of activeMainPanel for media query logic
  const activeMainPanelRef = React.useRef(activeMainPanel);
  useEffect(() => {
    activeMainPanelRef.current = activeMainPanel;
  }, [activeMainPanel]);


  const gameProgressionHook = useGameProgression(apiKeyMissing, activeMainPanel, setActiveMainPanel, completedBattles);

  const {
    selectedLocation,
    setSelectedLocation, // Exposed from useGameProgression
    locationDetails,
    isLoadingLocation,
    locationError,
    levelCap,
    nextBattleName,
    nextBattleLocation,
    nextBattlePokemonCount,
    currentLocationId, 
    setCurrentLocation, 
  } = gameProgressionHook;

  const storyHelperHook = useStoryHelper(
    apiKeyMissing,
    team,
    selectedLocation,
    { name: nextBattleName, location: nextBattleLocation, level: levelCap }
  );

  const {
    activeBottomBarView,
    selectedPokemonDetailData,
    selectedAbilityDetailData,
    selectedMoveDetailData,
    pokemonContextForDetailView,
    isLoadingDetail,
    detailError,
    selectedMoveForAssignment,
    setSelectedMoveForAssignment, 
    handleOpenPokemonDetail,
    handleAbilityNameClick,
    handleMoveNameClick,
    handleBackToPokemonDetail,
    handleCloseBottomBar,
    handleStageMove,
  } = useDetailBar(apiKeyMissing);

  const handleLocationSelectionAndCollapse = useCallback((location: GameLocationNode) => {
    gameProgressionHook.handleSelectLocation(location);
    if (isMobileView && activeMainPanel !== 'starterSelection') {
      setIsLeftSidebarCollapsed(true);
    }
  }, [gameProgressionHook, isMobileView, activeMainPanel]);

  const handleSwitchToNavigatorAndCollapse = useCallback(() => {
    switchToNavigatorPanel();
     if (isMobileView && activeMainPanel !== 'starterSelection') {
      setIsLeftSidebarCollapsed(true);
    }
  }, [switchToNavigatorPanel, isMobileView, activeMainPanel]);
  
  const handleSwitchToTeamBuilderAndCollapse = useCallback(() => {
    setActiveMainPanel('teamBuilder');
    if (isMobileView && activeMainPanel !== 'starterSelection') {
      setIsLeftSidebarCollapsed(true);
    }
  }, [setActiveMainPanel, isMobileView, activeMainPanel]);

  const handleOpenStarterSelection = useCallback(() => {
    setActiveMainPanel('starterSelection');
    if (isMobileView) {
        setIsLeftSidebarCollapsed(true); // Collapse sidebar on mobile when opening starter selection
    }
    // Ensure "Cabo Poco" is selected if not already, to provide context.
    const startingLocation = SCARLET_VIOLET_PROGRESSION.find(loc => loc.id === "prologue-cabo-poco");
    if (startingLocation && selectedLocation?.id !== "prologue-cabo-poco") {
        setSelectedLocation(startingLocation); // Prime selectedLocation if opening starter selection directly
    }

  }, [setActiveMainPanel, isMobileView, selectedLocation, setSelectedLocation]);

  const handleStarterSelected = useCallback((starter: StarterPokemonData) => {
    addTeamMember({
        species: starter.name,
        level: 5, // Standard starter level
        pokemonId: starter.pokeApiId,
        initialMove: starter.initialMoves[0]?.name // Add first initial move
    });
    handleToggleCaughtStatus(starter.pokeApiId); // Mark as caught

    setActiveMainPanel('location'); // Go back to location view
    
    // Navigate to the next logical location after starter selection
    const nextLocation = SCARLET_VIOLET_PROGRESSION.find(loc => loc.id === 'prologue-inlet-grotto');
    if (nextLocation) {
        setCurrentLocation(nextLocation.id); // This will also select the location and fetch its details
    } else if (SCARLET_VIOLET_PROGRESSION.length > 0) { // Fallback to first location if not found
        setCurrentLocation(SCARLET_VIOLET_PROGRESSION[0].id);
    }
     if (isMobileView) {
      setIsLeftSidebarCollapsed(true);
    }
  }, [addTeamMember, handleToggleCaughtStatus, setActiveMainPanel, setCurrentLocation, isMobileView]);


  useEffect(() => {
    if (selectedMoveForAssignment) {
      const targetPokemonId = selectedMoveForAssignment.pokemonId;
      const moveNameToAssign = selectedMoveForAssignment.moveName;
      const teamMemberIndex = team.findIndex(member => member.pokemonId === targetPokemonId);
      if (teamMemberIndex !== -1) {
        setTeam(prevTeam => {
          const updatedTeam = [...prevTeam];
          const memberToUpdate = { ...updatedTeam[teamMemberIndex] };
          let currentMoves = [...(memberToUpdate.moves || ['', '', '', ''])];
          if (currentMoves.includes(moveNameToAssign)) {
            setSelectedMoveForAssignment(null);
            return prevTeam;
          }
          let assigned = false;
          for (let i = 0; i < 4; i++) {
            if (!currentMoves[i] || currentMoves[i] === "") {
              currentMoves[i] = moveNameToAssign;
              assigned = true;
              break;
            }
          }
          if (!assigned) { currentMoves[0] = moveNameToAssign; } 
          memberToUpdate.moves = currentMoves;
          updatedTeam[teamMemberIndex] = memberToUpdate;
          return updatedTeam;
        });
        setSelectedMoveForAssignment(null); 
      }
    }
  }, [selectedMoveForAssignment, team, setTeam, setSelectedMoveForAssignment]);

  const handleAddPokemonToTeamFromDetailCallback = useCallback((speciesName: string, pokemonId: number) => {
    if (team.some(member => member.pokemonId === pokemonId)) {
        alert(`${speciesName} is already in your team!`); return;
    }
    if (team.length >= 6) {
        alert("Your team is full (6 Pokémon maximum)!"); return;
    }
    let initialMoveName: string | undefined = undefined;
    if (selectedMoveForAssignment && selectedMoveForAssignment.pokemonId === pokemonId) {
        initialMoveName = selectedMoveForAssignment.moveName;
    }
    addTeamMember({ species: speciesName, level: 5, pokemonId: pokemonId, initialMove: initialMoveName });
    if (!caughtPokemon[pokemonId.toString()]) { handleToggleCaughtStatus(pokemonId); }
    if (initialMoveName) { setSelectedMoveForAssignment(null); } 
  }, [team, caughtPokemon, handleToggleCaughtStatus, addTeamMember, selectedMoveForAssignment, setSelectedMoveForAssignment]);


  const stagedMoveNameForCurrentPokemon =
    selectedPokemonDetailData && activeBottomBarView === 'pokemon' && selectedMoveForAssignment && selectedMoveForAssignment.pokemonId === selectedPokemonDetailData.id
    ? selectedMoveForAssignment.moveName
    : null;

  const currentLocIndex = selectedLocation ? SCARLET_VIOLET_PROGRESSION.findIndex(l => l.id === selectedLocation.id) : -1;
  const isFirstLocationSelected = currentLocIndex === 0;
  const isLastLocationSelected = currentLocIndex === SCARLET_VIOLET_PROGRESSION.length - 1;
  const noLocationSelected = currentLocIndex === -1;
  
  const prevLocationNode = currentLocIndex > 0 ? SCARLET_VIOLET_PROGRESSION[currentLocIndex - 1] : null;
  const nextLocationNode = currentLocIndex !== -1 && currentLocIndex < SCARLET_VIOLET_PROGRESSION.length - 1 ? SCARLET_VIOLET_PROGRESSION[currentLocIndex + 1] : null;


  const handlePreviousLocation = useCallback(() => {
    if (prevLocationNode) {
      gameProgressionHook.handleSelectLocation(prevLocationNode);
    }
  }, [prevLocationNode, gameProgressionHook]);

  const handleNextLocation = useCallback(() => {
    if (nextLocationNode) {
      gameProgressionHook.handleSelectLocation(nextLocationNode);
    } else if (!selectedLocation && SCARLET_VIOLET_PROGRESSION.length > 0) { 
        const locationToSelect = currentLocationId ? SCARLET_VIOLET_PROGRESSION.find(loc => loc.id === currentLocationId) : null;
        if (locationToSelect) {
             gameProgressionHook.handleSelectLocation(locationToSelect);
        } else {
             gameProgressionHook.handleSelectLocation(SCARLET_VIOLET_PROGRESSION[0]);
        }
    }
  }, [nextLocationNode, selectedLocation, gameProgressionHook, currentLocationId]);


  if (apiKeyMissing) {
     return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-slate-800 p-8 rounded-lg shadow-xl text-center max-w-lg w-full">
          <h1 className="text-3xl font-bold text-red-500 mb-4">Configuration Error</h1>
          <p className="text-slate-300 text-lg mb-3">
            Gemini API Key is missing. Please set the <code className="bg-slate-700 px-1 rounded text-base">VITE_GEMINI_API_KEY</code> environment variable.
          </p>
          <p className="text-slate-300 mt-4 text-left">
            This application requires a Gemini API key to function. To resolve this:
          </p>
          <ul className="list-disc list-inside text-left text-slate-300 text-sm mt-2 space-y-1.5 pl-4 bg-slate-700/30 p-4 rounded-md">
            <li>Create a file named <code className="bg-slate-900/50 px-1 rounded text-xs">.env</code> in the root of the project.</li>
            <li>Add your API key to the file like this: <code className="bg-slate-900/50 px-1 rounded text-xs">VITE_GEMINI_API_KEY=YOUR_API_KEY_HERE</code>.</li>
            <li>Restart the development server.</li>
          </ul>
        </div>
      </div>
    );
  }

  const renderMainPanel = () => {
    switch (activeMainPanel) {
      case 'location':
        return (
          isLoadingLocation ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-sky-400"></div>
              <p className="ml-4 text-lg text-slate-300">Loading Location Data...</p>
            </div>
          ) : locationError ? (
            <div className="bg-red-800/30 border border-red-700 text-red-300 p-6 rounded-lg shadow-xl text-center animate-fadeIn">
              <h1 className="text-2xl font-bold text-red-400 mb-3">Error Loading Location</h1>
              <p className="text-slate-200">{locationError}</p>
              <p className="text-slate-300 mt-2 text-sm">This could be due to an API issue or a misconfiguration. Please try selecting the location again or check your API key.</p>
            </div>
          ) : locationDetails && selectedLocation ? (
            <LocationDetailsDisplay
              details={locationDetails}
              IconPokeball={IconPokeball}
              IconTrainer={IconTrainer}
              IconItem={IconItem}
              onPokemonNameClick={handleOpenPokemonDetail}
              currentLocationId={currentLocationId}
              onSetCurrentLocation={setCurrentLocation}
              selectedLocationNodeId={selectedLocation.id}
              onTriggerStarterSelection={handleOpenStarterSelection}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-lg text-slate-400">Please select a location from the list.</p>
            </div>
          )
        );
      case 'navigator':
        return (
          <NavigatorDisplay
            initialPromptValue={navigatorUserPrompt}
            onPromptSubmit={handleNavigatorSubmit}
            isLoading={isLoadingNavigatorQuery}
            apiResponse={navigatorGeminiResponse}
            apiError={navigatorError}
            onReset={handleNavigatorReset}
            apiKeyMissing={apiKeyMissing}
            onPokemonNameClick={handleOpenPokemonDetail}
            onLocationNameClick={handleLocationSelectionAndCollapse}
            gameLocations={SCARLET_VIOLET_PROGRESSION}
          />
        );
      case 'starterSelection':
        return (
          <StarterSelectionDisplay
            starters={SCARLET_VIOLET_STARTERS}
            onSelectStarter={handleStarterSelected}
          />
        );
      case 'teamBuilder':
        return (
          <div className="animate-fadeIn">
              <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">
                  Team Builder
              </h1>
                {/* Top Level Tabs */}
                <div className="flex space-x-1 border-b-2 border-slate-700 mt-4 mb-6">
                    <button
                        onClick={() => setTeamBuilderTopTab('management')}
                        className={`px-4 py-2 text-sm font-semibold rounded-t-md transition-colors ${
                            teamBuilderTopTab === 'management' ? 'bg-slate-700/80 text-sky-300 border-b-2 border-sky-400' : 'text-slate-400 hover:bg-slate-800/50'
                        }`}
                    >
                        Team Management
                    </button>
                    <button
                        onClick={() => setTeamBuilderTopTab('story')}
                        className={`px-4 py-2 text-sm font-semibold rounded-t-md transition-colors ${
                            teamBuilderTopTab === 'story' ? 'bg-slate-700/80 text-sky-300 border-b-2 border-sky-400' : 'text-slate-400 hover:bg-slate-800/50'
                        }`}
                    >
                        Story Helper
                    </button>
                </div>

                {/* Content for Top Level Tabs */}
                {teamBuilderTopTab === 'management' && (
                    <div className="animate-fadeIn space-y-8">
                        <section>
                            <h2 className="text-2xl font-bold text-emerald-400 mb-4">My Team</h2>
                            <TeamManager
                                team={team}
                                onRemoveTeamMember={removeTeamMember}
                                IconPokeball={IconPokeball}
                                levelCap={levelCap}
                                nextBattleName={nextBattleName}
                                nextBattleLocation={nextBattleLocation}
                                nextBattlePokemonCount={nextBattlePokemonCount}
                                onUpdateTeamMemberNickname={handleUpdateTeamMemberNickname}
                                onUpdateTeamMemberLevel={handleUpdateTeamMemberLevel}
                                onUpdateTeamMemberItem={handleUpdateTeamMemberItem}
                                onUpdateTeamMemberMove={handleUpdateTeamMemberMove}
                                onToggleTeamMemberShiny={handleToggleTeamMemberShiny}
                            />
                        </section>
                        
                        <div className="border-t-2 border-slate-700/50"></div>
                        
                        <section>
                            <h2 className="text-xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 mb-2">Liked Pokémon</h2>
                             <LikedPokemonDisplay 
                                likedPokemonIds={Object.keys(likedPokemonMap).filter(id => likedPokemonMap[id]).map(Number)}
                                onPokemonClick={handleOpenPokemonDetail}
                             />
                        </section>

                        <div className="border-t-2 border-slate-700/50"></div>
                        
                        <section>
                            <h2 className="text-xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-400 mb-2">Hunting List</h2>
                            <HuntingListDisplay
                                huntingList={huntingList}
                                onPokemonClick={handleOpenPokemonDetail}
                                onRemoveFromHunt={removeFromHuntingList}
                            />
                        </section>

                        <div className="border-t-2 border-slate-700/50"></div>

                        <section>
                            <h2 className="text-xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400 mb-2">Team Prospector</h2>
                            <TeamProspector 
                                onAbilityClick={handleAbilityNameClick}
                                likedPokemonMap={likedPokemonMap}
                                onToggleLiked={toggleLikedPokemon}
                                onPokemonClick={handleOpenPokemonDetail}
                            />
                        </section>
                    </div>
                )}

                {teamBuilderTopTab === 'story' && (
                    <div className="animate-fadeIn">
                        <StoryHelper
                          checkpoints={SCARLET_VIOLET_PROGRESSION}
                          currentLocationId={currentLocationId}
                          nextBattleName={nextBattleName}
                          nextBattleLocation={nextBattleLocation}
                          levelCap={levelCap}
                          team={team}
                          apiKeyMissing={apiKeyMissing}
                          gameLocations={SCARLET_VIOLET_PROGRESSION}
                          completedBattles={completedBattles}
                          toggleBattleCompletion={toggleBattleCompletion}
                          customGoals={storyHelperHook.customGoals}
                          addCustomGoal={storyHelperHook.addCustomGoal}
                          toggleCustomGoal={storyHelperHook.toggleCustomGoal}
                          deleteCustomGoal={storyHelperHook.deleteCustomGoal}
                          addCustomGoalWithAi={storyHelperHook.addCustomGoalWithAi}
                          isAiGoalLoading={storyHelperHook.isAiGoalLoading}
                          aiGoalError={storyHelperHook.aiGoalError}
                          chatHistory={storyHelperHook.chatHistory}
                          sendChatMessage={storyHelperHook.sendChatMessage}
                          isChatLoading={storyHelperHook.isChatLoading}
                          chatError={storyHelperHook.chatError}
                          onPokemonNameClick={handleOpenPokemonDetail}
                          onLocationNameClick={handleLocationSelectionAndCollapse}
                        />
                    </div>
                )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden">
       <aside className={`bg-slate-800/80 backdrop-blur-sm flex flex-col transition-all duration-300 ease-in-out ${isLeftSidebarCollapsed ? 'w-0 md:w-16' : 'w-64'} z-30 shadow-2xl`}>
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <h1 className={`font-bold text-lg text-sky-400 transition-opacity ${isLeftSidebarCollapsed ? 'opacity-0' : 'opacity-100'}`}>Nuzlocke</h1>
                <button onClick={() => setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed)} className="p-1 rounded-md hover:bg-slate-700">
                     {isLeftSidebarCollapsed ? '»' : '«'}
                </button>
            </div>
            <div className={`p-4 space-y-3 flex-grow overflow-y-auto ${isLeftSidebarCollapsed ? 'hidden' : 'block'}`}>
              <button
                onClick={handleSwitchToNavigatorAndCollapse}
                className="w-full text-left px-4 py-2 rounded-lg transition-colors bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 font-semibold"
              >
                Nuzlocke Navigator
              </button>
              <button
                onClick={handleSwitchToTeamBuilderAndCollapse}
                className="w-full text-left px-4 py-2 rounded-lg transition-colors bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 font-semibold"
              >
                Team Builder
              </button>
               <div className="border-t border-slate-700 my-4"></div>
                <GameProgressionTree
                    locations={SCARLET_VIOLET_PROGRESSION}
                    selectedLocationId={selectedLocation?.id ?? null}
                    onSelectLocation={handleLocationSelectionAndCollapse}
                    currentLocationId={currentLocationId}
                    onSetCurrentLocation={setCurrentLocation}
                />
            </div>
       </aside>
      
      <main className="flex-1 flex flex-col bg-slate-900/80">
        <div className="flex-grow p-4 md:p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
                 <div className="flex items-center gap-2">
                    <button onClick={handlePreviousLocation} disabled={isFirstLocationSelected || noLocationSelected} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors">&larr; Prev</button>
                    <button onClick={handleNextLocation} disabled={isLastLocationSelected} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Next &rarr;</button>
                 </div>
            </div>
            {renderMainPanel()}
        </div>
      </main>

      {activeBottomBarView && (
        <DetailDisplayController
          activeView={activeBottomBarView}
          pokemonData={selectedPokemonDetailData}
          abilityData={selectedAbilityDetailData}
          moveData={selectedMoveDetailData}
          isLoading={isLoadingDetail}
          error={detailError}
          onClose={handleCloseBottomBar}
          onBackToPokemon={handleBackToPokemonDetail}
          pokemonContextForDetailViewName={pokemonContextForDetailView?.name}

          isCaught={selectedPokemonDetailData ? !!caughtPokemon[selectedPokemonDetailData.id.toString()] : false}
          onToggleCaught={handleToggleCaughtStatus}
          onAddToTeam={handleAddPokemonToTeamFromDetailCallback}
          onAddToHuntingList={addToHuntingList}
          onStageMove={handleStageMove}
          stagedMoveNameForThisPokemon={stagedMoveNameForCurrentPokemon}

          onPokemonNameClickForEvolution={handleOpenPokemonDetail}
          onAbilityNameClick={handleAbilityNameClick}
          onMoveNameClick={handleMoveNameClick}
        />
      )}
    </div>
  );
};

export default App;