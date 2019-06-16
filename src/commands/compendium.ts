import { AwaitMessagesOptions, CollectorFilter, Message, TextBasedChannelFields, User } from "discord.js";
import { AddCommandMethod, BackgroundDisplay, capitalise, ClassDisplay, ClassFeatDisplay, Compendium, CompendiumDisplay, Context, DiscordDisplay, escapeStringForRegex, FeatDisplay, ICommandSet, Injector, ItemDisplay, MonsterDisplay, MonsterFeatDisplay, MonsterListDisplay, RaceDisplay, RuleDisplay, SpellDisplay, SpellListDisplay, SpellSlotDisplay, SubclassDisplay, UserConfig } from "../lib";
import { IStored, IStoredBackground, IStoredClass, IStoredClassFeature, IStoredFeat, IStoredItem, IStoredMonster, IStoredMonsterFeat, IStoredRace, IStoredRule, IStoredSpell, IStoredSubclass, SOURCE_JSON_TO_SHORT, SPELL_SCHOOL_DISPLAY, SPELL_SCHOOL_KEYS } from "../models";

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

	public async setUseEmbed(ctx: Context, useEmbed: boolean) {
		await Injector.get(UserConfig).setUserConfigKey(ctx.user.id, "useEmbed", useEmbed);
		await ctx.sendToChannel(`Ok, I'll now send you ${useEmbed ? "embeds" : "plain messages"} for search results`);
	}

	public async searchLevel(context: Context, type?: string) {
		const [ search, level ] = this.tryParseLevel(context.messageData) as [ string, number ];
		const match = await this.doSearch(context, search, type);
		if (!match) return;

		await context.sendToChannel(await this.getDisplay(context, match, level));
	}

	public async search(context: Context, type?: string) {
		const search: string = context.messageData;
		const match = await this.doSearch(context, search, type);
		if (!match) return;

		await context.sendToChannel(await this.getDisplay(context, match));
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
			await context.sendToChannel(await this.getDisplay(context, results[0]));
			return;
		}

		const display = new SpellListDisplay(results);
		const output = await this.useEmbed(context)
			? display.getEmbed(`Spells for ${search}`)
			: display.getText(`Spells for ${search}`);
		await context.sendToChannel(output);
	}

	public async searchSpellSlots(context: Context) {
		const [ search, level ] = this.tryParseLevel(context.messageData) as [ string, number ];
		const match = await this.doSearch(context, search, "class") as IStoredClass;
		if (!match) return;

		const display = new SpellSlotDisplay(match);
		const output = await this.useEmbed(context)
			? display.getEmbed(level)
			: display.getText(level);
		if (!output) return this.sendNotFound(context);

		await context.sendToChannel(output);
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
			await context.sendToChannel(await this.getDisplay(context, results[0]));
			return;
		}

		const display = new SpellListDisplay(results);
		const output = await this.useEmbed(context)
			? display.getEmbed(`${SPELL_SCHOOL_DISPLAY[school]} Spells`)
			: display.getText(`${SPELL_SCHOOL_DISPLAY[school]} Spells`);
		await context.sendToChannel(output);
	}

	public async searchMonsterList(context: Context) {
		const [ cr, ...search ] = context.args;
		const query: any = {};

		if (cr !== undefined) query.cr = cr;

		const results = await Injector.get(Compendium).search(search.join(" "), "monster", query, [["cr", 1], ["name", 1]]) as IStoredMonster[];
		if (results.length === 0) return this.sendNotFound(context);
		if (results.length === 1) {
			await context.sendToChannel(await this.getDisplay(context, results[0]));
			return;
		}

		const display = new MonsterListDisplay(results);
		const output = await this.useEmbed(context)
			? display.getEmbed(`Monsters for ${search}`)
			: display.getText(`Monsters for ${search}`);

		await context.sendToChannel(output);
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

	private async useEmbed(context: Context) {
		let useEmbed = await Injector.get(UserConfig).getUserConfigKey(context.user.id, "useEmbed");
		if (useEmbed === undefined) useEmbed = true;
		return useEmbed;
	}

	private async getDisplay(context: Context, match: IStored, level?: number) {
		const useEmbed = await this.useEmbed(context);
		return useEmbed
			? this.getEmbed(match, level)
			: this.getText(match, level);
	}

	private getDisplayClass(match: IStored, level?: number) {
		let display: CompendiumDisplay<IStored>;
		switch (match.compendiumType) {
			case "class":
				display = new ClassDisplay(match as IStoredClass, level);
				break;
			case "classfeat":
				display = new ClassFeatDisplay(match as IStoredClassFeature);
				break;
			case "subclass":
				display = new SubclassDisplay(match as IStoredSubclass, level);
				break;
			case "spell":
				display = new SpellDisplay(match as IStoredSpell);
				break;
			case "item":
				display = new ItemDisplay(match as IStoredItem);
				break;
			case "race":
				display = new RaceDisplay(match as IStoredRace);
				break;
			case "background":
				display = new BackgroundDisplay(match as IStoredBackground);
				break;
			case "feat":
				display = new FeatDisplay(match as IStoredFeat);
				break;
			case "monster":
				display = new MonsterDisplay(match as IStoredMonster);
				break;
			case "monsterfeat":
				display = new MonsterFeatDisplay(match as IStoredMonsterFeat);
				break;
			case "rule":
				display = new RuleDisplay(match as IStoredRule);
				break;
			default:
				throw new Error(`Cannot render unrecognised result type: ${match.compendiumType}`);
		}

		return display;
	}

	private getEmbed(match: IStored, level?: number) {
		const embed = this.getDisplayClass(match, level).getEmbed();

		if (!embed) throw new Error(`Unable to generate embed for item ${match.name}`);
		return embed;
	}

	private getText(match: IStored, level?: number) {
		const text = this.getDisplayClass(match, level).getText();

		if (!text) throw new Error(`Unable to generate render for item ${match.name}`);
		return text;
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
		let output;

		if (await this.useEmbed(context)) {
			output = CompendiumDisplay.embed
				.setTitle("Did You Mean...")
				.setDescription(this.formatOptions(results, page));
		} else {
			output = [
				"**Did You Mean...**",
				this.formatOptions(results, page),
			].join("\n");
		}

		const nextPage = results.length > ((page + 1) * pageCount);
		const prevPage = page > 0;

		const messages = await context.sendToChannel(output);

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
		addCommand("searchembed", (ctx) => compendiumCommands.setUseEmbed(ctx, true));
		addCommand("searchplain", (ctx) => compendiumCommands.setUseEmbed(ctx, false));
	},
};

export = commandSet;
