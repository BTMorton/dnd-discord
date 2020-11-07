import { Message } from "discord.js";
import { Subject } from "rxjs";
import { filter, takeUntil } from "rxjs/operators";
import { Bot } from "./bot";
import { CommandMethod, ValidatorMethod } from "./command";
import { CommandLoader } from "./commandLoader";
import { CommandPrefixManager } from "./commandPrefixManager";
import { escapeStringForRegex, formatError, isGuildChannel } from "./common";
import { Context } from "./context";
import { Injector } from "./injector";
import { ListenerLoader } from "./listenerLoader";

export class CommandHandler {
	public nonCommandMessages = new Subject<Message>();
	private bot = Injector.get(Bot);
	private commandLoader = Injector.get(CommandLoader);
	private unsubscribe = new Subject<void>();
	private listenerLoader = Injector.get(ListenerLoader);

	public async start() {
		await this.commandLoader.reload();
		await this.listenerLoader.reload();

		this.bot.observe("message")
			.pipe(takeUntil(this.unsubscribe))
			.pipe(filter(([message]) => !message.author.bot))
			.subscribe(([message]) => this.processMessage(message));
	}

	public destroy() {
		this.unsubscribe.next();
	}

	public async processMessage(message: Message) {
		const prefixManager = Injector.get(CommandPrefixManager);
		const prefix = isGuildChannel(message.channel)
			? prefixManager.getGuildPrefix(message.guild!.id)
			: prefixManager.getChannelPrefix(message.channel.id);

		const regex = new RegExp("^" + escapeStringForRegex(prefix) + "([a-z]+)", "i");
		const matches = message.content.match(regex);
		if (matches) {
			const command = matches[1].toLowerCase();
			const context = new Context(message, prefix, command);

			const success = await this.processCommand(context);
			if (success) { return; }
		}

		this.nonCommandMessages.next(message);
	}

	public async processCommand(context: Context) {
		let commandName = context.command;

		if (!this.commandLoader.commandMap.has(commandName)) { return false; }

		while (typeof this.commandLoader.commandMap.get(commandName) === "string") {
			commandName = this.commandLoader.commandMap.get(commandName) as string;
		}

		if (typeof this.commandLoader.commandMap.get(commandName) !== "function") { return false; }

		if (this.commandLoader.validatorMap.has(commandName)) {
			const validators = this.commandLoader.validatorMap.get(commandName) as ValidatorMethod[];

			for (const validator of validators) {
				if (!await validator(context)) {
					return false;
				}
			}
		}

		const command = this.commandLoader.commandMap.get(commandName) as CommandMethod;
		try {
			await command(context);
		} catch (e) {
			await context.reply("Sorry, I was unable to complete your command.");

			const channelDisplay = isGuildChannel(context.channel)
				? `in ${context.guild.name} - #${context.channel.name}`
				: `for ${context.user.username}#${context.user.discriminator} (@${context.user.id})`;

			const errorMessage = [
				`There was an issue processing the command ${commandName} ${channelDisplay}`,
				`Raw command: \`${context.rawMessage}\``,
				formatError(e),
			].join("\n");

			console.error(errorMessage);
			console.error(e.stack);
			await this.bot.sendDebugMessage(errorMessage);
		}

		return true;
	}
}
