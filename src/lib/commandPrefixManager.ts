import { Database } from "./database";
import { Injector } from "./injector";

export class CommandPrefixManager {
	private static CONST_DEFAULT_PREFIX = "/";
	private serverPrefixes: Map<string, string> = new Map();
	private channelPrefixes: Map<string, string> = new Map();

	public getGuildPrefix(guildId: string): string {
		return this.serverPrefixes.has(guildId)
			? this.serverPrefixes.get(guildId) as string
			: CommandPrefixManager.CONST_DEFAULT_PREFIX;
	}

	public getChannelPrefix(channelId: string): string {
		return this.channelPrefixes.has(channelId)
			? this.channelPrefixes.get(channelId) as string
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

	public async setChannelPrefix(channelId: string, prefix: string) {
		this.channelPrefixes.set(channelId, prefix);

		const collection = await Injector.get(Database).getCollection("dmPrefixes");
		await collection.update(
			{ channel: channelId },
			{ channel: channelId, prefix },
			{ upsert: true },
		);
	}

	public async initialise() {
		const db = Injector.get(Database);
		const dmCollection = await db.getCollection("dmPrefixes");
		const dmPrefixes = await dmCollection.find({}).toArray();
		this.channelPrefixes = new Map(dmPrefixes.map((doc) => [doc.channel, doc.prefix]));

		const serverCollection = await db.getCollection("serverPrefixes");
		const serverPrefixes = await serverCollection.find({}).toArray();
		this.serverPrefixes = new Map(serverPrefixes.map((doc) => [doc.server, doc.prefix]));
	}
}
