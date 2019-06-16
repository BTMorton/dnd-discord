import { IStoredBackground } from "../../models";
import { CompendiumDisplay } from "./compendiumDisplay";

export class BackgroundDisplay extends CompendiumDisplay<IStoredBackground> {
	public getEmbed() {
		const embed = this.embed
			.setTitle(this.itemData.name);

		if (this.itemData.entries) {
			this.addEntriesAndDescription(this.itemData.entries, embed);
		}

		return embed.setFooter(this.renderSource(this.itemData));
	}

	public getText() {
		const lines = [
			this.itemData.name,
		];

		if (this.itemData.entries) {
			lines.push(this.renderEntries(this.itemData.entries));
		}

		lines.push(this.renderSource(this.itemData));
		return lines.join("\n");
	}
}
