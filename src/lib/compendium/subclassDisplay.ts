import { IStoredSubclass } from "../../models";
import { CompendiumDisplay } from "./compendiumDisplay";

export class SubclassDisplay extends CompendiumDisplay<IStoredSubclass> {
	private level: number | undefined;

	constructor(item: IStoredSubclass, level?: number) {
		super(item);
		this.level = level;
	}

	public getEmbed() {
		const embed = this.embed;
		if (this.level) {
			embed.setTitle(`${this.itemData.className}: ${this.itemData.name}, Level ${this.level}`);

			const levelIndex = this.itemData.featLevels.indexOf(this.level - 1);
			if (levelIndex < 0) {
				return embed.setDescription(`Sorry, there are no ${this.itemData.name} subclass features for level ${this.level}.`);
			}

			this.itemData.subclassFeatures[levelIndex]
				.forEach((feature) => embed.addField(feature.name, this.renderEntries(feature.entries)));

			return embed;
		}

		embed.setTitle(`${this.itemData.className}: ${this.itemData.name}`);

		this.addEntriesAndDescription(this.itemData.description, embed);

		return embed
			.addField(`${this.itemData.subclassTitle} Features`, this.generateSubClassFeatureList(this.itemData))
			.setFooter(this.renderSource(this.itemData));
	}

	public getText() {
		const lines: string[] = [];
		if (this.level) {
			lines.push(`**${this.itemData.className}: ${this.itemData.name}, Level ${this.level}**`);

			const levelIndex = this.itemData.featLevels.indexOf(this.level - 1);
			if (levelIndex < 0) {
				lines.push(`Sorry, there are no ${this.itemData.name} subclass features for level ${this.level}.`);
				return lines.join("\n");
			}

			this.itemData.subclassFeatures[levelIndex]
				.forEach((feature) => lines.push(`**${feature.name}**`, this.renderEntries(feature.entries)));

			return lines.join("\n");
		}

		lines.push(`**${this.itemData.className}: ${this.itemData.name}**`);

		lines.push(this.renderEntries(this.itemData.description));

		lines.push(`**${this.itemData.subclassTitle} Features**`, this.generateSubClassFeatureList(this.itemData));
		lines.push(this.renderSource(this.itemData));
		return lines.join("\n");
	}

	protected generateSubClassFeatureList(subclass: IStoredSubclass) {
		return this.generateFeatureList(subclass.subclassFeatures, subclass.featLevels);
	}

}
