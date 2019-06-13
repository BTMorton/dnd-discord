import { AddCommandMethod, CommandHandler, Context, Database, DiceRollManager, escapeStringForRegex, ICommandSet, Injector } from "../lib";

interface IMacro {
	userId: string;
	key: string;
	value: string;
}

class MacroManager {
	private processingMessages: Set<string> = new Set();
	private database: Database;

	constructor() {
		this.database = Injector.get(Database);
	}

	public async processMacro(context: Context) {
		if (this.processingMessages.has(context.messageId)) return;

		const [ macroCommand, ...contents ] = context.args;
		const macroText = contents.join(" ");

		try {
			this.processingMessages.add(context.messageId);
			switch (macroCommand) {
				case "set":
				case "save":
				case "add":
					const [ key, ...splits ] = macroText.split("=");
					const value = splits.join("=").trim();

					return await this.saveMacro(context, key.trim(), value);
				case "list":
					return await this.listMacros(context);
				case "del":
				case "delete":
				case "remove":
					return await this.removeMacro(context, macroText);
				default:
					return await this.runMacro(context);
			}
		} finally {
			this.processingMessages.delete(context.messageId);
		}
	}

	private getCollection() {
		return this.database.getCollection("macros");
	}

	private async saveMacro(context: Context, key: string, value: string) {
		const userId = context.user.id;
		const result = await (await this.getCollection()).findOneAndUpdate({
			key,
			userId,
		}, {
			$set: {
				value,
			},
			$setOnInsert: {
				key,
				userId,
			},
		}, {
			upsert: true,
		});

		await context.reply(`OK, I've ${(result.value ? "updated" : "set")} that macro for you. Type \`${context.channelPrefix}${context.command} ${key}\` to run it.`);
	}

	private async runMacro(context: Context) {
		const key = context.messageData;
		const doc: IMacro | null = await (await this.getCollection()).findOne({ key, userId: context.user.id });
		if (!doc) {
			return this.sendNotFound(context, key);
		}

		const prefixRegex = new RegExp("^" + escapeStringForRegex(context.channelPrefix) + "([a-z]+)", "i");
		const macroLines = doc.value.split("\n");

		let macros: Array<string | string[]> = [];
		macroLines.reduce((messages: string[], macro) => {
			if (!prefixRegex.test(macro[0])) {
				return [ ...messages, macro ];
			}

			macros = [ ...macros, messages, macro ];
			return [];
		}, []);

		const message = context.rawMessage;
		await macros.reduce(async (promise, macro) => {
			await promise;

			if (macro instanceof Array) {
				return this.sendMacroMessages(context, macro);
			}

			message.content = macro;

			return Injector.get(CommandHandler).processMessage(message);
		}, Promise.resolve());
	}

	private async sendMacroMessages(context: Context, messages: string[]) {
		if (messages.length === 0) { return; }

		const output = messages.join("\n");
		await context.sendToChannel(output);

		if (output.match(DiceRollManager.CONST_INLINE_ROLL_REGEX)) {
			const renders = Injector.get(DiceRollManager).inlineRolls(output);
			context.sendToChannel(renders.join("\n"));
		}
	}

	private async listMacros(context: Context) {
		const docs: IMacro[] = await (await this.getCollection()).find({ userId: context.user.id }).toArray();
		if (docs.length === 0) {
			await context.reply("Sorry, I don't have any stored macros associated with your user.");
			return;
		}

		const replies: string[] = [
			"I have the following macros stored for your user:",
			...docs.map((macro) => `**${macro.key}** = ${macro.value}`),
		];

		await context.reply(replies.join("\n"));
	}

	private async removeMacro(context: Context, key: string) {
		const result = await (await this.getCollection()).findOneAndDelete({ key, userId: context.user.id });

		await result.value
			? context.reply("I have removed the macro for `" + key + "` associated with your user.")
			: this.sendNotFound(context, key);
	}

	private async sendNotFound(context: Context, key: string) {
		await context.reply("Sorry, I don't have a stored macro for `" + key + "` associated with your user.");
	}
}

const manager = new MacroManager();
const commandSet: ICommandSet = {
	loadCommands(addCommand: AddCommandMethod) {
		addCommand("macro", manager.processMacro.bind(manager), {
			aliases: ["m"],
		});
	},
};

export = commandSet;