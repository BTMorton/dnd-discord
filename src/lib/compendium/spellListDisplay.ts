import { ordinal } from "../../lib";
import { IStoredSpell } from "../../models";
import { CompendiumDisplay } from "./compendiumDisplay";

export class SpellListDisplay extends CompendiumDisplay<IStoredSpell[]> {
	public getEmbed(title = "Spell List") {
		const levelMap = this.itemData.reduce((map, spell) => {
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

	public getText(title = "Spell List") {
		const levelMap = this.itemData.reduce((map, spell) => {
			return map.set(spell.level, [...map.get(spell.level) || [], spell ]);
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
			lines = lines.concat(spellList.map((spell) => `${spell.name} - *${spell.classes.join(", ")}*`));
		}

		return lines.join("\n");
	}
}
