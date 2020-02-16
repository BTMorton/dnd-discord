import { Permissions } from "discord.js";
import { AddCommandMethod, CommandPrefixManager, Context, ICommandSet, Injector, isGuildChannel } from "../../lib";
import { hasPerm } from "./common";

function canSetPrefix(context: Context) {
	return !isGuildChannel(context.channel) || hasPerm(Permissions.FLAGS.MANAGE_GUILD as number, context);
}

const commandSet: ICommandSet = {
	loadCommands(addCommand: AddCommandMethod) {
		addCommand("setprefix", handleSetPrefix, {
			help: {
				section: "Server Administration",
				shortDescription: "Sets the command prefix this bot will respond to",
			},
			validators: [canSetPrefix],
		});
	},
};

export = commandSet;

async function handleSetPrefix(context: Context) {
	const prefix = context.messageData;
	if (!prefix) {
		context.reply("You need to specify a valid prefix.");
		return;
	}

	if (isGuildChannel(context.channel)) {
		const guildMember = context.guild.member(context.user);
		if (guildMember && guildMember.hasPermission("MANAGE_GUILD")) {
			await Injector.get(CommandPrefixManager).setGuildPrefix(context.guild.id, prefix);
			await context.reply("OK, I have updated this server's command prefix to `" + prefix + "`.");
		} else {
			await context.reply("Sorry, you don't have permission to do that.");
		}
	} else {
		await Injector.get(CommandPrefixManager).setChannelPrefix(context.channel.id, prefix);
		await context.reply("OK, I have updated this server's command prefix to `" + prefix + "`.");
	}
}
