import { DiceRoller } from "dice_roller";
import { AddCommandMethod, Context, DiceRollManager, ICommandSet } from "../lib";

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
	try {
		const parsedRoll = diceRoller.parse(rollFormat);
		const label = parsedRoll.label || rollFormat;
		const padLen = count.toString().length;
		const rollResults: string[] = Array.from({ length: count }, (_, i) => {
			const rollNum = (i + 1).toString().padStart(padLen, "0");
			return `**${label} ${rollNum}**: ${diceRoller.rollParsed(parsedRoll).value}`;
		});
		const reply = [
			`Rolling ${rollFormat} ${count} times:`,
			...rollResults,
		].join("\n");
		await context.sendToChannel(reply);
	} catch (_) {
		await context.reply(`Sorry, I was unable to complete the roll: ${rollFormat}`);
	}
}
