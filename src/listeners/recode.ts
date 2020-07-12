import { GuildMember, TextChannel } from "discord.js";
import { filter } from "rxjs/operators";
import { AddListenerMethod, Bot, formatError, IListenerSet, Injector } from "../lib";

const CONST_RC_SERVER_ID = "569209846256369684";
const CONST_RC_MEMBER_ROLE_ID = "571741515123130378";
const CONST_RC_BOT_LOG_CHANNEL = "711343351147790336";

const listeners: IListenerSet = {
	loadListeners(addListener: AddListenerMethod) {
		addListener("recodeNewMembers", subscribeToRecodeNewMembers);
	},
};
export = listeners;

function subscribeToRecodeNewMembers() {
	const bot = Injector.get(Bot);
	return bot.observe("guildMemberAdd")
		.pipe(
			//  This member is in MM
			filter(([member]) => member.guild.id === CONST_RC_SERVER_ID),
		)
		.subscribe(async ([member]) => {
			//  The username is a common bot web address format
			if (/(twit(ter|ch)|discord)\.[a-z]{2,3}\//i.test(member.user.username)) {
				return await banRecodeMember(member);
			}

			const memberRole = bot.client.guilds.get(CONST_RC_SERVER_ID)?.roles.get(CONST_RC_MEMBER_ROLE_ID);
			if (!memberRole) {
				return await sendRCBotLog(`Unable to give ${member.user.username}#${member.user.discriminator} the Member role as it could not be found.`);
			}

			await member.addRole(memberRole);
		});
}

async function banRecodeMember(member: GuildMember) {
	try {
		await member.ban({ days: 1, reason: "Suspected bot user account." });
		await sendRCBotLog(`Banned user ${member.user.username}#${member.user.discriminator} as a suspected bot user account.`);
	} catch (e) {
		await sendRCBotLog(`Unable to ban user ${member.user.username}#${member.user.discriminator} as a suspected bot user account. Error: ${formatError(e)}`);
	}
}

function sendRCBotLog(message: string) {
	const channel = Injector.get(Bot).client.channels.get(CONST_RC_BOT_LOG_CHANNEL) as TextChannel;

	return channel?.send(message, { split: true });
}
