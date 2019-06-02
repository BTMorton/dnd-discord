import { AwaitMessagesOptions, CollectorFilter, Message, User } from "discord.js";
import { AddCommandMethod, Context, Database, DiscordDisplay, escapeStringForRegex, ICommandSet, Injector } from "../lib";

interface IAwaitedReplyResponse {
	message: Message;
	item: any;
}

let lastUserId = "";
const CONST_MULTI_REPLY_PROMPT = "Did you mean one of:";
const CONST_AWAIT_REPLY_PROMPT = "If the item you are looking for is in the list, reply with the number.";
const CONST_DISCORD_DISPLAY: DiscordDisplay = new DiscordDisplay();
const CONST_SPELL_SCHOOLS: { [type: string]: string } = {
	A: "Abjuration",
	C: "Conjuration",
	D: "Divination",
	EN: "Enchantment",
	EV: "Evocation",
	I: "Illusion",
	N: "Necromancy",
	T: "Transmutation",
};

const commandSet: ICommandSet = {
	loadCommands(addCommand: AddCommandMethod) {
		addCommand("spells", searchCompendium.bind(null, "spell"), { aliases: ["spell", "sp"] });
		addCommand("items", searchCompendium.bind(null, "item"), { aliases: ["item", "it"] });
		addCommand("class", searchCompendium.bind(null, "class"), { aliases: ["classes", "cl"] });
		addCommand("races", searchCompendium.bind(null, "race"), { aliases: ["race", "ra"] });
		addCommand("rules", searchCompendium.bind(null, "rule"), { aliases: ["rule", "ru"] });
		addCommand("backgrounds", searchCompendium.bind(null, "background"), { aliases: ["background", "bg"] });
		addCommand("feats", searchCompendium.bind(null, "feat"), { aliases: ["feat", "ft", "feature"] });
		addCommand("monsters", searchCompendium.bind(null, "monster"), { aliases: ["monster", "mon"] });
		addCommand("monsterslist", searchMonsterList, { aliases: ["monsterlist"] });
		addCommand("spelllist", searchSpelllist, { aliases: ["spelllists", "spellslist", "spellist"] });
		addCommand("spellslot", searchSpellslots, { aliases: ["spellslots", "slots"] });
		addCommand("spellschool", searchSpellSchools, { aliases: ["spellschools", "schools"] });
		addCommand("monsterfeat", searchMonsterAbilities, { aliases: ["mfeat", "monsterability", "mability"] });
		addCommand("ability", searchAbilities, { aliases: ["abilities", "classfeat", "ab", "cft"] });
		addCommand("search", searchCompendium.bind(null, ""));
	},
};

export = commandSet;

async function searchCompendium(type: string, context: Context): Promise<void> {
	let search: string = context.messageData;
	let level: number | undefined;

	if (type === "class") {
		const searchParts: string[] = search.split(" ");

		if (!isNaN(parseInt(searchParts.slice(-1)[0], 10))) {
			level = parseInt(searchParts.splice(-1)[0], 10);
			search = searchParts.join(" ");
		}
	}

	if (search.length <= 0) {
		context.reply("Please enter a search query.");
		return;
	}

	const searchRegexs: RegExp[] = search.split(" ").map((str: string) => new RegExp("^" + str.replace(/[^\w]/g, ""), "i"));

	const query: any = {
		$or: [
			{ name: new RegExp("^" + escapeStringForRegex(search), "i") },
			{ searchString: new RegExp("^" + search.replace(/[^\w]/g, "")) },
			{ $and: searchRegexs.map((regexp: RegExp) => ({ searchStrings: regexp })) },
		],
	};

	if (type) {
		query.recordType = type;
	}

	const DB = Injector.get(Database);
	const collection = await DB.getCollection("compendium");
	const docs = await collection.find(query).toArray();

	if (docs.length === 0) {
		return sendNotFound(context);
	}

	if (docs.length === 1) {
		await processMatch(context, docs[0], level);
	} else {
		for (const doc of docs) {
			if (doc.name.toLowerCase() === search) {
				await processMatch(context, doc, level);
				return;
			}
		}

		await processOptions(context, docs);
	}
}

async function searchSpellSchools(context: Context): Promise<void> {
	const args: string[] = context.args;
	const schoolSearch = escapeStringForRegex(args.shift() || "");
	const schoolRegExp = new RegExp(schoolSearch, "i");
	let school = "";

	for (const key in CONST_SPELL_SCHOOLS) {
		if (schoolRegExp.test(CONST_SPELL_SCHOOLS[key])) {
			school = key;
			break;
		}
	}

	if (!school) {
		await sendNotFound(context);
		return;
	}

	let level = args.shift() || "";

	if (isNaN(parseInt(level || "NaN", 10))) {
		args.unshift(level);
		level = "";
	}

	const search: string = escapeStringForRegex(args.join(" "));
	const query: any = {
		recordType: "spell",
		school,
	};

	if (level) { query.level = parseInt(level, 10); }
	if (search) { query.name = RegExp(search, "i"); }

	const DB = Injector.get(Database);
	const collection = await DB.getCollection("compendium");
	const docs = await collection.find(query).sort([["level", 1], ["name", 1]]).toArray();

	if (docs.length === 0) {
		return sendNotFound(context);
	}

	const results: string[] = [];
	let currentLevel = -1;

	for (const spell of docs) {
		if (spell.level !== currentLevel) {
			if (results.length > 0) {
				results.push("");
			}
			if (spell.level === 0) {
				results.push("**Cantrips (0 Level)**");
			} else {
				results.push("**" + ordinal(spell.level) + " Level**");
			}
			currentLevel = spell.level;
		}

		results.push(spell.name + " - *" + spell.classes + "*");
	}

	await sendLongReplies(context, results);
}

async function searchSpelllist(context: Context) {
	const args: string[] = context.args;
	const query: any = { recordType: "spell" };
	let level: number | null = null;
	let search: string | null = null;

	if (isNaN(parseInt(args[0], 10))) {
		search = escapeStringForRegex(args[0]);

		if (args[1]) {
			level = parseInt(args[1], 10);
		}
	} else {
		level = parseInt(args[0], 10);
	}

	if (search != null) { query.classes = new RegExp(search, "i"); }
	if (level != null) { query.level = level; }

	const DB = Injector.get(Database);
	const collection = await DB.getCollection("compendium");
	const docs = await collection.find(query).sort([["level", 1], ["name", 1]]).toArray();

	if (docs.length === 0) {
		return sendNotFound(context);
	}

	const results: string[] = [];
	let currentLevel = -1;

	for (const spell of docs) {
		if (spell.level !== currentLevel) {
			if (results.length > 0) {
				results.push("");
			}
			if (spell.level === 0) {
				results.push("**Cantrips (0 Level)**");
			} else {
				results.push(`**${ordinal(spell.level)} Level**`);
			}
			currentLevel = spell.level;
		}

		const spellSchool: string = spell.school ? CONST_SPELL_SCHOOLS[spell.school] : "";
		results.push(spell.name + (spellSchool ? " - *" + spellSchool + "*" : ""));
	}

	await sendLongReplies(context, results);
}

async function searchSpellslots(context: Context) {
	const args: string[] = context.args;
	const search: string = escapeStringForRegex(args[0]);

	const query: any = { $or: [{ name: new RegExp("^" + escapeStringForRegex(search), "i") }, { searchString: new RegExp("^" + search.replace(/[^\w]/g, "")) }], recordType: "class" };

	const DB = Injector.get(Database);
	const collection = await DB.getCollection("compendium");

	let doc;
	try {
		doc = await collection.findOne(query);
	} catch (_) {
		return sendNotFound(context);
	}

	if ("spellSlots" in doc) {
		const reply: string = CONST_DISCORD_DISPLAY.displaySpellSlots(doc.spellSlots, args[1] ? parseInt(args[1], 10) : undefined).join("\n");

		await context.sendToChannel(reply);
	} else {
		await context.reply(`Sorry, the class ${doc.name} has no spell slots.`);
	}
}

async function searchAbilities(context: Context) {
	const classSearch: string = escapeStringForRegex(context.args[0]);
	const fullSearch: string = context.messageData;

	const query: any = { $or: [{ name: new RegExp("^" + escapeStringForRegex(classSearch), "i") }, { searchString: new RegExp("^" + classSearch.replace(/[^\w]/g, "")) }], recordType: "class" };
	const ability: string = context.args.slice(1).join(" ");

	const DB = Injector.get(Database);
	const collection = await DB.getCollection("compendium");
	const doc = await collection.findOne(query);

	if (doc) {
		return handleFoundClassForAbilitySearch(context, ability, doc);
	}

	const altQuery: any = {
		$where: `function() {
			if (obj.levelFeatures) {
				for (var i = 1; i <= 20; i++) {
					if (obj.levelFeatures[i]) {
						for (var j = 0; j < obj.levelFeatures[i].length; j++) {
							if (obj.levelFeatures[i][j].name.match(/${escapeStringForRegex(fullSearch)}/i)) {
								return true;
							}
						}
					}
				}
			}
			return false;
		}`.replace(/\s+/g, " "),
		recordType: "class",
	};

	const subDoc = await collection.findOne(altQuery);
	if (subDoc) {
		return handleFoundClassForAbilitySearch(context, fullSearch, subDoc);
	}

	await sendNotFound(context);
}

async function handleFoundClassForAbilitySearch(context: Context, ability: string, doc: any) {
	const abilitySearch: RegExp = new RegExp(escapeStringForRegex(ability), "i");

	if (!("levelFeatures" in doc)) {
		await context.reply("Sorry, the class " + doc.name + " has no abilities.");
		return;
	}

	const matches: any[] = [];
	let exactMatch: any;

	loop:
	for (const level in doc.levelFeatures) {
		if (!(level in doc.levelFeatures)) continue;

		for (const feat of doc.levelFeatures[level]) {
			if (feat.name.match(abilitySearch) || feat.name.replace(/[^\w]/g, "").indexOf(ability.replace(/[^\w]/g, "")) >= 0) {
				feat.level = level;
				matches.push(feat);

				if (feat.name.toLowerCase() === ability) {
					exactMatch = feat;
					break loop;
				} else if (feat.name.indexOf(":") >= 0) {
					const shortName: string = feat.name.split(":")[1].trim();

					if (shortName.toLowerCase() === ability) {
						exactMatch = feat;
						break loop;
					}
				}
			}
		}
	}

	if (matches.length === 0) {
		await context.reply("Sorry, I could not find any abilities for " + doc.name + " matching your query");
		return;
	}

	if (!exactMatch && matches.length === 1) {
		exactMatch = matches[0];
	}

	let display: string[] = [];
	const formatMatch = (match: any) => {
		display.push("**" + match.name + "**");
		display.push("*" + doc.name + " - " + ordinal(match.level) + " level ability*");
		display = display.concat(match.text);

		return display.join("\n");
	};

	if (exactMatch) {
		await context.sendToChannel(formatMatch(exactMatch));
	} else {
		const response = await replyOptions(context, (match) => match.name + " *" + ordinal(match.level) + " level*", matches);
		if (!response) return;

		await response.message.channel.send(formatMatch(response.item));
	}
}

async function searchMonsterAbilities(context: Context) {
	const search: string = context.messageData;
	const searchRegexp: RegExp = new RegExp("^" + escapeStringForRegex(search), "i");

	const query: any = { $or: [{ "trait.name": searchRegexp }, { "action.name": searchRegexp }, { "reaction.name": searchRegexp }, { "legendary.name": searchRegexp }], recordType: "monster" };
	const project = { "trait.name": 1, "trait.text": 1, "action.name": 1, "action.text": 1, "reaction.name": 1, "reaction.text": 1, "legendary.name": 1, "legendary.text": 1, "name": 1 };

	const DB = Injector.get(Database);
	const collection = await DB.getCollection("compendium");
	const docs = await collection.find(query).project(project).toArray();

	if (docs.length === 0) {
		return sendNotFound(context);
	}

	const matches: any = {};
	const matchMonsters: any = {};
	const matchNames: string[] = [];
	let exactMatch: any;

	for (const doc of docs) {
		const options: any[] = [].concat(doc.trait, doc.action, doc.legendary, doc.reaction).filter((t) => !!t);

		for (const trait of options) {
			if (searchRegexp.test(trait.name)) {
				if (!matchNames.includes(trait.name)) {
					matchNames.push(trait.name);
					matches[trait.name] = trait;
					matchMonsters[trait.name] = [];

					if (trait.name.toLowerCase() === search) {
						exactMatch = trait;
					}
				}

				matchMonsters[trait.name].push(doc.name);
			}
		}
	}

	if (matchNames.length === 0) {
		await context.reply("Sorry, I could not find any monster abilities matching your query");
		return;
	}

	if (!exactMatch && matchNames.length === 1) {
		exactMatch = matches[matchNames[0]];
	}

	const display: string[] = [];
	const formatMatch = (match: any) => {
		display.push("**" + match.name + "**");
		display.push(match.text);

		display.push("");

		display.push("*Found In:* " + matchMonsters[match.name].join(", "));

		return display.join("\n");
	};

	if (exactMatch) {
		await context.sendToChannel(formatMatch(exactMatch));
	} else {
		const response = await replyOptions(context, (m) => m, matchNames);
		if (!response) return;

		await response.message.channel.send(formatMatch(matches[response.item]));
	}
}

async function searchMonsterList(context: Context) {
	const rating: string | undefined = context.args[0];
	const query: any = { recordType: "monster" };
	let cr: string | number = "";

	if (rating !== undefined) {
		if (rating.indexOf("/") < 0) {
			cr = parseInt( rating as string, 10);
		} else {
			cr = rating;
		}
	}

	if ((typeof cr === "string" && cr !== "") || (typeof cr === "number" && !isNaN(cr))) {
		query.cr = cr;
	} else if (rating !== undefined) {
		await context.reply("You entered an invalid monster challenge rating.");
		return;
	}

	const DB = Injector.get(Database);
	const collection = await DB.getCollection("compendium");
	const docs = await collection.find(query).sort([["cr", 1], ["name", 1]]).toArray();

	if (docs.length === 0) {
		return sendNotFound(context);
	}

	const results: string[] = [];
	let currentRating = "";

	for (const monster of docs) {
		if (monster.cr !== currentRating) {
			if (results.length > 0) {
				results.push("");
			}

			results.push("**Challenge Rating " + monster.cr + "**");
			currentRating = monster.cr;
		}

		const type = monster.type.split(",")[0].trim();

		results.push(monster.name + ", " + type);
	}

	const reply: string = results.join("\n");

	if ("cr" in query) {
		await context.sendToChannel(reply);
	} else {
		await context.sendPM(reply);
	}
}

async function processOptions(context: Context, docs: any[]) {
	const response = await replyOptions(context, (doc) => doc.name + " *" + doc.recordType + "*", docs);
	if (!response) return;

	const responseContext = new Context(response.message, context.channelPrefix);
	processMatch(responseContext, response.item);
}

async function replyOptions(context: Context, formatter: (_: any) => string, docs: any[]) {
	const options: string[] = docs.map((doc, i) => `${i + 1}: ${formatter(doc)}`);
	const maxLength = 1900 - CONST_AWAIT_REPLY_PROMPT.length;
	let reply = CONST_MULTI_REPLY_PROMPT + "\n";
	let index = 0;

	while (index < options.length && reply.length < maxLength) {
		reply += options[index++] + "\n";
	}

	const replyPrompt = reply + "\n" + CONST_AWAIT_REPLY_PROMPT;
	const responsePromise = context.reply(replyPrompt);

	const respondedWith = await getMessageFrom(responsePromise);
	if (!respondedWith) return;

	return awaitReply(respondedWith, context.user, docs, reply);
}

async function getMessageFrom(promise: Promise<Message[]>) {
	const messages = await promise;
	if (messages.length === 0) return undefined;

	return messages.pop() as Message;
}

async function awaitReply(message: Message, user: User, docs: any[], fallback?: string) {
	const filter: CollectorFilter = (m: Message) => {
		const index = (parseInt(m.content, 10) || 0) - 1;
		return m.author.id === user.id && index >= 0 && index < docs.length;
	};

	const options: AwaitMessagesOptions = {
		errors: ["time"],
		maxMatches: 1,
		time: 60000,
	};

	try {
		const collected = await message.channel.awaitMessages(filter, options);
		const response: Message = collected.first();
		const index = (parseInt(response.content, 10) || 0) - 1;

		if (index < 0 || index >= docs.length) return;

		const promises: Array<Promise<any>> = [];
		if (response.deletable) promises.push(response.delete());
		if (message.deletable) promises.push(message.delete());
		await Promise.all(promises);

		return {
			item: docs[index],
			message: response,
		} as IAwaitedReplyResponse;
	} catch (_) {
		if (fallback) {
			await message.edit(fallback);
		}
	}
}

async function processMatch(context: Context, doc: any, level?: number) {
	const type: string = doc.recordType;
	delete doc.recordType;
	delete doc._id;

	let reply = "";

	if (type === "class" && level !== undefined) {
		reply = CONST_DISCORD_DISPLAY.displayClass(doc, level);
	} else {
		reply = CONST_DISCORD_DISPLAY.display(doc, type);
	}

	await sendLongReplies(context, [reply]);
}

async function sendNotFound(context: Context) {
	await context.reply("Sorry, I couldn't find any information matching your query.");
}

function ordinal(num: number): string {
	const s: number = num % 100;

	if (s > 3 && s < 21) return num + "th";

	switch (s % 10) {
		case 1: return num + "st";
		case 2: return num + "nd";
		case 3: return num + "rd";
		default: return num + "th";
	}
}

async function sendLongReplies(context: Context, replies: string[]) {
	const reply = replies.join("\n");
	if (reply.length >= 2000 || replies.length > 50) {
		await tooLongReply(context);
		await context.sendPM(reply);
	} else {
		await context.sendToChannel(reply);
	}
}

async function tooLongReply(context: Context) {
	if (context.channel.type === "dm") {
		return;
	}

	if (lastUserId !== context.user.id) {
		await context.reply("The output from your command was too long, so I have sent you a direct message with the contents.");
	}

	lastUserId = context.user.id;
}
