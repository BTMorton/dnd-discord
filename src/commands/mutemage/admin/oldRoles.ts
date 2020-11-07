import { Collection, GuildChannel, Permissions, Role } from "discord.js";
import { AddCommandMethod, Context, ICommandSet, isTextChannelContext } from "../../../lib";
import { hasPerm } from "../../admin/common";
import { CONST_IGNORED_ROLE_IDS, isMuteMage } from "../common";

const commandSet: ICommandSet = {
	loadCommands(addCommand: AddCommandMethod) {
		addCommand("oldroles", oldRoles, {
			aliases: ["oldrole"],
			help: {
				section: "Mute Mage Administration",
				shortDescription: "Lists old, unused roles",
			},
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
	const fixedRoles: Set<string> = new Set(CONST_IGNORED_ROLE_IDS);

	const channels: Collection<string, GuildChannel> = context.guild.channels.cache;
	const roles: Role[] = context.guild.roles.cache
		.filter((r) => !fixedRoles.has(r.id))
		.array();

	const replies = [];
	const legacyRoles = roles.filter((r) => channels.filter((c) => c.name.startsWith(r.name.toLowerCase())).size === 0)
		.map((r) => `@${r.name}`)
		.sort(caseInsensitiveSort);
	if (legacyRoles.length > 0) {
		replies.push(`The following roles do not have an associated channel:\n${legacyRoles.join("\n")}`);
	}

	const emptyRoles = roles.filter((r) => r.members.size === 0)
		.map((r) => `@${r.name}`)
		.sort(caseInsensitiveSort);
	if (emptyRoles.length > 0) {
		replies.push(`The following roles do not have any members:\n${emptyRoles.join("\n")}`);
	}

	const reply = replies.length > 0
		? replies.join("\n\n")
		: "There are no outdated roles found.";
	await context.sendToChannel(reply);
}

function caseInsensitiveSort(a: string, b: string) {
	return a.toLowerCase().localeCompare(b.toLowerCase());
}
