
import { useState, useEffect, useCallback } from 'react';
import { StoryGoal, TeamMember, GameLocationNode, ChatMessage } from '../types';
import { CUSTOM_GOALS_STORAGE_KEY, STORY_CHAT_HISTORY_STORAGE_KEY } from '../constants';

// This function now uses a secure proxy and requires an updated signature
async function sendChatMessageToProxy(
  message: string,
  history: ChatMessage[],
  context: object
): Promise<string> {
    const response = await fetch('/api/gemini-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'sendChatMessage',
            payload: { message, history, context }
        }),
    });
    const responseData = await response.json();
    if (!response.ok) {
        throw new Error(responseData.error || `Server responded with ${response.status}`);
    }
    return responseData;
}


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
  
  // AI-related state for goals is now removed.
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

  const addCustomGoalWithAi = useCallback((text: string) => {
      // AI goal enrichment is deprecated in favor of secure proxy architecture.
      // This function now behaves like a simple add.
      console.warn("AI Goal Enrichment is deprecated. Adding goal manually.");
      addCustomGoal(text);
  }, [addCustomGoal]);

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
    const currentHistory = [...chatHistory, userMessage];
    setChatHistory(currentHistory);

    try {
      const context = {
        currentLocation,
        nextBattle,
        team,
        customGoals: customGoals.filter(g => !g.isCompleted)
      };

      const modelResponseText = await sendChatMessageToProxy(message, chatHistory, context);
      
      if (typeof modelResponseText !== 'string' || modelResponseText.trim() === "") {
        throw new Error("The AI returned an empty response.");
      }

      const modelMessage: ChatMessage = { role: 'model', text: modelResponseText };
      setChatHistory(prev => [...prev, modelMessage]);

    } catch (err) {
      console.error("Error sending chat message:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred while getting advice.";
      setChatError(errorMessage);
      // Remove the user's last message on error
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