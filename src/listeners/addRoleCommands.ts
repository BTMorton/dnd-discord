import { GuildChannel, Message, Permissions } from "discord.js";
import { filter } from "rxjs/operators";
import { botHasPerm } from "../commands/admin/common";
import { AddListenerMethod, CommandHandler, CommandPrefixManager, Context, escapeStringForRegex, IListenerSet, Injector, isGuildChannel, isTextChannel, RoleManager, toggleRole } from "../lib";

const listeners: IListenerSet = {
	loadListeners(addListener: AddListenerMethod) {
		addListener("addroles", subscribeToAddRoles);
	},
};
export = listeners;

function subscribeToAddRoles() {
	// 	Get messages that aren't already commands
	return Injector.get(CommandHandler).nonCommandMessages
		.pipe(
			filter((message: Message) => isTextChannel(message.channel) && isGuildChannel(message.channel)),
			filter((message: Message) => botHasPerm(Permissions.FLAGS.MANAGE_ROLES, new Context(message, ""))),
		)
		//  Look for messages with role commands
		.subscribe(async (message: Message) => {
			const guild = message.guild!;
			const channel = message.channel as GuildChannel;
			const prefixManager = Injector.get(CommandPrefixManager);
			const prefix = prefixManager.getGuildPrefix(channel.guild.id);

			const [first] = message.content.split(" ");
			if (!first.toLowerCase().startsWith(prefix.toLowerCase())) { return; }

			const roleName = first.slice(prefix.length);
			const roleRegex = new RegExp("^" + escapeStringForRegex(roleName.replace(/[\W_]/igm, "")), "i");

			const role = guild.roles.cache
				.find((r) => roleRegex.test(r.name.replace(/[\W_]/igm, "")));
			if (!role) { return; }

			const roleManager = Injector.get(RoleManager);
			const allowed = roleManager.guildAllowedRoles.has(guild.id)
				&& (roleManager.guildAllowedRoles.get(guild.id) as Set<string>).has(role.id);
			if (!allowed) { return; }

			if (await toggleRole(new Context(message, prefix), role)) {
				message.reply(`OK, I have assigned the role ${role.name}.`);
			} else {
				message.reply(`OK, I have removed the role ${role.name}.`);
			}
		});
}
