import { AddCommandMethod, CommandLoader, Context, getMapValueOrDefault, ICommandSet, Injector, ValidatorMethod } from "../lib";

const commandSet: ICommandSet = {
	loadCommands(addCommand: AddCommandMethod) {
		addCommand("help", sendHelp);
		addCommand("commandlist", listCommands, { aliases: [ "commands" ] });
	},
};

export = commandSet;

async function sendHelp(context: Context) {
	await context.sendToChannel([
		"Help is coming soon...",
	].join("\n"));
}

async function listCommands(context: Context) {
	const commandMap = Injector.get(CommandLoader).commandMap;
	const validatorMap = Injector.get(CommandLoader).displayValidatorMap;
	const aliases: Map<string, Set<string>> = new Map();
	const commands: Set<string> = new Set();

	commandMap.forEach((command, name) => {
		if (typeof command === "string") {
			aliases.set(command, getMapValueOrDefault(aliases, command, new Set()).add(name));
		} else {
			commands.add(name);
		}
	});

	for (const command of commands) {
		if (!validatorMap.has(command)) { continue; }

		const validators = validatorMap.get(command) as ValidatorMethod[];
		const validations = await Promise.all(validators.map((val) => val(context)));
		if (!validations.every((res) => res)) {
			commands.delete(command);
		}
	}

	const commandList = Array.from(commands.values(),
		(command) => !aliases.has(command)
			? command
			: `${command} (aliases: ${Array.from(aliases.get(command) as Set<string>).join(", ")})`)
		.join(", ");

	await context.sendToChannel(`Here is the list of currently available commands:\n${commandList}`);
}
