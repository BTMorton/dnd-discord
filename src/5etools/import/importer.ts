// tslint:disable: no-console
import { BackgroundImporter, ClassImporter, FeatImporter, ItemImporter, MonsterImporter, RaceImporter, RuleImporter, SpellImporter } from ".";
import { Database, flatten, Injector } from "../../lib";
import { IStored } from "../../models/common";

export interface IImporter {
	getData(): Promise<IStored[]>;
}

export class Importer {
	public async clear() {
		const collection = await this.getCollection();
		await collection.deleteMany({});
	}

	public importAll() {
		return this.import([
			new BackgroundImporter(),
			new ClassImporter(),
			new FeatImporter(),
			new ItemImporter(),
			new MonsterImporter(),
			new RaceImporter(),
			new RuleImporter(),
			new SpellImporter(),
		]);
	}

	public async import(importers: IImporter[]) {
		console.log("Reading data from 5etools...");
		const data = await Promise.all(importers.map((importer) => importer.getData()));

		const flattenedData = flatten(data);
		console.log("Putting data in the database...");
		await this.importData(flattenedData);

		return flattenedData.length;
	}

	private async importData(...data: IStored[][]) {
		const collection = await this.getCollection();
		await collection.insertMany(flatten(data));
	}

	private getCollection() {
		return Injector.get(Database).getCollection("compendium");
	}
}
