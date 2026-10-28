import { type AutomaticSpeechRecognitionPipeline, pipeline } from '@huggingface/transformers';
import { type WorkerMessage, WorkerMessageTypes } from './messages.ts';

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;

// загружаем модель: из интернетов - если приложение запущено впервые, из cache storage - если
// модель туда уже когда-то загружалось (повторные запуски приложения)
self.onmessage = async ({ data }: MessageEvent<WorkerMessage>) => {
	switch (data.type) {
		// TODO продумать реализацию хранения и доставки модели со своего сервера
		case WorkerMessageTypes.Load: {
			const modelId = 'Xenova/whisper-base'; // 317 Mb
			// const modelId = 'onnx-community/whisper-tiny'; // 178 Mb
			try {
				transcriber = await pipeline(
					'automatic-speech-recognition',
					modelId,
					{
						device: 'webgpu',
						progress_callback: info => {
							if (info.status !== 'progress_total') return;

							self.postMessage({
								type: WorkerMessageTypes.Progress,
								payload: Math.trunc(info.progress),
							} satisfies WorkerMessage);
						}
					}
				);
			} catch (e) {
				self.postMessage({ type: WorkerMessageTypes.Error, payload: 'Не удалось загрузить модель' } satisfies WorkerMessage);
				console.error(e);
			} finally {
				self.postMessage({ type: WorkerMessageTypes.Done, payload: null } satisfies WorkerMessage)
			}
			break;
		}
		case WorkerMessageTypes.Transcribe: {
			if (!transcriber) {
				self.postMessage({ type: WorkerMessageTypes.Error, payload: 'Модель ещё не загружена' } satisfies WorkerMessage);
				return;
			}

			try {
				const result = await transcriber(data.payload, { language: 'russian', task: 'transcribe' });
				self.postMessage({
					type: WorkerMessageTypes.Text,
					payload: Array.isArray(result) ? result.map(i => i.text).join(' ') : result.text
				} satisfies WorkerMessage)
			} catch (e) {
				self.postMessage({ type: WorkerMessageTypes.Error, payload: 'Не удалось распознать речь' } satisfies WorkerMessage);
				console.error(e);
			}
			break;
		}
		default:
			break;
	}
};
