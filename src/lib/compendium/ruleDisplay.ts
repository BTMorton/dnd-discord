import { IStoredRule } from "../../models";
import { CompendiumDisplay } from "./compendiumDisplay";

export class RuleDisplay extends CompendiumDisplay<IStoredRule> {
	public getEmbed() {
		const embed = this.embed
			.setTitle(this.itemData.name);

		this.addEntriesAndDescription(this.itemData.content, embed);

		if (this.itemData.children) {
			this.splitAddFields("Child Rules", this.itemData.children.join(", "), embed);
		}

		const parents = this.itemData.parents
			? ` - ${this.itemData.parents.join(", ")}`
			: "";

		return embed.setFooter(`${this.renderSource(this.itemData)}${parents}`);
	}

	public getText() {
		let lines = [
			`**${this.itemData.name}**`,
		];

		lines.push(this.renderEntries(this.itemData.content));

		if (this.itemData.children) {
			lines = [
				...lines,
				"**Child Rules**",
				...this.itemData.children,
			];
		}

		const parents = this.itemData.parents
			? ` - ${this.itemData.parents.join(", ")}`
			: "";

		lines.push(`${this.renderSource(this.itemData)}${parents}`);
		return lines.join("\n");
	}
}
