import { Permissions, TextChannel } from "discord.js";
import { AddCommandMethod, ICommandSet } from "../../lib/command";
import { formatError, isTextChannel, isTextChannelContext } from "../../lib/common";
import { Context } from "../../lib/context";
import { hasPerm } from "./common";

const commandSet: ICommandSet = {
	loadCommands(addCommand: AddCommandMethod) {
		addCommand("oldchannels", listOldChannels, {
			aliases: ["oldchannel"],
			validators: [
				isTextChannelContext,
				hasPerm.bind(null, Permissions.FLAGS.MANAGE_CHANNELS),
			],
		});
	},
};
export = commandSet;

function listOldChannels(context: Context) {
	const channels: TextChannel[] = context.guild.channels.array().filter(isTextChannel) as TextChannel[];

	const promises: Array<Promise<any>> = [];
	const monthAgo = Date.now() - (1000 * 60 * 60 * 24 * 7 * 4);

	channels.sort((a, b) => a.position - b.position);

	let firstChannel = channels.shift();

	while (firstChannel && !firstChannel.name.startsWith("l------")) {
		firstChannel = channels.shift();
	}

	for (const channel of channels) {
		if (channel.name.startsWith("l------")) {
			continue;
		}

		promises.push(channel.fetchMessages({ limit: 1 }).then((messages) => {
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

			return null;
		}).catch((e: Error) => {
			console.error("Could not get last message for " + channel.name, formatError(e));
			return null;
		}));
	}

	return Promise.all(promises).then((foundChannels: any[]) => {
		foundChannels = foundChannels.filter((el) => !!el);
		const reply = "The following channels have not had any activity in the past four weeks:\n" + foundChannels.join("\n");
		return context.sendToChannel(reply);
	}).catch((e: Error) => {
		console.error(e);
	}).then(() => undefined);
}
