import { AddCommandMethod, Context, ICommandSet, isCreator } from "../../lib";
import { isMuteMage } from "./common";

let enablePingFunk = false;

function validAuthor(context: Context) {
	return isCreator(context) || context.user.id === "93963201586139136";
}

const commandSet: ICommandSet = {
	loadCommands(addCommand: AddCommandMethod) {
		const toggleOpts = {
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
	const funk = context.guild.fetchMember("93963201586139136");

	await Promise.all([
		context.sendToChannel(`${funk}`),
		context.delete(),
	]);
}
