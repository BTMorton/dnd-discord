import { Channel, Guild, GuildChannel, TextChannel } from "discord.js";
import { Bot, Context, formatError, Injector, isTextChannel } from "../../lib";

export const CONST_SERVER_ID = "232401294399111170";
export const CONST_HELPERS_ROLE_ID = "232620671790743552";
export const CONST_MOD_ROLE_ID = "232413965630701568";
export const CONST_BOT_ROLE_ID = "232594809926189058";
export const CONST_OWDM_ROLE_ID = "376838160493314048";
export const CONST_WMDM_ROLE_ID = "281275770557431808";
export const CONST_DM_ROLE_ID = "234635573808070656";
export const CONST_ROGUEMODE_ROLE_ID = "236501592701009920";
export const CONST_SPECTATOR_ROLE_ID = "510946568329756672";
export const CONST_EVERYONE_ROLE_ID = "232401294399111170";
export const CONST_ADMIN_ROLE_ID = "232403207962230785";
export const CONST_AVRAE_ROLE_ID = "286362255065481216";
export const CONST_LFG_ROLE_ID = "343810940539502592";
export const CONST_D1C3_ROLE_ID = "384179473748197389";

// const CONST_NERDS_ONLY_CHANNEL = "263847732110819329";

const doingChannelSort: Set<string> = new Set();
const sortingChannels: Set<string> = new Set();

export function isMuteMage(context: Context): boolean {
	return context.guild.id === CONST_SERVER_ID;
}

export async function sortChannels(context: Context) {
	if (doingChannelSort.has(context.guild.id)) {
		await context.reply("Unable to sort channels. There is a sort already in progress");
		return;
	}

	await context.sendToChannel("Starting channel sort. Please wait...");
	try {
		const failedChannels: Channel[] = (await doChannelSort(context.guild))
			.filter((c) => !!c);

		let reply = "Channel order updated.";
		if (failedChannels.length > 0) {
			reply += " Could not update the following channels:";

			for (const channel of failedChannels) {
				reply += "\n" + channel;
			}
		}

		await context.reply(reply);
	} catch (e) {
		console.error(`Error during channel sort: ${formatError(e)}`);
		await context.reply("There was a problem updating some of the channels.");
		await Injector.get(Bot).sendDebugMessage(`Error during channel sort: ${formatError(e)}`);
	}
}

async function doChannelSort(guild: Guild) {
	sortingChannels.add(guild.id);
	doingChannelSort.add(guild.id);

	const muteMageRootIds = [
		"232404448943538176",	// welcome
		"236965875289292800",	// announcements
		"232401738563452928",	// open-game-list
		"324132737814626305",	// lfg-posts
		"232862074370260995",	// lfg-discussion
		"232401294399111170",	// general
		"232401426104582144",	// player-chat
		"232401446019137546",	// dm-chat
		"379439864132665344",	// art
		"391715036177104906",	// serious-talk
		"237695436729745409",	// nsfw-memes-nsfw
		"236170895993995265",	// bot-playpen
		"377910760807989248",	// project-mute-sheet
		"263847732110819329",	// nerds-only
	];

	const ignores = ["379093092307042314"];

	const channels: TextChannel[] = guild.channels.array().filter(isTextChannel) as TextChannel[];

	const rootChannels: TextChannel[] = [];
	const gameChannels: TextChannel[] = [];
	const westMarchesChannels: TextChannel[] = [];
	const orcWarsChannels: TextChannel[] = [];
	const orcOnlyChannels: TextChannel[] = [];
	let mainDivider: TextChannel | null = null;
	let wmDivider: TextChannel | null = null;

	for (const channel of channels) {
		if (ignores.includes(channel.id)) {
			continue;
		} else if (muteMageRootIds.includes(channel.id)) {
			rootChannels.push(channel);
		} else if (channel.topic && channel.topic.toLowerCase().startsWith("west marches")) {
			if (channel.name.startsWith("l------")) {
				wmDivider = channel;
			} else {
				westMarchesChannels.push(channel);
			}
		} else if (channel.name.startsWith("l------")) {
			mainDivider = channel;
		} else if (channel.name.startsWith("ow_") || channel.name.startsWith("owr_")) {
			orcWarsChannels.push(channel);
		} else if (channel.name.startsWith("owrc_") || channel.name.startsWith("owrcs_")) {
			orcOnlyChannels.push(channel);
		} else {
			gameChannels.push(channel);
		}
	}

	if (!mainDivider) {
		return Promise.resolve([]);
	}

	// tslint:disable:no-console
	rootChannels.sort((a, b) => muteMageRootIds.indexOf(a.id) - muteMageRootIds.indexOf(b.id));
	gameChannels.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
	westMarchesChannels.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
	orcWarsChannels.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
	orcOnlyChannels.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

	let allChannels: any[] = [];

	allChannels = allChannels.concat(rootChannels);

	allChannels.push(mainDivider);

	allChannels = allChannels.concat(gameChannels);

	if (wmDivider) {
		allChannels.push(wmDivider);
	}

	allChannels = allChannels.concat(westMarchesChannels);
	allChannels = allChannels.concat(orcWarsChannels);
	allChannels = allChannels.concat(orcOnlyChannels);

	const sortedChannelIds: string[] = allChannels.map((c) => c.id);
	const originalChannelIds: string[] = channels.sort((a, b) => a.position - b.position).map((c) => c.id).filter((c) => !ignores.includes(c));
	const changedChannelIds: Set<string> = new Set<string>();

	let sortedPos = 0;
	let origPos = 0;

	while (origPos < originalChannelIds.length && sortedPos < sortedChannelIds.length) {
		const originalId = originalChannelIds[origPos];
		const sortedId = sortedChannelIds[sortedPos];

		if (originalId !== sortedId) {
			if (changedChannelIds.has(originalId)) {
				origPos++;
			} else if (changedChannelIds.has(sortedId)) {
				sortedPos++;
			} else {
				const originalOffset = originalChannelIds.indexOf(sortedId);
				const sortedOffset = sortedChannelIds.indexOf(originalId);

				if (originalOffset < sortedOffset) {
					changedChannelIds.add(originalId);
					origPos++;
				} else {
					changedChannelIds.add(sortedId);
					sortedPos++;
				}
			}
			continue;
		}

		sortedPos++;
		origPos++;
	}

	const changedChannels = Array.from(changedChannelIds).map((cId) => guild.channels.get(cId)).filter((c) => !!c) as GuildChannel[];
	changedChannels.sort((a, b) => allChannels.indexOf(a) - allChannels.indexOf(b));
	console.log(changedChannels.map((c) => c.name));

	console.log("Sorting channels. Sorted " + changedChannels.length + " channels.");

	const failed: GuildChannel[] = [];
	const toSort = changedChannels.slice();

	while (toSort.length > 0) {
		const channel = toSort.pop();

		if (!channel) { break; }

		try {
			console.log("Sorting channel " + channel.name + " from " + channel.position + " to " + allChannels.indexOf(channel));
			await channel.setPosition(allChannels.indexOf(channel));
		} catch (e) {
			console.error("Could not update channel " + channel.name, e);
			failed.push(channel);
		}
	}

	sortingChannels.delete(guild.id);
	doingChannelSort.delete(guild.id);

	return failed;
}
