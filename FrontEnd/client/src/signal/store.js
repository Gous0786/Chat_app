import { SignalProtocolStore } from './SignalProtocolStore';

// Single shared store instance so every module talks to the same IndexedDB.
export const signalStore = new SignalProtocolStore();
