

export interface GameLocationNode {
  id: string;
  name: string;
  isCompleted?: boolean; 
  significantBattleLevel?: number; // Level of the ace/totem in a significant battle at this location
  significantBattleName?: string;  // Name of the significant battle/opponent
  significantBattlePokemonCount?: number; // Number of Pokemon the opponent has in this significant battle
  island?: string; // Island where the location is
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

export interface CatchablePokemonInfo {
  name:string;
  pokemonId: number;
  conditions?: string; // e.g., "Day only", "SOS Battle", "Surfing"
}

export interface LocationDetailsDisplayProps {
  details: DetailedLocationInfo;
  IconPokeball: React.ElementType;
  IconTrainer: React.ElementType;
  IconItem: React.ElementType;
  onPokemonNameClick: (pokemonName: string) => void;
  currentLocationId: string | null; // ID of the currently starred location
  onSetCurrentLocation: (locationNodeId: string) => void; // Function to set a location as current
  selectedLocationNodeId: string; // ID of the location whose details are being displayed
  onTriggerStarterSelection?: () => void; // Optional callback to open starter selection
}

export interface DetailedLocationInfo {
  locationId: string;
  locationName: string;
  summary?: string;
  catchablePokemon: CatchablePokemonInfo[];
  trainers: TrainerInfo[];
  items: ItemInfo[];
  keyEvents: KeyEventInfo[];
}

export interface AddTeamMemberData {
  species: string;
  level: number;
  nickname?: string;
  pokemonId?: number; // For fetching sprite
  initialMove?: string; // For setting the first move
  types: string[];
}

export interface TeamMember {
  id: string;
  species: string;
  nickname?: string;
  level: number;
  pokemonId?: number; // For sprite
  heldItem?: string;
  moves?: string[]; // Array of 4 move names
  isShiny?: boolean;
  types: string[];
}

export interface TeamManagerProps {
  team: TeamMember[];
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

// Structure Gemini is expected to return
export interface GeminiLocationResponse {
  locationName: string;
  summary?: string;
  catchablePokemon: Array<{
    name: string;
    pokemonId: number;
    conditions: string; 
  }>;
  trainers: Array<{
    name: string;
    strongestPokemonName: string;
    strongestPokemonLevel: number;
    notes?: string;
  }>;
  items: Array<{
    name: string;
    locationDescription: string;
  }>;
  keyEvents: Array<{
    name: string;
    description: string;
    type: 'Reward' | 'Event' | 'Interaction';
  }>;
}

// --- PokeAPI Specific Types ---

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

export interface PokeApiMoveData { // This is used for the initial list of moves in PokemonDetailBar
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


export interface PokeApiPokemon {
  id: number;
  name: string;
  sprites: {
    front_default: string | null;
    front_shiny: string | null; 
    other?: {
      "official-artwork"?: {
        front_default: string | null;
        front_shiny?: string | null;
      };
    };
  };
  types: Array<{
    slot: number;
    type: PokeApiResource;
  }>;
  abilities: Array<{
    ability: PokeApiResource;
    is_hidden: boolean;
    slot: number;
  }>;
  stats: Array<{
    base_stat: number;
    effort: number;
    stat: PokeApiResource;
  }>;
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
  genera: Array<{
    genus: string;
    language: PokeApiResource;
  }>;
}

export interface PokeApiEvolutionDetail {
  item: PokeApiResource | null;
  trigger: PokeApiResource;
  gender: number | null;
  held_item: PokeApiResource | null;
  known_move: PokeApiResource | null;
  known_move_type: PokeApiResource | null;
  location: PokeApiResource | null;
  min_affection: number | null;
  min_beauty: number | null;
  min_happiness: number | null;
  min_level: number | null;
  needs_overworld_rain: boolean;
  party_species: PokeApiResource | null;
  party_type: PokeApiResource | null;
  relative_physical_stats: number | null;
  time_of_day: string;
  trade_species: PokeApiResource | null;
  turn_upside_down: boolean;
}

export interface PokeApiEvolutionChainLink {
  is_baby: boolean;
  species: PokeApiResource;
  evolution_details: PokeApiEvolutionDetail[];
  evolves_to: PokeApiEvolutionChainLink[];
}

export interface PokeApiEvolutionChain {
  id: number;
  baby_trigger_item: PokeApiResource | null;
  chain: PokeApiEvolutionChainLink;
}

// --- Processed Pokemon Detail Data for UI ---
export interface PokemonBaseStat {
  name: string;
  value: number;
}

export interface PokemonEvolutionStep {
  name: string;
  spriteUrl?: string; 
  trigger: string; 
  conditions: string[];
}

export interface PokemonMoveInfo { // Basic move info for lists
  name: string;
  levelLearnedAt?: number;
  learnMethod: string;
  power?: number | null;
  accuracy?: number | null;
  pp?: number;
  moveType?: string;
  damageClass?: string;
  shortEffect?: string;
  // Raw name for fetching full details
  rawName?: string; 
}

export interface PokemonAbilityInfo {
  displayName: string;
  rawName: string;
  isHidden: boolean;
}

// --- Pokemon Generation Insights (for detail view) ---
export interface PokemonLocation {
  area: string;
  notes: string;
}

export interface PokemonGenerationInsights {
  pokemonName: string;
  scarletVioletSummary: string; // What's new (evolutions, forms)
  notableNewMoves: { name: string; description: string }[]; // List of new moves it can learn
  availability: PokemonLocation[]; // How/where to find it in Paldea
}

// For Gemini's response
export interface GeminiPokemonInsightsResponse extends Omit<PokemonGenerationInsights, 'pokemonName'> {}


export interface PokemonDetailData {
  id: number;
  name: string;
  spriteUrl: string | null;
  shinySpriteUrl?: string | null; 
  genus: string; 
  types: string[];
  abilities: PokemonAbilityInfo[]; // Array of ability objects
  baseStats: PokemonBaseStat[];
  evolutions: {
    currentStage: { name: string; id: number; spriteUrl: string | null };
    nextStages: PokemonEvolutionStep[];
    previousStage?: { name: string; id: number; spriteUrl: string | null }; 
  } | null; 
  flavorText: string;
  moves: PokemonMoveInfo[];
  generationInsights?: PokemonGenerationInsights | null;
}

// Type for storing caught status
export type CaughtStatusMap = Record<string, boolean>;

// --- Ability Detail Types ---
export interface AbilityEffectChange {
  effect_entries: PokeApiEffect[];
  version_group: PokeApiNamedAPIResource;
}

export interface AbilityFlavorText {
  flavor_text: string;
  language: PokeApiNamedAPIResource;
  version_group: PokeApiNamedAPIResource;
}

export interface PokeApiAbility {
  id: number;
  name: string;
  names: { name: string; language: PokeApiNamedAPIResource }[];
  effect_entries: PokeApiVerboseEffect[];
  flavor_text_entries: AbilityFlavorText[];
  pokemon: {
    is_hidden: boolean;
    slot: number;
    pokemon: PokeApiNamedAPIResource;
  }[];
}

export interface AbilityDetailData {
  id: number;
  name: string;
  effect: string;
  shortEffect: string;
  flavorText: string;
  pokemonWithAbility: { name: string; isHidden: boolean; id: string }[];
}


// --- Move Detail Types ---
export interface FullPokeApiMoveData extends PokeApiMoveData {
  flavor_text_entries: {
    flavor_text: string;
    language: PokeApiNamedAPIResource;
    version_group: PokeApiNamedAPIResource;
  }[];
  target: PokeApiNamedAPIResource;
  learned_by_pokemon: PokeApiNamedAPIResource[];
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

// --- Component Prop Types ---

export interface PokemonContext {
  name: string;
  id: number;
}

export interface DetailDisplayControllerProps {
  activeView: 'pokemon' | 'ability' | 'move' | null;
  pokemonData: PokemonDetailData | null;
  abilityData: AbilityDetailData | null;
  moveData: FullMoveDetailData | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onBackToPokemon?: () => void;
  pokemonContextForDetailViewName?: string;
  isCaught?: boolean;
  onToggleCaught?: (pokemonId: number) => void;
  onAddToTeam?: (speciesName: string, pokemonId: number, types: string[]) => void;
  onAddToHuntingList?: (pokemonId: number, pokemonName: string, area: string) => void;
  onStageMove?: (pokemonId: number, moveName: string, moveDetails: PokemonMoveInfo) => void;
  stagedMoveNameForThisPokemon?: string | null;
  onPokemonNameClickForEvolution?: (pokemonName: string) => void;
  onAbilityNameClick?: (abilityName: string) => void;
  onMoveNameClick?: (moveDisplayName: string, rawMoveName: string) => void;
}

export interface PokemonDetailBarProps {
  pokemonData: PokemonDetailData;
  isCaught: boolean;
  onToggleCaught: (pokemonId: number) => void;
  onAddToTeam: (speciesName: string, pokemonId: number, types: string[]) => void;
  onAddToHuntingList: (pokemonId: number, pokemonName: string, area: string) => void;
  onPokemonNameClickForEvolution: (name: string) => void;
  onAbilityNameClick: (abilityName: string) => void;
  onMoveNameClick: (moveDisplayName: string, rawMoveName: string) => void;
  onStageMove: (pokemonId: number, moveName: string, moveDetails: PokemonMoveInfo) => void;
  stagedMoveNameForThisPokemon: string | null;
  onClose: () => void; 
}

export interface ProspectorFilters {
  generation: number | null;
  type: string | null;
  isFullyEvolvedOnly: boolean;
}

export interface TeamProspectorProps {
    team: TeamMember[];
    onAbilityClick: (abilityName: string) => void;
    likedPokemonMap: { [key: string]: boolean };
    onToggleLiked: (pokemonId: number) => void;
    onPokemonClick: (pokemonNameOrId: string | number) => void;
    onAddToTeam: (memberData: AddTeamMemberData) => boolean;
}

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

export interface StoryGoal {
    id: string;
    text: string;
    isCompleted: boolean;
    aiNotes?: string;
    aiLevel?: number;
    aiPokemonCount?: number;
}

export interface GeminiGoalResponse {
    refinedGoalText: string;
    level: number;
    pokemonCount: number;
    notes: string;
}

export interface BattleStrategyDetails {
    battleId: string;
    puzzleInformation: string;
    keyOpponentPokemon: {
        name: string;
        typeInfo: string;
        notes: string;
    }[];
    recommendedPokemonTypes: string[];
    nuzlockeTips: string;
}

export interface GeminiBattleStrategyResponse extends Omit<BattleStrategyDetails, 'battleId'> {}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

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
  onLocationNameClick: (location: GameLocationNode) => void;
}

export interface LikedPokemonDisplayProps {
    likedPokemonIds: number[];
    onPokemonClick: (id: number) => void;
}

export interface HuntingListMap {
    [area: string]: { pokemonId: number, pokemonName: string }[];
}

export interface HuntingListDisplayProps {
    huntingList: HuntingListMap;
    onPokemonClick: (id: number) => void;
    onRemoveFromHunt: (pokemonId: number, area: string) => void;
}

export interface LikedPokemonMap {
    [pokemonId: string]: boolean;
}

export interface MoveDetailDisplayProps {
    moveData: FullMoveDetailData;
    onPokemonNameClick?: (pokemonNameOrId: string | number) => void;
}

export interface AbilityDetailDisplayProps {
    abilityData: AbilityDetailData;
    onPokemonNameClick?: (pokemonNameOrId: string | number) => void;
}