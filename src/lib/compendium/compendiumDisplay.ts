import { RichEmbed } from "discord.js";
import { IStoredItem } from "models/items";
import { IRaceAbilities, IStoredRace } from "models/races";
import { capitalise, flatMap, joinConjunct, ordinal } from "../";
import { ABILITY_DISPLAY, ABILITY_SHORT, ALIGNMENT, CR_TO_XP_MAP, DAMAGE_TYPE, DAMAGE_TYPE_KEY, EntryType, IAbilityMap, ICastingTime, IChoice, IChoosable, IClassTable,
	IConditionImmune, IDamageImmune, IDamageResist, IDamageVuln, IDistance,	IFeatArmorPrereq, IFeatPrereq, IFeatRacePrereq, IHitDie, IMonsterSkills, IMulticlassing, INote,
	isITypeItemEntry, ISkillMap, ISourceItem, ISpecial, ISpeed, ISpellComponents, ISpellDuration, ISpellRange, IStartingEquipment, IStartingProficiencies,
	IStoredBackground, IStoredClass, IStoredClassFeature, IStoredFeat, IStoredMonster, IStoredMonsterFeat, IStoredRule, IStoredSpell, IStoredSubclass, ITEM_TYPE,
	ITypeAbility, ITypeAbilityGeneric, ITypeEntries, ITypeHref, ITypeItem, ITypeLink, ITypeList, ITypeTable, SIZE, SOURCE_JSON_TO_FULL, SPELL_ENDS, SPELL_SCHOOL_DISPLAY, TIME_DISPLAY } from "../../models";

export class CompendiumDisplay {
	public static CONST_STRIP_WRAPPED_REGEX = /\{@([a-z]+)(?: ([^\}]+))?\}/i;
	public static CONST_STRIP_REGEX = /([^|]+)(\|[^|]+)+/i;

	static get embed() {
		return new RichEmbed().setColor("RANDOM");
	}

	public static getClassEmbed(classData: IStoredClass, level?: number) {
		const embed = this.embed;

		if (level) {
			const levelIndex = level - 1;
			embed.setTitle(`${classData.name}, Level ${level}`);

			classData.classTableGroups.forEach((table: IClassTable) => {
				table.colLabels.forEach((label, index) =>
					embed.addField(this.stripMetadata(label), table.rows[levelIndex][index], true));

				for (let i = table.colLabels.length; (i % 3) !== 0; i++) {
					embed.addBlankField(true);
				}
			});

			if (classData.classTableGroups.length > 0 && classData.classFeatures[levelIndex].length > 0) {
				embed.addBlankField();
			}

			const subclassFeature = classData.classFeatures[levelIndex].reduce((gainSubclass, feature) => {
				embed.addField(feature.name, this.renderEntries(feature.entries));
				return gainSubclass || feature.gainSubclassFeature as boolean;
			}, false);

			if (subclassFeature) {
				embed.addField(`${classData.subclassTitle} Features`, this.renderSubclasses(classData, levelIndex));
			}

			return embed.setFooter(this.renderSource(classData));
		}

		embed.setTitle(classData.name)
			.setDescription(this.generateClassFeatureList(classData));

		if (classData.hd) embed.addField("Hit Die", this.renderHitDie(classData.hd), true);
		if (classData.proficiency) embed.addField("Saving Throws", this.renderSavingThrows(classData.proficiency), true);
		if (classData.startingProficiencies) embed.addField("Starting Proficiencies", this.renderStartingProficiencies(classData.startingProficiencies));
		if (classData.startingEquipment) embed.addField("Starting Equipment", this.renderStartingEquipment(classData.startingEquipment));
		if (classData.multiclassing) embed.addField("Multiclassing", this.renderMulticlass(classData.multiclassing), true);
		if (classData.subclasses) embed.addField(`${classData.subclassTitle}s`, this.renderSubclasses(classData), true);

		return embed.setFooter(this.renderSource(classData));
	}

	public static getSubclassEmbed(subclass: IStoredSubclass, level?: number) {
		const embed = this.embed;
		if (level) {
			embed.setTitle(`${subclass.className}: ${subclass.name}, Level ${level}`);

			const levelIndex = subclass.featLevels.indexOf(level - 1);
			subclass.subclassFeatures[levelIndex]
				.forEach((feature) => embed.addField(feature.name, this.renderEntries(feature.entries)));

			return embed;
		}

		embed.setTitle(`${subclass.className}: ${subclass.name}`);

		this.addEntriesAndDescription(subclass.description, embed);

		return embed
			.addField(`${subclass.subclassTitle} Features`, this.generateSubClassFeatureList(subclass))
			.setFooter(this.renderSource(subclass));
	}

	public static getClassFeatEmbed(feat: IStoredClassFeature) {
		const subclass = feat.subclass ? `${feat.subclass} - ` : "";
		const embed = this.embed
			.setTitle(`${feat.className}: ${subclass}${feat.name} (Level ${feat.level + 1})`);

		this.addEntriesAndDescription(feat.entries, embed);

		return embed;
	}

	public static getSpellEmbed(spell: IStoredSpell) {
		const embed = this.embed
			.setTitle(spell.name)
			.setDescription(this.renderSpellDescription(spell))
			.addField("Casting Time", this.renderCastingTime(spell.time), true)
			.addField("Range", this.renderRange(spell.range), true)
			.addField("Range", this.renderComponents(spell.components), true)
			.addField("Duration", this.renderDuration(spell.duration), true);

		this.addEntries("Description", spell.entries, embed);

		if (spell.entriesHigherLevel) {
			this.addEntries("At Higher Levels", spell.entriesHigherLevel, embed);
		}

		return embed.setFooter(this.renderSource(spell));
	}

	public static getSpellList(spells: IStoredSpell[], title = "Spell List") {
		const levelMap = spells.reduce((map, spell) => {
			return map.set(spell.level, [...map.get(spell.level) || [], spell ]);
		}, new Map<number, IStoredSpell[]>());

		const embed = this.embed
			.setTitle(title);

		const spellLevels = Array.from(levelMap.keys()).sort();
		for (const level of spellLevels) {
			const spellList = levelMap.get(level) as IStoredSpell[];
			const spellLevel = level === 0
				? `Cantrips`
				: `${ordinal(level)} Level`;

			this.splitAddFields(
				spellLevel,
				spellList.map((spell) => `${spell.name} - *${spell.classes.join(", ")}*`)
					.join("\n"),
				embed,
			);
		}

		return embed;
	}

	public static getSpellSlotEmbed(cls: IStoredClass, level: number) {
		const levelDisplay = level ? ` - Level ${level}` : "";
		const embed = this.embed
			.setTitle(`Spell slots for ${cls.name}${levelDisplay}`);
		const spellSlots = cls.classTableGroups.find((table) => /spell slots/i.test(table.title || ""));
		if (!spellSlots) return null;

		if (level) {
			spellSlots.rows = [spellSlots.rows[level - 1]];
		}

		const maxLevels = spellSlots.rows
			.reduce((maxLevel, row) => Math.max(maxLevel, row.filter((slots) => slots > 0).length), 0);

		const headings = Array.from({ length: maxLevels }, (_, i) => i + 1);

		const levelMod = level ? level : 1;

		const slotTable = [
			`|\u00A0\u00A0\u00A0\u00A0| ${headings.join(" | ")} |`,
			`|----|${headings.map(() => "---").join("|")}|`,
			...spellSlots.rows
				.map((slots: number[], index) => `| ${(levelMod + index).toString().padStart(2, "0")} | ${slots.slice(0, maxLevels).join(" | ")} |`),
		].join("\n");

		embed.setDescription(`\`\n${slotTable}\n\``);

		return embed;
	}

	public static getItemEmbed(item: IStoredItem) {
		const embed = this.embed
			.setTitle(item.name)
			.setDescription(this.renderItemDescription(item));

		if (item.value) embed.addField("Cost", item.value, true);
		if (item.valueMult) embed.addField("Base Value", `x${item.valueMult}`);

		if (item.weight) {
			const note = item.weightNote ? ` ${item.weightNote}` : "";
			embed.addField("Weight", `${item.weight}lb ${note}`, true);
		}
		if (item.weightMult) embed.addField("Base Weight", `x${item.weightMult}`);
		if (item.ac) embed.addField("Armor Class", `${item.ac}`, true);
		if (item.speed) embed.addField("Speed", item.speed, true);
		if (item.carryingcapacity) embed.addField("CarryingCapacity", `${item.carryingcapacity} lbs`, true);
		if (item.weapon) embed.addField("Weapon Details", this.renderWeapon(item), true);

		if (item.entries) {
			this.addEntries("Description", item.entries, embed);
		}

		return embed.setFooter(this.renderSource(item));
	}

	public static getRaceEmbed(race: IStoredRace) {
		const embed = this.embed
			.setTitle(race.name);

		if (race.speed) embed.addField("Speed", `${race.speed} ft.`, true);
		if (race.size) embed.addField("Size", SIZE[race.size], true);
		if (race.ability) embed.addField("Ability Bonuses", this.renderRaceAbilities(race.ability), true);
		if (race.darkvision) embed.addField("Darkvision", `${race.darkvision} ft.`, true);
		if (race.languageTags) embed.addField("Languages", race.languageTags.join(", "), true);

		if (race.entries) {
			this.addEntries("\u200b", race.entries, embed);
		}

		if (race.subraces && race.subraces.length > 0) {
			embed.addField("Subraces", race.subraces.map((sub) => sub.name).join(", "));
		}

		return embed.setFooter(this.renderSource(race));
	}

	public static getBackgroundEmbed(background: IStoredBackground) {
		const embed = this.embed
			.setTitle(background.name);

		if (background.entries) {
			this.addEntriesAndDescription(background.entries, embed);
		}

		return embed.setFooter(this.renderSource(background));
	}

	public static getFeatEmbed(feat: IStoredFeat) {
		const embed = this.embed
			.setTitle(feat.name);

		if (feat.entries) {
			this.addEntriesAndDescription(feat.entries, embed);
		}

		if (feat.prerequisite) {
			embed.addField("Prerequisites", this.renderPrereq(feat.prerequisite), true);
		}

		return embed.setFooter(this.renderSource(feat));
	}

	public static getMonsterEmbed(monster: IStoredMonster) {
		const embed = this.embed
			.setTitle(monster.name)
			.setDescription(this.renderMonsterDescription(monster));

		if (monster.ac) {
			const acs = monster.ac
				.map((ac) => typeof ac === "number" ? `${ac}` : `${ac.ac} (${ac.from})`)
				.join(", ");
			embed.addField("AC", acs, true);
		}

		if (monster.hp) embed.addField("HP", `${monster.hp.average} (${monster.hp.formula})`, true);
		if (monster.speed) embed.addField("Speed", this.renderSpeed(monster.speed), true);

		const fieldLength = (embed.fields || []).length;
		for (let i = fieldLength; i % 3 > 0; i++) {
			embed.addBlankField(true);
		}

		if (monster.str) embed.addField("STR", `${monster.str}`, true);
		if (monster.dex) embed.addField("DEX", `${monster.dex}`, true);
		if (monster.con) embed.addField("CON", `${monster.con}`, true);
		if (monster.int) embed.addField("INT", `${monster.int}`, true);
		if (monster.wis) embed.addField("WIS", `${monster.wis}`, true);
		if (monster.cha) embed.addField("CHA", `${monster.cha}`, true);

		if (monster.save) embed.addField("Saving Throws", this.renderSaves(monster.save), true);
		if (monster.skill) embed.addField("Skills", this.renderSkills(monster.skill), true);
		if (monster.vulnerable) embed.addField("Damage Vulnerabilities", this.renderResist<IDamageVuln>("vulnerable", monster.vulnerable), true);
		if (monster.resist) embed.addField("Damage Resistances", this.renderResist<IDamageResist>("resist", monster.resist), true);
		if (monster.immune) embed.addField("Damage Immunities", this.renderResist<IDamageImmune>("immune", monster.immune), true);
		if (monster.conditionImmune) embed.addField("Condition Immunities", this.renderResist<IConditionImmune>("conditionImmune", monster.conditionImmune), true);
		if (monster.senses) embed.addField("Senses", monster.senses.join(", "), true);
		if (monster.languages) embed.addField("Languages", `${monster.languages.join(", ")}`, true);
		if (monster.cr) {
			const cr = typeof monster.cr === "string"
				? monster.cr
				: monster.cr.cr;
			embed.addField("CR", `${cr} (${CR_TO_XP_MAP[cr]} XP)`, true);
		}

		if (monster.trait) this.splitAddFields("Special Abilities", this.renderEntries(monster.trait), embed);
		if (monster.action) this.splitAddFields("Actions", this.renderEntries(monster.action), embed);
		if (monster.reaction) this.splitAddFields("Reactions", this.renderEntries(monster.reaction), embed);
		if (monster.legendary) this.splitAddFields("Legendary Actions", this.renderEntries(monster.legendary), embed);
		if (monster.lairActions) this.splitAddFields("Lair Actions", this.renderEntries(monster.lairActions), embed);
		if (monster.regionalEffects) this.splitAddFields("Regional Effects", this.renderEntries(monster.regionalEffects), embed);

		return embed.setFooter(this.renderSource(monster));
	}

	public static getMonsterFeatEmbed(feat: IStoredMonsterFeat) {
		const embed = this.embed
			.setTitle(feat.name);

		if (feat.entries) {
			this.addEntriesAndDescription(feat.entries, embed);
		}

		if (feat.monsters) {
			this.splitAddFields("Monsters", feat.monsters.join(", "), embed);
		}

		return embed.setFooter(this.renderSource(feat));
	}

	public static getMonsterList(monsters: IStoredMonster[], title = "Monster List") {
		const levelMap = monsters.reduce((map, monster) => {
			const cr = typeof monster.cr === "string"
				? monster.cr
				: monster.cr.cr;
			return map.set(cr, [...map.get(cr) || [], monster ]);
		}, new Map<string, IStoredMonster[]>());

		const embed = this.embed
			.setTitle(title);

		const monsterCRs = Array.from(levelMap.keys()).sort();
		for (const cr of monsterCRs) {
			const monsterList = levelMap.get(cr) as IStoredMonster[];
			const crDisplay = `Challenge Rating ${cr}`;

			this.splitAddFields(
				crDisplay,
				monsterList.map((monster) => {
					if (!monster.type) return monster.name;

					const type = typeof monster.type === "string"
						? monster.type
						: monster.type.type;
					return `${monster.name}, ${capitalise(type)}`;
				}).join("\n"),
				embed,
			);
		}

		return embed;
	}

	public static getRuleEmbed(rule: IStoredRule) {
		const embed = this.embed
			.setTitle(rule.name);

		this.addEntriesAndDescription(rule.content, embed);

		if (rule.children) {
			this.splitAddFields("Child Rules", rule.children.join(", "), embed);
		}

		const parents = rule.parents
			? ` - ${rule.parents.join(", ")}`
			: "";

		return embed.setFooter(`${this.renderSource(rule)}${parents}`);
	}

	private static renderSource(source: ISourceItem) {
		const page = source.page ? `, page ${source.page}` : "";
		return `Source: ${SOURCE_JSON_TO_FULL[source.source]}${page}`;
	}

	private static addEntries(title: string, entries: EntryType[], embed: RichEmbed, inline = false) {
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

	private static addEntriesAndDescription(entries: EntryType[], embed: RichEmbed) {
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

	private static splitAddFields(title: string, field: string, embed: RichEmbed, inline = false) {
		const fieldParts = [];
		while (field.length > 1024) {
			let breakPoint = field.lastIndexOf("\n", 1024);
			if (breakPoint < 0) {
				breakPoint = field.lastIndexOf(" ", 1024);
			}

			fieldParts.push(field.slice(0, breakPoint));
			field = field.slice(breakPoint + 1);
		}

		fieldParts.push(field);

		fieldParts.forEach((part, i) =>
			embed.addField(`${i > 0 ? "\u200b" : title}`, part, inline));
	}

	private static splitSetDescription(field: string, embed: RichEmbed) {
		const fieldParts = [];
		let limit = 2048;
		while (field.length > limit) {
			let breakPoint = field.lastIndexOf("\n", limit);
			if (breakPoint < 0) {
				breakPoint = field.lastIndexOf(" ", limit);
			}

			fieldParts.push(field.slice(0, breakPoint));
			field = field.slice(breakPoint + 1);
			limit = 1024;
		}

		fieldParts.push(field);

		embed.setDescription(fieldParts.shift());
		fieldParts.forEach((part) => embed.addField("\u200b", part));
	}

	private static getEntryName(entry: EntryType) {
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

	private static renderEntries(entries: EntryType[], includeNames = true): string {
		return entries.map((entry) => this.renderEntry(entry, includeNames))
			.join("\n");
	}

	private static renderEntry(entry: EntryType, includeNames = true) {
		if (typeof entry === "string") {
			return this.stripMetadata(entry);
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
			default:
				throw new Error(`Render method for entry type ${entry.type} not implemented.`);
		}
	}

	private static renderItem(entry: ITypeItem, includeNames = true): string {
		const display = isITypeItemEntry(entry)
			? this.renderEntry(entry.entry)
			: this.renderEntries(entry.entries);

		const entryName = this.getEntryName(entry);
		return entryName && includeNames
			? `**${entryName}:** ${display}`
			: display;
	}

	private static renderAbility(entry: ITypeAbility) {
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

	private static renderGenericAbility(entry: ITypeAbilityGeneric) {
		const name = entry.name ? `**${entry.name}** = ` : "";
		const mods = entry.attributes
			? entry.attributes.map((ab) => ABILITY_DISPLAY[ab]).join(" or ")
			: "";
		return `${name}${entry.text}${mods}`;
	}

	private static renderList(entry: ITypeList): string {
		return entry.items
			.map((item) => `  - ${this.renderEntry(item)}`)
			.join("\n");
	}

	private static renderLink(entry: ITypeLink): string {
		return `[${entry.text}](${this.renderHref(entry.href)})`;
	}

	// private static getImageLink(entry: ITypeImage): string {
	// 	return this.renderHref(entry.href, "img/");
	// }

	private static renderHref(href: ITypeHref, pathRoot = "") {
		switch (href.type) {
			case "internal":
				return `http://5e.tools/${pathRoot}${href.path}`;
			case "external":
				return href.url;
		}
	}

	private static renderTable(entry: ITypeTable): string {
		let headings = [];
		if (entry.rowLabels) headings.push("");
		if (entry.colLabels) {
			headings = headings.concat(entry.colLabels.map((label) => `**${this.stripMetadata(label)}**`));
		} else {
			headings = headings.concat(Array.from({length: entry.rows[0].length}, () => ""));
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

	private static renderHitDie(hd: IHitDie) {
		return `${hd.number}d${hd.faces}`;
	}

	private static renderRaceAbilities(ability: IRaceAbilities) {
		let parts: string[] = [];
		for (const key in ability) {
			if (!(key in ability)) continue;

			if (key in ABILITY_DISPLAY) {
				const abShort = key as ABILITY_SHORT;
				parts.push(`${ABILITY_DISPLAY[abShort]}: ${ability[abShort]}`);
				continue;
			}
			if (key === "choose") {
				const choices = ability.choose.map((choice) => this.renderChoices(choice, (ab) => ABILITY_DISPLAY[ab]));
				parts = parts.concat(choices);
			}
		}
		return parts.join(", ");
	}

	private static renderPrereq(prereqs: IFeatPrereq[]) {
		return joinConjunct(
			flatMap(prereqs, (prereq) => {
				return Object.keys(prereq).map((key) => {
					switch (key) {
						case "race": {
							const racePrereqs = (prereq.race as IFeatRacePrereq[]).map((req) => {
								const subrace = req.subrace ? ` (${capitalise(req.subrace)})` : "";
								return `${capitalise(req.name)}${subrace}`;
							});
							return joinConjunct(racePrereqs, ", ", "or");
						}
						case "ability": {
							const abilityPrereqs = (prereq.ability as IAbilityMap[]).map((abilities) => {
								const displays = Object.entries(abilities)
									.map(([skill, minimum]) => `${ABILITY_DISPLAY[skill as ABILITY_SHORT]} > ${minimum}`);

								return joinConjunct(displays, ", ", "and");
							});
							return joinConjunct(abilityPrereqs, ", ", "or");
						}
						case "spellcasting":
							return prereq.spellcasting
								? "The ability to cast at least one spell"
								: "";
						case "proficiency":
							const profs = (prereq.proficiency as IFeatArmorPrereq[])
								.map(({armor}) => capitalise(armor));
							return `Proficiency with ${joinConjunct(profs, ", ", "or")} Armor`;
						case "special":
							return prereq.special as string;
						case "level":
							return `${ordinal(prereq[key] as number)} level`;
					}
				});
			}).filter((req) => !!req) as string[],
			", ",
			"and",
		);
	}

	private static renderChoosables<T extends string>(choosables: Array<IChoosable<T>>, map: (item: T) => string = (item: T) => item) {
		const choices = [];
		const opts = [];

		for (const choosable of choosables) {
			for (const key in choosable) {
				if (!(key in choosable)) continue;

				if (key === "choose") {
					choices.push(this.renderChoices(choosable.choose, map));
					continue;
				}

				const optKey = key as T;
				if (choosable[optKey]) {
					opts.push(map(optKey));
				}
			}
		}

		return [
			...opts,
			...choices,
		].join(", ");
	}

	private static renderChoices<T>(choice: IChoice<T>, map: (item: T) => string = (item: T) => `${item}`) {
		if (choice.from.length === 0) return "";
		if (choice.from.length === 1) return map(choice.from[0]);

		const last = choice.from.pop();
		return `Choose ${choice.count || 1} from ${choice.from.map(map).join(", ")} or ${last}`;
	}

	private static renderItemDescription(item: IStoredItem) {
		const parts = [];
		if (item.staff) parts.push("Staff");
		if (item.weaponCategory) parts.push(`${item.weaponCategory} Weapon`);
		if (item.wondrous) parts.push(`Wondrous Item`);
		if (item.type) parts.push(ITEM_TYPE[item.type]);
		if (item.baseItem)  parts.push(this.stripMetadata(item.baseItem));
		if (item.tier) parts.push(item.tier);
		if (item.rarity !== "None") parts.push(item.rarity);
		if (item.reqAttune) parts.push("Requires Attunement");

		return `*${parts.join(", ")}*`;
	}

	private static renderWeapon(item: IStoredItem) {
		const damage = item.dmg1
			? `${this.stripMetadata(item.dmg1 as string)} ${DAMAGE_TYPE[item.dmgType as DAMAGE_TYPE_KEY]}`
			: "";

		const additional = item.property && item.property.length > 0
			? this.renderWeaponProperties(item)
			: "";

		const join = damage && additional ? " - " : "";

		return `${damage}${join}${additional}`;
	}

	private static renderWeaponProperties(item: IStoredItem) {
		if (!item.property) return [];

		return item.property.map((key) => {
			switch (key) {
				case "2H":
					return "two-handed";
				case "A":
				case "AF":
					return `ammunition (${item.range} ft.)`;
				case "T":
					return `thrown (${item.range} ft.)`;
				case "V":
					return `versatile (${this.stripMetadata(item.dmg2 as string)})`;
				case "H":
					return "heavy";
				case "F":
					return "finesse";
				case "L":
					return "light";
				case "R":
					return "reach";
				case "LD":
					return "loading";
				case "S":
					return "special";
				case "RLD":
					return `reload (${item.reload} shots)`;
				case "BF":
					return "burst fire";
			}
		}).join(", ");
	}

	private static renderSpellDescription(spell: IStoredSpell) {
		const spellLevel = spell.level === 0
			? `${SPELL_SCHOOL_DISPLAY[spell.school]} cantrip`
			: `${ordinal(spell.level)} level ${SPELL_SCHOOL_DISPLAY[spell.school]}`;

		const users = [
			...spell.classes,
			...spell.backgrounds || [],
			...spell.races || [],
		];

		return `*${spellLevel}. (${users.join(", ")})*`;
	}

	private static renderCastingTime(time: ICastingTime) {
		const condition = time.condition
			? ` ${this.stripMetadata(time.condition)}`
			: "";

		return `${time.number} ${TIME_DISPLAY[time.unit]}${condition}`;
	}

	private static renderDistance(distance: IDistance) {
		switch (distance.type) {
			case "self":
				return "Self";
			case "sight":
				return "Sight";
			case "touch":
				return "Touch";
			case "unlimited":
				return "Unlimited on the same plane";
			case "plane":
				return "Special";
			case "feet":
			case "miles":
				return `${distance.amount} ${distance.type}`;
		}
	}

	private static renderRange(range: ISpellRange) {
		switch (range.type) {
			case "special":
				return "Special";
			case "point":
				return this.renderDistance(range.distance);
			case "cube":
			case "cone":
			case "line":
			case "radius":
			case "sphere":
			case "hemisphere":
			case "cylinder":
				return `Self (${this.renderDistance(range.distance)} ${range.type})`;
		}
	}

	private static renderComponents(components: ISpellComponents) {
		const comps = [];
		if (components.v) comps.push("V");
		if (components.s) comps.push("S");
		if (components.m) {
			if (typeof components.m === "string") {
				comps.push(`M (${components.m})`);
			} else {
				comps.push(`M (${components.m.text})`);
			}
		}

		return comps.join(", ");
	}

	private static renderDuration(duration: ISpellDuration) {
		switch (duration.type) {
			case "instant":
				const condition = duration.condition
					? ` (${duration.condition})`
					: "";
				return `Instantaneous${condition}`;
			case "special":
				return "Special";
			case "permanent":
				return duration.ends
					? `Until ${duration.ends.map((key) => SPELL_ENDS[key]).join(" or ")}`
					: "Permanent";
			case "timed":
				const conc = duration.concentration ? "Concentration, " : "";
				const upTo = duration.concentration
					? "up to "
					: (duration.duration && duration.duration.upTo)
						? "Up to "
						: "";

				const durS = duration.duration && duration.duration.amount as number > 1;
				const dur = duration.duration
					? `${duration.duration.amount}${duration.duration.type}${durS ? "s" : ""}`
					: "";

				return `${conc}${upTo}${dur}`;
		}
	}

	private static renderSavingThrows(savingThrows: ABILITY_SHORT[]) {
		return savingThrows
			.map((skill) => ABILITY_DISPLAY[skill])
			.join(", ");
	}

	private static renderProficiencies(startingProficiencies: IStartingProficiencies) {
		const output = [];
		if (startingProficiencies.armor) {
			output.push(`Armor: ${startingProficiencies.armor.join(", ")}`);
		}
		if (startingProficiencies.weapons) {
			output.push(`Weapons: ${startingProficiencies.weapons.join(", ")}`);
		}
		if (startingProficiencies.tools) {
			output.push(`Tools: ${startingProficiencies.tools.join(", ")}`);
		}
		if (startingProficiencies.skills) {
			output.push(`Skills: Choose ${startingProficiencies.skills.choose} from ${startingProficiencies.skills.from.join(", ")}`);
		}
		return output;
	}

	private static renderStartingProficiencies(startingProficiencies: IStartingProficiencies) {
		return [
			"You are proficient with the following items, in addition to any proficiencies provided by your race or background.",
			...this.renderProficiencies(startingProficiencies),
		]
			.map((str) => this.stripMetadata(str))
			.join("\n");
	}

	private static renderStartingEquipment(startingEquipment: IStartingEquipment) {
		return [
			`You start with the following items${startingEquipment.additionalFromBackground
				? ", plus anything provided by your background"
				: ""}.`,
			...startingEquipment.default,
			`Alternatively, you may start with ${startingEquipment.goldAlternative} gp to buy your own equipment.`,
		]
			.map((str) => this.stripMetadata(str))
			.join("\n");
	}

	private static renderMulticlass(multiclassing: IMulticlassing) {
		return [
			`Ability Score Minimum: ${this.renderSkillRequirements(multiclassing.requirements).join(", ")}`,
			`Extra proficiencies:`,
			...this.renderProficiencies(multiclassing.proficienciesGained)
				.map((str) => `    ${str}`),
		]
			.map((str) => this.stripMetadata(str))
			.join("\n");
	}

	private static renderSkillRequirements(requirements: IAbilityMap) {
		return Object.entries(requirements)
			.map(([skill, minimum]) => `${ABILITY_DISPLAY[skill as ABILITY_SHORT]}: ${minimum}`);
	}

	private static renderSubclasses(classData: IStoredClass, level?: number) {
		const subclasses = classData.subclasses as IStoredSubclass[];

		if (level) {
			const subclassLevelIndex = (classData.subclassFeatLevels as number[]).indexOf(level);

			return subclasses.map((subclass) => {
					const feats = subclass.subclassFeatures[subclassLevelIndex]
						.map((feat) => feat.name)
						.join(", ");

					return `  - ${subclass.name}: ${feats}`;
				})
				.join("\n");
		}

		return subclasses.map((subclass) => `  - ${subclass.name}`)
			.join("\n");
	}

	private static generateSubClassFeatureList(subclass: IStoredSubclass) {
		return this.generateFeatureList(subclass.subclassFeatures, subclass.featLevels);
	}

	private static generateClassFeatureList(classData: IStoredClass) {
		return this.generateFeatureList(classData.classFeatures, Array.from({length: 20}, (_, i) => i));
	}

	private static generateFeatureList(features: ITypeEntries[][], levelLookup: number[]) {
		return features.map((feats, index) => {
			const level = `${levelLookup[index] + 1}`.padStart(2, "0");
			const featList = feats
				.filter((feat) => feat.name)
				.map((feat) => (feat.name as string).trim())
				.join(", ");

			return `${level}: ${featList}`;
		}).join("\n");
	}

	private static stripMetadata(input: string): string {
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

	private static renderAttackMetadata(attack: string) {
		const tags = attack.split(",");

		return Array.from(new Set(tags), (tag) => [
				...tag.includes("m") ? ["Melee"] :
				tag.includes("r") ? ["Ranged"] :
				tag.includes("a") ? ["Area"] : [],
				...tag.includes("w") ? ["Weapon"] :
				tag.includes("r") ? ["Spell"] : [],
		].join(" ")).join(" or ") + " Attack:";
	}

	private static renderResist<T extends INote>(key: Exclude<keyof T, keyof INote>, resist: Array<T | ISpecial | string>) {
		return resist.map((res) => {
			if (typeof res === "string") return res;
			if ("special" in res) return res.special;
			return `${res.preNote} ${res[key]} ${res.note}`.trim();
		}).join(", ");
	}

	private static renderSkills(skills: IMonsterSkills) {
		const output = this.renderSkillMap(skills as ISkillMap<string>);

		return "other" in skills
			? `${output}, plus one of the following: ${this.renderSkillMap(skills.other[0].oneOf)}`
			: output;
	}

	private static renderSkillMap(skills: ISkillMap<string>) {
		return Object.entries(skills)
			.filter(([key]) => key !== "other")
			.map(([key, value]) => `${key}: ${value}`)
			.join(", ");
	}

	private static renderSaves(save: IAbilityMap<string> | ISpecial) {
		if ("special" in save) return save.special;

		return (Object.entries(save) as Array<[ABILITY_SHORT, string]>)
			.map(([key, value]) => `${ABILITY_DISPLAY[key]}: ${value}`)
			.join(", ");
	}

	private static renderMonsterDescription(monster: IStoredMonster) {
		const align = monster.alignment
			.map((al) => ALIGNMENT[al])
			.join(" ");

		return `${SIZE[monster.size]} ${monster.type}. ${align}`;
	}

	private static renderSpeed(speed: ISpeed) {
		let join = ", ";
		return Object.entries(speed)
			.map(([key, value]) => {
				if (key === "choose") {
					join = "; ";
					return `${joinConjunct(value.from.sort(), ", ", " or ")} ${value.amount} ft.${value.note ? ` ${value.note}` : ""}`;
				}

				const prop = key === "walk" ? "" : `${key} `;
				if (typeof value === "number") return `${prop}${value} ft.`;

				const condition = value.condition ? ` ${value.condition}` : "";
				return `${prop}${value.number} ft.${condition}`;
			}).join(join);
	}
}
