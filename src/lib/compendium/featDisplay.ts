import { capitalise, flatMap, joinConjunct, ordinal } from "../../lib";
import { ABILITY_DISPLAY, ABILITY_SHORT, IAbilityMap, IFeatArmorPrereq, IFeatPrereq, IFeatRacePrereq, IStoredFeat } from "../../models";
import { CompendiumDisplay } from "./compendiumDisplay";

export class FeatDisplay extends CompendiumDisplay<IStoredFeat> {
	public getEmbed() {
		const embed = this.embed
			.setTitle(this.itemData.name);

		if (this.itemData.entries) {
			this.addEntriesAndDescription(this.itemData.entries, embed);
		}

		if (this.itemData.prerequisite) {
			embed.addField("Prerequisites", this.renderPrereq(this.itemData.prerequisite), true);
		}

		return embed.setFooter(this.renderSource(this.itemData));
	}

	public getText() {
		const lines = [
			`**${this.itemData.name}**`,
		];

		if (this.itemData.entries) {
			lines.push(this.renderEntries(this.itemData.entries));
		}

		if (this.itemData.prerequisite) {
			lines.push(`**Prerequisites**`, this.renderPrereq(this.itemData.prerequisite));
		}

		lines.push(this.renderSource(this.itemData));
		return lines.join("\n");
	}

	protected renderPrereq(prereqs: IFeatPrereq[]) {
		return joinConjunct(
			flatMap(prereqs, (prereq) => {
				return Object.keys(prereq).map((key) => {
					switch (key) {
						case "race": {
							const racePrereqs = (prereq.race as IFeatRacePrereq[]).map((req) => {
								const subrace = req.subrace ? ` (${capitalise(req.subrace)})` : "";
								return `${capitalise(req.name)}${subrace}`;
							});
							return joinConjunct(racePrereqs, ", ", "or");
						}
						case "ability": {
							const abilityPrereqs = (prereq.ability as IAbilityMap[]).map((abilities) => {
								const displays = Object.entries(abilities)
									.map(([skill, minimum]) => `${ABILITY_DISPLAY[skill as ABILITY_SHORT]} > ${minimum}`);

								return joinConjunct(displays, ", ", "and");
							});
							return joinConjunct(abilityPrereqs, ", ", "or");
						}
						case "spellcasting":
							return prereq.spellcasting
								? "The ability to cast at least one spell"
								: "";
						case "proficiency":
							const profs = (prereq.proficiency as IFeatArmorPrereq[])
								.map(({armor}) => capitalise(armor));
							return `Proficiency with ${joinConjunct(profs, ", ", "or")} Armor`;
						case "special":
							return prereq.special as string;
						case "level":
							return `${ordinal(prereq[key] as number)} level`;
					}
				});
			}).filter((req) => !!req) as string[],
			", ",
			"and",
		);
	}
}
