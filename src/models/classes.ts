import { EntryType, IAbilityMap, ISkillChoice, ISourceItem, IStored, ITypeDice, ITypeEntries } from "./common";
import { ABILITY_SHORT, SOURCE_KEY } from "./enums";

export interface IClassFile {
	class: IClassData[];
}

export interface IClassData extends ISourceItem {
	hd: IHitDie;
	proficiency: ABILITY_SHORT[];
	classTableGroups: IClassTable[];
	startingProficiencies: IStartingProficiencies;
	startingEquipment: IStartingEquipment;
	multiclassing: IMulticlassing;
	classFeatures: IClassFeatureEntry[][];
	subclassTitle: string;
	subclasses?: ISubclass[];
	page: number;
}

export interface IStoredClass extends IClassData, IStored {
	compendiumType: "class";
	subclassFeatLevels?: number[];
	subclasses?: IStoredSubclass[];
	page: number;
}

export interface IStoredSubclass extends ISubclass, IStored {
	className: string;
	compendiumType: "subclass";
	description: EntryType[];
	featLevels: number[];
	subclassTitle: string;
}

export interface IHitDie {
	number: number;
	faces: number;
}

export interface IClassTable {
	colLabels: string[];
	rows: EntryType[][];
	title?: string;
}

export interface IStartingProficiencies {
	armor?: string[];
	weapons?: string[];
	tools?: string[];
	skills?: ISkillChoice[];
}

export interface IStartingEquipment {
	additionalFromBackground: boolean;
	default: string[];
	goldAlternative: string;
}

export interface IMulticlassing {
	requirements: IAbilityMap;
	proficienciesGained: IStartingProficiencies;
}

export interface IStoredClassFeature extends IClassFeatureEntry, IStored {
	compendiumType: "classfeat";
	name: string;
	subclass?: string;
	className: string;
	level: number;
	source: SOURCE_KEY;
}

export interface ISubclass extends ISourceItem {
	subclassFeatures: IClassFeatureEntry[][];
	shortName: string;
}

export interface IClassFeatureEntry extends ITypeEntries {
	gainSubclassFeature?: boolean;
}
