import { MessageEmbed } from "discord.js";

export class EmbedHelper {
	public static splitFields(field: string, initialLimit = 1024) {
		const fieldParts = [];
		let limit = initialLimit;
		while (field.length > limit) {
			let breakPoint = field.lastIndexOf("\n", limit);
			if (breakPoint < 0) {
				breakPoint = field.lastIndexOf(" ", limit);
			}

			fieldParts.push(field.slice(0, breakPoint));
			field = field.slice(breakPoint + 1);
			limit = 1024;
		}

		if (field.length > 0) {
			fieldParts.push(field);
		}

		return fieldParts;
	}

	public static splitAddFields(embed: MessageEmbed, title: string | undefined, field: string, inline = false) {
		const fieldParts = EmbedHelper.splitFields(field);

		fieldParts.forEach((part, i) =>
			embed.addField(`${i > 0 ? "\u200b" : title}`, part, inline));
	}

	public static splitSetDescription(embed: MessageEmbed, field: string) {
		const fieldParts = EmbedHelper.splitFields(field, 2048);

		embed.setDescription(fieldParts.shift());
		fieldParts.forEach((part) => embed.addField("\u200b", part));
	}
}
