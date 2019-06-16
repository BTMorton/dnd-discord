import { Database, Injector } from ".";

export class UserConfig {
	public setUserConfigKey(userId: string, key: string, value: any) {
		return this.setUserConfig(userId, { [key]: value });
	}

	public async setUserConfig(userId: string, config: {[key: string]: any}) {
		const collection = await this.getCollection();
		const result = await collection.findOneAndUpdate({ userId }, { $set: config }, { upsert: true });
		return result.ok && result.ok > 0;
	}

	public async getUserConfigKey(userId: string, key: string) {
		const config = await this.getUserConfig(userId);
		return config[key];
	}

	public async getUserConfig(userId: string) {
		const collection = await this.getCollection();
		const config = await collection.findOne({ userId });
		return config || {};
	}

	private async getCollection() {
		return Injector.get(Database).getCollection("userConfig");
	}
}
