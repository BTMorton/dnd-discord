// tslint:disable: no-console
import { FileGetter, IImporter } from ".";
import { generateSearchStrings } from "../../lib";
import { IBackgroundsFile, IStoredBackground } from "../../models";

export class BackgroundImporter implements IImporter {
	private fileGetter = new FileGetter();

	public async getData() {
		console.log("Loading backgrounds data...");
		const backgroundsFile: IBackgroundsFile = await this.fileGetter.getResource("backgrounds.json");

		console.log("Converting backgrounds data...");
		const backgrounds: IStoredBackground[] = backgroundsFile.background.map((background) => ({
			...background,
			...generateSearchStrings(background.name),
			compendiumType: "background",
		}));

		return backgrounds;
	}
}
