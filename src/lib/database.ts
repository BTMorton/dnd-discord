import { Db, MongoClient } from "mongodb";

export class Database {
	private client: MongoClient | undefined;
	private db: Db | undefined;
	private connectionPromise: Promise<void> | undefined;

	public isConnected() {
		return !!this.db;
	}

	public destroy() {
		if (this.client) {
			this.client.close();
		}
	}

	public async connect() {
		this.connectionPromise = this.doConnect();
		await this.connectionPromise;
		this.connectionPromise = undefined;
	}

	public async getCollection(collectionName: string) {
		if (!this.db) {
			if (!this.connectionPromise) {
				throw new Error("Database is not connected and not connecting.");
			}

			await this.connectionPromise;
		}

		return (this.db as Db).collection(collectionName);
	}

	private async doConnect() {
		let userAuth = "";

		if (process.env.MONGO_USER && process.env.MONGO_PASS) {
			userAuth = `${process.env.MONGO_USER}:${process.env.MONGO_PASS}@`;
		}

		let mongoUrl = "localhost";
		if (process.env.MONGO_URL) {
			mongoUrl = process.env.MONGO_URL;
		}

		let mongoPort = 27017;
		if (process.env.MONGO_PORT) {
			mongoPort = parseInt(process.env.MONGO_PORT, 10);
		}

		let database = "discordBot";
		if (process.env.MONGO_DB) {
			database = process.env.MONGO_DB;
		}

		this.client = await MongoClient.connect(`mongodb://${userAuth}${mongoUrl}:${mongoPort}/${database}`, { useNewUrlParser: true });
		this.db = this.client.db();
	}
}
