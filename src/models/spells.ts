import { EntryType, ISourceItem, IStored } from "./common";
import { ABILITIES, CASTING_DURATION, CASTING_DURATION_TYPE, CONDITIONS, DAMAGE_TYPE, DISTANCE, RANGE, SPELL_AREA_TYPE_KEY, SPELL_ENDS_KEY, SPELL_SCHOOL_KEYS, TIMES } from "./enums";

export interface ISpellsFile {
	spell: ISpellData[];
}

export interface ISpellData extends ISourceItem {
	level: number;
	school: SPELL_SCHOOL_KEYS;
	time: ICastingTime[];
	range: ISpellRange;
	components: ISpellComponents;
	duration: ISpellDuration[];
	classes: ISpellClasses;
	entries: EntryType[];
	page: number;
	meta?: ISpellMeta;
	damageInflict?: DAMAGE_TYPE[];
	conditionInflict?: CONDITIONS[];
	savingThrow?: ABILITIES[];
	areaTags?: SPELL_AREA_TYPE_KEY[];
	backgrounds: ISourceItem[];
	miscTags?: string[];
	entriesHigherLevel?: EntryType[];
	races?: ISourceItem[];
}

export interface IStoredSpell extends ISourceItem, IStored {
	level: number;
	school: SPELL_SCHOOL_KEYS;
	time: ICastingTime;
	range: ISpellRange;
	components: ISpellComponents;
	duration: ISpellDuration;
	classes: string[];
	entries: EntryType[];
	page: number;
	meta?: ISpellMeta;
	damageInflict?: DAMAGE_TYPE[];
	conditionInflict?: CONDITIONS[];
	savingThrow?: ABILITIES[];
	areaTags?: string[];
	miscTags?: string[];
	entriesHigherLevel?: EntryType[];
	backgrounds?: string[];
	races?: string[];
}

export interface ISpellClasses {
	fromClassList: ISourceItem[];
	fromSubclass: Array<{
		class: ISourceItem;
		subclass: ISourceItem;
	}>;
}

export interface ICastingTime {
	number: number;
	unit: TIMES;
	condition?: string;
}

export interface ISpellDuration {
	type: CASTING_DURATION_TYPE;
	duration?: IDuration;
	concentration?: boolean;
	ends?: SPELL_ENDS_KEY[];
	condition?: string;
}

export interface IDuration {
	type: CASTING_DURATION;
	amount?: number;
	upTo?: boolean;
}

export interface ISpellRange {
	type: RANGE;
	distance: IDistance;
}

export interface IDistance {
	type: DISTANCE;
	amount: number;
}

export interface ISpellComponents {
	v: boolean;
	s: boolean;
	m: string | IMaterialComponent;
}

export interface IMaterialComponent {
	text: string;
	cost: number;
	consume?: boolean;
}

export interface ISpellMeta {
	ritual: boolean;
}
