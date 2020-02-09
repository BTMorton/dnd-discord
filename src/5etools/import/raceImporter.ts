// tslint:disable: no-console
import { FileGetter, IImporter } from ".";
import { flatMap, generateSearchStrings } from "../../lib";
import { IRacesFile, IStoredRace } from "../../models";

export class RaceImporter implements IImporter {
	private fileGetter = new FileGetter();

	public async getData() {
		console.log("Loading race data...");
		const racesFile: IRacesFile = await this.fileGetter.getResource("races.json");

		console.log("Converting race data...");
		const raceData = flatMap(racesFile.race, (race) => {
			let subraces: IStoredRace[] = [];
			let matchedRace = false;

			if (race.subraces) {
				subraces = race.subraces
					.map((subrace) => {
						const ability = race.ability && subrace.ability
							? [
								...race.ability,
								...subrace.ability,
							]
							: race.ability || subrace.ability;

						const languageTags = [
							...race.languageTags || [],
							...subrace.languageTags || [],
						];

						const traitTags = [
							...race.traitTags || [],
							...subrace.traitTags || [],
						];

						const name = subrace.name
							? `${race.name} (${subrace.name})`
							: race.name;

						matchedRace = matchedRace || subrace.name == null;

						return {
							...race,
							...subrace,
							...generateSearchStrings(race.name, subrace.name),
							ability,
							compendiumType: "race",
							entries: (race.entries || []).concat(subrace.entries || []),
							languageTags,
							name,
							subraces: [],
							traitTags,
						};
					});
			}

			if (!matchedRace) {
				subraces.push(
					{
						...race,
						...generateSearchStrings(race.name),
						compendiumType: "race",
					} as IStoredRace,
				);
			}

			return subraces;
		});

		return raceData;
	}
}
