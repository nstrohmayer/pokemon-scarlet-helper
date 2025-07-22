

import React from 'react';
import { FormattedResponseProps, GameLocationNode } from '../types';

/**
 * A component that takes a raw string response from the AI,
 * parses it for special syntax like {{PokemonName}} and [[LocationName]],
 * and renders it with interactive, clickable links.
 * It also handles basic markdown like paragraphs and unordered lists.
 */
export const FormattedResponse: React.FC<FormattedResponseProps> = ({
  responseText,
  gameLocations,
  onPokemonNameClick,
  onLocationNameClick,
}) => {

  const parseAndRenderText = (text: string) => {
    // Regex to match {{PokemonName}} or [[LocationName]] globally
    const regex = /(\{\{.*?\}\})|(\[\[.*?\]\])/g;
    // Split the text by our regex, keeping the delimiters, and filter out empty strings
    const parts = text.split(regex).filter(part => part);

    return parts.map((part, index) => {
      // Check for Pokémon pattern: {{PokemonName}}
      if (part.startsWith('{{') && part.endsWith('}}')) {
        const pokemonName = part.substring(2, part.length - 2);
        return (
          <button
            key={`${pokemonName}-${index}`}
            onClick={() => onPokemonNameClick(pokemonName)}
            className="text-yellow-400 hover:text-yellow-300 font-semibold hover:underline focus:underline transition-colors duration-150 focus:outline-none"
            aria-label={`View details for ${pokemonName}`}
          >
            {pokemonName}
          </button>
        );
      }

      // Check for Location pattern: [[LocationName]]
      if (part.startsWith('[[') && part.endsWith(']]')) {
        const locationName = part.substring(2, part.length - 2);
        const locationNode = gameLocations.find(loc => loc.name.toLowerCase() === locationName.toLowerCase());

        if (locationNode) {
          return (
            <button
              key={`${locationName}-${index}`}
              onClick={() => onLocationNameClick(locationNode)}
              className="text-emerald-400 hover:text-emerald-300 font-semibold hover:underline focus:underline transition-colors duration-150 focus:outline-none"
              aria-label={`Go to ${locationName}`}
            >
              {locationName}
            </button>
          );
        }
        // If location is not found in the game data, render it as plain text to avoid errors
        return <span key={index}>{locationName}</span>;
      }
      
      // If it's not a special pattern, it's just regular text
      return <span key={index}>{part}</span>;
    });
  };

  // Process the raw response text into blocks of paragraphs and lists
  const lines = responseText.split('\n').map(l => l.trim());
  const contentBlocks: Array<{ type: 'paragraph'; content: string } | { type: 'list'; items: string[] }> = [];
  let currentListItems: string[] = [];

  for (const line of lines) {
    if (line.length === 0) {
        // If there's an empty line, it breaks the current list.
        if (currentListItems.length > 0) {
            contentBlocks.push({ type: 'list', items: currentListItems });
            currentListItems = [];
        }
        continue;
    }

    if (line.startsWith('* ') || line.startsWith('- ')) {
      currentListItems.push(line.substring(2));
    } else {
      // If we encounter a non-list line, the current list (if any) has ended.
      if (currentListItems.length > 0) {
        contentBlocks.push({ type: 'list', items: currentListItems });
        currentListItems = [];
      }
      contentBlocks.push({ type: 'paragraph', content: line });
    }
  }

  // Add any remaining list items at the end of the text
  if (currentListItems.length > 0) {
    contentBlocks.push({ type: 'list', items: currentListItems });
  }

  return (
    <div className="space-y-4">
      {contentBlocks.map((block, index) => {
        if (block.type === 'list') {
          return (
            <ul key={index} className="list-disc list-inside ml-4 space-y-1">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{parseAndRenderText(item)}</li>
              ))}
            </ul>
          );
        } else { // paragraph
          return (
            <p key={index} className="leading-relaxed">
                {parseAndRenderText(block.content)}
            </p>
          );
        }
      })}
    </div>
  );
};