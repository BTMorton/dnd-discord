import { DiceRoller, RootType } from "dice_roller";
import { RichEmbed } from "discord.js";
import { AddCommandMethod, Context, DiceRollManager, ICommandSet, Injector, UserConfig } from "../lib";

const commandSet: ICommandSet = {
	loadCommands(addCommand: AddCommandMethod) {
		addCommand("roll", processRoll, { aliases: ["r"] });
		addCommand("rollstats", rollStats);
		addCommand("multiroll", multiRoll, { aliases: ["multi"] });
	},
};

export = commandSet;
const roller = new DiceRollManager();

async function processRoll(context: Context) {
	const roll = context.messageData;

	try {
		const reply = roller.rollDice(roll);

		await context.sendToChannel(reply);
	} catch (e) {
		await context.reply("Sorry, I was unable to complete the roll: " + roll);
	}
}

async function rollStats(context: Context) {
	const diceRoll = context.messageData || "4d6d";

	await processMultiRoll(context, 6, diceRoll);
}

async function multiRoll(context: Context) {
	const args = context.args.slice();
	const countStr = args.shift() || "";
	let count = parseInt(countStr, 10);

	if (Number.isNaN(count)) {
		context.reply("I was unable to process the number: " + countStr + ". Rolling once...");
		count = 1;
	}

	if (count > 250) {
		await context.reply("Sorry, you have entered a multi-roll value too high.");
		return;
	}

	await processMultiRoll(context, count, args.join(" "));
}

async function processMultiRoll(context: Context, count: number, rollFormat: string) {
	const diceRoller = new DiceRoller();
	const rollManager = Injector.get(DiceRollManager);

	let parsedRoll: RootType;
	try {
		parsedRoll = diceRoller.parse(rollFormat);
	} catch (_) {
		return await context.reply(`Sorry, I was unable to complete the roll: ${rollFormat}`);
	}

	const label = parsedRoll.label ? `${parsedRoll.label} ` : "";
	const padLen = count.toString().length;

	const rollResults: string[] = Array.from({ length: count }, (_, i) => {
		const rollNum = (i + 1).toString().padStart(padLen, "0");
		const roll = diceRoller.rollParsed(parsedRoll);

		const display = count > 50
			? roll.value
			: rollManager.displayRoll(roll);

		return `**${label}${rollNum}**: ${display}`;
	});

	const isEmbed = await useEmbed(context);
	const result = rollResults.join("\n");
	let reply: string | RichEmbed[];

	if (isEmbed) {
		const embed = new RichEmbed().setColor("RANDOM")
			.setTitle(`Rolling ${rollFormat} ${count} times`);

		if (count < 10 && result.length < 1024) {
			embed.addField("\u200b", result);
		} else if (result.length / 3 < 1024) {
			const first = Math.ceil(rollResults.length / 3);
			embed.addField("\u200b", rollResults.splice(0, first).join("\n"), true);
			const second = Math.ceil(rollResults.length / 2);
			embed.addField("\u200b", rollResults.splice(0, second).join("\n"), true);
			//  Third
			embed.addField("\u200b", rollResults.join("\n"), true);
		} else {
			let left = result;
			while (left.length > 1024) {
				const newLineIndex = left.lastIndexOf("\n", 1024);
				const newField = left.substring(0, newLineIndex);
				left = left.substring(newLineIndex + 1);
				embed.addField("\u200b", newField, true);
			}

			if (left.length > 0) {
				embed.addField("\u200b", left, true);
			}
		}

		reply = [embed];
	} else {
		reply = [
			`Rolling ${rollFormat} ${count} times:`,
			result,
		].join("\n");
	}

	await context.sendToChannel(reply);
}

async function useEmbed(context: Context) {
	let isEmbed = await Injector.get(UserConfig).getUserConfigKey(context.user.id, "useEmbed");
	if (isEmbed === undefined) isEmbed = true;
	return isEmbed;
}
