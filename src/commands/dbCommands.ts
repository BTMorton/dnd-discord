import { AddCommandMethod, Context, DatabaseCommandManager, formatError, ICommandSet, Injector } from "../lib";

async function handleCommand(context: Context) {
	const [ command, ...args] = context.args;

	switch (command) {
		case "list":
			return handleListCommands(context);
		case "add":
		case "set":
		case "update": {
			const [ commandName, ...codeParts ] = args;
			return doAddCommand(context, commandName, codeParts.join(" "));
		}
		case "get":
		case "view":
			return doViewCommand(context, args[0]);
		case "del":
		case "delete":
		case "remove":
			return doDeleteCommand(context, args[0]);
		case "run": {
			const [ commandName, ...commandArgs ] = args;
			return doRunCommand(context, commandName, commandArgs);
		}
		default:
			return doRunCommand(context, command, args);
	}
}

async function handleListCommands(context: Context) {
	const manager = Injector.get(DatabaseCommandManager);
	const commands = await manager.getAll(context.user.id);

	if (commands.length === 0) {
		await context.reply("Sorry, I don't have any stored commands associated with your user.");
		return;
	}

	const replies: string[] = [
		"I have the following custom commands stored for your user:",
		...commands.map((command) => `- ${command.command}`),
	];

	await context.reply(replies.join("\n"));
}

async function handleViewCommand(context: Context) {
	await doViewCommand(context, context.args[0]);
}

async function doViewCommand(context: Context, commandName: string) {
	const manager = Injector.get(DatabaseCommandManager);
	const command = await manager.getCommand(context.user.id, commandName);
	if (!command) { return sendNotFound(context, commandName); }

	context.sendToChannel(`The following code is stored for the command '${command.command}':\n${command.code}`);
}

async function handleAddCommand(context: Context) {
	const [ commandName, ...codeParts ] = context.args;
	await doAddCommand(context, commandName, codeParts.join(" "));
}

async function doAddCommand(context: Context, commandName: string, code: string) {
	const manager = Injector.get(DatabaseCommandManager);
	const result = await manager.addCommand(context.user.id, commandName, code);

	await context.sendToChannel(`Ok, I have ${result ? "updated" : "added"} the command ${commandName}.`);
}

async function handleDeleteCommand(context: Context) {
	const commandName = context.args[0];
	await doDeleteCommand(context, commandName);
}

async function doDeleteCommand(context: Context, commandName: string) {
	const manager = Injector.get(DatabaseCommandManager);
	const result = await manager.deleteCommand(context.user.id, commandName);

	await result
		? context.sendToChannel(`Ok, I have delete the command ${commandName}.`)
		: sendNotFound(context, commandName);
}

async function handleRunCommand(context: Context) {
	const [ commandName, ...args ] = context.args;
	await doRunCommand(context, commandName, args);
}

async function doRunCommand(context: Context, commandName: string, args: string[]) {
	const manager = Injector.get(DatabaseCommandManager);
	const command = await manager.getCommand(context.user.id, commandName);
	if (!command) {
		return sendNotFound(context, commandName);
	}

	let response: string;
	try {
		response = await manager.runCommand(command, args);
	} catch (error) {
		await context.sendToChannel(`An error was encountered during command execution: ${formatError(error)}`);
		return;
	}

	await context.sendToChannel(`Command response: ${response}`);
}

async function sendNotFound(context: Context, commandName: string) {
	await context.reply(`Sorry, I could not find a command matching name '${commandName}'.`);
}

const commandSet: ICommandSet = {
	loadCommands(addCommand: AddCommandMethod) {
		addCommand("customcommands", handleCommand, { aliases: ["custom"] });
		addCommand("listcustomcommands", handleListCommands, { aliases: ["listcustom"] });
		addCommand("viewcustomcommand", handleViewCommand, { aliases: ["viewcustom", "getcustomcommand", "getcustom"] });
		addCommand("addcustomcommand", handleAddCommand, { aliases: [ "setcustomcommand", "setcustom", "addcustom" ]});
		addCommand("deletecustomcommand", handleDeleteCommand, { aliases: ["delcustomcommand", "deletecustom", "delcustom"] });
		addCommand("runcustomcommand", handleRunCommand, { aliases: ["runcustom", "run"] });
	},
};

export = commandSet;
