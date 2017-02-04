export class DiscordDisplay {
	private itemTypes: { [type: string]: string } = { "$": "Gemstone", "G": "General Item", "MA": "Medium Armour", "HA": "Heavy Armour", "W": "Wondrous Item", "S": "Shield", "A": "Ammunition", "M": "Melee Weapon", "R": "Ranged Weapon", "P": "Potion", "LA": "Light Armour", "ST": "Staff", "RD": "Rod", "RG": "Ring", "SC": "Scroll", "WD": "Wand" };
	private damageTypes: { [type: string]: string } = { "S": "Slashing", "P": "Piercing", "B": "Bludgeoning" };
	private propertyTypes: { [type: string]: string } = { "T": "Thrown", "V": "Versatile", "H": "Heavy", "2H": "Two-Handed", "L": "Light", "A": "Ammunition", "LD": "Loading", "F": "Finesse", "R": "Reach", "S": "Special" };
	private abilityTypes: { [type: string]: string } = { "str": "Strength", "dex": "Dexterity", "con": "Constitution", "int": "Intelligence", "wis": "Wisdom", "cha": "Charisma" };
	private sizeTypes: { [type: string]: string } = { "T": "Tiny", "S": "Small", "M": "Medium", "L": "Large", "H": "Huge", "G": "Gigantic" };
	private challengeXP: { [type: string]: number } = { "0": 10, "1/8": 25, "1/4": 50, "1/2": 100, "1": 200, "2": 450, "3": 700, "4": 1100, "5": 1800, "6": 2300, "7": 2900, "8": 3900, "9": 5000, "10": 5900, "11": 7200, "12": 8400, "13": 10000, "14": 11500, "15": 13000, "16": 15000, "17": 18000, "18": 20000, "19": 25000, "20": 25000, "21": 33000, "22": 41000, "23": 50000, "24": 62000, "30": 155000 };
	private schools: { [type: string]: string } = { "EV": "Evocation", "T": "Transmutation", "A": "Abjuration", "I": "Illusion", "N": "Necromancy", "C": "Conjuration", "EN": "Enchantment", "D": "Divination" };

	public display(item: any, type: string): string {
		switch (type) {
			case "spell":
				return this.displaySpell(item);
			case "monster":
				return this.displayMonster(item);
			case "background":
				return this.displayBackground(item);
			case "feat":
				return this.displayFeat(item);
			case "race":
				return this.displayRace(item);
			case "class":
				return this.displayClass(item);
			case "item":
			default:
				return this.displayItem(item);
		}
	}

	public displayItem(item: any): string {
		let display: Array<string> = [];

		for (let prop in item) {
			switch (prop) {
				case "name":
					display.push("***" + item.name + "***");
					break;
				case "type":
					display.push("*" + this.itemTypes[item.type] + "*");
					break;
				case "weight":
					display.push("**Weight**: " + item.weight + "lb");
					break;
				case "ac":
					display.push("**AC**: " + item.ac);
					break;
				case "stealth":
					display.push("**Stealth**: Disadvantage");
				case "dmg1":
					display.push("**Damage**: " + item.dmg1 + " " + this.damageTypes[item.dmgType] + (item.dmg2 ? " (" + item.dmg2 + " 2-Handed)" : ""));
					break;
				case "dmg2":
				case "dmgType":
					break;
				case "property":
					const properties: Array<string> = item.property.split(",");
					const fullProperties: Array<string> = [];

					for (let property of properties) {
						fullProperties.push(this.propertyTypes[property]);
					}

					display.push("**Properties**: " + fullProperties.join(", "));
					break;
				case "text":
					if (item.text instanceof Array) {
						display = display.concat(item.text.map((el: string) => el.replace(/\*/, "\*")));
					} else {
						display.push(item.text);
					}
					break;
				case "roll":
					let rolls: Array<string> = item.roll;

					if (item.roll instanceof Array) {
						rolls = item.roll.join(", ");
					}

					display.push("**Rolls**: " + rolls);
					break;
				case "modifier":
					let modifiers: Array<string> = [];

					if (item.modifier instanceof Array) {
						for (let mod of item.modifier) {
							modifiers = modifiers.concat(this.parseModifier(mod));
						}
					} else {
						modifiers = modifiers.concat(this.parseModifier(item.modifier));
					}

					display.push("**Modifiers**: " + modifiers.join(", "));
					break;
				case "value":
				case "range":
				case "strength":
					display.push("**" + DiscordDisplay.toTitleCase(prop) + "**: " + DiscordDisplay.toTitleCase(item[prop].toString()));
					break;
			}
		}

		return display.join("\n");
	}

	public displayClass(cls: any, level?: number): string {
		let display: Array<string> = [];

		for (let prop in cls) {
			switch (prop) {
				case "name":
					display.push("***" + cls.name + "***");
					break;
				case "hd":
					display.push("**Hit Die**: d" + cls.hd);
					break;
				case "proficiency":
					display.push("**Saving Throws**: " + cls.proficiency);
					break;
				case "spellAbility":
					display.push("**Spellcasting Ability**: " + cls.spellAbility);
					break;
				case "spellSlots":
					if (level && cls.spellSlots[level]) {
						display = display.concat(this.displaySpellSlots([ cls.spellSlots[level] ]));
					}
					break;
				case "levelFeatures":
					if (level && cls.levelFeatures[level]) {
						display.push("");

						display.push("**Level " + level + "**:");

						for (let feature of cls.levelFeatures[level]) {
							display.push("*" + feature.name + "*");
							display = display.concat(feature.text);
						}
					}
					break;
			}
		}

		return display.join("\n");
	}

	public displayBackground(background: any): string {
		let display: Array<string> = [];

		for (let prop in background) {
			switch (prop) {
				case "name":
					display.push("***" + background.name + "***");
					break;
				case "proficiency":
					break;
				case "trait":
					display.push("");
					display = display.concat(this.parseTraits(background.trait));
					break;
			}
		}

		return display.join("\n");
	}

	public displayRace(race: any): string {
		let display: Array<string> = [];

		for (let prop in race) {
			switch (prop) {
				case "name":
					display.push("***" + race.name + "***");
					break;
				case "size":
					display.push("**Size**: " + this.sizeTypes[race.size]);
					break;
				case "speed":
					display.push("**Speed**: " + race.speed + "ft");
					break;
				case "ability":
					const abilities: Array<string> = [];
					const rawAbilities: Array<string> = race.ability.split(/, ?/);

					for (let ability of rawAbilities) {
						const abilityParts: Array<string> = ability.split(" ");

						abilities.push(this.abilityTypes[abilityParts[0].toLowerCase()] + " +" + abilityParts[1]);
					}

					display.push("**Ability Score Increase**: " + abilities.join(", "));
					break;
				case "proficiency":
					display.push("**Bonus Proficiencies**: " + race.proficiency);
					break;
				case "trait":
					display.push("");
					display = display.concat(this.parseTraits(race.trait));
					break;
			}
		}

		return display.join("\n");
	}

	public displayFeat(feat: any): string {
		let display: Array<string> = [];

		for (let prop in feat) {
			switch (prop) {
				case "name":
					display.push("***" + feat.name + "***");
					break;
				case "text":
					if (feat.text instanceof Array) {
						display = display.concat(feat.text);
					} else {
						display.push(feat.text);
					}
					break;
				case "modifier":
					let modifiers: Array<string> = [];

					if (feat.modifier instanceof Array) {
						for (let mod of feat.modifier) {
							modifiers = modifiers.concat(this.parseModifier(mod));
						}
					} else {
						modifiers = modifiers.concat(this.parseModifier(feat.modifier));
					}

					display.push("**Modifiers**: " + modifiers.join(", "));
					break;
				case "prerequisite":
					display.push("*Prerequisite*: " + feat.prerequisite);
					break;
			}
		}

		return display.join("\n");
	}

	public displaySpell(spell: any): string {
		let display: Array<string> = [];

		for (let prop in spell) {
			switch (prop) {
				case "name":
					display.push("***" + spell.name + "***");
					break;
				case "level":
					let level: string = "";

					if (spell.level == 0) {
						level = (spell.school ? this.schools[spell.school] + " " : "") + "Cantrip";
					} else {
						level = (spell.level == 1 ? "1st" : (spell.level == 2 ? "2nd" : (spell.level == 3 ? "3rd" : spell.level + "th"))) + " level" + (spell.school ? " " + this.schools[spell.school] : "");
					}

					if (spell.ritual === "YES") {
						level += " (ritual)";
					}

					display.push("*" + level + "*");
					break;
				case "ritual":
				case "school":
					break;
				case "text":
					if (spell.text instanceof Array) {
						display = display.concat(spell.text);
					} else {
						display.push(spell.text);
					}
					break;
				case "time":
					display.push("**Casting Time**: " + spell.time);
					break;
				case "roll":
					let rolls: Array<string> = spell.roll;

					if (spell.roll instanceof Array) {
						rolls = spell.roll.join(", ");
					}

					display.push("**Rolls**: " + rolls);
					break;
				case "components":
				case "duration":
				case "classes":
				case "range":
					display.push("**" + DiscordDisplay.toTitleCase(prop) + "**: " + spell[prop].toString());
					break;
			}
		}

		return display.join("\n");
	}

	public displayMonster(monster: any): string {
		let display: Array<string> = [];

		for (let prop in monster) {
			switch (prop) {
				case "name":
					display.push("***" + monster.name + "***");
					break;
				case "size":
					let summary: Array<string> = [ this.sizeTypes[monster.size] ];

					if (monster.type) {
						summary = summary.concat(monster.type.split(",").map((s: string) => s.trim()));
					}

					if (monster.alignment) {
						summary.push(monster.alignment);
					}

					display.push("*" + summary.join(", ") + "*");
					break;
				case "type":
				case "alignment":
				case "dex":
				case "con":
				case "int":
				case "wis":
				case "cha":
				case "spells":
					break;
				case "ac":
					display.push("**Armour Class**: " + monster.ac.toString());
					break;
				case "cr":
					display.push("**Challenge**: " + monster.cr + " (" + this.challengeXP[monster.cr] + " XP)");
					break;
				case "hp":
					display.push("**Hit Points**: " + monster.hp);
					break;
				case "skill":
					display.push("**Skills**: " + monster.skill);
					break;
				case "speed":
					display.push("**Speed**: " + monster.speed + "ft.");
					break;
				case "passive":
					display.push("**Passive Perception**: " + monster.passive);
					break;
				case "str":
					const abilities: Array<string> = [
						"**STR**: " + monster.str,
						"**DEX**: " + monster.dex,
						"**CON**: " + monster.con,
						"**INT**: " + monster.int,
						"**WIS**: " + monster.wis,
						"**CHA**: " + monster.cha,
					];

					display.push(abilities.join(" | "));
					break;
				case "save":
					const saves: Array<string> = [];
					const rawSaves: Array<string> = monster.save.split(/, ?/);

					for (let save of rawSaves) {
						const saveParts: Array<string> = save.split(" ");

						saves.push(this.abilityTypes[saveParts[0].toLowerCase()] + " +" + saveParts[1]);
					}

					display.push("**Saving Throws**: " + saves.join(", "));
					break;
				case "action":
					display.push("");
					display.push("**Actions**");
					display = display.concat(this.parseTraits(monster.action));
					break;
				case "legendary":
					display.push("");
					display.push("**Legendary Actions**");
					display = display.concat(this.parseTraits(monster.legendary));
					break;
				case "trait":
					display.push("");
					display = display.concat(this.parseTraits(monster.trait));
					break;
				case "reaction":
					display.push("");
					display.push("**Reactions**");
					display = display.concat(this.parseTraits(monster.reaction));
					break;
				case "vulnerable":
					display.push("**Damage Vulnerabilities**: " + monster.vulnerable);
					break;
				case "resist":
					display.push("**Damage Resistances**: " + monster.resist);
					break;
				case "immune":
					display.push("**Damage Immunities**: " + monster.immune);
					break;
				case "conditionImmune":
					display.push("**Condition Immunities**: " + monster.conditionImmune);
					break;
				case "description":
					display.push(monster.description);
					break;
				case "languages":
				case "senses":
					display.push("**" + DiscordDisplay.toTitleCase(prop) + "**: " + monster[prop].toString());
					break;
			}
		}

		return display.join("\n");
	}

	public displaySpellSlots(levels: { [level: number]: string }, level?: number): Array<string> {
		let display: Array<string> = [];
		let maxSpellLevel: number = 0;

		if (level) {
			maxSpellLevel = levels[level].split(",").length - 1;
			display.push((level < 10 ? " " : "") + level + " | " + levels[level].replace(/,/g, " | ") + " |");
		} else {
			for (let lev in levels) {
				maxSpellLevel = Math.max(levels[lev].split(",").length - 1, maxSpellLevel);
				display.push((<any>lev < 10 ? " " : "") + lev + " | " + levels[lev].replace(/,/g, " | ") + " |");
			}
		}

		const levs: Array<number> = [];

		for (let i: number = 0; i < maxSpellLevel; i++) {
			levs.push(i + 1);
		}

		display.unshift("   | C | " + levs.join(" | ") + " |");
		display.unshift("```");
		display.unshift("**Spell Slots**");

		display.push("```");

		return display;
	}

	private parseModifier(modifier: any): string {
		let modifiers: Array<string> = [];

		for (let prop in modifier) {
			modifiers.push(DiscordDisplay.toTitleCase(prop) + ": " + modifier[prop]);
		}

		return modifiers.join(", ");
	}

	private parseTraits(traits: Array<any>): Array<string> {
		let display: Array<string> = [];

		for (let trait of traits) {
			if (trait.text instanceof Array) {
				display.push(("**" + trait.name + "**: " + trait.text[0]));
				display = display.concat(trait.text.slice(1));
			} else {
				display.push(("**" + trait.name + "**: " + trait.text));
			}
		}

		return display;
	}

	public static toTitleCase(str: string): string {
		return str.split(" ").map((s: string) => s.charAt(0).toUpperCase() + s.substr(1).toLowerCase()).join(" ");
	}
}