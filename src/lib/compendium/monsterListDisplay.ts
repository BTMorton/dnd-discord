import { IStoredMonster } from "models";
import { capitalise, flatMap } from "../../lib";
import { CompendiumDisplay } from "./compendiumDisplay";

export class MonsterListDisplay extends CompendiumDisplay<IStoredMonster[]> {
	public getEmbeds(title = "Monster List") {
		const embed = this.getEmbed(title);
		return embed ? [embed] : [];
	}

	public getEmbed(title = "Monster List") {
		const levelMap = this.itemData.reduce((map, monster) => {
			const cr = typeof monster.cr === "string"
				? monster.cr
				: monster.cr.cr;
			return map.set(cr, [...map.get(cr) || [], monster]);
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

	public getText(title = "Monster List") {
		const levelMap = this.itemData.reduce((map, monster) => {
			const cr = typeof monster.cr === "string"
				? monster.cr
				: monster.cr.cr;
			return map.set(cr, [...map.get(cr) || [], monster]);
		}, new Map<string, IStoredMonster[]>());

		let lines = [
			title,
		];

		const monsterCRs = Array.from(levelMap.keys()).sort();
		for (const cr of monsterCRs) {
			const monsterList = levelMap.get(cr) as IStoredMonster[];
			const crDisplay = `Challenge Rating ${cr}`;

			lines.push(`**${crDisplay}**`);
			lines = lines.concat(monsterList.map((monster) => {
				if (!monster.type) return monster.name;

				const type = typeof monster.type === "string"
					? monster.type
					: monster.type.type;
				return `${monster.name}, ${capitalise(type)}`;
			}));
		}

		return lines.join("\n");
	}
}
