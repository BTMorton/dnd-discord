// tslint:disable: no-console
import request = require("request-promise-native");
import { IImporter } from ".";
import { flatMap, generateSearchStrings } from "../../lib";
import { EntryType, ISRDInclude, ISRDRule, IStoredRule } from "../../models";
import includeFile = require("../../srd_rule_includes.json");

export class RuleImporter implements IImporter {
	private seenRules: Set<string> = new Set();

	public async getData() {
		console.log("Loading rules data...");
		const srd: ISRDRule = await request({
			json: true,
			uri: "https://raw.githubusercontent.com/BTMorton/dnd-5e-srd/master/5esrd.json",
		});

		console.log("Converting rules data...");
		return this.nestedProcessRules(srd, includeFile);
	}

	private nestedProcessRules(srd: ISRDRule, includes: ISRDInclude, parents: string[] = []): IStoredRule[] {
		return flatMap(Object.keys(includes),
			(rule) => {
				if (includes[rule] === false) return [];
				if (!(rule in srd)) {
					console.log("Rule " + rule + " does not exist under " + parents.join(", "));
					return [];
				}

				let name = rule;

				if (this.seenRules.has(name)) {
					name = rule + " (" + parents.slice(-1)[0] + ")";
					// console.log("Duplicate rule " + rule + " in " + parents.join(", ") + ". Renaming to " + name);

					if (this.seenRules.has(name)) {
						console.log("Renamed rule duplicated. Skipping rule.");
						return [];
					}
				}

				const content: EntryType[] = [];
				const srdItem = srd[rule];
				let children: string[] = [];
				let nestedRules: IStoredRule[] = [];

				if (typeof srdItem === "string") {
					content.push(srdItem);
				} else if (srdItem instanceof Array) {
					content.push({
						entries: srdItem,
						type: "entries",
					});
				} else if ("table" in srdItem) {
					const colLabels = Object.keys(srdItem.table);
					const rows = Object.values(srdItem.table) as string[][];

					content.push({
						colLabels,
						rows,
						type: "table",
					});
				} else {
					const contentItem = srdItem.content;
					if (contentItem) {
						if (typeof contentItem === "string") {
							content.push(contentItem);
						} else if (contentItem instanceof Array) {
							content.push({
								entries: contentItem,
								type: "entries",
							});
						}
					}

					children = flatMap(Object.entries(includes[rule]),
						([childKey, includeChild]) => {
							if (includeChild !== false) return [childKey];

							const childItem = srdItem[childKey];

							let childContent: string[] = [];
							if (typeof childItem === "string") {
								childContent = [childItem];
							} else if (childItem instanceof Array) {
								childContent = childItem;
							} else if ("content" in childItem) {
								childContent = (childItem.content instanceof Array
										? childItem.content
										: [childItem.content]);
							}

							return [
								"",
								`**${childKey}**`,
								"",
								...childContent,
							];
						});

					if (content.length === 0) {
						// console.log("Skipping rule " + rule + " under " + parents.join(", ") + " as it has no content, including children");
						return this.nestedProcessRules(srd[rule] as ISRDRule, includes[rule] as ISRDInclude, [...parents]);
					}

					nestedRules = this.nestedProcessRules(srd[rule] as ISRDRule, includes[rule] as ISRDInclude, [...parents, rule]);
				}

				this.seenRules.add(name);

				const parsedRule: IStoredRule = {
					...generateSearchStrings(name),
					...(children.length > 0 ? { children } : {}),
					...(parents.length > 0 ? { parents } : {}),
					compendiumType: "rule",
					content,
					name,
					source: "SRD",
				};

				return [
					parsedRule,
					...nestedRules,
				];
			});
	}
}
