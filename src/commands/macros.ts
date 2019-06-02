import { AddCommandMethod, CommandHandler, Context, Database, DiceRollManager, ICommandSet, Injector } from "../lib";

class MacroManager {
	private processingMacro = false;
	private database: Database;

	constructor() {
		this.database = Injector.get(Database);
	}

	public async processMacro(context: Context) {
		if (this.processingMacro) return;
		const [ macroCommand, ...contents ] = context.args;
		const macroText = contents.join(" ");

		switch (macroCommand) {
			case "set":
			case "save":
			case "add":
				const [ key, ...splits ] = macroText.split("=");
				const value = splits.join("=").trim();

				return this.saveMacro(context, key.trim(), value);
			case "list":
				return this.listMacros(context);
			case "del":
			case "delete":
			case "remove":
				return this.removeMacro(context, macroText);
			default:
				return this.runMacro(context);
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
		try {
			const doc = await (await this.getCollection()).findOne({ key, userId: context.user.id });

			if (!doc) {
				await context.reply("Sorry, I don't have a stored macro for `" + key + "` associated with your user.");
				return;
			}

			const macros: string[] = doc.value.split("\n");

			this.processingMacro = true;

			for (const macro of macros) {
				if (macro[0] === context.channelPrefix) {
					const message = context.rawMessage;
					message.content = macro;

					Injector.get(CommandHandler).processMessage(message);
				} else {
					context.sendToChannel(macro);

					if (macro.match(DiceRollManager.CONST_INLINE_ROLL_REGEX)) {
						const renders = Injector.get(DiceRollManager).inlineRolls(macro);
						context.sendToChannel(renders.join("\n"));
					}
				}
			}
		} catch (_) {
			await context.reply("Sorry, I don't have a stored macro for `" + key + "` associated with your user.");
		} finally {
			this.processingMacro = false;
		}
	}

	private async listMacros(context: Context) {
		const docs = await (await this.getCollection()).find({ userId: context.user.id }).toArray();
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
		try {
			const result = await (await this.getCollection()).findOneAndDelete({ key, userId: context.user.id });

			if (result.value) {
				await context.reply("I have removed the macro for `" + key + "` associated with your user.");
			} else {
				await context.reply("Sorry, I don't have a stored macro for `" + key + "` associated with your user.");
			}
		} catch (_) {
			await context.reply("Sorry, I don't have a stored macro for `" + key + "` associated with your user.");
			this.processingMacro = false;
		}
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
