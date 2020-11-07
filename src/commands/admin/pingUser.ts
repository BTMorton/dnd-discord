import { Permissions, TextChannel } from "discord.js";
import { AddCommandMethod, Context, ICommandSet, isCreator, isTextChannelContext } from "../../lib";
import { hasPerm } from "./common";

const enabledPingUser: Set<string> = new Set();

function validAuthor(context: Context) {
	return isCreator(context) || hasPerm(Permissions.FLAGS.MANAGE_GUILD as number, context);
}

const commandSet: ICommandSet = {
	loadCommands(addCommand: AddCommandMethod) {
		const toggleOpts = {
			help: {
				section: "Administration",
				shortDescription: "Enables or disables bot pinging a user",
			},
			validators: [
				isTextChannelContext,
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
				isTextChannelContext,
				(c) => c.guild && enabledPingUser.has(c.guild.id),
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
		return;
	}

	const user = context.mentions.users.size === 0
		? (context.channel as TextChannel).members.find((m) =>
			m.displayName.toLowerCase() === userString.toLowerCase()
			|| m.nickname?.toLowerCase() === userString.toLowerCase()
			|| m.user.username.toLowerCase() === userString.toLowerCase(),
		)?.user
		: context.mentions.users.first();

	if (user == null) {
		context.reply(`Wait... is ${userString} event a person?`);
		return;
	}

	await Promise.all([
		context.sendToChannel(`${user}`),
		context.delete(),
	]);
}
