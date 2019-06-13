import { EntryType, IStored } from "./common";

export type ISRDRule = IAnyRule & {
	content: string | string[];
};

export interface IAnyRule {
	[key: string]: string | string[] | ISRDRule | ISRDTable;
}

export interface ISRDTable {
	table: {
		[key: string]: string[];
	};
}

export interface ISRDInclude {
	[key: string]: ISRDInclude | boolean;
}

export interface IStoredRule extends IStored {
	compendiumType: "rule";
	content: EntryType[];
	parents?: string[];
	children?: string[];
}
