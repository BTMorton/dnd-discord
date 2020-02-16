import { Permissions } from "discord.js";
import { AddCommandMethod, Bot, Context, ICommandSet, Injector, isCreator } from "../../lib";
import { hasPerm } from "./common";

const enabledPingUser: Set<string> = new Set();

function validAuthor(context: Context) {
	return isCreator(context) || hasPerm(Permissions.FLAGS.MANAGE_GUILD as number, context);
}

const commandSet: ICommandSet = {
	loadCommands(addCommand: AddCommandMethod) {
		const toggleOpts = {
			help: {
				section: "Server Administration",
				shortDescription: "Enables or disables bot pinging a user",
			},
			validators: [
				validAuthor,
			],
		};

		addCommand("togglepinguser", togglePingUser, toggleOpts);
		addCommand("enablepinguser", (c) => togglePingUser(c, true), toggleOpts);
		addCommand("disablepinguser", (c) => togglePingUser(c, false), toggleOpts);
		addCommand("pinguser", pingUser, {
			help: {
				section: "Fun",
				shortDescription: "Pings a user",
			},
			validators: [
				(c) => enabledPingUser.has(c.guild.id),
			],
		});
	},
};

export = commandSet;

async function togglePingUser(context: Context, active?: boolean) {
	if (active === undefined) {
		active = !enabledPingUser.has(context.guild.id);
	}

	if (active) {
		enabledPingUser.add(context.guild.id);
	} else {
		enabledPingUser.delete(context.guild.id);
	}

	await context.reply("`/pinguser` command has been " + (active ? "en" : "dis") + "abled.");
}

async function pingUser(context: Context) {
	const userString = context.args[0];
	if (context.mentions.users.size === 0 && !userString) {
		context.reply("Yeah, you're just being stupid now");
	}

	const u = context.mentions.users.size === 0
		? await Injector.get(Bot).client.fetchUser(userString)
		: context.mentions.users.first();

	await Promise.all([
		context.sendToChannel(`${u}`),
		context.delete(),
	]);
}
