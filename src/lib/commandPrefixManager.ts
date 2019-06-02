import { Database } from "./database";
import { Injector } from "./injector";

export class CommandPrefixManager {
	private static CONST_DEFAULT_PREFIX = "/";
	private serverPrefixes: Map<string, string> = new Map();
	private dmPrefixes: Map<string, string> = new Map();

	public getGuildPrefix(guildId: string): string {
		return this.serverPrefixes.has(guildId)
			? this.serverPrefixes.get(guildId) as string
			: CommandPrefixManager.CONST_DEFAULT_PREFIX;
	}

	public getDMPrefix(guildId: string): string {
		return this.dmPrefixes.has(guildId)
			? this.dmPrefixes.get(guildId) as string
			: CommandPrefixManager.CONST_DEFAULT_PREFIX;
	}

	public async setGuildPrefix(guildId: string, prefix: string) {
		this.serverPrefixes.set(guildId, prefix);

		const collection = await Injector.get(Database).getCollection("serverPrefixes");
		await collection.update(
			{ server: guildId },
			{ server: guildId, prefix },
			{ upsert: true },
		);
	}

	public async setDMPrefix(channelId: string, prefix: string) {
		this.dmPrefixes.set(channelId, prefix);

		const collection = await Injector.get(Database).getCollection("dmPrefixes");
		await collection.update(
			{ channel: channelId },
			{ channel: channelId, prefix },
			{ upsert: true },
		);
	}
}
