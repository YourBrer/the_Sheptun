import { Recording } from "./components/Recording.tsx";
import { Error } from "./components/Error.tsx";

export function App() {

	return <div className='m-auto max-w-5xl w-full h-[calc(100vh-64px)] p-8 text-gray-900'>
		<Recording />
		<Error />
	</div>;
}
