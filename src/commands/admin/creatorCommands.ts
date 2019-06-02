import { AddCommandMethod, CommandLoader, Context, DiscordBot, ICommandSet, Injector, isCreator, isGuildChannel, ListenerLoader } from "../../lib";

const commandSet: ICommandSet = {
	loadCommands(addCommand: AddCommandMethod) {
		addCommand("code", runCode, { aliases: ["exec", "eval"], validators: [isCreator] });
		addCommand("say", doSay, { validators: [isCreator] });
		addCommand("kill", shutdown, { validators: [isCreator] });
		addCommand("bugcheck", bugCheck, { validators: [isCreator] });
		addCommand("reloadall", reloadAll, {
			aliases: [ "reload" ],
			validators: [ isCreator ],
		});
		addCommand("reloadlisteners", reloadListeners, {
			aliases: [ "reloadlistener" ],
			validators: [ isCreator ],
		});
		addCommand("reloadcommands", reloadCommands, {
			aliases: [ "reloadcommand" ],
			validators: [ isCreator ],
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
	} catch (e)  {
		console.error(`Failed to send bugcheck message to channel ${channelName}`, e);
	}
}

async function reloadAll(context: Context) {
	await context.reply("Reloading commands and listeners, please wait...");

	const commands = Injector.get(CommandLoader);
	await commands.reload();

	const listeners = Injector.get(ListenerLoader);
	await listeners.reload();

	await context.reply(`${commands.commandMap.size} commands and ${listeners.listenerMap.size} listeners loaded.`);
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
