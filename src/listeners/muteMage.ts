import { GuildChannel, TextChannel } from "discord.js";
import { bufferTime, filter, map } from "rxjs/operators";
import { CONST_SERVER_ID, mmSortingChannels } from "../commands/mutemage/common";
import { AddListenerMethod, Bot, CommandHandler, formatError, IListenerSet, Injector, isGuildChannel } from "../lib";

const MUTE_MAGE_GRIM_LOG_CHANNEL = "438683515064680458";
const listeners: IListenerSet = {
	loadListeners(addListener: AddListenerMethod) {
		// addListener("channel_updates", subscribeToChannelUpdates);
		addListener("guild_member_add", subscribeToGuildMemberAdd);
		addListener("murica", subscribeToMurica);
	},
};
export = listeners;

function subscribeToChannelUpdates() {
	return Injector.get(Bot).observe("channelUpdate")
		.pipe(
			//  Not currently sorting channels
			filter(() => !mmSortingChannels.has(CONST_SERVER_ID)),
			//  The channel is a MM channel
			filter(([_, channel]) => isGuildChannel(channel) && channel.guild.id === CONST_SERVER_ID),
			//  Fix type issues
			map(([oldChan, newChan]) => [oldChan, newChan] as [GuildChannel, GuildChannel]),
			//  The positions have changed
			filter(([oldChan, newChan]) => oldChan.position !== newChan.position),
			//  Format string
			map(([oldChan, newChan]) => `${oldChan} moved from ${oldChan.position} to ${newChan.position}`),
			//  Only message once every 2 seconds
			bufferTime(2000),
			//  Only continue is there is more than one update
			filter((updates: string[]) => updates.length > 0),
		)
		.subscribe((updates: string[]) => sendMMLog(`Found ${updates.length} updated channels:\n` + updates.join("\n")));
}

function subscribeToGuildMemberAdd() {
	return Injector.get(Bot).observe("guildMemberAdd")
		.pipe(
			//  This member is in MM
			filter(([member]) => member.guild.id === CONST_SERVER_ID),
			//  The username is a common bot web address format
			filter(([member]) => /(twit(ter|ch)|discord)\.[a-z]{2,3}\//i.test(member.user.username)),
		)
		.subscribe(async ([member]) => {
			try {
				await member.ban({ days: 1, reason: "Suspected bot user account." });
				await sendMMLog(`Banned user ${member.user} as a suspected bot user account.`);
			} catch (e) {
				await sendMMLog(`<@&232403207962230785> - Unable to ban user ${member.user} as a suspected bot user account. Error: ${formatError(e)}`);
			}
		});
}

function subscribeToMurica() {
	return Injector.get(CommandHandler).nonCommandMessages
		.pipe(filter((message) => message.content === "MURICA"))
		.subscribe((message) => message.channel.send("FUCK YEAH!"));
}

function sendMMLog(message: string) {
	const channel = Injector.get(Bot).client.channels.get(MUTE_MAGE_GRIM_LOG_CHANNEL) as TextChannel;
	if (!channel) { return; }

	return channel.send(message, { split: true });
}
