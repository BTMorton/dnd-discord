import { DAMAGE_TYPE, DAMAGE_TYPE_KEY, IStoredItem, ITEM_TYPE } from "../../models";
import { CompendiumDisplay } from "./compendiumDisplay";

export class ItemDisplay extends CompendiumDisplay<IStoredItem> {
	public getEmbed() {
		const embed = this.embed
			.setTitle(this.itemData.name)
			.setDescription(this.renderItemDescription(this.itemData));

		if (this.itemData.value) embed.addField("Cost", this.renderMoney(this.itemData.value), true);
		if (this.itemData.valueMult) embed.addField("Base Value", `x${this.itemData.valueMult}`);

		if (this.itemData.weight) {
			const note = this.itemData.weightNote ? ` ${this.itemData.weightNote}` : "";
			embed.addField("Weight", `${this.itemData.weight}lb ${note}`, true);
		}
		if (this.itemData.weightMult) embed.addField("Base Weight", `x${this.itemData.weightMult}`);
		if (this.itemData.ac) embed.addField("Armor Class", `${this.itemData.ac}`, true);
		if (this.itemData.speed) embed.addField("Speed", this.itemData.speed, true);
		if (this.itemData.carryingcapacity) embed.addField("CarryingCapacity", `${this.itemData.carryingcapacity} lbs`, true);
		if (this.itemData.weapon) embed.addField("Weapon Details", this.renderWeapon(this.itemData), true);

		if (this.itemData.entries) {
			this.addEntries("Description", this.itemData.entries, embed);
		}

		return embed.setFooter(this.renderSource(this.itemData));
	}

	public getText() {
		const lines = [
			`**${this.itemData.name}**`,
			this.renderItemDescription(this.itemData),
		];

		if (this.itemData.value) lines.push(`**Cost**: ${this.renderMoney(this.itemData.value)}`);
		if (this.itemData.valueMult) lines.push(`**Cost**: Base Value x${this.itemData.valueMult}`);

		if (this.itemData.weight) {
			const note = this.itemData.weightNote ? ` ${this.itemData.weightNote}` : "";
			lines.push(`**Weight**: ${this.itemData.weight}lb ${note}`);
		}
		if (this.itemData.weightMult) lines.push(`**Weight**: Base Weight x${this.itemData.weightMult}`);
		if (this.itemData.ac) lines.push(`**Armor Class**: ${this.itemData.ac}`);
		if (this.itemData.speed) lines.push(`**Speed**: ${this.itemData.speed}`);
		if (this.itemData.carryingcapacity) lines.push(`**CarryingCapacity**: ${this.itemData.carryingcapacity} lbs`);
		if (this.itemData.weapon) lines.push(`**Weapon Details**: ${this.renderWeapon(this.itemData)}`);

		if (this.itemData.entries) {
			lines.push("Description", this.renderEntries(this.itemData.entries));
		}

		lines.push(this.renderSource(this.itemData));
		return lines.join("\n");
	}

	protected renderItemDescription(item: IStoredItem) {
		const parts = [];
		if (item.staff) parts.push("Staff");
		if (item.weaponCategory) parts.push(`${item.weaponCategory} Weapon`);
		if (item.wondrous) parts.push(`Wondrous Item`);
		if (item.type) parts.push(ITEM_TYPE[item.type]);
		if (item.baseItem) parts.push(this.stripMetadata(item.baseItem));
		if (item.tier) parts.push(item.tier);
		if (item.rarity !== "None") parts.push(item.rarity);
		if (item.reqAttune) parts.push("Requires Attunement");

		return `*${parts.join(", ")}*`;
	}

	protected renderWeapon(item: IStoredItem) {
		const damage = item.dmg1
			? `${this.stripMetadata(item.dmg1 as string)} ${DAMAGE_TYPE[item.dmgType as DAMAGE_TYPE_KEY]}`
			: "";

		const additional = item.property && item.property.length > 0
			? this.renderWeaponProperties(item)
			: "";

		const join = damage && additional ? " - " : "";

		return `${damage}${join}${additional}`;
	}

	protected renderWeaponProperties(item: IStoredItem) {
		if (!item.property) return [];

		return item.property.map((key) => {
			switch (key) {
				case "2H":
					return "two-handed";
				case "A":
				case "AF":
					return `ammunition (${item.range} ft.)`;
				case "T":
					return `thrown (${item.range} ft.)`;
				case "V":
					return `versatile (${this.stripMetadata(item.dmg2 as string)})`;
				case "H":
					return "heavy";
				case "F":
					return "finesse";
				case "L":
					return "light";
				case "R":
					return "reach";
				case "LD":
					return "loading";
				case "S":
					return "special";
				case "RLD":
					return `reload (${item.reload} shots)`;
				case "BF":
					return "burst fire";
			}
		}).join(", ");
	}
}
