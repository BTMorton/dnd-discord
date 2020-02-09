// tslint:disable: no-console
import { FileGetter, IImporter } from ".";
import { flatMap, generateSearchStrings } from "../../lib";
import { ISpellClasses, ISpellsFile, IStored, IStoredSpell } from "../../models";

export class SpellImporter implements IImporter {
	private fileGetter = new FileGetter();

	public async getData(): Promise<IStored[]> {
		console.log("Loading spell data...");
		const spellsFile: ISpellsFile[] = await this.fileGetter.scrapeResource("spells");

		console.log("Converting spell data...");
		const spells: IStoredSpell[] = flatMap(
			spellsFile,
			(file) => file.spell.map((spell) => ({
				...spell,
				...generateSearchStrings(spell.name),
				backgrounds: spell.backgrounds ? spell.backgrounds.map((bg) => bg.name) : [],
				classes: spell.classes ? this.reduceSpellClasses(spell.classes) : [],
				compendiumType: "spell",
				duration: spell.duration[0],
				races: spell.races ? spell.races.map((bg) => bg.name) : [],
				time: spell.time[0],
			})),
		);

		return spells;
	}

	private reduceSpellClasses(classes: ISpellClasses): string[] {
		return [
			...classes.fromClassList
				? classes.fromClassList.map((cls) => cls.name)
				: [],
			...classes.fromSubclass
				? classes.fromSubclass.map((subcls) => `${subcls.class.name}: ${subcls.subclass.name}`)
				: [],
		];
	}
}
