import { Permissions, TextChannel } from "discord.js";
import { AddCommandMethod, ICommandSet } from "../../lib/command";
import { isTextChannel, isTextChannelContext } from "../../lib/common";
import { Context } from "../../lib/context";
import { CONST_DIVIDER_CHANNEL_ID, CONST_ROOT_CHANNEL_IDS } from "../mutemage/common";
import { hasPerm } from "./common";

const commandSet: ICommandSet = {
	loadCommands(addCommand: AddCommandMethod) {
		addCommand("oldchannels", listOldChannels, {
			aliases: ["oldchannel"],
			help: {
				section: "Server Administration",
				shortDescription: "Lists channels that have not been active recently",
			},
			validators: [
				isTextChannelContext,
				hasPerm.bind(null, Permissions.FLAGS.MANAGE_CHANNELS),
			],
		});
	},
};
export = commandSet;

async function listOldChannels(context: Context) {
	const channels: TextChannel[] = context.guild.channels.array()
		.filter(isTextChannel)
		.filter((channel) => channel.guild.id === context.guild.id)
		.filter((channel) => !CONST_ROOT_CHANNEL_IDS.includes(channel.id))
		.filter((channel) => channel.id !== CONST_DIVIDER_CHANNEL_ID);

	const monthAgo = Date.now() - (1000 * 60 * 60 * 24 * 7 * 4);

	const promises = channels.map(async (channel) => {
		try {
			const messages = await channel.fetchMessages({ limit: 1 });
			const lastMessage = messages.first();

			if (lastMessage) {
				const timestamp = lastMessage.editedTimestamp || lastMessage.createdTimestamp;

				if (timestamp < monthAgo) {
					return channel;
				}
			} else {
				console.error("Could not get last message for " + channel.name + ", assuming none.");

				if (channel.createdTimestamp < monthAgo) {
					return channel;
				}
			}
		} catch (e) {
			console.error("Could not get last message for " + channel.name, e.message);
		}
	});

	const foundChannels = (await Promise.all(promises))
		.filter((channel): channel is TextChannel => channel != null);

	foundChannels.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

	const reply = "The following channels have not had any activity in the past four weeks:\n" + foundChannels.join("\n");
	await context.sendToChannel(reply);
}
