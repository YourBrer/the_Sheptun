import { useAppStore } from "../store/appStore.ts";
import { type WorkerMessage, WorkerMessageTypes } from "./downloadModel.worker.ts";
import { useEffect, useMemo } from "react";

export function useModelWorker(): Worker | undefined {
	const setError = useAppStore(state => state.setError);
	const setLoadingProgress = useAppStore(state => state.setLoadingProgress);
	const setState = useAppStore(state => state.setState);
	const setTranscribingText = useAppStore(state => state.setTranscribingText);

	const worker = useMemo(() => {
		if (!window.Worker) return;

		const worker = new Worker(
			new URL('./downloadModel.worker.ts', import.meta.url),
			{ type: 'module' }
		)

		worker.onerror = e => setError(e.message);
		worker.onmessage = ({ data: { type, payload } }: { data: WorkerMessage }) => {
			switch (type) {
				case WorkerMessageTypes.Progress:
					setLoadingProgress(payload as number);
					break;
				case WorkerMessageTypes.Done:
					setState({ isModelLoading: false });
					break;
				case WorkerMessageTypes.Error:
					setError(payload)
					break;
				case WorkerMessageTypes.Text:
					setTranscribingText(payload);
					setState({ isTranscribing: false });
					break;
				default:
					break;
			}
		}

		worker.postMessage({ type: WorkerMessageTypes.Load, payload: null });

		return worker;
	}, [setError, setLoadingProgress, setState, setTranscribingText]);

	useEffect(() => {
		return () => {
			if (worker) worker.terminate();
		}
	}, [worker])

	return worker;
}
