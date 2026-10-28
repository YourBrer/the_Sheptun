import { type RefObject, useEffect, useEffectEvent, useRef } from "react";
import { useAppStore } from "../store/appStore.ts";
import { type WorkerMessage, WorkerMessageTypes } from "./messages.ts";

export function useModelWorker(): RefObject<Worker | null> {
	const setError = useAppStore(state => state.setError);
	const setLoadingProgress = useAppStore(state => state.setLoadingProgress);
	const setState = useAppStore(state => state.setState);
	const setTranscribingText = useAppStore(state => state.setTranscribingText);

	// Worker нужен только внутри колбэков, а не во время рендера, поэтому храним его в ref.
	const workerRef = useRef<Worker | null>(null);

	// Effect Event: обработчик всегда видит актуальные экшены стора,
	// но не является причиной пересоздания воркера.
	const handleMessage = useEffectEvent(({ type, payload }: WorkerMessage) => {
		switch (type) {
			case WorkerMessageTypes.Progress:
				setLoadingProgress(payload);
				break;
			case WorkerMessageTypes.Done:
				setState({ isModelLoading: false });
				break;
			case WorkerMessageTypes.Error:
				setError(payload);
				setState({ isModelLoading: false, isTranscribing: false });
				break;
			case WorkerMessageTypes.Text:
				setTranscribingText(payload);
				setState({ isTranscribing: false });
				break;
			default:
				break;
		}
	});

	// Создание Worker — это side effect, поэтому делаем его в useEffect,
	// а не в useMemo: React вправе выбросить значение из useMemo, и тогда воркер утечёт.
	useEffect(() => {
		if (!window.Worker) {
			setError('Браузер не поддерживает Web Workers');
			setState({ isModelLoading: false });
			return;
		}

		const worker = new Worker(
			new URL('./downloadModel.worker.ts', import.meta.url),
			{ type: 'module' }
		);

		worker.onerror = (e: ErrorEvent) => {
			setError(e.message || 'Ошибка при загрузке модели');
			setState({ isModelLoading: false, isTranscribing: false });
		};
		worker.onmessage = ({ data }: MessageEvent<WorkerMessage>) => handleMessage(data);

		worker.postMessage({ type: WorkerMessageTypes.Load, payload: null } satisfies WorkerMessage);
		workerRef.current = worker;
		setState({ isWorkerReady: true });

		return () => {
			worker.terminate();
			workerRef.current = null;
		};
	}, [setError, setState]);

	return workerRef;
}
