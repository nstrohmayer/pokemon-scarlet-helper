import { StoryGoal } from '../types';
import { CUSTOM_GOALS_STORAGE_KEY } from '../constants';
import { parseComplexGoalFromGemini } from './geminiService';
import { huntingListService } from './huntingListService';

type GoalState = {
    customGoals: StoryGoal[];
    isAiGoalLoading: boolean;
    aiGoalError: string | null;
};

type Listener = (state: GoalState) => void;

class StoryGoalsService {
    private state: GoalState = {
        customGoals: [],
        isAiGoalLoading: false,
        aiGoalError: null,
    };
    private listeners: Listener[] = [];

    constructor() {
        this.loadFromStorage();
    }
    
    private loadFromStorage() {
        if (typeof localStorage === 'undefined') return;
        try {
            const stored = localStorage.getItem(CUSTOM_GOALS_STORAGE_KEY);
            if (stored) {
                this.state.customGoals = JSON.parse(stored);
            }
        } catch (e) {
            console.error("Failed to load story goals from localStorage", e);
            this.state.customGoals = [];
        }
    }

    private saveToStorage() {
        if (typeof localStorage === 'undefined') return;
        try {
            localStorage.setItem(CUSTOM_GOALS_STORAGE_KEY, JSON.stringify(this.state.customGoals));
        } catch (e) {
            console.error("Failed to save story goals to localStorage", e);
        }
    }
    
    private setState(newState: Partial<GoalState>) {
        this.state = { ...this.state, ...newState };
        this.notifyListeners();
    }

    private notifyListeners() {
        const stateCopy = this.getState();
        this.listeners.forEach(listener => listener(stateCopy));
    }

    public subscribe(listener: Listener): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    public getState(): GoalState {
        return JSON.parse(JSON.stringify(this.state));
    }
    
    public addCustomGoal = (text: string) => {
        if (text.trim()) {
            const newGoal: StoryGoal = { id: Date.now().toString(), text: text.trim(), isCompleted: false };
            this.setState({ customGoals: [...this.state.customGoals, newGoal] });
            this.saveToStorage();
        }
    };
    
    public toggleCustomGoal = (id: string) => {
        const newGoals = this.state.customGoals.map(goal => goal.id === id ? { ...goal, isCompleted: !goal.isCompleted } : goal);
        this.setState({ customGoals: newGoals });
        this.saveToStorage();
    };

    public deleteCustomGoal = (id: string) => {
        const newGoals = this.state.customGoals.filter(goal => goal.id !== id);
        this.setState({ customGoals: newGoals });
        this.saveToStorage();
    };

    public addComplexGoalFromPrompt = async (prompt: string) => {
        this.setState({ isAiGoalLoading: true, aiGoalError: null });
        try {
            const complexGoals = await parseComplexGoalFromGemini(prompt);

            if (complexGoals.length === 0) {
                throw new Error("The AI couldn't determine any specific goals from your prompt. Please try being more descriptive.");
            }

            const newGoals: StoryGoal[] = complexGoals.map(g => ({
                id: `${Date.now()}-${g.pokemonId || Math.random().toString(36).substring(2, 9)}`,
                text: g.goalText,
                isCompleted: false,
            }));

            const pokemonToHunt = complexGoals
                .filter(g => g.pokemonId && g.pokemonName)
                .map(g => ({ id: g.pokemonId!, name: g.pokemonName! }));

            if (pokemonToHunt.length > 0) {
                const areaName = `Goal: ${prompt.substring(0, 30)}${prompt.length > 30 ? '...' : ''}`;
                huntingListService.addMultipleToHunt(pokemonToHunt, areaName);
            }

            this.setState({
                customGoals: [...this.state.customGoals, ...newGoals],
                isAiGoalLoading: false,
            });
            this.saveToStorage();

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            this.setState({ isAiGoalLoading: false, aiGoalError: errorMessage });
        }
    };
}

export const storyGoalsService = new StoryGoalsService();
