
import { GameLocationNode, StarterPokemonData } from './types';

// A recommended progression path for Pokémon Scarlet and Violet Nuzlocke runs.
// This path interleaves the three main storylines: Victory Road, Path of Legends, and Starfall Street.
export const SCARLET_VIOLET_PROGRESSION: GameLocationNode[] = [
  { id: "prologue-cabo-poco", name: "Prologue: Cabo Poco" },
  { id: "prologue-inlet-grotto", name: "Prologue: Inlet Grotto" },
  { id: "prologue-south-province-area-one", name: "Prologue: South Province (Area One)" },
  { id: "mesagoza-city", name: "Mesagoza City" },
  { id: "south-province-area-two", name: "South Province (Area Two)" },
  { 
    id: "gym-cortondo", 
    name: "Gym: Cortondo",
    significantBattleLevel: 15, 
    significantBattleName: "Gym Leader Katy (Bug)",
    significantBattlePokemonCount: 4
  },
  { 
    id: "titan-stony-cliff", 
    name: "Titan: Stony Cliff",
    significantBattleLevel: 16, 
    significantBattleName: "Klawf, The Stony Cliff Titan",
    significantBattlePokemonCount: 1
  },
  { id: "east-province-area-one", name: "East Province (Area One)" },
  { 
    id: "gym-artazon", 
    name: "Gym: Artazon",
    significantBattleLevel: 17, 
    significantBattleName: "Gym Leader Brassius (Grass)",
    significantBattlePokemonCount: 3
  },
  { id: "west-province-area-one-south", name: "West Province (Area One - South)" },
  { 
    id: "titan-open-sky", 
    name: "Titan: Open Sky",
    significantBattleLevel: 19, 
    significantBattleName: "Bombirdier, The Open Sky Titan",
    significantBattlePokemonCount: 1
  },
  { 
    id: "star-dark-base", 
    name: "Team Star: Dark Crew Base",
    significantBattleLevel: 21, 
    significantBattleName: "Giacomo, The Dark Crew Boss",
    significantBattlePokemonCount: 2
  },
  { id: "east-province-area-two", name: "East Province (Area Two)" },
  { 
    id: "gym-levincia", 
    name: "Gym: Levincia",
    significantBattleLevel: 24, 
    significantBattleName: "Gym Leader Iono (Electric)",
    significantBattlePokemonCount: 4
  },
  { id: "east-province-area-three", name: "East Province (Area Three)" },
  { 
    id: "star-fire-base", 
    name: "Team Star: Fire Crew Base",
    significantBattleLevel: 27, 
    significantBattleName: "Mela, The Fire Crew Boss",
    significantBattlePokemonCount: 2
  },
  { 
    id: "titan-lurking-steel", 
    name: "Titan: Lurking Steel",
    significantBattleLevel: 28, 
    significantBattleName: "Orthworm, The Lurking Steel Titan",
    significantBattlePokemonCount: 1
  },
  { id: "west-province-area-two", name: "West Province (Area Two)" },
  { 
    id: "gym-cascarrafa", 
    name: "Gym: Cascarrafa",
    significantBattleLevel: 30, 
    significantBattleName: "Gym Leader Kofu (Water)",
    significantBattlePokemonCount: 4
  },
  { id: "tagtree-thicket", name: "Tagtree Thicket" },
  { 
    id: "star-poison-base", 
    name: "Team Star: Poison Crew Base",
    significantBattleLevel: 33, 
    significantBattleName: "Atticus, The Poison Crew Boss",
    significantBattlePokemonCount: 4
  },
  { 
    id: "gym-medali", 
    name: "Gym: Medali",
    significantBattleLevel: 36, 
    significantBattleName: "Gym Leader Larry (Normal)",
    significantBattlePokemonCount: 4
  },
  { id: "glaseado-mountain", name: "Glaseado Mountain" },
  { 
    id: "gym-montenevera", 
    name: "Gym: Montenevera",
    significantBattleLevel: 42, 
    significantBattleName: "Gym Leader Ryme (Ghost)",
    significantBattlePokemonCount: 4
  },
  { id: "asado-desert", name: "Asado Desert" },
  { 
    id: "titan-quaking-earth", 
    name: "Titan: Quaking Earth",
    significantBattleLevel: 45, 
    significantBattleName: "The Quaking Earth Titan",
    significantBattlePokemonCount: 1
  },
  { 
    id: "gym-alfornada", 
    name: "Gym: Alfornada",
    significantBattleLevel: 45, 
    significantBattleName: "Gym Leader Tulip (Psychic)",
    significantBattlePokemonCount: 4
  },
  { 
    id: "gym-glaseado", 
    name: "Gym: Glaseado",
    significantBattleLevel: 48, 
    significantBattleName: "Gym Leader Grusha (Ice)",
    significantBattlePokemonCount: 4
  },
  { id: "north-province-area-three", name: "North Province (Area Three)" },
  { 
    id: "star-fairy-base", 
    name: "Team Star: Fairy Crew Base",
    significantBattleLevel: 51, 
    significantBattleName: "Ortega, The Fairy Crew Boss",
    significantBattlePokemonCount: 4
  },
  { id: "casseroya-lake", name: "Casseroya Lake" },
  { 
    id: "titan-false-dragon", 
    name: "Titan: False Dragon",
    significantBattleLevel: 55, 
    significantBattleName: "Dondozo & Tatsugiri, The False Dragon Titan",
    significantBattlePokemonCount: 2
  },
  { id: "north-province-area-one", name: "North Province (Area One)" },
  { 
    id: "star-fighting-base", 
    name: "Team Star: Fighting Crew Base",
    significantBattleLevel: 56, 
    significantBattleName: "Eri, The Fighting Crew Boss",
    significantBattlePokemonCount: 5
  },
  { 
    id: "pokemon-league", 
    name: "Victory Road: Pokémon League",
    significantBattleLevel: 62, 
    significantBattleName: "Elite Four & Champion Geeta",
    significantBattlePokemonCount: 6 // Geeta's count
  },
  { 
    id: "the-great-crater-of-paldea", 
    name: "The Great Crater of Paldea",
    significantBattleLevel: 63, 
    significantBattleName: "Final Battle (AI Turo/Sada)",
    significantBattlePokemonCount: 6
  },
  { 
    id: "post-game", 
    name: "Post-Game",
    significantBattleLevel: 75, 
    significantBattleName: "Academy Ace Tournament",
    significantBattlePokemonCount: 6 // Can vary, but typically a full team
  },
];


export const GEMINI_MODEL_NAME = 'gemini-2.5-flash';

// --- Local Storage Keys ---
export const CURRENT_LOCATION_ID_STORAGE_KEY = 'nuzlocke-sv-current-location-id';
export const TEAM_STORAGE_KEY = 'nuzlocke-sv-team';
export const CAUGHT_POKEMON_STORAGE_KEY = 'nuzlocke-sv-caught-pokemon';
export const COMPLETED_BATTLES_STORAGE_KEY = 'nuzlocke-sv-completed-battles';
export const CUSTOM_GOALS_STORAGE_KEY = 'nuzlocke-sv-custom-goals';
export const STORY_CHAT_HISTORY_STORAGE_KEY = 'nuzlocke-sv-story-chat-history';
export const LIKED_POKEMON_STORAGE_KEY = 'nuzlocke-sv-liked-pokemon';
export const HUNTING_LIST_STORAGE_KEY = 'nuzlocke-sv-hunting-list';


export const DEFAULT_CURRENT_LOCATION_ID = 'prologue-cabo-poco';
export const GEN_9_START_ID = 906; // Start of Gen 9 (Paldea) Pokemon


export const SCARLET_VIOLET_STARTERS: StarterPokemonData[] = [
  {
    id: "sprigatito",
    name: "Sprigatito",
    pokeApiId: 906, 
    types: ["Grass"],
    initialMoves: [
      { name: "Leafage", type: "Grass", power: 40, description: "Attacks with a flurry of leaves. " },
      { name: "Scratch", type: "Normal", power: 40, description: "A basic physical attack using sharp claws." },
    ],
    description: "A capricious, attention-seeking Grass Cat Pokémon. Sprigatito is known for its aromatic fur and playful nature. It evolves into a swift and cunning Grass/Dark type, Meowscarada, excelling in speed and attack.",
    evolutions: [
      { name: "Sprigatito", pokeApiId: 906, types: ["Grass"], method: "Base Stage" },
      { name: "Floragato", pokeApiId: 907, types: ["Grass"], method: "Level 16" },
      { name: "Meowscarada", pokeApiId: 908, types: ["Grass", "Dark"], method: "Level 36" },
    ],
  },
  {
    id: "fuecoco",
    name: "Fuecoco",
    pokeApiId: 909,
    types: ["Fire"],
    initialMoves: [
      { name: "Ember", type: "Fire", power: 40, description: "A weak fire attack that may inflict a burn." },
      { name: "Tackle", type: "Normal", power: 40, description: "A full-body charge attack." },
    ],
    description: "A laid-back Fire Croc Pokémon that loves to eat. Fuecoco is sturdy and boasts growing firepower. It evolves into the powerful Fire/Ghost type, Skeledirge, known for its high Special Attack and unique signature move.",
    evolutions: [
      { name: "Fuecoco", pokeApiId: 909, types: ["Fire"], method: "Base Stage" },
      { name: "Crocalor", pokeApiId: 910, types: ["Fire"], method: "Level 16" },
      { name: "Skeledirge", pokeApiId: 911, types: ["Fire", "Ghost"], method: "Level 36" },
    ],
  },
  {
    id: "quaxly",
    name: "Quaxly",
    pokeApiId: 912,
    types: ["Water"],
    initialMoves: [
      { name: "Pound", type: "Normal", power: 40, description: "Pounds the foe with forelegs or tail." },
      { name: "Water Gun", type: "Water", power: 40, description: "Squirts water to attack the foe." },
    ],
    description: "An earnest and tidy Duckling Pokémon. Quaxly is diligent and focuses on its dance-like fighting style. It evolves into the elegant Water/Fighting type, Quaquaval, which uses its powerful legs for devastating attacks.",
    evolutions: [
      { name: "Quaxly", pokeApiId: 912, types: ["Water"], method: "Base Stage" },
      { name: "Quaxwell", pokeApiId: 913, types: ["Water"], method: "Level 16" },
      { name: "Quaquaval", pokeApiId: 914, types: ["Water", "Fighting"], method: "Level 36" },
    ],
  },
];
