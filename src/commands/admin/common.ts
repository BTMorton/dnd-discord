import { Bot, Context, Injector, isGuildChannel } from "../../lib";

export function botHasPerm(permission: number | undefined, context: Context): boolean {
	if (!permission) return false;
	if (!isGuildChannel(context.channel)) return false;

	const member = context.guild.member(Injector.get(Bot).client.user!);
	return member != null && member.hasPermission(permission);
}

export function hasPerm(permission: number | undefined, context: Context): boolean {
	if (!permission) return false;
	if (!isGuildChannel(context.channel)) return false;

	const member = context.guild.member(context.user);
	return member != null && member.hasPermission(permission);
}

export function hasRole(roleId: string, context: Context): boolean {
	if (!isGuildChannel(context.channel)) return false;

	const member = context.guild.member(context.user);
	return member != null && member.roles.cache.has(roleId);
}
