


import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameLocationNode, AddTeamMemberData, PokemonMoveInfo, StarterPokemonData, TeamMember } from './types';
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
import { PokemonDetailLookup } from './components/PokemonDetailLookup';
import { LockscreenManager } from './components/LockscreenManager';
import { LanguageSwitcher } from './components/LanguageSwitcher';


import { useTeamManager } from './hooks/useTeamManager';
import { ActiveMainPanelType, useNavigator } from './hooks/useNavigator';
import { useGameProgression } from './hooks/useGameProgression';
import { useDetailBar } from './hooks/useDetailBar';
import { useStoryHelper } from './hooks/useStoryHelper';
import { useBattleTracker } from './hooks/useBattleTracker';
import { usePokemonCollections } from './hooks/usePokemonCollections';
import { useI18n } from './hooks/useI18n';


// Placeholder icons - can be moved if they grow
const IconPokeball = () => <span className="text-red-500">◉</span>;
const IconTrainer = () => <span className="text-blue-400">👤</span>;
const IconItem = () => <span className="text-yellow-400">🛍️</span>;
const IconBattle = () => <span className="text-purple-400">⚔️</span>;

const App: React.FC = () => {
  const { t } = useI18n();
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState<boolean>(true); 
  const [isMobileView, setIsMobileView] = useState<boolean>(false);
  
  // State for Team Builder tabs
  const [teamBuilderActiveTab, setTeamBuilderActiveTab] = useState<'management' | 'story' | 'navigator' | 'details'>('management');

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

  const handleHuntSuccess = useCallback(() => {
    setActiveMainPanel('teamBuilder');
    setTeamBuilderActiveTab('management');
    if (isMobileView) {
      setIsLeftSidebarCollapsed(true);
    }
  }, [isMobileView]);

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
  } = useNavigator({ onHuntSuccess: handleHuntSuccess });
  
  // Ref to keep track of activeMainPanel for media query logic
  const activeMainPanelRef = React.useRef(activeMainPanel);
  useEffect(() => {
    activeMainPanelRef.current = activeMainPanel;
  }, [activeMainPanel]);


  const gameProgressionHook = useGameProgression(activeMainPanel, setActiveMainPanel, completedBattles);

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
  } = useDetailBar();

  // Global keydown listener for 'Escape' key
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // If the detail bar is open, close it. This is the primary "modal".
        if (activeBottomBarView) {
          handleCloseBottomBar();
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [activeBottomBarView, handleCloseBottomBar]);

  const handleLocationSelectionAndCollapse = useCallback((location: GameLocationNode) => {
    gameProgressionHook.handleSelectLocation(location);
    if (isMobileView && activeMainPanel !== 'starterSelection') {
      setIsLeftSidebarCollapsed(true);
    }
  }, [gameProgressionHook, isMobileView, activeMainPanel]);
  
  const handleSwitchToTeamBuilderAndCollapse = useCallback(() => {
    setActiveMainPanel('teamBuilder');
    setTeamBuilderActiveTab('management'); // Reset to management tab
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
        initialMove: starter.initialMoves[0]?.name, // Add first initial move
        types: starter.types
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

  const handleAddPokemonToTeamFromDetailCallback = useCallback((speciesName: string, pokemonId: number, types: string[]) => {
    let initialMoveName: string | undefined = undefined;
    if (selectedMoveForAssignment && selectedMoveForAssignment.pokemonId === pokemonId) {
        initialMoveName = selectedMoveForAssignment.moveName;
    }
    
    const success = addTeamMember({ species: speciesName, level: 5, pokemonId: pokemonId, initialMove: initialMoveName, types: types });

    if (success) {
        if (!caughtPokemon[pokemonId.toString()]) { handleToggleCaughtStatus(pokemonId); }
        if (initialMoveName) { setSelectedMoveForAssignment(null); } 
    }
  }, [addTeamMember, caughtPokemon, handleToggleCaughtStatus, selectedMoveForAssignment, setSelectedMoveForAssignment]);


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


  const renderMainPanel = () => {
    switch (activeMainPanel) {
      case 'location':
        return (
          isLoadingLocation ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-sky-400"></div>
              <p className="ml-4 text-lg text-slate-300">{t('location.loading')}</p>
            </div>
          ) : locationError ? (
            <div className="bg-red-800/30 border border-red-700 text-red-300 p-6 rounded-lg shadow-xl text-center animate-fadeIn">
              <h1 className="text-2xl font-bold text-red-400 mb-3">{t('location.error.title')}</h1>
              <p className="text-slate-200">{locationError}</p>
              <p className="text-slate-300 mt-2 text-sm">{t('location.error.suggestion')}</p>
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
              <p className="text-lg text-slate-400">{t('location.prompt')}</p>
            </div>
          )
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
                  {t('teamBuilder.title')}
              </h1>
                {/* Top Level Tabs */}
                <div className="flex space-x-1 border-b-2 border-slate-700 mt-4 mb-6">
                    <button
                        onClick={() => setTeamBuilderActiveTab('management')}
                        className={`px-4 py-2 text-sm font-semibold rounded-t-md transition-colors ${
                            teamBuilderActiveTab === 'management' ? 'bg-slate-700/80 text-sky-300 border-b-2 border-sky-400' : 'text-slate-400 hover:bg-slate-800/50'
                        }`}
                    >
                        {t('teamBuilder.tabs.management')}
                    </button>
                     <button
                        onClick={() => setTeamBuilderActiveTab('details')}
                        className={`px-4 py-2 text-sm font-semibold rounded-t-md transition-colors ${
                            teamBuilderActiveTab === 'details' ? 'bg-slate-700/80 text-sky-300 border-b-2 border-sky-400' : 'text-slate-400 hover:bg-slate-800/50'
                        }`}
                    >
                        {t('teamBuilder.tabs.details')}
                    </button>
                    <button
                        onClick={() => setTeamBuilderActiveTab('story')}
                        className={`px-4 py-2 text-sm font-semibold rounded-t-md transition-colors ${
                            teamBuilderActiveTab === 'story' ? 'bg-slate-700/80 text-sky-300 border-b-2 border-sky-400' : 'text-slate-400 hover:bg-slate-800/50'
                        }`}
                    >
                        {t('teamBuilder.tabs.storyHelper')}
                    </button>
                    <button
                        onClick={() => setTeamBuilderActiveTab('navigator')}
                        className={`px-4 py-2 text-sm font-semibold rounded-t-md transition-colors ${
                            teamBuilderActiveTab === 'navigator' ? 'bg-slate-700/80 text-sky-300 border-b-2 border-sky-400' : 'text-slate-400 hover:bg-slate-800/50'
                        }`}
                    >
                        {t('teamBuilder.tabs.navigator')}
                    </button>
                </div>

                {/* Content for Top Level Tabs */}
                {teamBuilderActiveTab === 'management' && (
                    <div className="animate-fadeIn space-y-8">
                        <section>
                            <h2 className="text-2xl font-bold text-emerald-400 mb-4">{t('teamManager.myTeam')}</h2>
                            <TeamManager
                                team={team}
                                setTeam={setTeam as (team: TeamMember[]) => void}
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
                            <h2 className="text-xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 mb-2">{t('likedPokemon.title')}</h2>
                             <LikedPokemonDisplay 
                                likedPokemonIds={Object.keys(likedPokemonMap).filter(id => likedPokemonMap[id]).map(Number)}
                                onPokemonClick={handleOpenPokemonDetail}
                             />
                        </section>

                        <div className="border-t-2 border-slate-700/50"></div>
                        
                        <section>
                            <h2 className="text-xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-400 mb-2">{t('huntingList.title')}</h2>
                            <HuntingListDisplay
                                huntingList={huntingList}
                                onPokemonClick={handleOpenPokemonDetail}
                                onRemoveFromHunt={removeFromHuntingList}
                            />
                        </section>

                        <div className="border-t-2 border-slate-700/50"></div>

                        <section>
                            <h2 className="text-xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400 mb-2">{t('teamProspector.title')}</h2>
                            <TeamProspector 
                                team={team}
                                onAbilityClick={handleAbilityNameClick}
                                likedPokemonMap={likedPokemonMap}
                                onToggleLiked={toggleLikedPokemon}
                                onPokemonClick={handleOpenPokemonDetail}
                                onAddToTeam={addTeamMember}
                            />
                        </section>
                    </div>
                )}
                
                {teamBuilderActiveTab === 'details' && (
                     <div className="animate-fadeIn">
                        <PokemonDetailLookup 
                            onAbilityClick={handleAbilityNameClick}
                            onMoveClick={handleMoveNameClick}
                        />
                    </div>
                )}

                {teamBuilderActiveTab === 'story' && (
                    <div className="animate-fadeIn">
                        <StoryHelper
                          checkpoints={SCARLET_VIOLET_PROGRESSION}
                          currentLocationId={currentLocationId}
                          nextBattleName={nextBattleName}
                          nextBattleLocation={nextBattleLocation}
                          levelCap={levelCap}
                          team={team}
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

                {teamBuilderActiveTab === 'navigator' && (
                    <div className="animate-fadeIn">
                         <NavigatorDisplay
                            initialPromptValue={navigatorUserPrompt}
                            onPromptSubmit={handleNavigatorSubmit}
                            isLoading={isLoadingNavigatorQuery}
                            apiResponse={navigatorGeminiResponse}
                            apiError={navigatorError}
                            onReset={handleNavigatorReset}
                            onPokemonNameClick={handleOpenPokemonDetail}
                            onLocationNameClick={handleLocationSelectionAndCollapse}
                            gameLocations={SCARLET_VIOLET_PROGRESSION}
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
                <h1 className={`font-bold text-lg text-sky-400 transition-opacity ${isLeftSidebarCollapsed ? 'opacity-0' : 'opacity-100'}`}>{t('app.title')}</h1>
                <button onClick={() => setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed)} className="p-1 rounded-md hover:bg-slate-700">
                     {isLeftSidebarCollapsed ? '»' : '«'}
                </button>
            </div>
            <div className={`flex-grow overflow-y-auto ${isLeftSidebarCollapsed ? 'hidden' : 'block'}`}>
                <div className="p-4 space-y-3">
                    <button
                        onClick={handleSwitchToTeamBuilderAndCollapse}
                        className="w-full text-left px-4 py-2 rounded-lg transition-colors bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 font-semibold"
                    >
                        {t('sidebar.teamBuilder')}
                    </button>
                    <LockscreenManager />
                    <LanguageSwitcher />
                    <div className="border-t border-slate-700 my-4"></div>
                    <GameProgressionTree
                        locations={SCARLET_VIOLET_PROGRESSION}
                        selectedLocationId={selectedLocation?.id ?? null}
                        onSelectLocation={handleLocationSelectionAndCollapse}
                        currentLocationId={currentLocationId}
                        onSetCurrentLocation={setCurrentLocation}
                    />
                </div>
            </div>
       </aside>
      
      <main className="flex-1 flex flex-col bg-slate-900/80">
        <div className="flex-grow p-4 md:p-6 overflow-y-auto">
            {activeMainPanel === 'location' && (
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <button onClick={handlePreviousLocation} disabled={isFirstLocationSelected || noLocationSelected} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors">&larr; {t('location.prev')}</button>
                        <button onClick={handleNextLocation} disabled={isLastLocationSelected} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors">{t('location.next')} &rarr;</button>
                    </div>
                </div>
            )}
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