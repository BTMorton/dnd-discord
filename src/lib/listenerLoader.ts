import { readdir, stat } from "fs";
import { extname, join } from "path";
import { Unsubscribable } from "rxjs";
import { promisify } from "util";
import { IListenerSet } from "./listeners";

export class ListenerLoader {
	private static CONST_LISTENER_FOLDER = "./listeners/";

	public listenerMap: Map<string, Unsubscribable> = new Map();

	public async reload() {
		// tslint:disable:no-console
		console.log(`Reloading listeners...`);
		await Promise.all(Array.from(this.listenerMap.values(), (subscription) => subscription.unsubscribe()));

		this.listenerMap.clear();

		const files = await this.readFolder(ListenerLoader.CONST_LISTENER_FOLDER);

		const listenerSets = files.filter((path) => extname(path) === ".js")
			.map((filePath) => this.loadListenerFile(filePath));

		await Promise.all(listenerSets
			.filter((listenerSet) => "loadListeners" in listenerSet)
			.map((listenerSet) => this.loadListenerSet(listenerSet)));

		console.log(`Listeners loaded. ${this.listenerMap.size} listeners loaded.`);
		// tslint:enable:no-console
	}

	public addListener(name: string, subscribable: () => Unsubscribable) {
		name = name.toLowerCase();

		if (this.listenerMap.has(name)) {
			throw new Error(`The command ${name} has already been registered.`);
		}

		this.listenerMap.set(name, subscribable());
	}

	public async removeListener(name: string) {
		name = name.toLowerCase();

		if (!this.listenerMap.has(name)) {
			throw new Error(`The command ${name} has not yet been registered.`);
		}

		(this.listenerMap.get(name) as Unsubscribable).unsubscribe();
		this.listenerMap.delete(name);
	}

	private async loadListenerSet(listenerSet: IListenerSet) {
		try {
			await listenerSet.loadListeners(this.addListener.bind(this));
		} catch (err) {
			console.error("Error loading listener set:", err.stack);
		}
	}

	private async readFolder(folderName: string): Promise<string[]> {
		const files = (await promisify(readdir)(folderName))
			.map((fileName) => join(folderName, fileName));

		return await files
			.reduce(async (filePromise, filePath) => {
				const fileStat = await promisify(stat)(filePath);

				const newFiles = fileStat.isDirectory()
					? await this.readFolder(filePath)
					: [filePath];

				const previousFiles = await filePromise;
				return previousFiles.concat(newFiles);
			}, Promise.resolve([] as string[]));
	}

	private loadListenerFile(filePath: string): IListenerSet {
		const fullPath = join(process.cwd(), filePath);
		delete require.cache[require.resolve(fullPath)];
		return require(fullPath);
	}
}
