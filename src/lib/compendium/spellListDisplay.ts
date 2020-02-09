import { ordinal } from "../../lib";
import { IStoredSpell, SPELL_SCHOOL_DISPLAY } from "../../models";
import { CompendiumDisplay } from "./compendiumDisplay";

export class SpellListDisplay extends CompendiumDisplay<IStoredSpell[]> {
	public getEmbed() { return null; }

	public getEmbeds(title = "Spell List") {
		const levelMap = this.itemData.reduce((map, spell) => {
			return map.set(spell.level, [...map.get(spell.level) || [], spell]);
		}, new Map<number, IStoredSpell[]>());

		const embeds = [];
		let embed = this.embed
			.setTitle(title);

		const spellLevels = Array.from(levelMap.keys()).sort();
		for (const level of spellLevels) {
			const spellList = levelMap.get(level) as IStoredSpell[];
			const spellLevel = level === 0
				? `Cantrips`
				: `${ordinal(level)} Level`;

			const fieldData = spellList
				.map((spell) => `**${spell.name}** (${SPELL_SCHOOL_DISPLAY[spell.school]}) - *${spell.classes.join(", ")}*`)
				.join("\n");
			const fields = this.splitFields(fieldData);

			while (fields.length > 0) {
				const nextField = fields.shift() as string;

				if (embed.fields && embed.fields.length >= 25 || embed.length + nextField.length > 6000) {
					embeds.push(embed);
					embed = this.embed.setTitle(title);
				}

				embed.addField(spellLevel, nextField);
			}
		}

		embeds.push(embed);

		return embeds;
	}

	public getText(title = "Spell List") {
		const levelMap = this.itemData.reduce((map, spell) => {
			return map.set(spell.level, [...map.get(spell.level) || [], spell]);
		}, new Map<number, IStoredSpell[]>());

		let lines = [
			title,
		];

		const spellLevels = Array.from(levelMap.keys()).sort();
		for (const level of spellLevels) {
			const spellList = levelMap.get(level) as IStoredSpell[];
			const spellLevel = level === 0
				? `Cantrips`
				: `${ordinal(level)} Level`;

			lines.push(`**${spellLevel}**`);
			lines = lines.concat(spellList.map((spell) => `**${spell.name}** (${SPELL_SCHOOL_DISPLAY[spell.school]}) - *${spell.classes.join(", ")}*`));
		}

		return lines.join("\n");
	}
}
