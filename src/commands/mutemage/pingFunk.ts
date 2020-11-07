import { AddCommandMethod, Context, ICommandOptions, ICommandSet, isCreator } from "../../lib";
import { isMuteMage } from "./common";

let enablePingFunk = false;

function validAuthor(context: Context) {
	return isCreator(context) || context.user.id === "93963201586139136";
}

const commandSet: ICommandSet = {
	loadCommands(addCommand: AddCommandMethod) {
		const toggleOpts: ICommandOptions = {
			help: {
				section: "Funkenspine Ping Management",
				shortDescription: "Enables or disables pinging Funkenspine",
			},
			validators: [
				isMuteMage,
				validAuthor,
			],
		};

		addCommand("togglepingfunk", togglePingFunk, toggleOpts);
		addCommand("enablepingfunk", (c) => togglePingFunk(c, true), toggleOpts);
		addCommand("disablepingfunk", (c) => togglePingFunk(c, false), toggleOpts);
		addCommand("pingfunk", pingFunk, {
			aliases: ["pingofthefunk", "pfunk"],
			help: {
				section: "Fun",
				shortDescription: "Pings Funkenspine",
			},
			validators: [
				isMuteMage,
				() => enablePingFunk,
			],
		});
	},
};

export = commandSet;

async function togglePingFunk(context: Context, active?: boolean) {
	if (active === undefined) {
		enablePingFunk = !enablePingFunk;
	} else {
		enablePingFunk = active;
	}

	await context.reply("`/pingfunk` command has been " + (enablePingFunk ? "en" : "dis") + "abled.");
}

async function pingFunk(context: Context) {
	const funk = await context.guild.members.fetch("93963201586139136");

	await Promise.all([
		context.sendToChannel(`${funk}`),
		context.delete(),
	]);
}
