import { AddCommandMethod, Context, ICommandSet } from "../lib";

const commandSet: ICommandSet = {
	loadCommands(addCommand: AddCommandMethod) {
		addCommand("beep", pingPong, { help: { section: "Ping", shortDescription: "boop" } });
		addCommand("hey", pingPong, { help: { section: "Ping", shortDescription: "ho" } });
		addCommand("ping", pingPong, { help: { section: "Ping", shortDescription: "pong" } });
		addCommand("ding", pingPong, { help: { section: "Ping", shortDescription: "dong" } });
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
		default:
			pingCount = 0;
			return;
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
