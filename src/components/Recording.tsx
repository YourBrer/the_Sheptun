import { WorkerMessageTypes } from "../workers/downloadModel.worker.ts";
import { useEffect, useRef } from "react";
import { useModelWorker } from "../workers/useModelWorker.ts";
import { useAppStore } from "../store/appStore.ts";

export function Recording() {
	const worker = useModelWorker();

	const isRecording = useAppStore(store => store.states.isRecording);
	const isModelLoading = useAppStore(store => store.states.isModelLoading);
	const isTranscribing = useAppStore(store => store.states.isTranscribing);
	const transcribingText = useAppStore(store => store.transcribingText);
	const loadingProgress = useAppStore(store => store.loadingProgress);
	const setError = useAppStore(store => store.setError);
	const setState = useAppStore(store => store.setState);

	const audioURLRef = useRef<string | null>(null);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);

	function startRecording() {
		navigator.mediaDevices.getUserMedia({ audio: true })
		.then((stream) => {
			const recorder = new MediaRecorder(stream);
			mediaRecorderRef.current = recorder;
			const chunks: Blob[] = [];

			recorder.ondataavailable = (event) => {
				if (event.data.size > 0) chunks.push(event.data);
			};

			recorder.onstop = () => {
				const blob = new Blob(chunks, { type: 'audio/webm' });
				if (audioURLRef.current) URL.revokeObjectURL(audioURLRef.current);
				const url = URL.createObjectURL(blob);
				audioURLRef.current = url;

				void processAndSendAudio(url);

				stream.getTracks().forEach((track) => track.stop());
				setState({ isRecording: false });
			};

			recorder.start();
			setState({ isRecording: true });
		})
		.catch((error) => {
			setError('Не удалось получить доступ к микрофону: ' + error.message);
		});
	}

	function stopRecording() {
		if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
			mediaRecorderRef.current.stop();
		}
	}

	async function processAndSendAudio(audioFileOrUrl: string) {
		if (!worker) return;

		const response = await fetch(audioFileOrUrl);
		const arrayBuffer = await response.arrayBuffer();
		const audioCtx = new window.AudioContext({ sampleRate: 16000 });
		const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
		const float32Data = audioBuffer.getChannelData(0);
		await audioCtx.close();

		setState({ isTranscribing: true });
		worker.postMessage({
			type: WorkerMessageTypes.Transcribe,
			payload: float32Data
		});
	}

	// удаляем аудио из памяти и останавливаем воспроизведение
	useEffect(() => {
		return () => {
			if (audioURLRef.current) {
				URL.revokeObjectURL(audioURLRef.current);
			}
			if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
				mediaRecorderRef.current.stop();
			}
		};
	}, []);

	if (!worker) return <h3 className='font-semibold'>Проблема с загрузкой модели</h3>;

	return isModelLoading
		? <div className='flex flex-col gap-2 justify-center items-center h-full'>
			<h3 className='font-semibold'>Загрузка модели...</h3>
			<progress className="progress w-56 progress-neutral" value={loadingProgress} max={100} />
		</div>
		: <div className='flex flex-col justify-center items-center h-full gap-4'>
			{isTranscribing
				? <h3 className='font-semibold'>Транскрибирую...</h3>
				: <div className='flex gap-4'>
					<button className='btn btn-primary' onClick={startRecording} disabled={isRecording}>
						{isRecording ? 'Идёт запись...' : 'Запись'}
					</button>
					<button className='btn btn-secondary' onClick={stopRecording}>
						Стоп
					</button>
				</div>
			}
			{transcribingText && <h3 className='mt-3 font-semibold max-w-full'>{transcribingText}</h3>}
		</div>
}
