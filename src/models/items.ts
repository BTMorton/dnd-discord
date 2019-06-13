import { EntryType, IAbilityMap, ISkillChoice, ISourceItem, IStored } from "./common";
import { DAMAGE_TYPE_KEY, ITEM_PROPERTIES, ITEM_RARITIES, ITEM_TYPE_KEYS, SOURCE_KEY } from "./enums";

export interface IItemsFile {
	item: IItemData[];
	itemGroup: IItemsGroupData[];
}

export interface IBasicItemsFile {
	baseitem: IItemData[];
}

export interface IItemData extends ISourceItem {
	rarity: ITEM_RARITIES;
	type?: ITEM_TYPE_KEYS;
	page?: number;
	additionalSources?: IAdditionalSource[];
	baseItem?: string;
	ac?: number;
	age?: string;
	ammunition?: boolean;
	armor?: boolean;
	axe?: boolean;
	carryingcapacity?: string;
	dmg1?: string;
	dmg2?: string;
	dmgType?: DAMAGE_TYPE_KEY;
	entries?: EntryType[];
	additionalEntries?: EntryType[];
	property?: ITEM_PROPERTIES[];
	range?: string;
	reload?: string;
	reqAttune?: string | boolean;
	curse?: boolean;
	resist?: string;
	scfType?: string;
	speed?: string;
	stealth?: boolean;
	strength?: string;
	sword?: boolean;
	firearm?: boolean;
	staff?: boolean;
	tier?: string;
	value?: string;
	valueMult?: number;
	weapon?: boolean;
	weaponCategory?: string;
	weight?: number;
	weightMult?: number;
	weightNote?: string;
	wondrous?: boolean;
	sentient?: boolean;
	poison?: boolean;
	crew?: number;
	vehAc?: number;
	vehHp?: number;
	vehDmgThresh?: number;
	items?: string[];
	attachedSpells?: string[];
	ability?: IItemAbility;
	focus?: boolean | string[];
	lootTables?: Array<string | ILootItem>;
}

export interface IStoredItem extends IItemData, IStored {
	compendiumType: "item";
}

export interface IItemsGroupData extends IItemData {
	items: string[];
}

export interface IAdditionalSource {
	source: SOURCE_KEY;
	page: number;
}

export interface IItemAbility extends IAbilityMap {
	choose: ISkillChoice[];
	static: IAbilityMap;
}

export interface ILootItem extends ISourceItem {
	type: string;
}
