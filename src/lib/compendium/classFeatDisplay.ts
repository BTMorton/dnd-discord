import { IStoredClassFeature } from "../../models";
import { CompendiumDisplay } from "./compendiumDisplay";

export class ClassFeatDisplay extends CompendiumDisplay<IStoredClassFeature> {
	public getEmbed() {
		const subclass = this.itemData.subclass ? `${this.itemData.subclass} - ` : "";
		const embed = this.embed
			.setTitle(`${this.itemData.className}: ${subclass}${this.itemData.name} (Level ${this.itemData.level + 1})`);

		this.addEntriesAndDescription(this.itemData.entries, embed);

		return embed;
	}

	public getText() {
		const subclass = this.itemData.subclass ? `${this.itemData.subclass} - ` : "";
		const lines = [
			`**${this.itemData.className}: ${subclass}${this.itemData.name} (Level ${this.itemData.level + 1})**`,
		];

		lines.push(this.renderEntries(this.itemData.entries));

		return lines.join("\n");
	}
}
