import { ABILITY_DISPLAY, ABILITY_SHORT, IAbilityMap, IClassTable, IHitDie, IMulticlassing, IStartingEquipment, IStartingProficiencies, IStoredClass, IStoredSubclass } from "../../models";
import { CompendiumDisplay } from "./compendiumDisplay";

export class ClassDisplay extends CompendiumDisplay<IStoredClass> {
	private level: number | undefined;

	constructor(item: IStoredClass, level?: number) {
		super(item);
		this.level = level;
	}

	public getEmbed() {
		const embed = this.embed;

		if (this.level) {
			const levelIndex = this.level - 1;
			embed.setTitle(`${this.itemData.name}, Level ${this.level}`);

			if (this.itemData.classTableGroups) {
				this.itemData.classTableGroups.forEach((table: IClassTable) => {
					table.colLabels.forEach((label, index) =>
						embed.addField(this.stripMetadata(label), table.rows[levelIndex][index], true));

					for (let i = table.colLabels.length; (i % 3) !== 0; i++) {
						embed.addBlankField(true);
					}
				});

				if (this.itemData.classTableGroups.length > 0 && this.itemData.classFeatures[levelIndex].length > 0) {
					embed.addBlankField();
				}
			}

			const subclassFeature = this.itemData.classFeatures[levelIndex].reduce((gainSubclass, feature) => {
				this.splitAddFields(feature.name, this.renderEntries(feature.entries), embed);
				return gainSubclass || feature.gainSubclassFeature as boolean;
			}, false);

			if (subclassFeature) {
				this.splitAddFields(`${this.itemData.subclassTitle} Features`, this.renderSubclasses(this.itemData, levelIndex), embed);
			}

			return embed.setFooter(this.renderSource(this.itemData));
		}

		embed.setTitle(this.itemData.name)
			.setDescription(this.generateClassFeatureList(this.itemData));

		if (this.itemData.hd) embed.addField("Hit Die", this.renderHitDie(this.itemData.hd), true);
		if (this.itemData.proficiency) embed.addField("Saving Throws", this.renderSavingThrows(this.itemData.proficiency), true);
		if (this.itemData.startingProficiencies) embed.addField("Starting Proficiencies", this.renderStartingProficiencies(this.itemData.startingProficiencies));
		if (this.itemData.startingEquipment) embed.addField("Starting Equipment", this.renderStartingEquipment(this.itemData.startingEquipment));
		if (this.itemData.multiclassing) embed.addField("Multiclassing", this.renderMulticlass(this.itemData.multiclassing), true);
		if (this.itemData.subclasses) embed.addField(`${this.itemData.subclassTitle}s`, this.renderSubclasses(this.itemData), true);

		return embed.setFooter(this.renderSource(this.itemData));
	}

	public getText() {
		let lines: string[] = [];

		if (this.level) {
			const levelIndex = this.level - 1;
			lines.push(`**${this.itemData.name}, Level ${this.level}**`);

			this.itemData.classTableGroups.forEach((table: IClassTable) => {
				const headers: string[] = [];
				const values: string[] = [];

				table.colLabels.forEach((label, index) => {
					const header = this.stripMetadata(label);
					const value = table.rows[levelIndex][index].toString();

					headers.push(header.padEnd(value.length, " "));
					values.push(value.padEnd(header.length, " "));
				});

				lines = [
					...lines,
					`\`\`\`| ${headers.join(" | ")} |`,
					`| ${values.join(" | ")} |\`\`\``,
				];
			});

			const subclassFeature = this.itemData.classFeatures[levelIndex].reduce((gainSubclass, feature) => {
				lines.push(`**${feature.name}**`);
				lines.push(this.renderEntries(feature.entries));
				return gainSubclass || feature.gainSubclassFeature as boolean;
			}, false);

			if (subclassFeature) {
				lines.push(`**${this.itemData.subclassTitle} Features**`);
				lines.push(this.renderSubclasses(this.itemData, levelIndex));
			}

			lines.push(this.renderSource(this.itemData));
			return lines.join("\n");
		}

		lines.push(`**${this.itemData.name}**`);
		lines.push(this.generateClassFeatureList(this.itemData));

		if (this.itemData.hd) lines.push(`**Hit Die**${this.renderHitDie(this.itemData.hd)}`);
		if (this.itemData.proficiency) lines.push(`**Saving Throws**${this.renderSavingThrows(this.itemData.proficiency)}`);
		if (this.itemData.startingProficiencies) lines.push("**Starting Proficiencies**", this.renderStartingProficiencies(this.itemData.startingProficiencies));
		if (this.itemData.startingEquipment) lines.push("**Starting Equipment**", this.renderStartingEquipment(this.itemData.startingEquipment));
		if (this.itemData.multiclassing) lines.push("**Multiclassing**", this.renderMulticlass(this.itemData.multiclassing));
		if (this.itemData.subclasses) lines.push(`**${this.itemData.subclassTitle}s**`, this.renderSubclasses(this.itemData));

		lines.push(this.renderSource(this.itemData));
		return lines.join("\n");
	}

	protected renderSkillRequirements(requirements: IAbilityMap) {
		return Object.entries(requirements)
			.map(([skill, minimum]) => `${ABILITY_DISPLAY[skill as ABILITY_SHORT]}: ${minimum}`);
	}

	protected renderHitDie(hd: IHitDie) {
		return `${hd.number}d${hd.faces}`;
	}

	protected renderSavingThrows(savingThrows: ABILITY_SHORT[]) {
		return savingThrows
			.map((skill) => ABILITY_DISPLAY[skill])
			.join(", ");
	}

	protected renderSubclasses(classData: IStoredClass, level?: number) {
		const subclasses = classData.subclasses as IStoredSubclass[];

		if (level) {
			const subclassLevelIndex = (classData.subclassFeatLevels as number[]).indexOf(level);

			return subclasses.map((subclass) => {
				const feats = subclass.subclassFeatures[subclassLevelIndex]
					.map((feat) => feat.name)
					.join(", ");

				return `  - ${subclass.name}: ${feats}`;
			})
				.join("\n");
		}

		return subclasses.map((subclass) => `  - ${subclass.name}`)
			.join("\n");
	}

	protected renderStartingProficiencies(startingProficiencies: IStartingProficiencies) {
		return [
			"You are proficient with the following items, in addition to any proficiencies provided by your race or background.",
			...this.renderProficiencies(startingProficiencies),
		]
			.map((str) => this.stripMetadata(str))
			.join("\n");
	}

	protected renderStartingEquipment(startingEquipment: IStartingEquipment) {
		return [
			`You start with the following items${startingEquipment.additionalFromBackground
				? ", plus anything provided by your background"
				: ""}.`,
			...startingEquipment.default,
			`Alternatively, you may start with ${startingEquipment.goldAlternative} gp to buy your own equipment.`,
		]
			.map((str) => this.stripMetadata(str))
			.join("\n");
	}

	protected renderMulticlass(multiclassing: IMulticlassing) {
		let multiclassOutput = [
			` Ability Score Minimum: ${this.renderSkillRequirements(multiclassing.requirements).join(", ")}`,
		];

		if (multiclassing.proficienciesGained) {
			multiclassOutput = [
				...multiclassOutput,
				` Extra proficiencies: `,
				...this.renderProficiencies(multiclassing.proficienciesGained)
					.map((str) => `    ${str}`),
			];
		}

		return multiclassOutput
			.map((str) => this.stripMetadata(str))
			.join("\n");
	}

	protected generateClassFeatureList(classData: IStoredClass) {
		return this.generateFeatureList(classData.classFeatures, Array.from({ length: 20 }, (_, i) => i));
	}

	protected renderProficiencies(startingProficiencies: IStartingProficiencies) {
		if (!startingProficiencies) { return []; }
		const output = [];
		if (startingProficiencies.armor) {
			output.push(`**Armor**: ${startingProficiencies.armor.join(", ")}`);
		}
		if (startingProficiencies.weapons) {
			output.push(`**Weapons**: ${startingProficiencies.weapons.join(", ")}`);
		}
		if (startingProficiencies.tools) {
			output.push(`**Tools**: ${startingProficiencies.tools.join(", ")}`);
		}
		if (startingProficiencies.skills) {
			const choose = startingProficiencies.skills[0].choose;
			output.push(`**Skills**: Choose ${choose.count} from ${choose.from.join(", ")}`);
		}
		return output;
	}
}
