import { RichEmbed } from "discord.js";
import { EmbedHelper } from "../";
import {
	ABILITY_DISPLAY, EntryType, isITypeItemEntry, ISourceItem, ITypeAbility, ITypeAbilityGeneric, ITypeEntries, ITypeHref, ITypeItem, ITypeLink,
	ITypeList, ITypeTable, ITypeTableCell, ITypeTableCellRollExact, SOURCE_JSON_TO_FULL,
} from "../../models";

export abstract class CompendiumDisplay<ItemType> {
	public CONST_STRIP_WRAPPED_REGEX = /\{@([a-z]+)(?: ([^\}]+))?\}/i;
	public CONST_STRIP_REGEX = /([^|]+)(\|[^|]+)+/i;

	constructor(protected itemData: ItemType) { }

	public static get embed() {
		return new RichEmbed().setColor("RANDOM");
	}

	get embed() {
		return CompendiumDisplay.embed;
	}

	public abstract getEmbed(): RichEmbed | null;
	public abstract getText(): string | null;

	public getEmbeds(): RichEmbed[] {
		const embed = this.getEmbed();
		return embed ? [embed] : [];
	}

	protected renderSource(source: ISourceItem) {
		const page = source.page ? `, page ${source.page}` : "";
		return `Source: ${SOURCE_JSON_TO_FULL[source.source]}${page}`;
	}

	protected addEntries(title: string, entries: EntryType[], embed: RichEmbed, inline = false) {
		let textParts: string[] = [];
		for (const entry of entries) {
			if (typeof entry === "string") {
				textParts.push(this.stripMetadata(entry));
				continue;
			}

			if (entry.type === "list") {
				const allNamed = entry.items
					.every((item) => typeof item !== "string" && "name" in item);

				if (allNamed) {
					if (textParts.length > 0) {
						this.splitAddFields(title, textParts.join("\n"), embed, inline);
					}

					this.addEntries(entry.name || "\u200b", entry.items, embed, true);
					title = "\u200b";
					textParts = [];
					continue;
				}
			}

			const entryName = this.getEntryName(entry);
			if (entryName === "") {
				textParts.push(this.renderEntry(entry, false) as string);
				continue;
			}

			if (textParts.length > 0) {
				this.splitAddFields(title, textParts.join("\n"), embed, inline);
			}

			title = entryName;
			textParts = [
				this.renderEntry(entry, false) as string,
			];
		}

		if (textParts.length > 0) {
			this.splitAddFields(title, textParts.join("\n"), embed, inline);
		}
	}

	protected addEntriesAndDescription(entries: EntryType[], embed: RichEmbed) {
		let textParts: string[] = [];
		let title = "";
		for (const entry of entries) {
			if (typeof entry === "string") {
				textParts.push(this.stripMetadata(entry));
				continue;
			}

			if (entry.type === "list") {
				const allNamed = entry.items
					.every((item) => typeof item !== "string" && "name" in item);

				if (allNamed) {
					if (textParts.length > 0) {
						this.splitAddFields(title, textParts.join("\n"), embed);
					}

					this.addEntries(entry.name || "\u200b", entry.items, embed, true);
					title = "\u200b";
					textParts = [];
					continue;
				}
			}

			const entryName = this.getEntryName(entry);
			if (entryName === "") {
				textParts.push(this.renderEntry(entry, false) as string);
				continue;
			}

			if (textParts.length > 0) {
				title === ""
					? this.splitSetDescription(textParts.join("\n"), embed)
					: this.splitAddFields(title, textParts.join("\n"), embed);
			}

			title = entryName;
			textParts = [
				this.renderEntry(entry, false) as string,
			];
		}

		if (textParts.length > 0) {
			title === ""
				? this.splitSetDescription(textParts.join("\n"), embed)
				: this.splitAddFields(title, textParts.join("\n"), embed);
		}
	}

	protected splitFields(field: string) {
		return EmbedHelper.splitFields(field);
	}

	protected splitAddFields(title: string | undefined, field: string, embed: RichEmbed, inline = false) {
		return EmbedHelper.splitAddFields(embed, title, field, inline);
	}

	protected splitSetDescription(field: string, embed: RichEmbed) {
		return EmbedHelper.splitSetDescription(embed, field);
	}

	protected getEntryName(entry: EntryType) {
		if (typeof entry === "string") return "";

		let name = "";
		switch (entry.type) {
			case "table":
				name = entry.caption || entry.name || "";
				break;
			default:
				name = entry.name || "";
				break;
		}
		return this.stripMetadata(name.replace(/:$/, ""));
	}

	protected renderEntries(entries: EntryType[], includeNames = true): string {
		return entries.map((entry) => this.renderEntry(entry, includeNames))
			.join("\n");
	}

	protected renderEntry(entry: EntryType, includeNames = true) {
		if (typeof entry === "string") {
			return this.stripMetadata(entry);
		}

		if (typeof entry === "number") {
			return `${entry}`;
		}

		if (!entry.type && "entries" in entry) {
			(entry as any).type = "entries";
		}

		switch (entry.type) {
			case "entries":
			case "inset":
			case "insetReadaloud":
			case "variantSub":
			case "options":
			case "inlineBlock":
			case "section":
				const entries = this.renderEntries(entry.entries);
				const entryName = this.getEntryName(entry);
				return entryName && includeNames
					? `**${entryName}:** ${entries}`
					: entries;
			case "table":
				const table = this.renderTable(entry);
				const tableName = this.getEntryName(entry);
				return tableName && includeNames
					? `**${tableName.replace(/:$/, "")}:** ${table}`
					: table;
			case "list":
				return this.renderList(entry);
			case "link":
				return this.renderLink(entry);
			case "abilityDc":
			case "abilityAttackMod":
				return this.renderAbility(entry);
			case "abilityGeneric":
				return this.renderGenericAbility(entry);
			case "item":
				return this.renderItem(entry, includeNames);
			case "cell":
				const roll = (entry as ITypeTableCell).roll;
				const pad = roll.pad
					? (str: number) => `${str}`
					: (str: number) => `${str}`.padStart(2, "0");

				if ("min" in roll) {
					return `${pad(roll.min)}-${pad(roll.max)}`;
				} else {
					return pad((roll as ITypeTableCellRollExact).exact);
				}
			default:
				throw new Error(`Render method for entry type ${entry.type} not implemented.`);
		}
	}

	protected renderItem(entry: ITypeItem, includeNames = true): string {
		const display = isITypeItemEntry(entry)
			? this.renderEntry(entry.entry)
			: this.renderEntries(entry.entries);

		const entryName = this.getEntryName(entry);
		return entryName && includeNames
			? `**${entryName}:** ${display}`
			: display;
	}

	protected renderAbility(entry: ITypeAbility) {
		let text = "";
		switch (entry.type) {
			case "abilityDc":
				text = "save DC";
				break;
			case "abilityAttackMod":
				text = "attack modifier";
				break;
			default:
				break;
		}

		const mods = entry.attributes.map((ab) => ABILITY_DISPLAY[ab]).join(" or ");
		return `**${entry.name} ${text}** = 8 + proficiency bonus + ${mods} modifier${entry.attributes.length > 1 ? " (your choice)" : ""}`;
	}

	protected renderGenericAbility(entry: ITypeAbilityGeneric) {
		const name = entry.name ? `**${entry.name}** = ` : "";
		const mods = entry.attributes
			? entry.attributes.map((ab) => ABILITY_DISPLAY[ab]).join(" or ")
			: "";
		return `${name}${entry.text}${mods}`;
	}

	protected renderList(entry: ITypeList): string {
		return entry.items
			.map((item) => `  - ${this.renderEntry(item)}`)
			.join("\n");
	}

	protected renderLink(entry: ITypeLink): string {
		return `[${entry.text}](${this.renderHref(entry.href)})`;
	}

	// protected getImageLink(entry: ITypeImage): string {
	// 	return this.renderHref(entry.href, "img/");
	// }

	protected renderHref(href: ITypeHref, pathRoot = "") {
		switch (href.type) {
			case "internal":
				return `http://5e.tools/${pathRoot}${href.path}`;
			case "external":
				return href.url;
		}
	}

	protected renderTable(entry: ITypeTable): string {
		let headings = [];
		if (entry.rowLabels) headings.push("");
		if (entry.colLabels) {
			headings = headings.concat(entry.colLabels.map((label) => `**${this.stripMetadata(label)}**`));
		} else {
			headings = headings.concat(Array.from({ length: entry.rows[0].length }, () => ""));
		}

		const rows = [
			//  Add headings
			`${headings.join(" - ")}`,

			...entry.rows.map((row, index) => {
				const parts = [
					...entry.rowLabels ? [entry.rowLabels[index]] : [],
					...row.map((cell) => this.renderEntry(cell)),
				];
				return `${parts.join(" - ")}`;
			}),
		];

		return rows.join("\n");
	}

	protected generateFeatureList(features: ITypeEntries[][], levelLookup: number[]) {
		return features.map((feats, index) => {
			const level = `${levelLookup[index] + 1}`.padStart(2, "0");
			const featList = feats
				.filter((feat) => feat.name)
				.map((feat) => (feat.name as string).trim())
				.join(", ");

			return `${level}: ${featList}`;
		}).join("\n");
	}

	protected stripMetadata(input: string): string {
		let original;
		let matchString;
		let type = "";
		const match = this.CONST_STRIP_WRAPPED_REGEX.exec(input);
		if (match) {
			[
				original,
				type,
				matchString,
			] = match;
		} else {
			const altMatch = this.CONST_STRIP_REGEX.exec(input);
			if (!altMatch) {
				return input;
			}

			original = matchString = altMatch[0];
		}

		let replacement = "";
		switch (type) {
			case "skill":
			case "creature":
			case "spell":
			case "sense":
			case "book":
			case "filter":
			case "condition":
			case "item":
			case "adventure":
			case "race":
			case "action":
			case "table":
			default:
				[replacement] = matchString.split("|");
				break;
			case "hit":
				const hitMod = parseInt(matchString, 10);
				replacement = `${hitMod > 0 ? "+" : ""}${hitMod}`;
				break;
			case "recharge":
				const recharge = parseInt(matchString || "6", 10);
				replacement = `(Recharge: ${recharge}${recharge < 6 ? `-6` : ""})`;
				break;
			case "atk":
				replacement = this.renderAttackMetadata(matchString);
				break;
			case "h":
				replacement = "*Hit:* ";
				break;
			case "chance":
				replacement = `${matchString}%`;
				break;
			case "b":
			case "bold":
				replacement = `**${matchString}**`;
				break;
			case "s":
			case "strike":
				replacement = `~~${matchString}~~`;
				break;
			case "i":
			case "italic":
			case "note":
				replacement = `*${matchString}*`;
				break;
			case "scaledice": {
				const metadataParts = matchString.split("|");
				replacement = `${metadataParts.pop()}`;
				break;
			}
			case "dice": {
				const metadataParts = matchString.split("|");
				const roll = metadataParts.shift();
				const text = metadataParts.pop();
				const display = text ? ` ${text}` : "";
				replacement = `${roll}${display}`;
				break;
			}
			case "link": {
				const [
					display,
					url,
				] = matchString.split("|");
				replacement = `[${display}](${url})`;
				break;
			}
		}

		return this.stripMetadata(input.replace(original, replacement));
	}

	protected renderAttackMetadata(attack: string) {
		const tags = attack.split(",");

		return Array.from(new Set(tags), (tag) => [
			...tag.includes("m") ? ["Melee"] :
				tag.includes("r") ? ["Ranged"] :
					tag.includes("a") ? ["Area"] : [],
			...tag.includes("w") ? ["Weapon"] :
				tag.includes("r") ? ["Spell"] : [],
		].join(" ")).join(" or ") + " Attack:";
	}
}
