import { EntryType, IChoosable, ISourceItem, IStored } from "./common";
import { LANGUAGES, SKILL, TOOL_PROFICIENCIES } from "./enums";

export interface IBackgroundsFile {
	background: IBackgroundData[];
}

export interface IBackgroundData extends ISourceItem {
	skillProficiencies: ISkillProficiencyChoice[];
	toolProficiencies?: IToolProficiencyChoice[];
	languageProficiencies?: ILanguageProficiencyChoice[];
	entries: EntryType[];
}

export interface IStoredBackground extends IBackgroundData, IStored {
	compendiumType: "background";
}

export interface ISkillProficiencyChoice extends IChoosable<SKILL> {}
export interface IToolProficiencyChoice extends IChoosable<TOOL_PROFICIENCIES> {}
export interface ILanguageProficiencyChoice extends IChoosable<LANGUAGES> {}
