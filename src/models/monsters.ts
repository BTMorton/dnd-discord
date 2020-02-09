import { ConditionImmune, DamageImmune, DamageResist, DamageVuln, EntryType, IAbilityMap, ISkillMap, ISourceItem, ISourcePage, ISpecial, ISpeed, IStored, ITypeEntries, ITypeImage, ITypeSpellcasting, ITypeWithEntries, TRAITS } from "./common";
import { ALIGNMENT_KEY, CR_VALUE, DAMAGE_TYPE_KEY, DRAGON_COLORS, ENVIRONMENT, LANGUAGE_MAP, LANGUAGES, MISC_TAG_KEYS, SENSE_KEYS, SIZE_KEYS, SOURCE_KEY, TYPES } from "./enums";

export interface IStats {
	str: number;
	dex: number;
	con: number;
	wis: number;
	int: number;
	cha: number;
}

export interface IMonsterFluffFile {
	monster: IMonsterFluffFileData[];
}

export interface IMonsterFluffFileData extends ISourceItem {
	type?: string;
	images?: ITypeImage[];
	entries?: EntryType[];
	_copy?: ISourceItem;
	_appendCopy?: ISourceItem;
}

export interface IMonsterFile {
	monster: IMonsterData[];
	_meta: IMonsterFileMeta;
}

export interface IMonsterFileMeta {
	dependencies: { monster: string[]; };
	otherSources: { monster: any; };
}

export interface IStoredMonster extends IStored, Exclude<IMonsterData, "legendaryGroup">, ILegendaryGroup {
	compendiumType: "monster";
}

export interface IMonsterData extends IStats, ISourceItem {
	ac: MonsterAC[];
	alignment: ALIGNMENT_KEY[];
	cr: CR_VALUE | IMonsterCR;
	hp: IMonsterHP;
	passive: number;
	size: SIZE_KEYS;
	speed: ISpeed;
	type: MonsterType;
	shortName?: string;
	alias?: string[];
	group?: string;
	otherSources?: ISourcePage[];
	externalSources?: { entry: EntryType };
	save?: IAbilityMap<string> | ISpecial;
	skill?: IMonsterSkills;
	senses?: string[];
	languages?: LANGUAGES[];
	vulnerable?: DamageVuln[];
	resist?: DamageResist[];
	conditionImmune?: ConditionImmune[];
	immune?: DamageImmune[];
	spellcasting?: ITypeSpellcasting[];
	trait?: ITypeEntries[];
	action?: ITypeEntries[];
	reaction?: ITypeEntries[];
	legendaryGroup?: ISourceItem;
	legendaryActions?: number;
	legendaryHeader?: EntryType[];
	legendary?: ITypeEntries[];
	variant?: Array<EntryType & ISourceItem>;
	familiar?: boolean;
	additionalSources?: ISourcePage[];
	tokenUrl?: string;
	altArt?: ISourceItem;
	fluff?: MonsterFluff;
	isNamedCreature?: boolean;
	isNpc?: boolean;
	environment?: ENVIRONMENT[];
	soundClip?: string;
	dragonCastingColor?: DRAGON_COLORS;
	traitTags?: TRAITS[];
	actionTags?: [];
	languageTags?: LANGUAGE_MAP[];
	senseTags?: SENSE_KEYS[];
	spellcastingTags?: Array<"I" | "P" | "S">;
	damageTags?: DAMAGE_TYPE_KEY[];
	miscTags?: MISC_TAG_KEYS[];
	footer?: EntryType[];
	_copy?: IMonsterCopy;
}

export interface IMonsterSkills extends ISkillMap<string> {
	other: Array<{
		oneOf: ISkillMap<string>;
	}>;
}

export interface IStoredMonsterFeat extends ITypeWithEntries, IStored {
	name: string;
	source: SOURCE_KEY;
	compendiumType: "monsterfeat";
	monsters: string[];
}

export interface IMonsterCopy extends ISourceItem {
	_mod: { [key: string]: string | CopyMod | CopyMod[] };
	_trait: ISourceItem;
}

export type CopyMod = IReplaceTextMod | IAppendStrMod | IAppendArrMod | IReplaceArrMod | IRemoveArrMod | ICalculatePropMod | ISpellsMod;

export interface IReplaceArrMod {
	mode: "replaceOrAppendArr" | "replaceArr";
	replace: string;
	items: string | EntryType[];
}

export interface IAppendArrMod {
	mode: "appendArr" | "prependArr";
	items: string | EntryType[];
}

export interface IReplaceTextMod {
	mode: "replaceTxt";
	replace: string;
	with: string;
	flags?: string;
}

export interface IAppendStrMod {
	mode: "appendStr";
	str: string;
	joiner?: string;
}

export interface IRemoveArrMod {
	mode: "removeArr";
	names?: string | EntryType[];
	items?: string | EntryType[];
}

export interface ICalculatePropMod {
	mode: "calculateProp";
	prep?: string;
	formula?: string;
}

export interface ISpellsMod {
	mode: "replaceSpells" | "addSpells";
	spells?: any;
}

export type MonsterFluff = { _monsterFluff: ISourceItem; } | IMonsterFluff;
export interface IMonsterFluff {
	entries: EntryType[];
	images: ITypeImage[];
}

export type MonsterType = TYPES | IMonsterType;

export interface IMonsterType {
	type: TYPES;
	swarmSize?: SIZE_KEYS;
	tags?: Array<string | IMonsterTypeTag>;
}

export interface IMonsterTypeTag {
	tag: string;
	prefix: string;
}

export type MonsterAC = IMonsterAC | number;

export interface IMonsterAC {
	ac: number;
	from?: string[];
	condition?: string;
	braces?: boolean;
}

export type MonsterHP = IMonsterHP | ISpecial;

export interface IMonsterHP {
	average: number;
	formula: string;
}

export type Alignment = ALIGNMENT_KEY | IAlignment | ISpecial;

export interface IAlignment {
	alignment: ALIGNMENT_KEY[];
	change: number;
}

export interface IMonsterCR {
	cr: CR_VALUE;
	lair?: string;
	cover?: string;
}

//  Monster meta.json
export interface IMonsterMetaFile {
	legendaryGroup: ILegendaryGroup[];
	language: { [key: string]: string };
}

export interface ILegendaryGroup extends ISourceItem {
	lairActions?: EntryType[];
	regionalEffects?: EntryType[];
}
