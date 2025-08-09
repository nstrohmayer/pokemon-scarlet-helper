import { AppState } from '../types';
import {
    CURRENT_LOCATION_ID_STORAGE_KEY,
    TEAM_STORAGE_KEY,
    CAUGHT_POKEMON_STORAGE_KEY,
    COMPLETED_BATTLES_STORAGE_KEY,
    CUSTOM_GOALS_STORAGE_KEY,
    STORY_CHAT_HISTORY_STORAGE_KEY,
    LIKED_POKEMON_STORAGE_KEY,
    HUNTING_LIST_STORAGE_KEY
} from '../constants';

const ALL_STORAGE_KEYS = [
    CURRENT_LOCATION_ID_STORAGE_KEY,
    TEAM_STORAGE_KEY,
    CAUGHT_POKEMON_STORAGE_KEY,
    COMPLETED_BATTLES_STORAGE_KEY,
    CUSTOM_GOALS_STORAGE_KEY,
    STORY_CHAT_HISTORY_STORAGE_KEY,
    LIKED_POKEMON_STORAGE_KEY,
    HUNTING_LIST_STORAGE_KEY,
];

class LockscreenService {
    private gatherState(): AppState {
        const appState: AppState = {};
        for (const key of ALL_STORAGE_KEYS) {
            const value = localStorage.getItem(key);
            if (value) {
                appState[key] = value;
            }
        }
        return appState;
    }

    public async lockState(): Promise<string> {
        const appState = this.gatherState();
        if (Object.keys(appState).length === 0) {
            throw new Error("There is no data to lock.");
        }
        
        const response = await fetch('/.netlify/functions/state-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appState),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "Failed to lock state on the server.");
        }
        
        return data.pin;
    }

    public async unlockState(pin: string): Promise<void> {
        if (!/^\d{4}$/.test(pin)) {
            throw new Error("PIN must be 4 digits.");
        }

        const response = await fetch(`/.netlify/functions/state-sync?pin=${pin}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to retrieve state from the server.");
        }

        const appState: AppState = data;
        
        // Clear existing state before applying the new one
        localStorage.clear();

        for (const key in appState) {
            if (Object.prototype.hasOwnProperty.call(appState, key)) {
                localStorage.setItem(key, appState[key]);
            }
        }

        // Reload the page to apply the new state from localStorage
        window.location.reload();
    }
}

export const lockscreenService = new LockscreenService();
