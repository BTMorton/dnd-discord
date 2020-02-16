import { Importer } from "../../5etools/import";
import { AddCommandMethod, CommandLoader, Context, DiscordBot, ICommandSet, Injector, isCreator, isGuildChannel, ListenerLoader } from "../../lib";

const commandSet: ICommandSet = {
	loadCommands(addCommand: AddCommandMethod) {
		addCommand("code", runCode, {
			aliases: ["exec", "eval"],
			help: {
				section: "Debug",
				shortDescription: "Executes arbitrary JS code",
			},
			validators: [isCreator],
		});
		addCommand("say", doSay, {
			help: {
				section: "Debug",
				shortDescription: "Has the bot say something",
			},
			validators: [isCreator],
		});
		addCommand("kill", shutdown, {
			help: {
				section: "Debug",
				shortDescription: "Shuts down the bot",
			},
			validators: [isCreator],
		});
		addCommand("bugcheck", bugCheck, {
			help: {
				section: "Debug",
				shortDescription: "Checks the bot is running",
			},
			validators: [isCreator],
		});
		addCommand("reloadall", reloadAll, {
			aliases: ["reload"],
			help: {
				section: "Data Management",
				shortDescription: "Reloads all bot data",
			},
			validators: [isCreator],
		});
		addCommand("reloadlisteners", reloadListeners, {
			aliases: ["reloadlistener"],
			help: {
				section: "Data Management",
				shortDescription: "Reloads bot listeners",
			},
			validators: [isCreator],
		});
		addCommand("reloadcommands", reloadCommands, {
			aliases: ["reloadcommand"],
			help: {
				section: "Data Management",
				shortDescription: "Reloads bot commands",
			},
			validators: [isCreator],
		});
		addCommand("reloaddata", reloadData, {
			help: {
				section: "Data Management",
				shortDescription: "Reloads bot data",
			},
			validators: [isCreator],
		});
	},
};

export = commandSet;

function runCode(context: Context) {
	try {
		// tslint:disable-next-line:no-eval
		eval(context.messageData);
	} catch (e) {
		context.reply(`YOU FUCKED UP, RETARD!\nError: ${e.message}`);
	}
}

async function doSay(context: Context) {
	const messageContent: string = context.messageData.trim();

	await Promise.all([
		context.sendToChannel(messageContent),
		context.delete(),
	]);
}

async function shutdown(_: Context) {
	await Injector.get(DiscordBot).shutdown();
	process.exit(-1);
}

async function bugCheck(context: Context) {
	const channelName: string = isGuildChannel(context.channel)
		? context.channel.name
		: context.user.username + " DM";

	try {
		await context.sendToChannel("bugresponse");
		// tslint:disable-next-line:no-console
		console.log(`Successfully sent bugcheck message to channel ${channelName}`);
	} catch (e) {
		console.error(`Failed to send bugcheck message to channel ${channelName}`, e);
	}
}

async function reloadAll(context: Context) {
	await context.reply("Reloading commands, listeners and data, please wait...");

	const commands = Injector.get(CommandLoader);
	await commands.reload();

	const listeners = Injector.get(ListenerLoader);
	await listeners.reload();

	const importer = Injector.get(Importer);
	const dataCount = await importer.reload();

	await context.reply(`${commands.commandMap.size} commands, ${listeners.listenerMap.size} listeners and ${dataCount} data items loaded.`);
}

async function reloadListeners(context: Context) {
	await context.reply("Reloading Listeners, please wait...");

	const loader = Injector.get(ListenerLoader);
	await loader.reload();
	await context.reply(`${loader.listenerMap.size} Listeners loaded.`);
}

async function reloadCommands(context: Context) {
	await context.reply("Reloading commands, please wait...");

	const loader = Injector.get(CommandLoader);
	await loader.reload();
	await context.reply(`${loader.commandMap.size} commands loaded.`);
}

async function reloadData(context: Context) {
	await context.reply("Reloading data, please wait...");

	const importer = Injector.get(Importer);
	await importer.clear();

	const loadCount = await importer.importAll();
	await context.reply(`${loadCount} compendium items loaded.`);
}
