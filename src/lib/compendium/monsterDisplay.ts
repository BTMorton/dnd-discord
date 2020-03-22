import { joinConjunct } from "../../lib";
import { ABILITY_DISPLAY, ABILITY_SHORT, ALIGNMENT, CR_TO_XP_MAP, IAbilityMap, IConditionImmune, IDamageImmune, IDamageResist, IDamageVuln, IMonsterData, IMonsterSkills, INote, ISkillMap, ISpecial, ISpeed, IStoredMonster, MonsterType, SIZE, SOURCE_JSON_TO_SHORT } from "../../models";
import { CompendiumDisplay } from "./compendiumDisplay";

export class MonsterDisplay extends CompendiumDisplay<IStoredMonster> {
	public getEmbed() {
		const embed = this.embed
			.setTitle(this.itemData.name)
			.setDescription(this.renderMonsterDescription(this.itemData));

		const tokenUrl = this.getImageURL(this.itemData);
		if (tokenUrl) {
			embed.setThumbnail(tokenUrl);
		}

		if (this.itemData.ac) {
			const acs = this.itemData.ac
				.map((ac) => typeof ac === "number" ? `${ac}` : `${ac.ac} (${ac.from})`)
				.join(", ");
			embed.addField("AC", acs, true);
		}

		if (this.itemData.hp) embed.addField("HP", `${this.itemData.hp.average} (${this.itemData.hp.formula})`, true);
		if (this.itemData.speed) embed.addField("Speed", this.renderSpeed(this.itemData.speed), true);

		const fieldLength = (embed.fields || []).length;
		for (let i = fieldLength; i % 3 > 0; i++) {
			embed.addBlankField(true);
		}

		if (this.itemData.str) embed.addField("STR", `${this.itemData.str}`, true);
		if (this.itemData.dex) embed.addField("DEX", `${this.itemData.dex}`, true);
		if (this.itemData.con) embed.addField("CON", `${this.itemData.con}`, true);
		if (this.itemData.int) embed.addField("INT", `${this.itemData.int}`, true);
		if (this.itemData.wis) embed.addField("WIS", `${this.itemData.wis}`, true);
		if (this.itemData.cha) embed.addField("CHA", `${this.itemData.cha}`, true);

		if (this.itemData.save) embed.addField("Saving Throws", this.renderSaves(this.itemData.save), true);
		if (this.itemData.skill) embed.addField("Skills", this.renderSkills(this.itemData.skill), true);
		if (this.itemData.vulnerable) embed.addField("Damage Vulnerabilities", this.renderResist<IDamageVuln>("vulnerable", this.itemData.vulnerable), true);
		if (this.itemData.resist) embed.addField("Damage Resistances", this.renderResist<IDamageResist>("resist", this.itemData.resist), true);
		if (this.itemData.immune) embed.addField("Damage Immunities", this.renderResist<IDamageImmune>("immune", this.itemData.immune), true);
		if (this.itemData.conditionImmune) embed.addField("Condition Immunities", this.renderResist<IConditionImmune>("conditionImmune", this.itemData.conditionImmune), true);
		if (this.itemData.senses) embed.addField("Senses", this.itemData.senses.join(", "), true);
		if (this.itemData.languages) embed.addField("Languages", `${this.itemData.languages.join(", ")}`, true);
		if (this.itemData.cr) {
			const cr = typeof this.itemData.cr === "string"
				? this.itemData.cr
				: this.itemData.cr.cr;
			embed.addField("CR", `${cr} (${CR_TO_XP_MAP[cr]} XP)`, true);
		}

		if (this.itemData.trait) this.splitAddFields("Special Abilities", this.renderEntries(this.itemData.trait), embed);
		if (this.itemData.action) this.splitAddFields("Actions", this.renderEntries(this.itemData.action), embed);
		if (this.itemData.reaction) this.splitAddFields("Reactions", this.renderEntries(this.itemData.reaction), embed);
		if (this.itemData.legendary) this.splitAddFields("Legendary Actions", this.renderEntries(this.itemData.legendary), embed);
		if (this.itemData.lairActions) this.splitAddFields("Lair Actions", this.renderEntries(this.itemData.lairActions), embed);
		if (this.itemData.regionalEffects) this.splitAddFields("Regional Effects", this.renderEntries(this.itemData.regionalEffects), embed);

		return embed.setFooter(this.renderSource(this.itemData));
	}

	public getText() {
		const lines = [
			`**${this.itemData.name}**`,
			this.renderMonsterDescription(this.itemData),
		];

		if (this.itemData.ac) {
			const acs = this.itemData.ac
				.map((ac) => typeof ac === "number" ? `${ac}` : `${ac.ac} (${ac.from})`)
				.join(", ");
			lines.push(`**AC**: ${acs}`);
		}

		if (this.itemData.hp) lines.push(`**HP**: ${this.itemData.hp.average} (${this.itemData.hp.formula})`);
		if (this.itemData.speed) lines.push(`**Speed**: ${this.renderSpeed(this.itemData.speed)}`);

		const skills: string[] = [];
		if (this.itemData.str) skills.push(`**STR:** ${this.itemData.str}`);
		if (this.itemData.dex) skills.push(`**DEX:** ${this.itemData.dex}`);
		if (this.itemData.con) skills.push(`**CON:** ${this.itemData.con}`);
		if (this.itemData.int) skills.push(`**INT:** ${this.itemData.int}`);
		if (this.itemData.wis) skills.push(`**WIS:** ${this.itemData.wis}`);
		if (this.itemData.cha) skills.push(`**CHA:** ${this.itemData.cha}`);

		if (skills.length > 0) {
			lines.push(skills.join(" | "));
		}

		if (this.itemData.save) lines.push(`**Saving Throws**: ${this.renderSaves(this.itemData.save)}`);
		if (this.itemData.skill) lines.push(`**Skills**: ${this.renderSkills(this.itemData.skill)}`);
		if (this.itemData.vulnerable) lines.push(`**Damage Vulnerabilities**: ${this.renderResist<IDamageVuln>("vulnerable", this.itemData.vulnerable)}`);
		if (this.itemData.resist) lines.push(`**Damage Resistances**: ${this.renderResist<IDamageResist>("resist", this.itemData.resist)}`);
		if (this.itemData.immune) lines.push(`**Damage Immunities**: ${this.renderResist<IDamageImmune>("immune", this.itemData.immune)}`);
		if (this.itemData.conditionImmune) lines.push(`**Condition Immunities**: ${this.renderResist<IConditionImmune>("conditionImmune", this.itemData.conditionImmune)}`);
		if (this.itemData.senses) lines.push(`**Senses**: ${this.itemData.senses.join(", ")}`);
		if (this.itemData.languages) lines.push(`**Languages**: ${this.itemData.languages.join(", ")}`);
		if (this.itemData.cr) {
			const cr = typeof this.itemData.cr === "string"
				? this.itemData.cr
				: this.itemData.cr.cr;
			lines.push(`**CR**: ${cr} (${CR_TO_XP_MAP[cr]} XP)`);
		}

		if (this.itemData.trait) lines.push("**Special Abilities**", this.renderEntries(this.itemData.trait));
		if (this.itemData.action) lines.push("**Actions**", this.renderEntries(this.itemData.action));
		if (this.itemData.reaction) lines.push("**Reactions**", this.renderEntries(this.itemData.reaction));
		if (this.itemData.legendary) lines.push("**Legendary Actions**", this.renderEntries(this.itemData.legendary));
		if (this.itemData.lairActions) lines.push("**Lair Actions**", this.renderEntries(this.itemData.lairActions));
		if (this.itemData.regionalEffects) lines.push("**Regional Effects**", this.renderEntries(this.itemData.regionalEffects));

		lines.push(this.renderSource(this.itemData));
		return lines.join("\n");
	}

	protected renderSaves(save: IAbilityMap<string> | ISpecial) {
		if ("special" in save) return save.special;

		return (Object.entries(save) as Array<[ABILITY_SHORT, string]>)
			.map(([key, value]) => `${ABILITY_DISPLAY[key]}: ${value}`)
			.join(", ");
	}

	protected renderMonsterDescription(monster: IStoredMonster) {
		const align = monster.alignment
			? monster.alignment
				.map((al) => ALIGNMENT[al])
				.join(" ")
			: "";

		const size = monster.size
			? SIZE[monster.size]
			: "";

		const type = monster.type
			? this.renderType(monster.type)
			: "";

		const inherit = monster._copy
			? `Inherits properties from ${monster._copy.name} ${this.renderSource(monster._copy)}`
			: "";

		let ret = [size, type]
			.filter((s) => s !== "")
			.join(" ");

		if (align) {
			ret = ret
				? `${ret}. ${align}`
				: align;
		}

		if (inherit) {
			ret = ret
				? `${ret}\n${inherit}`
				: inherit;
		}

		return ret;
	}

	protected renderType(type: MonsterType) {
		if (typeof type === "string") {
			return type;
		}

		let display: string = type.type;

		if (type.swarmSize) {
			display = `swarm of ${SIZE[type.swarmSize].toLowerCase()} ${type.type}s`;
		}

		if (type.tags) {
			display += ` (${type.tags.join(", ")})`;
		}

		return display;
	}

	protected renderResist<T extends INote>(key: Exclude<keyof T, keyof INote>, resist: Array<T | ISpecial | string>) {
		return resist.map((res) => {
			if (typeof res === "string") return res;
			if ("special" in res) return res.special;
			return `${res.preNote} ${res[key]} ${res.note}`.trim();
		}).join(", ");
	}

	protected renderSkills(skills: IMonsterSkills) {
		const output = this.renderSkillMap(skills as ISkillMap<string>);

		return "other" in skills
			? `${output}, plus one of the following: ${this.renderSkillMap(skills.other[0].oneOf)}`
			: output;
	}

	protected renderSkillMap(skills: ISkillMap<string>) {
		return Object.entries(skills)
			.filter(([key]) => key !== "other")
			.map(([key, value]) => `${key}: ${value}`)
			.join(", ");
	}

	private getImageURL(monster: IMonsterData) {
		if (monster.tokenUrl) return monster.tokenUrl;

		try {
			return `https://5e.tools/img/${SOURCE_JSON_TO_SHORT[monster.source]}/${this.sanitizeNameForURL(monster.name)}.png`;
		} catch {
			return null;
		}
	}

	private sanitizeNameForURL(name: string) {
		const sanitizedName = name
			.normalize("NFD") // replace diactrics with their individual graphemes
			.replace(/[\u0300-\u036f]/g, "") // remove accent graphemes
			.replace(/Æ/g, "AE").replace(/æ/g, "ae")
			.replace(/"/g, "");

		return encodeURI(sanitizedName);
	}
}
