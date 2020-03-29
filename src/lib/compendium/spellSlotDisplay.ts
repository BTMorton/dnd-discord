import { IStoredClass } from "../../models";
import { CompendiumDisplay } from "./compendiumDisplay";

export class SpellSlotDisplay extends CompendiumDisplay<IStoredClass> {
	public getEmbeds(level?: number) {
		const embed = this.getEmbed(level);
		return embed ? [embed] : [];
	}

	public getEmbed(level?: number) {
		const levelDisplay = level ? ` - Level ${level}` : "";
		const embed = this.embed
			.setTitle(`Spell slots for ${this.itemData.name}${levelDisplay}`);
		const spellSlots = this.itemData.classTableGroups.find((table) => /spell slots/i.test(table.title || ""));
		if (!spellSlots) return null;

		let spellSlotsRows = spellSlots.rows as number[][];

		if (level) {
			spellSlotsRows = [spellSlotsRows[level - 1]];
		}

		const maxLevels = spellSlotsRows
			.reduce((maxLevel, row) => Math.max(maxLevel, row.filter((slots) => slots > 0).length), 0);

		const headings = Array.from({ length: maxLevels }, (_, i) => i + 1);

		const levelMod = level ? level : 1;

		const slotTable = [
			`|\u00A0\u00A0\u00A0\u00A0| ${headings.join(" | ")} |`,
			`|----|${headings.map(() => "---").join("|")}|`,
			...spellSlotsRows
				.map((slots: number[], index) => `| ${(levelMod + index).toString().padStart(2, "0")} | ${slots.slice(0, maxLevels).join(" | ")} |`),
		].join("\n");

		embed.setDescription(`\`\n${slotTable}\n\``);

		return embed;
	}

	public getText(level?: number) {
		const levelDisplay = level ? ` - Level ${level}` : "";

		const spellSlots = this.itemData.classTableGroups.find((table) => /spell slots/i.test(table.title || ""));
		if (!spellSlots) return null;

		let spellSlotsRows = spellSlots.rows as number[][];
		if (level) {
			spellSlotsRows = [spellSlotsRows[level - 1]];
		}

		const maxLevels = spellSlotsRows
			.reduce((maxLevel, row) => Math.max(maxLevel, row.filter((slots) => slots > 0).length), 0);

		const headings = Array.from({ length: maxLevels }, (_, i) => i + 1);

		const levelMod = level ? level : 1;

		return [
			`**Spell slots for ${this.itemData.name}${levelDisplay}**`,
			`|\u00A0\u00A0\u00A0\u00A0| ${headings.join(" | ")} |`,
			`|----|${headings.map(() => "---").join("|")}|`,
			...spellSlotsRows
				.map((slots: number[], index) => `| ${(levelMod + index).toString().padStart(2, "0")} | ${slots.slice(0, maxLevels).join(" | ")} |`),
		].join("\n");
	}
}
