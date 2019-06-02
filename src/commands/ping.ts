import { AddCommandMethod, Context, ICommandSet } from "../lib";

const commandSet: ICommandSet = {
	loadCommands(addCommand: AddCommandMethod) {
		addCommand("beep", pingPong);
		addCommand("hey", pingPong);
		addCommand("ping", pingPong);
		addCommand("ding", pingPong);
	},
};

export = commandSet;

let pingCount = 0;
let lastUser = "";

async function pingPong(context: Context) {
	let reply = "";

	switch (context.command) {
		case "beep":
			reply = "boop";
			break;
		case "hey":
			reply = "ho";
			break;
		case "ping":
			reply = "pong";
			break;
		case "ding":
			reply = "dong";
			break;
	}

	if (lastUser === context.user.id) {
		pingCount++;
	} else {
		lastUser = context.user.id;
		pingCount = 0;
	}

	if (pingCount < 4) {
		context.reply(reply);
	} else if (pingCount === 4) {
		context.reply("stfu");
	} else if (pingCount === 6) {
		context.reply("seriously stfu!");
	} else if (pingCount === 10) {
		context.reply("SHUT. UP.");
	}
}
