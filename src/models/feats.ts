import { EntryType, IAbilityMap, IChoosable, ISourceItem, ISourcePage, IStored } from "./common";
import { ABILITY_SHORT, ARMOR } from "./enums";

export interface IFeatsFile {
	feat: IFeatData[];
}

export interface IFeatData extends ISourceItem {
	prerequisite?: IFeatPrereq[];
	additionalSources?: ISourcePage[];
	entries: EntryType[];
	ability?: IChoosable<ABILITY_SHORT>;
}

export interface IStoredFeat extends IFeatData, IStored {
	compendiumType: "feat";
}

export interface IFeatPrereq {
	race?: IFeatRacePrereq[];
	ability?: IAbilityMap[];
	spellcasting?: boolean;
	proficiency?: IFeatArmorPrereq[];
	special?: string;
	level?: number;
}

export interface IFeatRacePrereq {
	name: string;
	subrace?: string;
}

export interface IFeatArmorPrereq {
	armor: ARMOR;
}
