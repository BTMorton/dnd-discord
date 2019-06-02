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

	await processMultiRoll(context, count, args.join(" "));

}

async function processMultiRoll(context: Context, count: number, rollFormat: string) {
	try {
		const rollResults: string[] = Array.from({ length: count }, () => roller.rollDice(rollFormat, true));
		const reply = rollResults.join("\n");
		await context.sendToChannel(reply);
	} catch (_) {
		await context.reply(`Sorry, I was unable to complete the roll: ${rollFormat}`);
	}
}
