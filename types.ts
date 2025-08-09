

// === Game Structure & Progression ===
export interface GameLocationNode {
  id: string;
  name: string;
  isCompleted?: boolean;
  significantBattleLevel?: number;
  significantBattleName?: string;
  significantBattlePokemonCount?: number;
  island?: string;
}

// === Team & Pokémon Management ===
export interface TeamMember {
  id:string;
  species: string;
  nickname?: string;
  level: number;
  pokemonId?: number;
  heldItem?: string;
  moves?: string[];
  isShiny?: boolean;
  types: string[];
}

export interface AddTeamMemberData {
  species: string;
  level: number;
  nickname?: string;

  pokemonId?: number;
  initialMove?: string;
  types: string[];
}

export type CaughtStatusMap = Record<string, boolean>;
export type LikedPokemonMap = Record<string, boolean>;
export type HuntingListMap = Record<string, { pokemonId: number; pokemonName: string }[]>;

// === State Syncing ===
export interface AppState {
    [key: string]: string;
}


// === Component Props ===

// --- App Structure ---
export interface LocationDetailsDisplayProps {
  details: DetailedLocationInfo;
  IconPokeball: React.ElementType;
  IconTrainer: React.ElementType;
  IconItem: React.ElementType;
  onPokemonNameClick: (pokemonName: string) => void;
  currentLocationId: string | null;
  onSetCurrentLocation: (locationNodeId: string) => void;
  selectedLocationNodeId: string;
  onTriggerStarterSelection?: () => void;
}

export interface TeamManagerProps {
  team: TeamMember[];
  setTeam: (team: TeamMember[]) => void;
  onRemoveTeamMember: (id: string) => void;
  IconPokeball: React.ElementType;
  levelCap?: number | null;
  nextBattleName?: string | null;
  nextBattleLocation?: string | null;
  nextBattlePokemonCount?: number | null;
  onUpdateTeamMemberNickname: (memberId: string, nickname: string) => void;
  onUpdateTeamMemberLevel: (memberId: string, level: number) => void;
  onUpdateTeamMemberItem: (memberId: string, item: string) => void;
  onUpdateTeamMemberMove: (memberId: string, moveIndex: number, moveName: string) => void;
  onToggleTeamMemberShiny: (memberId: string) => void;
}

// --- Detail Display Bar ---
export interface DetailDisplayControllerProps {
  activeView: 'pokemon' | 'ability' | 'move' | null;
  pokemonData: PokemonDetailData | null;
  abilityData: AbilityDetailData | null;
  moveData: FullMoveDetailData | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onBackToPokemon?: () => void;
  pokemonContextForDetailViewName?: string | null;
  isCaught: boolean;
  onToggleCaught: (pokemonId: number) => void;
  onAddToTeam: (speciesName: string, pokemonId: number, types: string[]) => void;
  onAddToHuntingList: (pokemonId: number, pokemonName: string, area: string) => void;
  onStageMove: (pokemonId: number, moveName: string, moveDetails: PokemonMoveInfo) => void;
  stagedMoveNameForThisPokemon: string | null;
  onPokemonNameClickForEvolution: (pokemonNameOrId: string | number) => void;
  onAbilityNameClick: (abilityName: string) => void;
  onMoveNameClick: (moveDisplayName: string, rawMoveName: string) => void;
}

export interface PokemonDetailBarProps {
  pokemonData: PokemonDetailData;
  isCaught: boolean;
  onToggleCaught: (pokemonId: number) => void;
  onAddToTeam: (speciesName: string, pokemonId: number, types: string[]) => void;
  onAddToHuntingList: (pokemonId: number, pokemonName: string, area: string) => void;
  onPokemonNameClickForEvolution: (pokemonNameOrId: string | number) => void;
  onAbilityNameClick: (abilityName: string) => void;
  onMoveNameClick: (moveDisplayName: string, rawMoveName: string) => void;
  onStageMove: (pokemonId: number, moveName: string, moveDetails: PokemonMoveInfo) => void;
  stagedMoveNameForThisPokemon: string | null;
  onClose: () => void;
}

export interface AbilityDetailDisplayProps {
  abilityData: AbilityDetailData;
  onPokemonNameClick?: (pokemonNameOrId: string | number) => void;
}

export interface MoveDetailDisplayProps {
  moveData: FullMoveDetailData;
  onPokemonNameClick?: (pokemonNameOrId: string | number) => void;
}

// --- Starter Selection ---
export interface StarterPokemonData {
  id: string;
  name: string;
  pokeApiId: number;
  types: string[];
  initialMoves: { name: string; type: string; power: number; description: string }[];
  description: string;
  evolutions: StarterEvolutionStage[];
}

export interface StarterEvolutionStage {
  name: string;
  pokeApiId: number;
  types: string[];
  method: string;
}

export interface StarterSelectionDisplayProps {
  starters: StarterPokemonData[];
  onSelectStarter: (starter: StarterPokemonData) => void;
}

// --- Navigator & Formatted Response ---
export interface NavigatorDisplayProps {
  initialPromptValue: string;
  onPromptSubmit: (prompt: string) => void;
  isLoading: boolean;
  apiResponse: string | null;
  apiError: string | null;
  onReset: () => void;
  onPokemonNameClick: (pokemonName: string) => void;
  onLocationNameClick: (location: GameLocationNode) => void;
  gameLocations: GameLocationNode[];
}

export interface FormattedResponseProps {
  responseText: string;
  gameLocations: GameLocationNode[];
  onPokemonNameClick: (pokemonName: string) => void;
  onLocationNameClick: (location: GameLocationNode) => void;
}

// --- Story Helper ---
export interface StoryHelperProps {
  checkpoints: GameLocationNode[];
  currentLocationId: string | null;
  nextBattleName: string | null;
  nextBattleLocation: string | null;
  levelCap: number | null;
  team: TeamMember[];
  gameLocations: GameLocationNode[];
  completedBattles: Set<string>;
  toggleBattleCompletion: (locationId: string) => void;
  customGoals: StoryGoal[];
  addCustomGoal: (text: string) => void;
  toggleCustomGoal: (id: string) => void;
  deleteCustomGoal: (id: string) => void;
  addCustomGoalWithAi: (text: string) => void;
  isAiGoalLoading: boolean;
  aiGoalError: string | null;
  chatHistory: ChatMessage[];
  sendChatMessage: (message: string) => void;
  isChatLoading: boolean;
  chatError: string | null;
  onPokemonNameClick: (pokemonName: string) => void;
  onLocationNameClick: (locationNode: GameLocationNode) => void;
}

// --- Collections Displays ---
export interface LikedPokemonDisplayProps {
    likedPokemonIds: number[];
    onPokemonClick: (pokemonId: number) => void;
}

export interface HuntingListDisplayProps {
    huntingList: HuntingListMap;
    onPokemonClick: (pokemonId: number) => void;
    onRemoveFromHunt: (pokemonId: number, area: string) => void;
}

// --- Team Prospector ---
export interface TeamProspectorProps {
    team: TeamMember[];
    onAbilityClick: (abilityName: string) => void;
    likedPokemonMap: LikedPokemonMap;
    onToggleLiked: (pokemonId: number) => void;
    onPokemonClick: (pokemonId: number) => void;
    onAddToTeam: (data: AddTeamMemberData) => void;
}

export interface ProspectorFilters {
    generation: number | null;
    type: string | null;
    isFullyEvolvedOnly: boolean;
}

export interface ProspectorState {
    prospectList: { name: string; id: number }[];
    currentIndex: number;
    prospect: PokemonDetailData | null;
    isLoading: boolean;
    error: string | null;
}

// --- Pokemon Detail Lookup ---
export interface PokemonDetailLookupProps {
    onAbilityClick: (abilityName: string) => void;
    onMoveClick: (moveName: string, rawMoveName: string) => void;
}

// === Detailed Data Structures (from APIs) ===

// --- App-Internal Pokémon Detail Structure ---
export interface PokemonDetailData {
  id: number;
  name: string;
  spriteUrl: string | null;
  shinySpriteUrl: string | null;
  genus: string;
  types: string[];
  abilities: { displayName: string; rawName: string; isHidden: boolean }[];
  baseStats: PokemonBaseStat[];
  evolutions: {
    currentStage: { name: string; id: number; spriteUrl: string | null };
    previousStage?: { name: string; id: number; spriteUrl: string | null };
    nextStages: PokemonEvolutionStep[];
  } | null;
  flavorText: string;
  moves: PokemonMoveInfo[];
  generationInsights?: PokemonGenerationInsights | null;
}

export interface PokemonBaseStat {
  name: string;
  value: number;
}

export interface PokemonEvolutionStep {
  name: string;
  id: number;
  spriteUrl: string | null;
  trigger: string;
  conditions: string[];
}

export interface PokemonMoveInfo {
  rawName: string;
  name: string;
  levelLearnedAt: number;
  learnMethod: string;
  power: number | null;
  accuracy: number | null;
  pp?: number;
  moveType?: string;
  damageClass?: string;
  shortEffect?: string;
}

export interface AbilityDetailData {
    id: number;
    name: string;
    effect: string;
    shortEffect: string;
    flavorText: string;
    pokemonWithAbility: { name: string; isHidden: boolean; id: string }[];
}

export interface FullMoveDetailData {
    id: number;
    name: string;
    accuracy: number | null;
    power: number | null;
    pp: number;
    type: string;
    damageClass: string;
    effect: string;
    effectChance: number | null | undefined;
    flavorText: string;
    target: string;
    learnedByPokemon: { name: string; id: string }[];
}

// === Gemini API Response Structures ===
export interface DetailedLocationInfo {
  locationId: string;
  locationName: string;
  summary?: string;
  catchablePokemon: CatchablePokemonInfo[];
  trainers: TrainerInfo[];
  items: ItemInfo[];
  keyEvents: KeyEventInfo[];
}

export interface CatchablePokemonInfo {
  name: string;
  pokemonId: number;
  conditions?: string;
}

export interface TrainerInfo {
  name: string;
  strongestPokemonName: string;
  strongestPokemonLevel: number;
  notes?: string;
}

export interface ItemInfo {
  name: string;
  locationDescription: string;
}

export interface KeyEventInfo {
  name: string;
  description: string;
  type: 'Reward' | 'Event' | 'Interaction';
}

export interface GeminiLocationResponse {
  locationName: string;
  summary?: string;
  catchablePokemon: Array<{ name: string; pokemonId: number; conditions: string }>;
  trainers: Array<{ name: string; strongestPokemonName: string; strongestPokemonLevel: number; notes?: string }>;
  items: Array<{ name: string; locationDescription: string }>;
  keyEvents: Array<{ name: string; description: string; type: 'Reward' | 'Event' | 'Interaction' }>;
}

export interface GeminiComplexGoalResponseItem {
  goalText: string;
  pokemonName?: string;
  pokemonId?: number;
}


export interface BattleStrategyDetails {
    battleId: string;
    puzzleInformation: string;
    keyOpponentPokemon: { name: string; typeInfo: string; notes: string; }[];
    recommendedPokemonTypes: string[];
    nuzlockeTips: string;
}

export interface GeminiBattleStrategyResponse extends Omit<BattleStrategyDetails, 'battleId'> {}

export interface PokemonGenerationInsights {
    pokemonName: string;
    scarletVioletSummary: string;
    notableNewMoves: { name: string; description: string; }[];
    availability: { area: string; notes: string; }[];
}

export interface GeminiPokemonInsightsResponse extends Omit<PokemonGenerationInsights, 'pokemonName'> {}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export interface StoryGoal {
    id: string;
    text: string;
    isCompleted: boolean;
}



// === PokeAPI Response Structures ===
export interface PokeApiResource {
  name: string;
  url: string;
}

export interface PokeApiNamedAPIResource extends PokeApiResource {}

export interface PokeApiEffect {
  effect: string;
  language: PokeApiNamedAPIResource;
}

export interface PokeApiVerboseEffect extends PokeApiEffect {
  short_effect: string;
}

export interface PokeApiMoveData {
  id: number;
  name: string;
  accuracy: number | null;
  power: number | null;
  pp: number;
  type: PokeApiNamedAPIResource;
  damage_class: PokeApiNamedAPIResource;
  effect_entries: PokeApiVerboseEffect[];
  effect_chance?: number | null;
}

export interface FullPokeApiMoveData extends PokeApiMoveData {
    flavor_text_entries: Array<{
        flavor_text: string;
        language: PokeApiNamedAPIResource;
        version_group: PokeApiNamedAPIResource;
    }>;
    target: PokeApiNamedAPIResource;
    learned_by_pokemon: PokeApiNamedAPIResource[];
}

export interface PokeApiPokemon {
  id: number;
  name: string;
  sprites: {
    front_default: string | null;
    front_shiny: string | null;
    other?: { "official-artwork"?: { front_default: string | null; front_shiny?: string | null; } };
  };
  types: Array<{ slot: number; type: PokeApiResource; }>;
  abilities: Array<{ ability: PokeApiResource; is_hidden: boolean; slot: number; }>;
  stats: Array<{ base_stat: number; effort: number; stat: PokeApiResource; }>;
  moves: Array<{
    move: PokeApiResource;
    version_group_details: Array<{
      level_learned_at: number;
      move_learn_method: PokeApiResource;
      version_group: PokeApiResource;
    }>;
  }>;
  species: PokeApiResource;
}

export interface PokeApiSpecies {
  id: number;
  name: string;
  evolution_chain: { url: string };
  flavor_text_entries: Array<{
    flavor_text: string;
    language: PokeApiResource;
    version: PokeApiResource;
  }>;
  genera: Array<{ genus: string; language: PokeApiResource; }>;
}

export interface PokeApiAbility {
    id: number;
    name: string;
    names: Array<{ name: string; language: PokeApiNamedAPIResource; }>;
    effect_entries: PokeApiVerboseEffect[];
    flavor_text_entries: Array<{
        flavor_text: string;
        language: PokeApiNamedAPIResource;
        version_group: PokeApiNamedAPIResource;
    }>;
    pokemon: Array<{
        is_hidden: boolean;
        slot: number;
        pokemon: PokeApiNamedAPIResource;
    }>;
}

export interface PokeApiEvolutionChain {
    id: number;
    chain: PokeApiEvolutionChainLink;
}

export interface PokeApiEvolutionChainLink {
    species: PokeApiNamedAPIResource;
    evolves_to: PokeApiEvolutionChainLink[];
    evolution_details: PokeApiEvolutionDetail[];
}

export interface PokeApiEvolutionDetail {
  item: PokeApiResource | null;
  trigger: PokeApiResource;
  gender: number | null;
  held_item: PokeApiResource | null;
  known_move: PokeApiResource | null;
  known_move_type: PokeApiResource | null;
  location: PokeApiResource | null;
  min_level: number | null;
  min_happiness: number | null;
  min_beauty: number | null;
  min_affection: number | null;
  needs_overworld_rain: boolean;
  party_species: PokeApiResource | null;
  party_type: PokeApiResource | null;
  relative_physical_stats: number | null;
  time_of_day: string;
  trade_species: PokeApiResource | null;
  turn_upside_down: boolean;
}
