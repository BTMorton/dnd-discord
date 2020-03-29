// tslint:disable: no-console
import { FileGetter, IImporter } from ".";
import { flatMap, generateSearchStrings } from "../../lib";
import { ILegendaryGroup, IMonsterFile, IMonsterLegendaryGroupFile, IStoredMonster, IStoredMonsterFeat, isTypeWithEntries } from "../../models";

export class MonsterImporter implements IImporter {
	private fileGetter = new FileGetter();

	public async getData() {
		console.log("Loading monster data...");
		const monsterFiles: IMonsterFile[] = await this.fileGetter.scrapeResource("bestiary");
		const legendaryGroupFile: IMonsterLegendaryGroupFile = await this.fileGetter.getResource(["bestiary", "legendarygroups.json"].join("/"));

		console.log("Converting monster data...");
		const legendaryGroupMap = legendaryGroupFile.legendaryGroup.reduce((map, legendaryGroup) =>
			map.set(legendaryGroup.name, legendaryGroup),
			new Map<string, ILegendaryGroup>());

		const monsters = flatMap(monsterFiles, (monsterFile) =>
			monsterFile.monster.map(({ legendaryGroup, ...monster }): IStoredMonster => ({
				...legendaryGroup
					? legendaryGroupMap.get(legendaryGroup.name)
					: {},
				...monster,
				...generateSearchStrings(monster.name),
				compendiumType: "monster",
			})));

		const allAbilities = flatMap(monsters, (monster) => [
			...monster.trait || [],
			...monster.lairActions || [],
			...monster.regionalEffects || [],
			...monster.legendary || [],
		].filter(isTypeWithEntries)
			.filter((type) => !!type.name)
			.map((feat) => ({
				...feat,
				monsters: [monster.name],
				page: monster.page,
				source: monster.source,
			})));

		const abilityMap = allAbilities.reduce((map, ability) => {
			if (map.has(ability.name)) {
				const storedAbility = map.get(ability.name);
				storedAbility.monsters = [
					...storedAbility.monsters,
					...ability.monsters,
				];
				return map.set(ability.name, storedAbility);
			}
			return map.set(ability.name, ability);
		}, new Map());

		const abilities = Array.from(abilityMap.values(), (ability): IStoredMonsterFeat => ({
			...ability,
			...generateSearchStrings(ability.name, ability.monsters.join(" ")),
			compendiumType: "monsterfeat",
		}));

		return [
			...monsters,
			...abilities,
		];
	}
}
