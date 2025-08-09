import { PokemonDetailData, ProspectorFilters, TeamMember, ProspectorState } from '../types';
import { fetchPokemonDetails } from './pokeApiService';
import { 
    fetchProspectsFromAI, 
    fetchTeamSuggestionsFromAI,
    fetchProspectsByPromptFromAI
} from './prospectorService';

type Listener = (state: ProspectorState) => void;

class ProspectorStateService {
    private state: ProspectorState = {
        prospectList: [],
        currentIndex: 0,
        prospect: null,
        isLoading: true,
        error: null,
    };
    private listeners: Listener[] = [];
    private isInitialized = false;

    // --- Core State Management ---

    private setState(newState: Partial<ProspectorState>) {
        this.state = { ...this.state, ...newState };
        this.notifyListeners();
    }

    private notifyListeners() {
        // Notify with a deep copy to prevent consumers from mutating internal state
        const stateCopy = this.getState();
        this.listeners.forEach(listener => listener(stateCopy));
    }

    public subscribe(listener: Listener): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    public getState(): ProspectorState {
        return JSON.parse(JSON.stringify(this.state));
    }

    // --- Initialization and Navigation ---

    public initialize(initialFilters: ProspectorFilters) {
        if (!this.isInitialized) {
            this.isInitialized = true;
            this.fetchByFilters(initialFilters);
        }
    }

    public navigate(direction: 'next' | 'previous') {
        if (this.state.isLoading || this.state.prospectList.length < 2) return;
        
        let newIndex;
        if (direction === 'next') {
            newIndex = (this.state.currentIndex + 1) % this.state.prospectList.length;
        } else {
            newIndex = (this.state.currentIndex - 1 + this.state.prospectList.length) % this.state.prospectList.length;
        }
        this.setCurrentIndex(newIndex);
    }

    public setCurrentIndex(index: number) {
        if (index === this.state.currentIndex && this.state.prospect) return;
        this.setState({ currentIndex: index, prospect: null, isLoading: true, error: null });
        const pokemonToFetch = this.state.prospectList[index];
        if (pokemonToFetch) {
            this.fetchProspectDetails(pokemonToFetch.id);
        }
    }

    // --- Data Fetching Methods ---

    private async fetchProspectDetails(pokemonId: number | string) {
        try {
            const data = await fetchPokemonDetails(pokemonId);
            this.setState({ prospect: data, isLoading: false, error: null });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : `Failed to load details.`;
            this.setState({ prospect: null, isLoading: false, error: errorMessage });
        }
    }
    
    private async executeFetch(
        fetchFunction: () => Promise<{ name: string; id: number }[]>,
        noResultsMessage: string
    ) {
        this.setState({ isLoading: true, error: null, prospect: null, prospectList: [] });
        try {
            const namesAndIds = await fetchFunction();
            if (namesAndIds.length === 0) {
                throw new Error(noResultsMessage);
            }
            this.setState({ prospectList: namesAndIds, currentIndex: 0 });
            await this.fetchProspectDetails(namesAndIds[0].id);
        } catch (err) {
            this.setState({ 
                error: err instanceof Error ? err.message : "An unknown error occurred.", 
                isLoading: false, 
                prospectList: [] 
            });
        }
    }

    public fetchByFilters(filters: ProspectorFilters) {
        this.executeFetch(
            () => fetchProspectsFromAI(filters),
            "No Pokémon found matching your criteria. Please adjust filters."
        );
    }

    public fetchByPrompt(prompt: string) {
        this.executeFetch(
            () => fetchProspectsByPromptFromAI(prompt),
            "The AI couldn't find any Pokémon for that description. Try being more specific!"
        );
    }

    public fetchSuggestions(team: TeamMember[]) {
        this.executeFetch(
            () => fetchTeamSuggestionsFromAI(team),
            "The AI couldn't find any specific suggestions for your current team."
        );
    }
    
    public async fetchByName(name: string) {
        this.setState({ isLoading: true, error: null, prospect: null });
        try {
            const data = await fetchPokemonDetails(name);
            this.setState({ 
                prospectList: [{ name: data.name, id: data.id }], 
                currentIndex: 0, 
                prospect: data, 
                isLoading: false 
            });
        } catch(err) {
            this.setState({
                error: err instanceof Error ? err.message : `Could not find "${name}".`,
                isLoading: false,
                prospectList: []
            });
        }
    }
}

export const prospectorStateService = new ProspectorStateService();