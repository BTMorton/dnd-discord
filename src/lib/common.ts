import { CategoryChannel, Channel, DMChannel, GroupDMChannel, Guild, GuildChannel, Role, TextChannel, VoiceChannel } from "discord.js";
import { CREATOR_IDS } from "./constants";
import { Context } from "./context";

export function isCreator(context: Context) {
	return CREATOR_IDS.has(context.user.id);
}

export function isGuildChannel(channel: Channel): channel is GuildChannel {
	return ["text", "voice", "category"].includes(channel.type)
		&& "guild" in channel && (channel as GuildChannel).guild != null;
}

export function isTextChannel(channel: Channel): channel is TextChannel {
	return channel.type === "text";
}

export function isTextChannelContext(context: Context) {
	return isTextChannel(context.channel);
}

export function isVoiceChannel(channel: Channel): channel is VoiceChannel {
	return channel.type === "voice";
}

export function isCategory(channel: Channel): channel is CategoryChannel {
	return channel.type === "category";
}

export function isDMChannel(channel: Channel): channel is DMChannel {
	return channel.type === "dm";
}

export function isGroupDMChannel(channel: Channel): channel is GroupDMChannel {
	return channel.type === "group";
}

export function escapeStringForRegex(regex: string): string {
	return regex.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
}

export function getGuildRole(guild: Guild, roleName: string): Role | null {
	return guild.roles.find((r) => new RegExp("^" + escapeStringForRegex(roleName) + "$", "i").test(r.name));
}

export function getGuildChannel(guild: Guild, channelName: string): GuildChannel | null {
	return guild.channels.find((r) => new RegExp("^" + escapeStringForRegex(channelName) + "$", "i").test(r.name));
}

export function getMapValueOrDefault<K, V>(map: Map<K, V>, key: K, defaultValue: V) {
	return map.has(key)
		? map.get(key) as V
		: defaultValue;
}

export function ordinal(num: number): string {
	const s: number = num % 100;

	if (s > 3 && s < 21) return num + "th";

	switch (s % 10) {
		case 1: return num + "st";
		case 2: return num + "nd";
		case 3: return num + "rd";
		default: return num + "th";
	}
}

export async function toggleRole(context: Context, role: Role) {
	const member = await context.guild.fetchMember(context.user);

	if (member.roles.has(role.id)) {
		await member.removeRole(role);
		return false;
	} else {
		await member.addRole(role);
		return true;
	}
}

export function formatError(error: any) {
	if (!(error instanceof Error)) { return error.toString(); }

	const stack = error.stack || "";
	return stack.split("\n")
		.slice(0, 2)
		.map((s) => s.trim())
		.join(" ");
}

export function flatten<T>(array: T[][]) {
	return array.reduce((arr, items) => arr.concat(items));
}

export function flatMap<T, U>(array: T[], callback: (item: T, index: number) => U[]) {
	return array.reduce((arr, item, index) => arr.concat(callback(item, index)), [] as U[]);
}

export interface IPartitioned<T, U> {
	fail: U;
	pass: T;
}
export function partition<T, U>(array: Array<T | U>, filter: (item: T | U) => item is T) {
	return array.reduce(({ fail, pass }, e) => filter(e)
		? { fail, pass: [...pass, e] }
		: { fail: [...fail, e], pass },
		{ fail: [], pass: [] } as IPartitioned<T[], U[]>);
}

export function generateSearchStrings(...inputs: string[]) {
	const input = inputs.join(" ");
	const searchString = input.replace(/[^\w]/g, "");
	const searchStrings = input.split(" ").map((str) => str.replace(/[^\w]/g, ""));

	return {
		searchString,
		searchStrings,
	};
}

export function joinConjunct(array: string[], join: string, conjuct: string) {
	if (array.length === 0) return "";
	if (array.length === 1) return array[0];

	const last = array.pop();
	return [
		array.join(join),
		last,
	].join(` ${conjuct} `);
}

export function capitalise(str: string) {
	return str.split("-")
		.map((substr) =>
			substr.split(" ")
				.map((s) => s[0].toUpperCase() + s.slice(1).toLowerCase())
				.join(" "))
		.join("-");
}
