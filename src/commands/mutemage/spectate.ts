import { GuildChannel, PermissionOverwrites, Role } from "discord.js";
import { AddCommandMethod, Context, getGuildChannel, ICommandSet, isTextChannelContext, toggleRole } from "../../lib";
import { CONST_SPECTATOR_ROLE_ID, isMuteMage } from "./common";

const commandSet: ICommandSet = {
	loadCommands(addCommand: AddCommandMethod) {
		addCommand("spectate", spectate, {
			aliases: ["spectator"],
			help: {
				section: "Mute Mage Administration",
				shortDescription: "Enables spectator mode, globally or for a specific channel",
			},
			validators: [
				isTextChannelContext,
				isMuteMage,
			],
		});
	},
};

export = commandSet;

async function spectate(context: Context) {
	const channelName = context.args[0];
	const mentions = context.mentions.channels;
	if (mentions.size === 0 && (channelName == null || channelName === "")) {
		const role = context.guild.roles.resolve(CONST_SPECTATOR_ROLE_ID) as Role;

		if (await toggleRole(context, role)) {
			context.reply(`OK, I have assigned the role ${role.name}.`);
		} else {
			context.reply(`OK, I have removed the role ${role.name}.`);
		}
		return;
	}

	let channel: GuildChannel | undefined;
	if (context.mentions.channels.size > 0) {
		channel = context.mentions.channels.first();
	} else if (channelName != null && channelName !== "") {
		channel = getGuildChannel(context.guild, channelName);
	}

	if (channel == null) {
		await context.reply(`Unable to find a channel matching '${channelName}'`);
		return;
	}

	try {
		const perms = channel.permissionOverwrites;
		const user = context.user;

		if (perms.has(user.id)) {
			(perms.get(user.id) as PermissionOverwrites).delete();

			await context.reply(`Spectating disabled for channel ${channel}`);
		} else {
			await channel.overwritePermissions([user], {
				VIEW_CHANNEL: true,
			} as any);

			await context.reply(`Spectating enabled for channel ${channel}`);
		}
	} catch (e) {
		await context.reply(`Sorry, I was unable to update spectate status for channel ${channel}`);
	}
}
