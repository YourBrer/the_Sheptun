import { type AutomaticSpeechRecognitionPipeline, pipeline } from '@huggingface/transformers';

export const WorkerMessageTypes = {
	Progress: 'progress',
	Done: 'done',
	Error: 'error',
	Load: 'load',
	Transcribe: 'transcribe',
	Text: 'text',
}
type WorkerMessageType = typeof WorkerMessageTypes[keyof typeof WorkerMessageTypes];

export interface WorkerMessage {
	type: WorkerMessageType;
	payload: any,
}

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;

// загружаем модель: из интернетов - если приложение запущено впервые, из cache storage - если
// модель туда уже когда-то загружалось (повторные запуски приложения)
self.onmessage = async ({ data }) => {
	switch (data.type) {
		// TODO продумать реализацию хранения и доставки модели со своего сервера
		case WorkerMessageTypes.Load:
			const modelId = 'Xenova/whisper-base'; // 317 Mb
			// const modelId = 'onnx-community/whisper-tiny'; // 178 Mb
			let intervalId: NodeJS.Timeout | null = null;
			let lastProgressValue = 0;
			try {
				transcriber = await pipeline(
					'automatic-speech-recognition',
					modelId,
					{
						device: 'webgpu',
						progress_callback: info => {
							if (info.status !== 'progress_total') return;

							lastProgressValue = Math.trunc(info.progress);

							if (!intervalId) {
								intervalId = setInterval(() => {
									self.postMessage({ type: WorkerMessageTypes.Progress, payload: lastProgressValue })
								}, 1000)
							}
						}
					}
				);

			} catch (e) {
				self.postMessage({ type: WorkerMessageTypes.Error, payload: 'Не удалось загрузить модель' });
				console.error(e);
			} finally {
				self.postMessage({ type: WorkerMessageTypes.Done, payload: null })
				if (intervalId) clearInterval(intervalId)
			}
			break;
		case WorkerMessageTypes.Transcribe:
			if (!transcriber) return;

			const result = await transcriber(data.payload, { language: 'russian', task: 'transcribe' });
			self.postMessage({
				type: WorkerMessageTypes.Text,
				payload: Array.isArray(result) ? result.map(i => i.text).join(' ') : result.text
			})
			break;
		default:
			break;
	}
};
