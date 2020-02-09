import { ABILITY_SHORT, CONDITIONS, DAMAGE_TYPE, SKILL, SOURCE_KEY } from "./enums";

export interface ISourceItem {
	name: string;
	source: SOURCE_KEY;
	baseName?: string;
	baseSource?: string;
	page?: number;
}

export interface ISourcePage {
	source: SOURCE_KEY;
	page: string;
}

export interface IStored extends ISourceItem {
	name: string;
	compendiumType: string;
	searchString: string;
	searchStrings: string[];
}

export type IAbilityMap<T = number> = { [key in ABILITY_SHORT]: T };
export type ISkillMap<T = number> = { [key in SKILL]: T };

export interface ISkillChoice {
	choose: number;
	from: SKILL[];
	amount?: number;
}

export type EntryType = string | TypeWithEntries | ITypeTable | ITypeTableGroup | ITypeTableRow | ITypeTableCell | ITypeList
	| ITypeBonus | ITypeDice | ITypeAbility | ITypeAbilityGeneric | ITypeLink | ITypeOptFeature | ITypePatron | ITypeItem | ITypeEntry
	| ITypeImage | ITypeGallery | ITypeAttack | ITypeHr | ITypeSpellcasting;

export function isTypeWithEntries(entry: EntryType): entry is TypeWithEntries {
	return typeof entry !== "string" && "entries" in entry;
}

export type TypeWithEntries = ITypeEntries | ITypeHomebrew | ITypeQuote | ITypeVariant | ITypeItemEntries | ITypeActions;
export interface ITypeWithEntries extends ITypeEntryBase {
	entries: EntryType[];
}
export interface ITypeEntryBase {
	name?: string;
	type: string;
	source?: SOURCE_KEY;
	data?: any;
	page?: number;
}

export interface ITypeEntries extends ITypeEntryBase {
	type: "entries" | "inset" | "insetReadaloud" | "variantSub" | "options" | "inlineBlock" | "section";
	alias?: string;
	entries: EntryType[];
}

export interface ITypeHomebrew extends ITypeEntryBase {
	type: "homebrew";
	entries?: EntryType[];
	movedTo?: EntryType;
	oldEntries?: EntryType[];
}

export interface ITypeQuote extends ITypeEntryBase {
	type: "quote";
	entries: EntryType[];
	by?: string;
	from?: string;
}

export interface ITypeTable extends ITypeEntryBase {
	type: "table";
	caption?: string;
	intro?: EntryType[];
	outro?: EntryType[];
	isStriped?: boolean;
	style?: string;
	colLabels?: string[];
	colStyles?: string[];
	rowLabels?: string[];
	rowStyles?: string[];
	rows: Array<Array<ITypeTableCell | string>>;
	footnotes?: EntryType[];
}

export interface ITypeTableGroup extends ITypeEntryBase {
	type: "tableGroup";
	tables?: ITypeTable[];
}

export interface ITypeTableRow extends ITypeEntryBase {
	type: "row";
	style?: string;
	row: EntryType[];
}

export interface ITypeTableCell extends ITypeEntryBase {
	type: "cell";
	roll: ITypeTableCellRoll;
}

export type ITypeTableCellRoll = ITypeTableCellRollMinMax | ITypeTableCellRollExact;
export interface ITypeTableCellRollMinMax {
	min: number;
	max: number;
	entry?: EntryType;
	pad?: boolean;
}
export interface ITypeTableCellRollExact {
	exact: number;
	entry?: EntryType;
	pad?: boolean;
}

export interface ITypeList extends ITypeEntryBase {
	type: "list";
	items: EntryType[];
	style?: string;
	columns?: number;
}

export interface ITypeBonus extends ITypeEntryBase {
	type: "bonus" | "bonusSpeed";
	value: number;
}

export interface ITypeDice extends ITypeEntryBase {
	type: "dice";
	toRoll?: ITypeDiceRoll[];
	rollable?: boolean;
}

export interface ITypeDiceRoll {
	number: number;
	faces: number;
}

export interface ITypeAbility extends ITypeEntryBase {
	type: "abilityDc" | "abilityAttackMod";
	attributes: ABILITY_SHORT[];
	name: string;
}

export interface ITypeAbilityGeneric extends ITypeEntryBase {
	type: "abilityGeneric";
	attributes?: ABILITY_SHORT[];
	text: string;
}

export interface ITypeLink extends ITypeEntryBase {
	type: "link";
	text: string;
	href: ITypeHref;
}

export type ITypeHref = ITypeHrefExternal | ITypeHrefInternal;
export interface ITypeHrefExternal {
	type: "external";
	url: string;
}
export interface ITypeHrefInternal {
	type: "internal";
	path: string;
	hash?: string;
	hashPreEncoded?: boolean;
	subhashes?: ITypeHrefInternalSubhash[];
	hover?: ISourcePage;
}

export type ITypeHrefInternalSubhash = {
	key: string;
	preEncoded?: boolean;
} & ({
	values: string[];
} | {
	value: string;
});

export interface ITypeOptFeature extends ITypeEntryBase {
	type: "optfeature";
	name: string;
	prerequisite: string;
}

export interface ITypePatron extends ITypeEntryBase {
	type: "patron";
	name: string;
}

export interface ITypeVariant extends ITypeEntryBase {
	type: "variant";
	name: string;
	entries: EntryType[];
	variantSource: ISourcePage;
}

export type ITypeItem = ITypeItemEntry | ITypeItemEntries;
export interface ITypeItemEntries extends ITypeEntryBase {
	type: "item";
	name: string;
	entries: EntryType[];
}
export interface ITypeItemEntry extends ITypeEntryBase {
	type: "item";
	name: string;
	entry: EntryType;
}

export function isITypeItemEntry(entry: ITypeItem): entry is ITypeItemEntry {
	return "entry" in entry;
}

export interface ITypeEntry extends ITypeEntryBase {
	type: "itemSub" | "itemSpell";
	name: string;
	entry: EntryType;
}

export interface ITypeImage extends ITypeEntryBase {
	type: "image";
	href: ITypeHref;
	title?: string;
	altText?: string;
	imageType?: "map";
	width?: number;
	height?: number;
}

export interface ITypeGallery extends ITypeEntryBase {
	type: "gallery";
	images: ITypeImage[];
}

export interface ITypeActions extends ITypeEntryBase {
	type: "actions";
	name: string;
	entries: EntryType[];
}

export interface ITypeAttack extends ITypeEntryBase {
	type: "attack";
	attackType: "MW" | "RW";
	attackEntries: EntryType[];
	hitEntries: EntryType[];
}

export interface ITypeHr extends ITypeEntryBase {
	type: "hr";
}

export interface ITypeSpellcasting extends ITypeEntryBase {
	type: "spellcasting";
	name: string;
	headerEntries?: EntryType[];
	constant?: string[];
	will?: string[];
	rest?: ITypeSpellcastingFrequency;
	daily?: ITypeSpellcastingFrequency;
	weekly?: ITypeSpellcastingFrequency;
	spells?: ITypeSpellcastingSpells;
	hidden?: Array<"constant" | "will" | "rest" | "daily" | "weekly" | "spells">;
	footerEntries?: EntryType[];
	ability?: ABILITY_SHORT;
}

export interface ITypeSpellcastingSpells {
	"0"?: string[];
	"1"?: ITypeSpellcastingLevel[];
	"2"?: ITypeSpellcastingLevel[];
	"3"?: ITypeSpellcastingLevel[];
	"4"?: ITypeSpellcastingLevel[];
	"5"?: ITypeSpellcastingLevel[];
	"6"?: ITypeSpellcastingLevel[];
	"7"?: ITypeSpellcastingLevel[];
	"8"?: ITypeSpellcastingLevel[];
	"9"?: ITypeSpellcastingLevel[];
}

export interface ITypeSpellcastingLevel {
	lower?: number;
	slots?: number;
	spells: string[];
}

export interface ITypeSpellcastingFrequency {
	"9e"?: string[];
	"9"?: string[];
	"8e"?: string[];
	"8"?: string[];
	"7e"?: string[];
	"7"?: string[];
	"6e"?: string[];
	"6"?: string[];
	"5e"?: string[];
	"5"?: string[];
	"4e"?: string[];
	"4"?: string[];
	"3e"?: string[];
	"3"?: string[];
	"2e"?: string[];
	"2"?: string[];
	"1e"?: string[];
	"1"?: string[];
}

export interface INote {
	preNote?: string;
	note?: string;
}

export type DamageVuln = IDamageVuln | DAMAGE_TYPE | ISpecial;
export interface IDamageVuln extends INote {
	vulnerable: DamageVuln;
}

export type DamageResist = IDamageResist | DAMAGE_TYPE | ISpecial;
export interface IDamageResist extends INote {
	resist: DamageResist;
}

export type ConditionImmune = CONDITIONS | ISpecial | IConditionImmune;
export interface IConditionImmune extends INote {
	conditionImmune: CONDITIONS[];
}

export type DamageImmune = DAMAGE_TYPE | ISpecial | IDamageImmune;
export interface IDamageImmune extends INote {
	immune: DAMAGE_TYPE[];
}

export type SPEED_KEY = keyof ISpeeds;
export interface ISpeed extends ISpeeds, IChoice<SPEED_KEY> {
	canHover?: boolean;
	alternate: ISpeeds<SpeedValue[]>;
}

export interface ISpeeds<T = SpeedValue> {
	walk?: T;
	burrow?: T;
	climb?: T;
	fly?: T;
	swim?: T;
}

export type SpeedValue = ISpeedValue | number;
export interface ISpeedValue {
	number: number;
	condition: string;
}

export type TRAITS = "Amphibious" | "Armor Proficiency" | "Damage Resistance" | "Dragonmark" | "Improved Resting" | "Monstrous Race" | "Natural Armor"
	| "NPC Race" | "Powerful Build" | "Skill Proficiency" | "Spellcasting" | "Tool Proficiency" | "Unarmed Strike" | "Uncommon Race" | "Weapon Proficiency";

export type TYPE_OPTS<T extends string> = { [key in T]: boolean };
export type IChoosable<T extends string> = TYPE_OPTS<T> & {
	choose: IChoice<T>;
};

export interface IChoice<T> {
	from: T[];
	count: number;
	amount?: number;
	textReference?: boolean;
}

export interface ISpecial {
	special: string;
}
