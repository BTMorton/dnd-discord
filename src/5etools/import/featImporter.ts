// tslint:disable: no-console
import { FileGetter, IImporter } from ".";
import { generateSearchStrings } from "../../lib";
import { IFeatsFile, IStoredFeat } from "../../models";

export class FeatImporter implements IImporter {
	private fileGetter = new FileGetter();

	public async getData() {
		console.log("Loading feat data...");
		const featsFile: IFeatsFile = await this.fileGetter.getResource("feats.json");

		console.log("Converting feat data...");
		return featsFile.feat.map((feat) => ({
			...feat,
			...generateSearchStrings(feat.name),
			compendiumType: "feat",
		} as IStoredFeat));
	}
}
