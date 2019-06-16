import { IStoredMonsterFeat } from "../../models";
import { CompendiumDisplay } from "./compendiumDisplay";

export class MonsterFeatDisplay extends CompendiumDisplay<IStoredMonsterFeat> {
	public getEmbed() {
		const embed = this.embed
			.setTitle(this.itemData.name);

		if (this.itemData.entries) {
			this.addEntriesAndDescription(this.itemData.entries, embed);
		}

		if (this.itemData.monsters) {
			this.splitAddFields("Monsters", this.itemData.monsters.join(", "), embed);
		}

		return embed.setFooter(this.renderSource(this.itemData));
	}

	public getText() {
		let lines = [
			this.itemData.name,
		];

		if (this.itemData.entries) {
			lines.push(this.renderEntries(this.itemData.entries));
		}

		if (this.itemData.monsters) {
			lines.push("**Monsters**");
			lines = lines.concat(this.itemData.monsters);
		}

		lines.push(this.renderSource(this.itemData));
		return lines.join("\n");
	}
}
