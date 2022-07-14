import { CategoryChannel, Guild, GuildChannel, TextChannel } from "discord.js";
import { Bot, Context, formatError, Injector, isCategory, isGuildChannel, isTextChannel } from "../../lib";

export const CONST_SERVER_ID = "232401294399111170";
export const CONST_HELPERS_ROLE_ID = "232620671790743552";
export const CONST_BOT_ROLE_ID = "232594809926189058";
export const CONST_DM_ROLE_ID = "234635573808070656";
export const CONST_SPECTATOR_ROLE_ID = "510946568329756672";
export const CONST_EVERYONE_ROLE_ID = "232401294399111170";
export const CONST_IGNORED_ROLE_IDS = [
	CONST_HELPERS_ROLE_ID,
	CONST_BOT_ROLE_ID,
	CONST_DM_ROLE_ID,
	CONST_SPECTATOR_ROLE_ID,
	CONST_EVERYONE_ROLE_ID,
	"487657258738778112",	// muted
	"232403207962230785",	// Admin
	"286362255065481216",	// Avrae
	"343810940539502592",	// LFG!
	"585554398571397150",	// Nitro Booster
	"694971377723113602",	// Fake Spider
	"464846353110007818",	// Big Bear
	"439880343974182913",	// criticalrole
	"543527633682432051",	// D1-C3
	"562148009366781954",	// Server Daddy
	"409034444058656778",	// Dragonspeaker
];
export const CONST_DIVIDER_CHANNEL_ID = "370221981020323840";

export const CONST_ROOT_CHANNEL_IDS = [
	"232404448943538176",	// welcome
	"236965875289292800",	// announcements
	"691579092562346005",	// spellbook-contest
	"691624996409180170",	// spellbook-contest-discussion
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
	"438683515064680458",	// grim-log
	"989042338775040020",	// reports - (automod)
];

// const CONST_NERDS_ONLY_CHANNEL = "263847732110819329";

const doingChannelSort: Set<string> = new Set();
export const mmSortingChannels: Set<string> = new Set();

export function isMuteMage(context: Context): boolean {
	return context.guild && context.guild.id === CONST_SERVER_ID;
}

export async function sortChannels(context: Context) {
	if (doingChannelSort.has(context.guild.id)) {
		await context.reply("Unable to sort channels. There is a sort already in progress");
		return;
	}

	try {
		await context.sendToChannel("Starting channel sort. Please wait...");
		await doChannelSort(context.guild);
		await context.sendToChannel("Channel order updated.");
	} catch (e) {
		console.error(`Error during channel sort: ${formatError(e)}`);
		await context.reply("There was a problem updating some of the channels.");
		await Injector.get(Bot).sendDebugMessage(`Error during channel sort: ${formatError(e)}`);
	}
}
async function doChannelSort(guild: Guild) {
	try {
		mmSortingChannels.add(guild.id);
		doingChannelSort.add(guild.id);

		const bot = Injector.get(Bot);
		const guildChannels: GuildChannel[] = bot.client.channels.array()
			.filter((channel) => isGuildChannel(channel) && channel.guild.id === guild.id) as GuildChannel[];
		const categories: CategoryChannel[] = (guildChannels.filter((channel) => isCategory(channel)) as CategoryChannel[]);
		categories.sort((a, b) => a.position - b.position);

		const channels: TextChannel[] = (guildChannels.filter((channel) => isTextChannel(channel)) as TextChannel[]);

		const rootChannels: TextChannel[] = [];
		const gameChannels: TextChannel[] = [];
		const channelMap: Map<string, TextChannel[]> = new Map<string, TextChannel[]>();
		let mainDivider: TextChannel | null = null;

		for (const category of categories) {
			channelMap.set(category.id, []);
		}

		for (const channel of channels) {
			if (channel.parentID != null) {
				if (!channelMap.has(channel.parentID)) {
					channelMap.set(channel.parentID, []);
				}

				(channelMap.get(channel.parentID) as TextChannel[]).push(channel);
			} else if (CONST_ROOT_CHANNEL_IDS.includes(channel.id)) {
				rootChannels.push(channel);
			} else if (channel.id === CONST_DIVIDER_CHANNEL_ID) {
				mainDivider = channel;
			} else {
				gameChannels.push(channel);
			}
		}
		if (!mainDivider) { return; }

		// tslint:disable:no-console
		rootChannels.sort((a, b) => CONST_ROOT_CHANNEL_IDS.indexOf(a.id) - CONST_ROOT_CHANNEL_IDS.indexOf(b.id));
		gameChannels.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

		let allChannels: TextChannel[] = [
			...rootChannels,
			mainDivider,
			...gameChannels,
		];

		for (const category of categories) {
			const categoryChannels: TextChannel[] | undefined = channelMap.get(category.id);
			if (!categoryChannels || categoryChannels.length === 0) continue;

			allChannels = [...allChannels, ...categoryChannels.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))];
		}

		await guild.setChannelPositions(
			allChannels
				.map((channel, position) => ({
					channel,
					position,
				})),
		);
	} finally {
		mmSortingChannels.delete(guild.id);
		doingChannelSort.delete(guild.id);
	}
}
