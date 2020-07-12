import { EntryType, IAbilityMap, IChoice, ISourceItem, ISourcePage, ISpeed, IStored, TRAITS } from "./common";
import { ABILITY_SHORT, LANGUAGES } from "./enums";

export interface IRacesFile {
	race: IRaceData[];
}

export interface IRaceData extends ISubRace {
	size?: "M" | "S" | "V";
	soundClip?: string;
	subraces?: ISubRace[];
}

export interface IStoredRace extends IStored, IRaceData {
	compendiumType: "race";
}

export interface IStoredSubRace extends IStored, ISubRace {
	compendiumType: "subrace";
}

export interface ISubRace extends ISourceItem {
	page?: number;
	otherSources?: ISourcePage[];
	ability?: IRaceAbilities[];
	speed?: IRaceSpeed;
	entries?: EntryType[];
	darkvision?: number;
	traitTags?: TRAITS[];
	languageTags?: LANGUAGES[];
}

export interface IRaceAbilities extends IAbilityMap {
	choose: IRaceAbilityChoice | IRaceAbilityChoice[];
}

export interface IRaceAbilityChoice extends IChoice<ABILITY_SHORT> {
	predefined: IAbilityMap;
	weighted: IAbilityWeights;
}

export interface IAbilityWeights {
	from: ABILITY_SHORT[];
	weight: number[];
}

export type IRaceSpeed = ISpeed | string | number | { type: "Varies" };
