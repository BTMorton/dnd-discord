import { ordinal } from "../../lib";
import { ICastingTime, IDistance, ISpellComponents, ISpellDuration, ISpellRange, IStoredSpell, SPELL_ENDS, SPELL_SCHOOL_DISPLAY, TIME_DISPLAY } from "../../models";
import { CompendiumDisplay } from "./compendiumDisplay";

export class SpellDisplay extends CompendiumDisplay<IStoredSpell> {
	public getEmbed() {
		const embed = this.embed
			.setTitle(this.itemData.name)
			.setDescription(this.renderSpellDescription(this.itemData))
			.addField("Casting Time", this.renderCastingTime(this.itemData.time), true)
			.addField("Range", this.renderRange(this.itemData.range), true)
			.addField("Range", this.renderComponents(this.itemData.components), true)
			.addField("Duration", this.renderDuration(this.itemData.duration), true);

		this.addEntries("Description", this.itemData.entries, embed);

		if (this.itemData.entriesHigherLevel) {
			this.addEntries("At Higher Levels", this.itemData.entriesHigherLevel, embed);
		}

		return embed.setFooter(this.renderSource(this.itemData));
	}
	public getText() {
		const lines = [
			`**this.itemData.name**`,
			this.renderSpellDescription(this.itemData),
			`**Casting Time**: ${this.renderCastingTime(this.itemData.time)}`,
			`**Range**: ${this.renderRange(this.itemData.range)}`,
			`**Range**: ${this.renderComponents(this.itemData.components)}`,
			`**Duration**: ${this.renderDuration(this.itemData.duration)}`,
			"**Description**",
			this.renderEntries(this.itemData.entries),
		];

		if (this.itemData.entriesHigherLevel) {
			lines.push("**At Higher Levels**", this.renderEntries(this.itemData.entriesHigherLevel));
		}

		lines.push(this.renderSource(this.itemData));
		return lines.join("\n");
	}

	protected renderSpellDescription(spell: IStoredSpell) {
		const spellLevel = spell.level === 0
			? `${SPELL_SCHOOL_DISPLAY[spell.school]} cantrip`
			: `${ordinal(spell.level)} level ${SPELL_SCHOOL_DISPLAY[spell.school]}`;

		const users = [
			...spell.classes,
			...spell.backgrounds || [],
			...spell.races || [],
		];

		return `*${spellLevel}. (${users.join(", ")})*`;
	}

	protected renderCastingTime(time: ICastingTime) {
		const condition = time.condition
			? ` ${this.stripMetadata(time.condition)}`
			: "";

		return `${time.number} ${TIME_DISPLAY[time.unit]}${condition}`;
	}

	protected renderDistance(distance: IDistance) {
		switch (distance.type) {
			case "self":
				return "Self";
			case "sight":
				return "Sight";
			case "touch":
				return "Touch";
			case "unlimited":
				return "Unlimited on the same plane";
			case "plane":
				return "Special";
			case "feet":
			case "miles":
				return `${distance.amount} ${distance.type}`;
		}
	}

	protected renderRange(range: ISpellRange) {
		switch (range.type) {
			case "special":
				return "Special";
			case "point":
				return this.renderDistance(range.distance);
			case "cube":
			case "cone":
			case "line":
			case "radius":
			case "sphere":
			case "hemisphere":
			case "cylinder":
				return `Self (${this.renderDistance(range.distance)} ${range.type})`;
		}
	}

	protected renderComponents(components: ISpellComponents) {
		const comps = [];
		if (components.v) comps.push("V");
		if (components.s) comps.push("S");
		if (components.m) {
			if (typeof components.m === "string") {
				comps.push(`M (${components.m})`);
			} else {
				comps.push(`M (${components.m.text})`);
			}
		}

		return comps.join(", ");
	}

	protected renderDuration(duration: ISpellDuration) {
		switch (duration.type) {
			case "instant":
				const condition = duration.condition
					? ` (${duration.condition})`
					: "";
				return `Instantaneous${condition}`;
			case "special":
				return "Special";
			case "permanent":
				return duration.ends
					? `Until ${duration.ends.map((key) => SPELL_ENDS[key]).join(" or ")}`
					: "Permanent";
			case "timed":
				const conc = duration.concentration ? "Concentration, " : "";
				const upTo = duration.concentration
					? "up to "
					: (duration.duration && duration.duration.upTo)
						? "Up to "
						: "";

				const durS = duration.duration && duration.duration.amount as number > 1;
				const dur = duration.duration
					? `${duration.duration.amount}${duration.duration.type}${durS ? "s" : ""}`
					: "";

				return `${conc}${upTo}${dur}`;
		}
	}
}
