import React, { useState } from 'react';
import { lockscreenService } from '../services/lockscreenService';

const LockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
    </svg>
);
const UnlockIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2V7a5 5 0 00-5-5zm0 2a3 3 0 013 3v2H7V7a3 3 0 013-3z" />
    </svg>
);

const Modal: React.FC<{ children: React.ReactNode, onClose: () => void, title: string }> = ({ children, onClose, title }) => (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center animate-fadeIn" onClick={onClose}>
        <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-sky-400">{title}</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl" aria-label="Close modal">&times;</button>
            </div>
            {children}
        </div>
    </div>
);

export const LockscreenManager: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isLockModalOpen, setIsLockModalOpen] = useState(false);
    const [generatedPin, setGeneratedPin] = useState<string | null>(null);
    
    const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
    const [inputPin, setInputPin] = useState('');

    const handleLock = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const pin = await lockscreenService.lockState();
            setGeneratedPin(pin);
            setIsLockModalOpen(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleUnlockSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            await lockscreenService.unlockState(inputPin);
            // The service will reload the page on success
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            setIsLoading(false); // Only stop loading on error, as success reloads.
        }
    };
    
    const closeAllModals = () => {
        setIsLockModalOpen(false);
        setIsUnlockModalOpen(false);
        setError(null);
        setInputPin('');
        setGeneratedPin(null);
    };

    return (
        <>
            <div className="py-3 border-b border-t border-slate-700 space-y-2">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider text-center">Sync</p>
                 <div className="flex flex-col space-y-2">
                     <button
                        onClick={handleLock}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center px-3 py-2 text-sm font-semibold rounded-md transition-colors bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 disabled:opacity-50 disabled:cursor-wait"
                    >
                       <LockIcon /> Lock State
                    </button>
                     <button
                        onClick={() => setIsUnlockModalOpen(true)}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center px-3 py-2 text-sm font-semibold rounded-md transition-colors bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 disabled:opacity-50"
                    >
                       <UnlockIcon /> Unlock State
                    </button>
                    {error && !isLockModalOpen && !isUnlockModalOpen && (
                        <p className="text-red-400 text-xs text-center pt-1">{error}</p>
                    )}
                 </div>
            </div>

            {isLockModalOpen && (
                <Modal onClose={closeAllModals} title="State Locked">
                    <p className="text-slate-300 mb-4">Your session is locked. Use this PIN on another device to unlock it. The PIN will expire in 1 hour.</p>
                    <div className="bg-slate-900 text-center p-4 rounded-lg border border-slate-600">
                        <p className="text-4xl font-mono tracking-widest text-emerald-400">{generatedPin}</p>
                    </div>
                     <button onClick={closeAllModals} className="mt-6 w-full py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-md">
                        Got it
                    </button>
                </Modal>
            )}

            {isUnlockModalOpen && (
                 <Modal onClose={closeAllModals} title="Unlock State">
                     <form onSubmit={handleUnlockSubmit}>
                         <p className="text-slate-300 mb-4">Enter the 4-digit PIN to load your saved session. This will overwrite your current state.</p>
                         <input
                            type="text"
                            value={inputPin}
                            onChange={e => setInputPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="1234"
                            maxLength={4}
                            className="w-full bg-slate-700 p-3 rounded-md text-2xl text-center font-mono tracking-widest text-slate-100 border border-slate-600 focus:ring-2 focus:ring-emerald-500"
                        />
                        {error && <p className="text-red-400 text-xs text-center pt-3">{error}</p>}
                        <button type="submit" disabled={isLoading || inputPin.length !== 4} className="mt-6 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md disabled:opacity-50 disabled:cursor-not-allowed">
                            {isLoading ? 'Unlocking...' : 'Unlock'}
                        </button>
                     </form>
                 </Modal>
            )}
        </>
    );
};
