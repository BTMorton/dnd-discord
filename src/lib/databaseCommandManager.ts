import { runInNewContext } from "vm";
import { Compendium } from "./compendium";
import { Database, Injector } from "./index";

export interface IDatabaseCommand {
	userId: string;
	command: string;
	code: string;
}

export class DatabaseCommandManager {
	private static CONST_MAX_COMMAND_TIME = 5000;

	public async getAll(userId: string): Promise<IDatabaseCommand[]> {
		return (await this.getCollection()).find({ userId }).toArray();
	}

	public async getCommand(userId: string, command: string): Promise<IDatabaseCommand | null> {
		return (await this.getCollection()).findOne({
			command,
			userId,
		});
	}

	public async addCommand(userId: string, command: string, code: string) {
		const collection = await this.getCollection();
		const result = await collection.findOneAndUpdate({
			command,
			userId,
		}, {
			$set: {
				code,
			},
			$setOnInsert: {
				command,
				userId,
			},
		}, {
			upsert: true,
		});

		return !!result.value;
	}

	public async deleteCommand(userId: string, command: string) {
		const collection = await this.getCollection();
		const result = await collection.findOneAndDelete({
			command,
			userId,
		});

		return !!result.value ? true : false;
	}

	public async runCommand(command: IDatabaseCommand, args: string[]) {
		const message = args.join(" ");

		const compendium = Injector.get(Compendium);
		const returnData = await runInNewContext(command.code, {
			args,
			lookup: (search: string, type: string) => compendium.search(search, type),
			messageData: message,
		}, {
			timeout: DatabaseCommandManager.CONST_MAX_COMMAND_TIME,
		});

		return typeof returnData === "string"
			? returnData
			: JSON.stringify(returnData, null, "    ");
	}

	private async getCollection() {
		return Injector.get(Database).getCollection("dbCommands");
	}
}
