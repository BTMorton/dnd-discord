// tslint:disable: no-console
import { IBasicItemsFile, IItemsFile, IStoredItem } from "models/items";
import { FileGetter, IImporter } from ".";
import { generateSearchStrings } from "../../lib";

export class ItemImporter implements IImporter {
	private fileGetter = new FileGetter();

	public async getData() {
		console.log("Loading item data...");
		const itemsFile: IItemsFile = await this.fileGetter.getResource("items.json");
		const baseItemsFile: IBasicItemsFile = await this.fileGetter.getResource("items-base.json");

		console.log("Converting item data...");
		return [
			...itemsFile.item || [],
			...baseItemsFile.baseitem || [],
		].map((item) => ({
			...item,
			...generateSearchStrings(item.name),
			compendiumType: "item",
		})) as IStoredItem[];
	}
}
