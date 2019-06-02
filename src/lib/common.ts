import { CategoryChannel, Channel, DMChannel, GroupDMChannel, Guild, GuildChannel, Role, TextChannel, VoiceChannel } from "discord.js";
import { CREATOR_IDS } from "./constants";
import { Context } from "./context";

export function isCreator(context: Context) {
	return CREATOR_IDS.has(context.user.id);
}

export function isGuildChannel(channel: Channel): channel is GuildChannel {
	return ["text", "voice", "category"].includes(channel.type);
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
	const member = context.guild.member(context.user);

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
