import { Message } from "discord.js";
import { map } from "rxjs/operators";
import { AddListenerMethod, CommandHandler, CommandPrefixManager, DatabaseCommandManager, formatError, IListenerSet, Injector, isGuildChannel } from "../lib";

const listeners: IListenerSet = {
	loadListeners(addListener: AddListenerMethod) {
		addListener("dbcommands", subscribeToInlineRolls());
	},
};
export = listeners;

function subscribeToInlineRolls() {
	// 	Get messages that aren't already commands
	return Injector.get(CommandHandler).nonCommandMessages
		//  Look for messages with inline rolls
		.pipe(map(async (message: Message) => {
			const channel = message.channel;
			const prefixManager = Injector.get(CommandPrefixManager);
			const prefix = isGuildChannel(channel)
				? prefixManager.getGuildPrefix(channel.guild.id)
				: prefixManager.getDMPrefix(channel.id);

			const [ first, ...args ] = message.content.split(" ");
			if (!first.toLowerCase().startsWith(prefix.toLowerCase())) { return; }

			const commandName = first.slice(prefix.length);
			const commandManager = Injector.get(DatabaseCommandManager);
			const command = await commandManager.getCommand(message.author.id, commandName);
			if (!command) { return; }

			let response: string;
			try {
				response = await commandManager.runCommand(command, args);
			} catch (error) {
				await message.channel.send(`An error was encountered during command execution: ${formatError(error)}`);
				return;
			}

			if (response === "") {
				await message.channel.send("No command output to display.");
			} else {
				await message.channel.send(response);
			}
		}));
}
