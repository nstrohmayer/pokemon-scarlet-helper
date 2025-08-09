

import { useState, useCallback } from 'react';
import { fetchNavigatorGuidanceFromGemini, parseHuntIntentFromGemini } from '../services/geminiService';
import { huntingListService } from '../services/huntingListService';

export type ActiveMainPanelType = 'location' | 'navigator' | 'starterSelection' | 'teamBuilder';

interface UseNavigatorProps {
  onHuntSuccess: () => void;
}

export const useNavigator = ({ onHuntSuccess }: UseNavigatorProps) => {
  const [activeMainPanel, setActiveMainPanel] = useState<ActiveMainPanelType>('teamBuilder');
  const [navigatorUserPrompt, setNavigatorUserPrompt] = useState<string>("");
  const [navigatorGeminiResponse, setNavigatorGeminiResponse] = useState<string | null>(null);
  const [isLoadingNavigatorQuery, setIsLoadingNavigatorQuery] = useState<boolean>(false);
  const [navigatorError, setNavigatorError] = useState<string | null>(null);

  const switchToNavigatorPanel = useCallback(() => {
    setActiveMainPanel('teamBuilder');
  }, []);

  const handleNavigatorReset = useCallback(() => {
    setNavigatorUserPrompt("");
    setNavigatorGeminiResponse(null);
    setNavigatorError(null);
    setIsLoadingNavigatorQuery(false);
  }, []);

  const handleNavigatorSubmit = useCallback(async (prompt: string) => {
    setNavigatorUserPrompt(prompt);
    setNavigatorError(null);
    setNavigatorGeminiResponse(null);

    // Special handling for "hunt" command for better UX
    if (prompt.toLowerCase().startsWith('i want to hunt')) {
        setIsLoadingNavigatorQuery(true); // Show a brief spinner for feedback
        
        try {
            const pokemonToHunt = await parseHuntIntentFromGemini(prompt);
            if (pokemonToHunt.length > 0) {
                huntingListService.addMultipleToHunt(pokemonToHunt);
                onHuntSuccess(); // Trigger the view switch
                handleNavigatorReset(); // Clear the form
            } else {
                setNavigatorGeminiResponse("I couldn't figure out which Pokémon you wanted to hunt. Please try being more specific, like 'I want to hunt all the Paldean starters'.");
            }
        } catch (err) {
            console.error("Error parsing hunt intent:", err);
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred while processing your hunt request.";
            setNavigatorGeminiResponse(null);
            setNavigatorError(errorMessage);
        } finally {
            setIsLoadingNavigatorQuery(false);
        }
        return; // End execution for the hunt command
    }

    // Default behavior for all other questions
    setIsLoadingNavigatorQuery(true);
    try {
      const response = await fetchNavigatorGuidanceFromGemini(prompt);
      setNavigatorGeminiResponse(response);
    } catch (err) {
      console.error("Error fetching navigator guidance:", err);
      setNavigatorError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoadingNavigatorQuery(false);
    }
  }, [onHuntSuccess, handleNavigatorReset]);

  return {
    activeMainPanel,
    setActiveMainPanel, // Expose this for useGameProgression and App
    navigatorUserPrompt,
    navigatorGeminiResponse,
    isLoadingNavigatorQuery,
    navigatorError,
    switchToNavigatorPanel,
    handleNavigatorSubmit,
    handleNavigatorReset,
  };
};