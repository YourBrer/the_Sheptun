// Контракт обмена сообщениями между UI-потоком и Web Worker.
// Вынесен в отдельный модуль, чтобы основной бандл не тянул за собой код воркера
// (а вместе с ним — библиотеку @huggingface/transformers).
export const WorkerMessageTypes = {
	Progress: 'progress',
	Done: 'done',
	Error: 'error',
	Load: 'load',
	Transcribe: 'transcribe',
	Text: 'text',
} as const;

export type WorkerMessage =
	| { type: typeof WorkerMessageTypes.Progress; payload: number }
	| { type: typeof WorkerMessageTypes.Done; payload: null }
	| { type: typeof WorkerMessageTypes.Error; payload: string }
	| { type: typeof WorkerMessageTypes.Load; payload: null }
	| { type: typeof WorkerMessageTypes.Transcribe; payload: Float32Array }
	| { type: typeof WorkerMessageTypes.Text; payload: string };
