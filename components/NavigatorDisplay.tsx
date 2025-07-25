import React, { useState, useEffect } from 'react';
import { NavigatorDisplayProps } from '../types';
import { FormattedResponse } from './FormattedResponse';

export const NavigatorDisplay: React.FC<NavigatorDisplayProps> = ({
  initialPromptValue,
  onPromptSubmit,
  isLoading,
  apiResponse,
  apiError,
  onReset,
  apiKeyMissing,
  onPokemonNameClick,
  onLocationNameClick,
  gameLocations,
}) => {
  const [currentPrompt, setCurrentPrompt] = useState(initialPromptValue);

  useEffect(() => {
    setCurrentPrompt(initialPromptValue);
  }, [initialPromptValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPrompt.trim() && !isLoading) {
      onPromptSubmit(currentPrompt.trim());
    }
  };

  const handleResetAndClear = () => {
    setCurrentPrompt(""); 
    onReset();
  };

  if (apiKeyMissing) {
    return (
        <div className="bg-red-800/30 border border-red-700 text-red-300 p-6 rounded-lg shadow-xl text-center animate-fadeIn">
            <h1 className="text-2xl font-bold text-red-400 mb-3">Navigator Unavailable</h1>
            <p className="text-slate-200">The Nuzlocke Navigator feature requires a valid API Key.</p>
            <p className="text-slate-300 mt-2 text-sm">Please ensure the <code className="bg-slate-700 px-1 rounded text-xs">API_KEY</code> environment variable is correctly set up.</p>
        </div>
    );
  }


  return (
    <div className="p-2 md:p-4 space-y-6 animate-fadeIn">
      <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">
        Nuzlocke Navigator
      </h1>
      
      <p className="text-slate-300 text-sm md:text-base">
        Ask any question related to your Pokémon Scarlet and Violet Nuzlocke! 
        For example: "What are good counters for the Cortondo Gym?", "Where can I find a specific TM early?", or "Tips for an upcoming rival battle?".
      </p>

      {!apiResponse && !apiError && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="navigatorPrompt" className="block text-sm font-medium text-sky-300 mb-1">
              Your Question:
            </label>
            <textarea
              id="navigatorPrompt"
              value={currentPrompt}
              onChange={(e) => setCurrentPrompt(e.target.value)}
              placeholder="Enter your Pokémon Scarlet and Violet Nuzlocke question here..."
              rows={4}
              className="w-full p-3 bg-slate-700/50 border border-slate-600 rounded-md text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-colors"
              disabled={isLoading}
              aria-label="Nuzlocke question input"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !currentPrompt.trim()}
            className="w-full md:w-auto px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-md shadow-md transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            {isLoading ? 'Consulting...' : 'Ask the Oracle'}
          </button>
        </form>
      )}

      {isLoading && (
        <div className="flex flex-col items-center justify-center h-40 bg-slate-800/50 p-6 rounded-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-purple-500"></div>
          <p className="ml-3 mt-3 text-lg text-slate-300">The Oracle is pondering your query...</p>
        </div>
      )}

      {apiError && !isLoading && (
        <div className="bg-red-800/40 border border-red-600 text-red-200 p-4 rounded-lg shadow-lg animate-fadeIn">
          <h3 className="font-semibold text-lg mb-2">An Error Occurred:</h3>
          <p className="text-sm">{apiError}</p>
          <button
            onClick={handleResetAndClear}
            className="mt-3 px-4 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-black text-sm font-medium rounded-md transition-colors"
          >
            Try a New Question
          </button>
        </div>
      )}

      {apiResponse && !isLoading && !apiError && (
        <div className="bg-slate-700/70 p-4 md:p-6 rounded-lg shadow-xl animate-fadeIn backdrop-blur-sm border border-slate-600">
          <h3 className="text-xl font-semibold text-sky-300 mb-3">The Oracle Responds:</h3>
          <div className="text-slate-200 text-sm md:text-base leading-relaxed">
            <FormattedResponse 
              responseText={apiResponse}
              gameLocations={gameLocations}
              onPokemonNameClick={onPokemonNameClick}
              onLocationNameClick={onLocationNameClick}
            />
          </div>
          <button
            onClick={handleResetAndClear}
            className="mt-4 px-5 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-md transition-colors shadow"
          >
            Ask Another Question
          </button>
        </div>
      )}
    </div>
  );
};