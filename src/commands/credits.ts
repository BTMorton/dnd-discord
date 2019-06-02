import { AddCommandMethod, Context, ICommandSet } from "../lib";

const commandSet: ICommandSet = {
	loadCommands(addCommand: AddCommandMethod) {
		addCommand("credits", sendCredits, { aliases: ["credit"] });
	},
};

export = commandSet;

async function sendCredits(context: Context) {
	await context.sendToChannel([
		"This D&D Spell & Monster Discord Bot was built with love by Discord users Verdaniss#3529 and TumnusB#4019.",
	].join("\n"));
}
