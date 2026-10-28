import { create } from 'zustand'

interface States {
	isModelLoading: boolean;
	isWorkerReady: boolean;
	isTranscribing: boolean;
	isRecording: boolean;
}

interface AppState {
	error: string | null;
	loadingProgress: number;
	states: States;
	transcribingText: string;
	setError: (newError: string | null) => void;
	setLoadingProgress: (progress: number) => void;
	setTranscribingText: (transcribingText: string) => void;
	setState: (state: Partial<States>) => void;
}

export const useAppStore = create<AppState>()((set) => ({
	error: null,
	loadingProgress: 0,
	transcribingText: '',
	states: {
		isModelLoading: true,
		isWorkerReady: false,
		isTranscribing: false,
		isRecording: false,
	},
	setError: (error: string | null) => set({ error }),
	setLoadingProgress: (progress: number) => set({ loadingProgress: progress }),
	setTranscribingText: (transcribingText: string) => set({ transcribingText }),
	setState: (state) => set(store => ({ states: { ...store.states, ...state } })),
}))
