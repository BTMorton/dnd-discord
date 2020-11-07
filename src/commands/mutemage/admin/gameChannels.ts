import { AwaitMessagesOptions, CollectorFilter, GuildChannel, Message, OverwriteData, Permissions, TextChannel } from "discord.js";
import { AddCommandMethod, Context, getGuildChannel, getGuildRole, ICommandSet, isTextChannelContext } from "../../../lib";
import { hasRole } from "../../admin/common";
import * as MuteMage from "../common";

const commandSet: ICommandSet = {
	loadCommands(addCommand: AddCommandMethod) {
		addCommand("createchannel", createChannel, {
			aliases: ["createchannels"],
			help: {
				section: "Mute Mage Administration",
				shortDescription: "Creates a new pair of ,game channels, a game role, and adds players",
			},
			validators: [
				MuteMage.isMuteMage,
				hasRole.bind(null, MuteMage.CONST_HELPERS_ROLE_ID),
				isTextChannelContext,
			],
		});
		addCommand("deletechannel", deleteChannel, {
			aliases: ["deletechannels"],
			help: {
				section: "Mute Mage Administration",
				shortDescription: "Removes a game channel, it's OOC channel and game role",
			},
			validators: [
				MuteMage.isMuteMage,
				hasRole.bind(null, MuteMage.CONST_HELPERS_ROLE_ID),
				isTextChannelContext,
			],
		});
	},
};

export = commandSet;

async function createChannel(context: Context) {
	const channelName = context.args[0];
	const guild = (context.channel as GuildChannel).guild;
	const channel = guild.channels.cache.find((c) => c.name === channelName);

	if (channel) {
		await context.reply(`Sorry, I could not create channel ${channelName} as the channel already exists.`);
		return;
	}

	const helpers = guild.roles.resolve(MuteMage.CONST_HELPERS_ROLE_ID);
	const bot = guild.roles.resolve(MuteMage.CONST_BOT_ROLE_ID);
	const dm = guild.roles.resolve(MuteMage.CONST_DM_ROLE_ID);
	const spectator = guild.roles.resolve(MuteMage.CONST_SPECTATOR_ROLE_ID);
	const everyone = guild.roles.resolve(MuteMage.CONST_EVERYONE_ROLE_ID);

	if (!helpers || !spectator || !dm || !bot || !everyone) {
		throw new Error("Unable to find all roles");
	}

	const role = await guild.roles.create({ data: { mentionable: true, name: channelName, permissions: [] } });

	const view = Permissions.FLAGS.VIEW_CHANNEL;
	const send = Permissions.FLAGS.VIEW_CHANNEL + Permissions.FLAGS.SEND_MESSAGES;
	const manage = Permissions.FLAGS.MANAGE_MESSAGES;
	const all = Permissions.FLAGS.VIEW_CHANNEL + Permissions.FLAGS.SEND_MESSAGES + Permissions.FLAGS.MANAGE_MESSAGES;
	const perms: OverwriteData[] = [
		{ allow: 0, deny: send, id: everyone.id, type: "role" },	// 	@everyone
		{ allow: view, deny: 0, id: spectator.id, type: "role" },	// 	Spectator
		{ allow: send, deny: 0, id: role.id, type: "role" },	// 	channel
		{ allow: manage, deny: 0, id: dm.id, type: "role" },	// 	DM
		{ allow: all, deny: 0, id: bot.id, type: "role" },	// 	Bot
		{ allow: all, deny: 0, id: helpers.id, type: "role" },	// 	Helpers
	];

	const oocPerms: OverwriteData[] = [
		{ allow: 0, deny: send, id: everyone.id, type: "role" },	// 	@everyone
		{ allow: send, deny: 0, id: role.id, type: "role" },	// 	channel
		{ allow: manage, deny: 0, id: dm.id, type: "role" },	// 	DM
		{ allow: all, deny: 0, id: bot.id, type: "role" },	// 	Bot
		{ allow: all, deny: 0, id: helpers.id, type: "role" },	// 	Helpers
	];

	const channels = await Promise.all([
		guild.channels.create(channelName, { type: "text", permissionOverwrites: perms }),
		guild.channels.create(channelName + "_ooc", { type: "text", permissionOverwrites: oocPerms }),
	]);
	await context.reply(`Channel ${channels[0]} created.`);

	if (context.mentions.members != null) {
		for (const [_, member] of context.mentions.members) {
			member.roles.add(role);
		}
	}

	await MuteMage.sortChannels(context);
}

async function deleteChannel(context: Context) {
	const channel: TextChannel = context.channel as TextChannel;
	const channelName = channel.name;
	const toDelete: Array<{
		toString(): string;
		delete(): Promise<any>;
	}> = [
			channel,
		];

	const oocChannel = getGuildChannel(context.guild, `${channelName}_ooc`);
	if (oocChannel) { toDelete.push(oocChannel); }

	const role = getGuildRole(context.guild, channelName);
	if (role) { toDelete.push(role); }

	const deleteConfirmationMessage = await context.reply(`I am about to delete the following:\n` +
		`${toDelete.map((item) => `- ${item.toString()}`).join("\n")}\n` +
		`To confirm the delete, reply "yes" to this message within 60 seconds.`);

	const filter: CollectorFilter = (m: Message) => m.author.id === context.user.id
		&& ["yes", "y"].includes(m.content.toLowerCase());

	const options: AwaitMessagesOptions = { errors: ["time"], max: 1, time: 60000 };

	try {
		await context.channel.awaitMessages(filter, options);

		await Promise.all(toDelete.map((item) => item.delete()));
	} catch (e) {
		deleteConfirmationMessage.forEach((m) => m.delete());
	}
}
