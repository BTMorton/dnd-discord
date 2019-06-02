import { Collection, GuildChannel, Permissions, Role } from "discord.js";
import { AddCommandMethod, Context, ICommandSet, isTextChannelContext } from "../../../lib";
import { hasPerm } from "../../admin/common";
import { CONST_ADMIN_ROLE_ID, CONST_AVRAE_ROLE_ID, CONST_BOT_ROLE_ID, CONST_D1C3_ROLE_ID, CONST_DM_ROLE_ID, CONST_EVERYONE_ROLE_ID, CONST_HELPERS_ROLE_ID, CONST_LFG_ROLE_ID, CONST_OWDM_ROLE_ID, CONST_SPECTATOR_ROLE_ID, CONST_WMDM_ROLE_ID, isMuteMage } from "../common";

const commandSet: ICommandSet = {
	loadCommands(addCommand: AddCommandMethod) {
		addCommand("oldroles", oldRoles, {
			aliases: ["oldrole"],
			validators: [
				isTextChannelContext,
				isMuteMage,
				hasPerm.bind(null, Permissions.FLAGS.MANAGE_CHANNELS),
			],
		});
	},
};

export = commandSet;

async function oldRoles(context: Context) {
	const fixedRoles: Set<string> = new Set([
		CONST_BOT_ROLE_ID,
		CONST_DM_ROLE_ID,
		CONST_EVERYONE_ROLE_ID,
		CONST_HELPERS_ROLE_ID,
		CONST_OWDM_ROLE_ID,
		CONST_SPECTATOR_ROLE_ID,
		CONST_WMDM_ROLE_ID,
		CONST_ADMIN_ROLE_ID,
		CONST_AVRAE_ROLE_ID,
		CONST_LFG_ROLE_ID,
		CONST_D1C3_ROLE_ID,
	]);

	const channels: Collection<string, GuildChannel> = context.guild.channels;
	const roles: Role[] = context.guild.roles.array()
		.filter((r) => !fixedRoles.has(r.id));

	const legacyRoles: Role[] = roles.filter((r) => !channels.exists("name", r.name)
		|| r.members.size === 0);

	const reply = `The following roles do not have an associated channel, or do not have any members:\n${legacyRoles.join("\n")}`;
	await context.sendToChannel(reply);
}
