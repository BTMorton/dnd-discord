import { readdir, stat } from "fs";
import { extname, join } from "path";
import { promisify } from "util";
import { CommandMethod, ICommandOptions, ICommandSet, ValidatorMethod } from "./command";

export class CommandLoader {
	private static CONST_COMMAND_FOLDER = "./commands/";

	public commandMap: Map<string, CommandMethod | string> = new Map();
	public validatorMap: Map<string, ValidatorMethod[]> = new Map();
	public displayValidatorMap: Map<string, ValidatorMethod[]> = new Map();

	public async reload() {
		// tslint:disable:no-console
		console.log(`Reloading commands...`);
		this.commandMap.clear();

		const files = await this.readFolder(CommandLoader.CONST_COMMAND_FOLDER);

		const commandSets = files.filter((path) => extname(path) === ".js")
			.map((filePath) => this.loadCommandFile(filePath));

		await Promise.all(commandSets
			.filter((commandSet) => "loadCommands" in commandSet)
			.map((commandSet) => this.loadCommandSet(commandSet)));

		console.log(`Commands loaded. ${this.commandMap.size} commands loaded.`);
		// tslint:enable:no-console
	}

	public addCommand(name: string, command: CommandMethod, options?: ICommandOptions): void {
		if (name.includes(" ")) {
			throw new Error("Command names are not allowed to contain spaces.");
		}

		name = name.toLowerCase();

		if (this.commandMap.has(name)) {
			throw new Error(`The command ${name} has already been registered.`);
		}

		this.commandMap.set(name, command);

		if (options && options.validators) {
			this.validatorMap.set(name, options.validators);

			if (!options.displayValidators) {
				this.displayValidatorMap.set(name, options.validators);
			}
		}

		if (options && options.displayValidators) {
			this.displayValidatorMap.set(name, options.displayValidators);
		}

		if (options && options.aliases) {
			options.aliases
				.filter((alias) => !this.commandMap.has(alias))
				.forEach((alias) => this.commandMap.set(alias, name));
		}
	}

	public removeCommand(name: string): void {
		name = name.toLowerCase();

		if (!this.commandMap.has(name)) {
			throw new Error(`The command ${name} has not yet been registered.`);
		}

		this.commandMap.delete(name);

		this.commandMap.forEach((command, alias) => {
			if (command === name) {
				this.commandMap.delete(alias);
			}
		});
	}

	private async loadCommandSet(commandSet: ICommandSet) {
		try {
			await commandSet.loadCommands(this.addCommand.bind(this));
		} catch (err) {
			console.error("Error loading command set:", err.stack);
		}
	}

	private async readFolder(folderName: string): Promise<string[]> {
		const commandFiles = (await promisify(readdir)(folderName))
			.map((fileName) => join(folderName, fileName));

		return await commandFiles
			.reduce(async (filePromise: Promise<string[]>, filePath) => {
				const fileStat = await promisify(stat)(filePath);

				const newFiles = fileStat.isDirectory()
					? await this.readFolder(filePath)
					: [ filePath ];

				const previousFiles = await filePromise;
				return previousFiles.concat(newFiles);
			}, Promise.resolve([] as string[]));
	}

	private loadCommandFile(filePath: string): ICommandSet {
		const fullPath = join(process.cwd(), filePath);
		delete require.cache[require.resolve(fullPath)];
		return require(fullPath);
	}
}
