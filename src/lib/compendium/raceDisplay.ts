import { ABILITY_DISPLAY, ABILITY_SHORT, IChoice, IRaceAbilities, IStoredRace, SIZE } from "../../models";
import { CompendiumDisplay } from "./compendiumDisplay";

export class RaceDisplay extends CompendiumDisplay<IStoredRace> {
	public getEmbed() {
		const embed = this.embed
			.setTitle(this.itemData.name);

		if (this.itemData.speed) embed.addField("Speed", `${this.itemData.speed} ft.`, true);
		if (this.itemData.size) embed.addField("Size", SIZE[this.itemData.size], true);
		if (this.itemData.ability) embed.addField("Ability Bonuses", this.renderRaceAbilities(this.itemData.ability), true);
		if (this.itemData.darkvision) embed.addField("Darkvision", `${this.itemData.darkvision} ft.`, true);
		if (this.itemData.languageTags) embed.addField("Languages", this.itemData.languageTags.join(", "), true);

		if (this.itemData.entries) {
			this.addEntries("\u200b", this.itemData.entries, embed);
		}

		if (this.itemData.subraces && this.itemData.subraces.length > 0) {
			embed.addField("Subraces", this.itemData.subraces.map((sub) => sub.name).join(", "));
		}

		return embed.setFooter(this.renderSource(this.itemData));
	}

	public getText() {
		const lines = [
			`**this.itemData.name**`,
		];

		if (this.itemData.speed) lines.push(`**Speed**: ${this.itemData.speed} ft.`);
		if (this.itemData.size) lines.push(`**Size**: ${SIZE[this.itemData.size]}`);
		if (this.itemData.ability) lines.push(`**Ability Bonuses**: ${this.renderRaceAbilities(this.itemData.ability)}`);
		if (this.itemData.darkvision) lines.push(`**Darkvision**: ${this.itemData.darkvision} ft.`);
		if (this.itemData.languageTags) lines.push(`**Languages**: ${this.itemData.languageTags.join(", ")}`);

		if (this.itemData.entries) {
			lines.push(this.renderEntries(this.itemData.entries));
		}

		if (this.itemData.subraces && this.itemData.subraces.length > 0) {
			lines.push("**Subraces**", this.itemData.subraces.map((sub) => sub.name).join(", "));
		}

		lines.push(this.renderSource(this.itemData));
		return lines.join("\n");
	}

	protected renderRaceAbilities(ability: IRaceAbilities) {
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

	protected renderChoices<T>(choice: IChoice<T>, map: (item: T) => string = (item: T) => `${item}`) {
		if (choice.from.length === 0) return "";
		if (choice.from.length === 1) return map(choice.from[0]);

		const last = choice.from.pop();
		return `Choose ${choice.count || 1} from ${choice.from.map(map).join(", ")} or ${last}`;
	}
}
