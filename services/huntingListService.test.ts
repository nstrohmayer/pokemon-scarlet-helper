
import { HuntingListService } from './huntingListService';
import { HUNTING_LIST_STORAGE_KEY } from '../constants';
import { HuntingListMap } from '../types';

// --- Simple Test Runner ---
// This provides basic describe/it/expect functionality without a full framework like Jest.
const testResults = { successes: 0, failures: 0 };
const describe = (description: string, fn: () => void) => {
  console.log(`\n--- ${description} ---`);
  fn();
};
const it = (description: string, fn: () => void) => {
  try {
    fn();
    console.log(`  ✓ ${description}`);
    testResults.successes++;
  } catch (error) {
    console.error(`  ✗ ${description}`);
    console.error(error);
    testResults.failures++;
  }
};
const expect = (actual: any) => ({
  toBe: (expected: any) => {
    if (actual !== expected) {
      throw new Error(`\nExpected: ${expected}\nReceived: ${actual}`);
    }
  },
  toEqual: (expected: any) => {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
      throw new Error(`\nExpected: ${expectedStr}\nReceived: ${actualStr}`);
    }
  },
  toHaveBeenCalledWith: (expected: any) => {
    const mock = actual as { calls: any[] };
    if (!mock.calls || mock.calls.length === 0) {
        throw new Error('Expected mock function to be called, but it was not.');
    }
    const lastCallArgs = mock.calls[mock.calls.length - 1];
    if (JSON.stringify(lastCallArgs) !== JSON.stringify(expected)) {
        throw new Error(`\nExpected to be called with: ${JSON.stringify(expected)}\nReceived: ${JSON.stringify(lastCallArgs)}`);
    }
  },
  toBeInstanceOf: (expected: any) => {
    if (!(actual instanceof expected)) {
        throw new Error(`Expected instance of ${expected.name} but got ${actual.constructor.name}`);
    }
  }
});

const createMockFn = () => {
    const mock = (...args: any[]) => {
        mock.calls.push(args);
    };
    mock.calls = [] as any[];
    return mock;
};


// --- Mock localStorage for Node Test Environment ---
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });


// --- Test Suite ---
describe('HuntingListService', () => {
    let service: HuntingListService;

    // Runs before each 'it' block
    const beforeEach = () => {
        localStorageMock.clear();
        service = new HuntingListService();
    };

    it('should initialize with an empty list if localStorage is empty', () => {
        beforeEach();
        expect(service.getHuntingList()).toEqual({});
    });

    it('should load data from localStorage on initialization', () => {
        const testData: HuntingListMap = { 'Route 1': [{ pokemonId: 25, pokemonName: 'Pikachu' }] };
        localStorageMock.setItem(HUNTING_LIST_STORAGE_KEY, JSON.stringify(testData));
        const newService = new HuntingListService();
        expect(newService.getHuntingList()).toEqual(testData);
    });

    it('should add a new Pokémon to a new area', () => {
        beforeEach();
        service.addToHuntingList(25, 'Pikachu', 'Viridian Forest');
        const expected = { 'Viridian Forest': [{ pokemonId: 25, pokemonName: 'Pikachu' }] };
        expect(service.getHuntingList()).toEqual(expected);
        expect(JSON.parse(localStorageMock.getItem(HUNTING_LIST_STORAGE_KEY)!)).toEqual(expected);
    });
    
    it('should not add a duplicate Pokémon to the same area', () => {
        beforeEach();
        service.addToHuntingList(25, 'Pikachu', 'Viridian Forest');
        service.addToHuntingList(25, 'Pikachu', 'Viridian Forest'); // Add again
        const expected = { 'Viridian Forest': [{ pokemonId: 25, pokemonName: 'Pikachu' }] };
        expect(service.getHuntingList()).toEqual(expected);
    });
    
    it('should add multiple Pokémon using addMultipleToHunt', () => {
        beforeEach();
        const pokemonToAdd = [{ id: 1, name: 'Bulbasaur' }, { id: 4, name: 'Charmander' }];
        service.addMultipleToHunt(pokemonToAdd, 'Starter Choice');
        const expected = { 'Starter Choice': [{ pokemonId: 1, pokemonName: 'Bulbasaur' }, { pokemonId: 4, pokemonName: 'Charmander' }] };
        expect(service.getHuntingList()).toEqual(expected);
    });

    it('should use "Navigator Hunt" as default area for addMultipleToHunt', () => {
        beforeEach();
        const pokemonToAdd = [{ id: 906, name: 'Sprigatito' }];
        service.addMultipleToHunt(pokemonToAdd);
        const expected = { 'Navigator Hunt': [{ pokemonId: 906, pokemonName: 'Sprigatito' }] };
        expect(service.getHuntingList()).toEqual(expected);
    });
    
    it('should not add duplicates when using addMultipleToHunt', () => {
        beforeEach();
        service.addToHuntingList(1, 'Bulbasaur', 'Starter Choice'); // Pre-existing
        const pokemonToAdd = [{ id: 1, name: 'Bulbasaur' }, { id: 4, name: 'Charmander' }];
        service.addMultipleToHunt(pokemonToAdd, 'Starter Choice');
        const expected = { 'Starter Choice': [{ pokemonId: 1, pokemonName: 'Bulbasaur' }, { pokemonId: 4, pokemonName: 'Charmander' }] };
        expect(service.getHuntingList()).toEqual(expected);
    });

    it('should remove a Pokémon from an area', () => {
        beforeEach();
        service.addToHuntingList(25, 'Pikachu', 'Viridian Forest');
        service.addToHuntingList(10, 'Caterpie', 'Viridian Forest');
        service.removeFromHuntingList(25, 'Viridian Forest');
        const expected = { 'Viridian Forest': [{ pokemonId: 10, pokemonName: 'Caterpie' }] };
        expect(service.getHuntingList()).toEqual(expected);
    });
    
    it('should remove an area if it becomes empty after removing a Pokémon', () => {
        beforeEach();
        service.addToHuntingList(25, 'Pikachu', 'Viridian Forest');
        service.removeFromHuntingList(25, 'Viridian Forest');
        expect(service.getHuntingList()).toEqual({});
        expect(localStorageMock.getItem(HUNTING_LIST_STORAGE_KEY)).toEqual('{}');
    });

    it('should notify subscribed listeners when the list changes', () => {
        beforeEach();
        const listener = createMockFn();
        service.subscribe(listener);
        
        service.addToHuntingList(25, 'Pikachu', 'Some Area');
        const expected = { 'Some Area': [{ pokemonId: 25, pokemonName: 'Pikachu' }] };
        
        expect(listener.calls.length).toBe(1);
        expect(listener.calls[0][0]).toEqual(expected);
    });
    
    it('should stop notifying listeners after they unsubscribe', () => {
        beforeEach();
        const listener = createMockFn();
        const unsubscribe = service.subscribe(listener);

        service.addToHuntingList(25, 'Pikachu', 'Some Area');
        expect(listener.calls.length).toBe(1);

        unsubscribe();

        service.removeFromHuntingList(25, 'Some Area');
        expect(listener.calls.length).toBe(1); // Should not have increased
    });

    it('getHuntingList should return a deep copy to prevent mutation', () => {
        beforeEach();
        service.addToHuntingList(1, 'Bulbasaur', 'Pallet Town');
        const list = service.getHuntingList();
        
        // Mutate the retrieved list
        list['Pallet Town'][0].pokemonName = 'Modified';
        
        // The service's internal list should remain unchanged
        const pristineList = service.getHuntingList();
        expect(pristineList['Pallet Town'][0].pokemonName).toBe('Bulbasaur');
    });
});

console.log(`\nTests finished with ${testResults.successes} successes and ${testResults.failures} failures.`);

// To run these tests, you could use a tool like 'ts-node':
// ts-node services/huntingListService.test.ts
