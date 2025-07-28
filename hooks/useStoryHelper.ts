



import { useState, useEffect, useCallback } from 'react';
import { StoryGoal, TeamMember, GameLocationNode, ChatMessage } from '../types';
import { fetchGoalDetailsFromGemini, fetchChatContinuation } from '../services/geminiService';
import { CUSTOM_GOALS_STORAGE_KEY, STORY_CHAT_HISTORY_STORAGE_KEY } from '../constants';

export const useStoryHelper = (
  team: TeamMember[],
  currentLocation: GameLocationNode | null,
  nextBattle: { name: string | null; location: string | null; level: number | null }
) => {
  // --- Custom Goals State ---
  const [customGoals, setCustomGoals] = useState<StoryGoal[]>(() => {
    try {
      const storedGoals = localStorage.getItem(CUSTOM_GOALS_STORAGE_KEY);
      return storedGoals ? JSON.parse(storedGoals) : [];
    } catch (e) {
      console.error("Failed to load story goals from localStorage", e);
      return [];
    }
  });
  
  const [isAiGoalLoading, setIsAiGoalLoading] = useState<boolean>(false);
  const [aiGoalError, setAiGoalError] = useState<string | null>(null);

  // --- Chat State ---
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
     try {
      const storedHistory = localStorage.getItem(STORY_CHAT_HISTORY_STORAGE_KEY);
      return storedHistory ? JSON.parse(storedHistory) : [];
    } catch (e) {
      console.error("Failed to load chat history from localStorage", e);
      return [];
    }
  });

  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // --- Effects for Persistence ---
  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_GOALS_STORAGE_KEY, JSON.stringify(customGoals));
    } catch (e) {
      console.error("Failed to save story goals to localStorage", e);
    }
  }, [customGoals]);

  useEffect(() => {
    try {
      localStorage.setItem(STORY_CHAT_HISTORY_STORAGE_KEY, JSON.stringify(chatHistory));
    } catch (e) {
      console.error("Failed to save chat history to localStorage", e);
    }
  }, [chatHistory]);


  // --- Custom Goals Logic ---
  const addCustomGoal = useCallback((text: string) => {
    if (text.trim()) {
      const newGoal: StoryGoal = { id: Date.now().toString(), text: text.trim(), isCompleted: false };
      setCustomGoals(prev => [...prev, newGoal]);
    }
  }, []);

  const addCustomGoalWithAi = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setIsAiGoalLoading(true);
    setAiGoalError(null);
    try {
      const aiDetails = await fetchGoalDetailsFromGemini(text, team, currentLocation, nextBattle);
      const newGoal: StoryGoal = {
        id: Date.now().toString(), text: aiDetails.refinedGoalText || text, isCompleted: false,
        aiLevel: aiDetails.level, aiPokemonCount: aiDetails.pokemonCount, aiNotes: aiDetails.notes
      };
      setCustomGoals(prev => [...prev, newGoal]);
    } catch (err) {
        console.error("Error fetching AI goal details:", err);
        setAiGoalError(err instanceof Error ? err.message : "An unknown error occurred while thinking.");
    } finally {
        setIsAiGoalLoading(false);
    }
  }, [team, currentLocation, nextBattle]);

  const toggleCustomGoal = useCallback((id: string) => {
    setCustomGoals(prev => prev.map(goal => goal.id === id ? { ...goal, isCompleted: !goal.isCompleted } : goal));
  }, []);

  const deleteCustomGoal = useCallback((id: string) => {
    setCustomGoals(prev => prev.filter(goal => goal.id !== id));
  }, []);

  // --- Chat Logic ---
  const sendChatMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    setIsChatLoading(true);
    setChatError(null);
    
    const userMessage: ChatMessage = { role: 'user', text: message };
    const currentHistory: ChatMessage[] = [...chatHistory, userMessage];
    setChatHistory(currentHistory);
    
    try {
      let contextPrompt = "My current game status:\n";
      contextPrompt += `*   Current Location: ${currentLocation?.name || 'Not specified'}\n`;
      if (nextBattle.name && nextBattle.location && nextBattle.level) {
          contextPrompt += `*   Next Major Battle: ${nextBattle.name} in [[${nextBattle.location}]] (Level Cap: ${nextBattle.level})\n`;
      }
      if (team.length > 0) {
          const teamSummary = team.map(m => `{{${m.species}}} (Lvl ${m.level})`).join(', ');
          contextPrompt += `*   Current Team: ${teamSummary}\n`;
      }
      if (customGoals.length > 0) {
          const goalSummary = customGoals.filter(g => !g.isCompleted).map(g => g.text).join('; ');
          if (goalSummary) {
              contextPrompt += `*   My Custom Goals: ${goalSummary}\n`;
          }
      }
      contextPrompt += `\nMy question is: ${message}`;
        
      const systemInstruction = `
          You are an AI assistant for a Pokemon Nuzlocke challenge application, specifically for the game "Pokémon Scarlet and Violet". You are the "Story Helper". Your goal is to give the player helpful, actionable advice based on their current situation.
          
          Guidelines:
          1.  **Nuzlocke Focus:** All advice must be relevant to a Nuzlocke run (first encounters, avoiding deaths, preparation).
          2.  **Concise & Actionable:** Provide specific actions.
          3.  **Use Context:** Base your advice on the user's current game state, which will be provided with each message.
          4.  **Formatting:** Use a simple markdown list (e.g., starting lines with '* '). When you mention a Pokémon name, wrap it in {{PokemonName}}. When you mention a game location, wrap it in [[LocationName]].
          5.  **Output:** Respond ONLY with plain text advice. Do not add introductions like "Here's what you should do:". Do not wrap your response in JSON or markdown code fences.
      `;

      // Replace the user message text with the fully-formed context prompt for the API call
      const historyForApi: ChatMessage[] = [...chatHistory, {role: 'user', text: contextPrompt}];
      
      const modelResponseText = await fetchChatContinuation(historyForApi, systemInstruction);
      
      const modelMessage: ChatMessage = { role: 'model', text: modelResponseText };
      setChatHistory(prev => [...prev, modelMessage]);

    } catch (err) {
        console.error("Error sending chat message:", err);
        const errorMessage = err instanceof Error ? err.message : "An unknown error occurred while getting advice.";
        setChatError(errorMessage);
        // On error, remove the user's last message from the UI to allow them to retry.
        setChatHistory(prev => prev.slice(0, -1));
    } finally {
        setIsChatLoading(false);
    }

  }, [team, currentLocation, nextBattle, customGoals, chatHistory]);


  return {
    customGoals, addCustomGoal, toggleCustomGoal, deleteCustomGoal,
    addCustomGoalWithAi, isAiGoalLoading, aiGoalError,
    chatHistory, sendChatMessage, isChatLoading, chatError,
  };
};