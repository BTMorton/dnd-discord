import { AwaitMessagesOptions, CollectorFilter, GuildChannel, Message, TextChannel } from "discord.js";
import { AddCommandMethod, Context, getGuildChannel, getGuildRole, ICommandSet, isTextChannelContext } from "../../../lib";
import { hasRole } from "../../admin/common";
import * as MuteMage from "../common";

const commandSet: ICommandSet = {
	loadCommands(addCommand: AddCommandMethod) {
		addCommand("createchannel", createChannel, {
			aliases: ["createchannels"],
			validators: [
				MuteMage.isMuteMage,
				hasRole.bind(null, MuteMage.CONST_HELPERS_ROLE_ID),
				isTextChannelContext,
			],
		});
		addCommand("deletechannel", deleteChannel, {
			aliases: ["deletechannels"],
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
	const channel = guild.channels.array().find((c) => c.name === channelName);

	if (channel) {
		await context.reply(`Sorry, I could not create channel ${channelName} as the channel already exists.`);
		return;
	}

	const helpers = guild.roles.get(MuteMage.CONST_HELPERS_ROLE_ID);
	const bot = guild.roles.get(MuteMage.CONST_BOT_ROLE_ID);
	const dm = guild.roles.get(MuteMage.CONST_DM_ROLE_ID);
	const rogue = guild.roles.get(MuteMage.CONST_ROGUEMODE_ROLE_ID);
	const everyone = guild.roles.get(MuteMage.CONST_EVERYONE_ROLE_ID);

	if (!helpers || !rogue || !dm || !bot || !everyone) {
		throw new Error("Unable to find all roles");
	}

	const role = await guild.createRole({ mentionable: true, name: channelName, permissions: [] });

	const perms: any[] = [
		{ allow: 0, deny: 0x800, id: everyone.id, type: "role" },	// 	@everyone
		{ allow: 0, deny: 0x400, id: rogue.id, type: "role" },	// 	RogueMode
		{ allow: 0x400 + 0x800, deny: 0, id: role.id, type: "role" },	// 	channel
		{ allow: 0x2000, deny: 0, id: dm.id, type: "role" },	// 	DM
		{ allow: 0x400 + 0x800 + 0x2000, deny: 0, id: bot.id, type: "role" },	// 	Bot
		{ allow: 0x400 + 0x800 + 0x2000, deny: 0, id: helpers.id, type: "role" },	// 	Helpers
	];

	const oocPerms: any[] = [
		{ allow: 0, deny: 0x800 + 0x400, id: everyone.id, type: "role" },	// 	@everyone
		{ allow: 0x400 + 0x800, deny: 0, id: role.id, type: "role" },	// 	channel
		{ allow: 0x2000, deny: 0, id: dm.id, type: "role" },	// 	DM
		{ allow: 0x400 + 0x800 + 0x2000, deny: 0, id: bot.id, type: "role" },	// 	Bot
		{ allow: 0x400 + 0x800 + 0x2000, deny: 0, id: helpers.id, type: "role" },	// 	Helpers
	];

	const channels = await Promise.all([
		guild.createChannel(channelName, "text", perms),
		guild.createChannel(channelName + "_ooc", "text", oocPerms),
	]);
	await context.reply(`Channel ${channels[0]} created.`);

	const members = context.mentions.members.array();
	members.forEach((member) => member.addRole(role));

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
		`${toDelete.map((item) => `- ${item.toString()}`) .join("\n")}\n` +
		`To confirm the delete, reply "yes" to this message within 60 seconds.`);

	const filter: CollectorFilter = (m: Message) => m.author.id === context.user.id
		&& ["yes", "y"].includes(m.content.toLowerCase());

	const options: AwaitMessagesOptions = { errors: ["time"], maxMatches: 1, time: 60000 };

	try {
		await context.channel.awaitMessages(filter, options);

		await Promise.all(toDelete.map((item) => item.delete()));
	} catch (e) {
		deleteConfirmationMessage.forEach((m) => m.delete());
	}
}
