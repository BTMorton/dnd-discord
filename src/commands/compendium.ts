import { AwaitMessagesOptions, CollectorFilter, Message, TextBasedChannelFields, User } from "discord.js";
import { IStoredItem } from "models/items";
import { IStoredRace } from "models/races";
import { AddCommandMethod, capitalise, Compendium, CompendiumDisplay, Context, DiscordDisplay, escapeStringForRegex, ICommandSet, Injector } from "../lib";
import { IStored, IStoredBackground, IStoredClass, IStoredClassFeature, IStoredFeat, IStoredMonster, IStoredMonsterFeat, IStoredRule, IStoredSpell, IStoredSubclass, SOURCE_JSON_TO_SHORT, SPELL_SCHOOL_DISPLAY, SPELL_SCHOOL_KEYS } from "../models";

class CompendiumCommands {
	public static CONST_MULTI_REPLY_PROMPT = "Did you mean one of:";
	public static CONST_AWAIT_REPLY_PROMPT = "If the item you are looking for is in the list, reply with the number.";
	public static CONST_DISCORD_DISPLAY: DiscordDisplay = new DiscordDisplay();
	public static CONST_SPELL_SCHOOLS: { [type: string]: string } = {
		A: "Abjuration",
		C: "Conjuration",
		D: "Divination",
		EN: "Enchantment",
		EV: "Evocation",
		I: "Illusion",
		N: "Necromancy",
		T: "Transmutation",
	};

	public async searchLevel(context: Context, type?: string): Promise<void> {
		const [ search, level ] = this.tryParseLevel(context.messageData) as [ string, number ];
		const match = await this.doSearch(context, search, type);
		if (!match) return;

		await context.sendToChannel(this.getEmbed(match, level));
	}

	public async search(context: Context, type?: string): Promise<void> {
		const search: string = context.messageData;
		const match = await this.doSearch(context, search, type);
		if (!match) return;

		await context.sendToChannel(this.getEmbed(match));
	}

	public async searchSpellList(context: Context) {
		const [ search, level ] = this.tryParseLevel(context.messageData) as [ string, number | undefined ];
		const query: any = {
			$and: search.split(" ")
				.map((part) => ({
					classes: new RegExp(escapeStringForRegex(part), "i"),
				})),
			compendiumType: "spell",
		};

		if (level !== undefined) query.level = level;

		const results = await Injector.get(Compendium).query(query, [["level", 1], ["name", 1]]) as IStoredSpell[];
		if (results.length === 0) return this.sendNotFound(context);
		if (results.length === 1) {
			await context.sendToChannel(this.getEmbed(results[0]));
			return;
		}

		const embed = CompendiumDisplay.getSpellList(results, `Spells for ${search}`);
		await context.sendToChannel(embed);
	}

	public async searchSpellSlots(context: Context) {
		const [ search, level ] = this.tryParseLevel(context.messageData) as [ string, number ];
		const match = await this.doSearch(context, search, "class") as IStoredClass;
		if (!match) return;

		const embed = CompendiumDisplay.getSpellSlotEmbed(match, level);
		if (!embed) return this.sendNotFound(context);

		await context.sendToChannel(embed);
	}

	public async searchSpellSchools(context: Context) {
		const args: string[] = context.args;
		const schoolRegExp = new RegExp(escapeStringForRegex(args.shift() || ""), "i");
		const school: SPELL_SCHOOL_KEYS | undefined = (Object.keys(SPELL_SCHOOL_DISPLAY) as SPELL_SCHOOL_KEYS[])
			.find((key: SPELL_SCHOOL_KEYS) => schoolRegExp.test(SPELL_SCHOOL_DISPLAY[key]));

		if (!school) return this.sendNotFound(context);

		const query: any = { school };

		const maybeLevel = args.shift() as string;
		const level = parseInt(maybeLevel, 10);
		if (!Number.isNaN(level) && level < 10) {
			query.level = level;
		} else {
			args.unshift(maybeLevel);
		}

		const results = await Injector.get(Compendium).search(args.join(" "), "spell", query) as IStoredSpell[];
		if (results.length === 0) return this.sendNotFound(context);
		if (results.length === 1) {
			await context.sendToChannel(this.getEmbed(results[0]));
			return;
		}

		const embed = CompendiumDisplay.getSpellList(results, `${SPELL_SCHOOL_DISPLAY[school]} Spells`);
		await context.sendToChannel(embed);
	}

	public async searchMonsterList(context: Context) {
		const [ cr, ...search ] = context.args;
		const query: any = {};

		if (cr !== undefined) query.cr = cr;

		const results = await Injector.get(Compendium).search(search.join(" "), "monster", query, [["cr", 1], ["name", 1]]) as IStoredMonster[];
		if (results.length === 0) return this.sendNotFound(context);
		if (results.length === 1) {
			await context.sendToChannel(this.getEmbed(results[0]));
			return;
		}

		const embed = CompendiumDisplay.getMonsterList(results, `Monsters for ${search}`);
		await context.sendToChannel(embed);
	}

	private async doSearch(context: Context, search: string, type?: string, additionalQuery = {}) {
		const results = await Injector.get(Compendium).search(search, type, additionalQuery);
		if (results.length === 0) return this.sendNotFound(context);

		let match = results[0];
		if (results.length > 1) {
			try {
				match = await this.sendOptions(context, results);
			} catch (err) {
				await context.sendToChannel(err.message);
				return;
			}
		}

		return match;
	}

	private getEmbed(match: IStored, level?: number) {
		switch (match.compendiumType) {
			case "class":
				return CompendiumDisplay.getClassEmbed(match as IStoredClass, level);
			case "classfeat":
				return CompendiumDisplay.getClassFeatEmbed(match as IStoredClassFeature);
			case "subclass":
				const subclassMatch = match as IStoredSubclass;

				if (level) {
					const levelIndex = subclassMatch.featLevels.indexOf(level - 1);
					if (levelIndex < 0) {
						return `Sorry, there are no ${match.name} subclass features for level ${level}.`;
					}
				}

				return CompendiumDisplay.getSubclassEmbed(match as IStoredSubclass, level);
			case "spell":
				return CompendiumDisplay.getSpellEmbed(match as IStoredSpell);
			case "item":
				return CompendiumDisplay.getItemEmbed(match as IStoredItem);
			case "race":
				return CompendiumDisplay.getRaceEmbed(match as IStoredRace);
			case "background":
				return CompendiumDisplay.getBackgroundEmbed(match as IStoredBackground);
			case "feat":
				return CompendiumDisplay.getFeatEmbed(match as IStoredFeat);
			case "monster":
				return CompendiumDisplay.getMonsterEmbed(match as IStoredMonster);
			case "monsterfeat":
				return CompendiumDisplay.getMonsterFeatEmbed(match as IStoredMonsterFeat);
			case "rule":
				return CompendiumDisplay.getRuleEmbed(match as IStoredRule);
			default:
				throw new Error(`Cannot render unrecognised result type: ${match.compendiumType}`);
		}
	}

	private tryParseLevel(input: string) {
		const match = (/^(.+) ([0-9]+)$/i).exec(input);
		if (!match) {
			return [ input, undefined ];
		}

		const [, search, level] = match;
		return [
			search,
			parseInt(level, 10),
		];
	}

	private async sendOptions(context: Context, results: IStored[], page = 0, pageCount = 20): Promise<IStored> {
		const embed = CompendiumDisplay.embed
			.setTitle("Did You Mean...")
			.setDescription(this.formatOptions(results, page));

		const nextPage = results.length > ((page + 1) * pageCount);
		const prevPage = page > 0;

		const messages = await context.sendToChannel(embed);

		const filter: CollectorFilter = (m: Message) => {
			if (m.author.id !== context.user.id) return false;
			if (nextPage && m.content === "n") return true;
			if (prevPage && m.content === "p") return true;
			if (m.content === "c") return true;

			const index = (parseInt(m.content, 10) || 0) - 1;
			return index >= 0 && index < results.length;
		};

		const cleanUp = async (toDelete: Message[]) => {
			try {
				await Promise.all(toDelete
					.filter((m) => m.deletable)
					.map((m) => m.delete()));
			} catch (_) { return; }
		};

		let reply;
		try {
			reply = await this.awaitReply(context.channel, context.user, filter);
		} catch (_) {
			throw new Error("Selection timed out");
		} finally {
			await cleanUp([
				...reply ? [reply] : [],
				...messages,
			]);
		}

		switch (reply.content) {
			case "c":
				throw new Error("Selection cancelled");
			case "n":
				return await this.sendOptions(context, results, page + 1);
			case "p":
				return await this.sendOptions(context, results, page - 1);
			default:
				const num = parseInt(reply.content, 10);
				if (Number.isNaN(num)) { throw new Error("Unable to process match"); }

				const match = num - 1;
				if (match < 0 || match > results.length) {
					throw new Error("Unable to process match");
				}

				return results[match];
		}
	}

	private formatOptions(results: IStored[], page = 0, pageCount = 20) {
		const start = page * pageCount;

		const options = results.slice(start, start + pageCount)
			.map((item, index) => `**${start + index + 1}** ${capitalise(item.compendiumType)}: ${this.formatName(item)} (${SOURCE_JSON_TO_SHORT[item.source]})`);

		const controls = [
			"Press c to cancel",
			...(results.length > (start + pageCount) ? ["n for the next page"] : []),
			...(page > 1 ? ["p for the next page"] : []),
		];
		const control = `${controls.join(", ")} (page ${page + 1} of ${Math.ceil(results.length / pageCount)})`;

		return [
			`If you were looking for one of the items below, type the number.`,
			control,
			...options,
		].join("\n");
	}

	private formatName(item: IStored) {
		switch (item.compendiumType) {
			default:
				return item.name;
			case "classfeat":
				const classfeat = item as IStoredClassFeature;
				const classNameDisplay = classfeat.subclass
					? `${classfeat.className} - ${classfeat.subclass}`
					: classfeat.className;
				return `${classNameDisplay} ${classfeat.level + 1}; ${classfeat.name}`;
			case "subclass":
				const subclass = item as IStoredSubclass;
				return `${subclass.className}; ${subclass.name}`;
		}
	}

	private async awaitReply(channel: TextBasedChannelFields, user: User, filter: CollectorFilter) {
		const options: AwaitMessagesOptions = {
			errors: ["time"],
			maxMatches: 1,
			time: 60000,
		};

		const collected = await channel.awaitMessages(filter, options);
		return collected.first();
	}

	private async sendNotFound(context: Context) {
		await context.reply("Sorry, I couldn't find any information matching your query.");
	}
}

const compendiumCommands = new CompendiumCommands();

const commandSet: ICommandSet = {
	loadCommands(addCommand: AddCommandMethod) {
		addCommand("spells", (ctx) => compendiumCommands.search(ctx, "spell"), { aliases: ["spell", "sp"] });
		addCommand("items", (ctx) => compendiumCommands.search(ctx, "item"), { aliases: ["item", "it"] });
		addCommand("class", (ctx) => compendiumCommands.searchLevel(ctx, "class"), { aliases: ["classes", "cl", "cls"] });
		addCommand("subclass", (ctx) => compendiumCommands.searchLevel(ctx, "subclass"), { aliases: ["subclasses", "subcls"] });
		addCommand("races", (ctx) => compendiumCommands.search(ctx, "race"), { aliases: ["race", "ra"] });
		addCommand("rules", (ctx) => compendiumCommands.search(ctx, "rule"), { aliases: ["rule", "ru"] });
		addCommand("backgrounds", (ctx) => compendiumCommands.search(ctx, "background"), { aliases: ["background", "bg"] });
		addCommand("feats", (ctx) => compendiumCommands.search(ctx, "feat"), { aliases: ["feat", "ft", "feature"] });
		addCommand("monsters", (ctx) => compendiumCommands.search(ctx, "monster"), { aliases: ["monster", "mon"] });
		addCommand("monsterslist", (ctx) => compendiumCommands.searchMonsterList(ctx), { aliases: ["monsterlist"] });
		addCommand("spelllist", (ctx) => compendiumCommands.searchSpellList(ctx), { aliases: ["spelllists", "spellslist", "spellist"] });
		addCommand("spellslot", (ctx) => compendiumCommands.searchSpellSlots(ctx), { aliases: ["spellslots", "slots"] });
		addCommand("spellschool", (ctx) => compendiumCommands.searchSpellSchools(ctx), { aliases: ["spellschools", "schools"] });
		addCommand("monsterfeat", (ctx) => compendiumCommands.search(ctx, "monsterfeat"), { aliases: ["mfeat", "monsterability", "mability"] });
		addCommand("ability", (ctx) => compendiumCommands.search(ctx, "classfeat"), { aliases: ["abilities", "classfeat", "ab", "cft"] });
		addCommand("search", (ctx) => compendiumCommands.search(ctx));
	},
};

export = commandSet;
