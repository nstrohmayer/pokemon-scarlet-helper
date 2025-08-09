
import { HuntingListMap } from '../types';
import { HUNTING_LIST_STORAGE_KEY } from '../constants';

type Listener = (huntingList: HuntingListMap) => void;

// Exporting the class for instantiating in tests
export class HuntingListService {
    private huntingList: HuntingListMap = {};
    private listeners: Listener[] = [];

    constructor() {
        this.loadFromStorage();
    }

    private loadFromStorage() {
        if (typeof localStorage === 'undefined') {
            return;
        }
        try {
            const stored = localStorage.getItem(HUNTING_LIST_STORAGE_KEY);
            this.huntingList = stored ? JSON.parse(stored) : {};
        } catch (e) {
            console.error("Failed to load hunting list from localStorage", e);
            this.huntingList = {};
        }
    }

    private saveToStorage() {
        if (typeof localStorage === 'undefined') {
            return;
        }
        try {
            localStorage.setItem(HUNTING_LIST_STORAGE_KEY, JSON.stringify(this.huntingList));
        } catch (e) {
            console.error("Failed to save hunting list to localStorage", e);
        }
    }

    private notifyListeners() {
        // Notify with a deep copy to prevent consumers from mutating the internal state
        const listCopy = this.getHuntingList();
        this.listeners.forEach(listener => listener(listCopy));
    }

    public subscribe(listener: Listener): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    public getHuntingList(): HuntingListMap {
        // Return a deep copy to prevent external mutations from affecting the service's state
        return JSON.parse(JSON.stringify(this.huntingList));
    }

    public addToHuntingList(pokemonId: number, pokemonName: string, area: string): void {
        const newHuntingList = this.getHuntingList(); // Start with a deep copy
        const areaHunts = newHuntingList[area] || [];

        if (areaHunts.some(p => p.pokemonId === pokemonId)) {
            return; // Already exists, do nothing
        }

        areaHunts.push({ pokemonId, pokemonName });
        newHuntingList[area] = areaHunts;
        this.huntingList = newHuntingList; // Update internal state
        this.saveToStorage();
        this.notifyListeners();
    }
    
    public addMultipleToHunt(pokemonList: { id: number; name: string }[], area: string = "Navigator Hunt"): void {
        const newHuntingList = this.getHuntingList();
        const areaHunts = newHuntingList[area] || [];
        const existingIdsInArea = new Set(areaHunts.map(p => p.pokemonId));

        let wasModified = false;
        for (const pokemon of pokemonList) {
            if (!existingIdsInArea.has(pokemon.id)) {
                areaHunts.push({ pokemonId: pokemon.id, pokemonName: pokemon.name });
                wasModified = true;
            }
        }

        if (wasModified) {
            newHuntingList[area] = areaHunts;
            this.huntingList = newHuntingList;
            this.saveToStorage();
            this.notifyListeners();
        }
    }

    public removeFromHuntingList(pokemonId: number, area: string): void {
        const newHuntingList = this.getHuntingList();
        if (!newHuntingList[area]) {
            return;
        }
        
        const initialLength = newHuntingList[area].length;
        newHuntingList[area] = newHuntingList[area].filter(p => p.pokemonId !== pokemonId);
        const finalLength = newHuntingList[area].length;

        if (newHuntingList[area].length === 0) {
            delete newHuntingList[area];
        }

        // Only update and notify if a change actually happened
        if (initialLength !== finalLength || !newHuntingList[area]) {
             this.huntingList = newHuntingList;
             this.saveToStorage();
             this.notifyListeners();
        }
    }
}

// Singleton instance for the app
export const huntingListService = new HuntingListService();
