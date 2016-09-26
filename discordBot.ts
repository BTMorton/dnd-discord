// The data source for this bot is processed from the XML compendium at https://github.com/ceryliae/DnDAppFiles
// Download the full compendium XML and run data.js on it.
import { DiscordDisplay } from "./discordDisplay";
import { DiceRoller } from "./diceRoller";
const mongodb: any = require("mongodb").MongoClient;
const Discord: any = require("discord.js");

class DiscordBot {
	private bot: any;
	private token: string = process.env.DISCORD_TOKEN;
	private display: DiscordDisplay;
	private roller: DiceRoller;
	private prefix = "~";
	private db: any;
	private compendium: any;
	private validCommands: Array<string> = [
		"r", "roll", "rollstats",
		"beep", "hey", "ding", "ping",
		"spell", "spells",
		"item", "items",
		"class", "classes",
		"race", "races",
		"background", "backgrounds",
		"feat", "feature", "feats",
		"monster", "monsters",
		"search",
		"credit", "credits",
		"help",
		"m", "macro",
		"allhailverd", "allhailverdaniss",
		"allhailtumnus", "allhailtumnusb",
		"allhailpi", "allhailapplepi",
		"spelllist", "spellslist", "spelllists",
		"spellslots", "spellslot", "slots",
		"ability", "abilities"
	];
	private pingCount: number = 0;
	private processingMacro: boolean = false;
	private reconnectAttempts: number = 0;
	private reconnectAttemptLimit: number = 10;
	private reconnectTimeout: any;
	private inlineRoll: RegExp = /\[\[[^\]]+\]\]/g;

	constructor() {
		this.initDB().then(() => this.startBot()).then(() => {
			this.display = new DiscordDisplay();
			this.roller = new DiceRoller();
		}).catch((err) => {
			console.error("There was an error trying to intialise the bot");
			console.error(err);
			this.kill();
		});
	}

	public kill(): void {
		if (this.bot) {
			this.bot.destroy();
		}

		if (this.db) {
			this.db.close();
		}
	}

	private startBot(): Promise<void> {
		this.bot = new Discord.Client();
		this.bot.on("ready", this.onReady.bind(this));
		this.bot.on("message", this.processMessage.bind(this));
		this.bot.on("error", (error) => {
			console.error(error);
			this.attemptReconnect();
		});
		this.bot.on("reconnecting", () => {
			console.error("The bot is attempting to reconnect...");
		});
		this.bot.on("disconnect", (error) => {
			console.error("The bot was disconnected. Attempting to reconnect...");
			this.attemptReconnect();
		});
		this.bot.login(this.token);

		return Promise.resolve(undefined);
	}

	private attemptReconnect() {
		if (this.reconnectAttempts >= this.reconnectAttemptLimit) {
			return process.exit(-1);
		}

		if (!this.reconnectTimeout) {
			this.reconnectTimeout = setTimeout(() => {
				this.reconnectTimeout = null;
				this.reconnectAttempts++;
				this.bot.login(this.token);
			}, 1000 * this.reconnectAttempts);
		}
	}

	private processMessage(message: any): void {
		if (message.author.bot) {
			return;
		}

		if (message.content === "MURICA") {
			message.channel.sendMessage("FUCK YEAH!");
			return;
		}

		if (message.content[0] === this.prefix) {
			const args: Array<string> = message.content.slice(1).toLowerCase().split(" ").filter((s) => s);

			if (args.length === 0) {
				this.sendHelp(message);
				return;
			}

			const command: string = args.splice(0, 1)[0];

			if (this.validCommands.indexOf(command) === -1) {
				this.sendInvalid(message);
				return;
			}

			if (["beep", "hey", "ping"].indexOf(command) == -1) {
				this.pingCount = 0;
			}

			switch (command) {
				case "beep":
				case "hey":
				case "ping":
				case "ding":
					this.pingCount++;

					if (this.pingCount < 4) {
						message.reply(command == "hey" ? "ho" : command == "ping" ? "pong" : command == "ding" ? "dong" : "boop");
					} else if (this.pingCount == 4) {
						message.reply("stfu");
					} else if (this.pingCount == 6) {
						message.reply("seriously stfu!");
					} else if (this.pingCount == 10) {
						message.reply("SHUT. UP.");
					}
					break;
				case "spell":
				case "spells":
					this.searchCompendium(message, args, "spell");
					break;
				case "item":
				case "items":
					this.searchCompendium(message, args, "item");
					break;
				case "class":
				case "classes":
					let level: number | undefined = undefined;

					if (!isNaN(parseInt(args.slice(-1)[0], 10))) {
						level = parseInt(args.splice(-1)[0], 10);
					}

					this.searchCompendium(message, args, "class", level);
					break;
				case "race":
				case "races":
					this.searchCompendium(message, args, "race");
					break;
				case "background":
				case "backgrounds":
					this.searchCompendium(message, args, "background");
					break;
				case "feat":
				case "feature":
				case "feats":
					this.searchCompendium(message, args, "feat");
					break;
				case "monster":
				case "monsters":
					this.searchCompendium(message, args, "monster");
					break;
				case "spelllist":
				case "spellslist":
				case "spelllists":
					this.searchSpelllist(message, args);
					break;
				case "spellslots":
				case "spellslot":
				case "slots":
					this.searchSpellslots(message, args);
					break;
				case "ability":
				case "abilities":
					this.searchAbilities(message, args);
					break;
				case "search":
					this.searchCompendium(message, args);
					break;
				case "credit":
				case "credits":
					this.sendCredits(message);
					break;
				case "help":
					this.sendHelp(message);
					break;
				case "m":
				case "macro":
					this.processMacro(message, args);
					break;
				case "r":
				case "roll":
					this.processRoll(message, args.join(" "));
					break;
				case "rollstats":
					this.processMultiRoll(message, ["4d6d", "4d6d", "4d6d", "4d6d", "4d6d", "4d6d"]);
					break;
				case "allhailverd":
				case "allhailverdaniss":
					message.channel.sendMessage("All bow before Verdaniss, for he is both wise and mighty!");
					break;
				case "allhailtumnus":
				case "allhailtumnusb":
					message.channel.sendMessage("Yeah, I guess, I mean some people are into that kinda thing...");
					break;
				case "allhailpi":
				case "allhailapplepi":
					message.channel.sendMessage("ahahahahahahahahahahahahahaha");

					setTimeout(() => {
						message.channel.sendMessage("haha");

						setTimeout(() => {
							message.channel.sendMessage("ha");

							setTimeout(() => {
								message.channel.sendMessage("Wait, you weren't serious, were you?");
							}, 5000);
						}, 1000);
					}, 1000);
					break;
				default:
					this.sendInvalid(message);
			}

			return;
		}

		// if (message.content.match(/^\/r(oll)? /i)) {
		// 	this.processRoll(message, message.content.replace(/^\/r(oll)? /i, "").trim());
		// 	return;
		// }

		const matches = message.content.match(this.inlineRoll);

		if (matches && matches.length > 0) {
			const diceRolls: Array<string> = [];

			for (let match of matches) {
				let diceString = match.slice(2, -2);

				if (diceString.indexOf(":") >= 0) {
					const flavour = diceString.slice(0, diceString.indexOf(":")).trim();
					diceString = diceString.slice(diceString.indexOf(":") + 1).trim() + " " + flavour;
				}

				diceRolls.push(diceString);
			}

			this.processMultiRoll(message, diceRolls);

			return;
		}
	}

	private processMacro(message: any, args: Array<string>): void {
		if (this.processingMacro) return;

		if (args[0] === "set") {
			const splits: Array<string> = args.slice(1).join(" ").split("=");
			const key: string = splits[0].trim();
			const value: string = splits.slice(1).join("=").trim();

			this.saveMacro(message, key, value);
		} else if (args[0] === "list") {
			this.listMacros(message);
		} else if (args[0] === "del") {
			this.removeMacro(message, args[1]);
		} else {
			this.runMacro(message, args.join(" "));
		}
	}

	private processRoll(message: any, roll: string) {
		try {
			const reply = this.roller.rollDice(roll);

			this.sendMessages(message, this.splitReply(reply));
		} catch (e) {
			// console.error(e);
			message.reply("Sorry, I was unable to complete the roll: " + roll);
		}
	}

	private processMultiRoll(message: any, rolls: Array<string>) {
		const rollResults: Array<string> = [];

		for (let roll of rolls) {
			try {
				const reply = this.roller.rollDice(roll);

				rollResults.push(reply);
			} catch (e) {
				// console.error(e);
				rollResults.push("Sorry, I was unable to complete the roll: " + roll);
			}
		}

		const reply = rollResults.join("\n");
		this.sendMessages(message, this.splitReply(reply));
	}

	private saveMacro(message: any, key: string, value: string): void {
		this.db.collection("macros").findOneAndUpdate({ userId: message.author.id, key: key }, { userId: message.author.id, key: key, value: value }, { upsert: true }).then((result) => {
			message.reply("OK, I've " + (result.value ? "updated" : "set") + " that macro for you. Type `" + this.prefix + "m " + key + "` to run it.");
		});
	}

	private runMacro(message: any, key: string) {
		this.db.collection("macros").findOne({ userId: message.author.id, key: key }).then((doc) => {
			if (doc) {
				const macros: Array<string> = doc.value.split("\n");

				this.processingMacro = true;

				for (let macro of macros) {
					if (macro[0] === this.prefix) {
						message.content = macro;

						this.processMessage(message);
					} else {
						this.sendMessages(message, this.splitReply(macro));

						if (macro.match(this.inlineRoll)) {
							message.content = macro;

							this.processMessage(message);
						}
					}
				}

				this.processingMacro = false;
			} else {
				message.reply("Sorry, I don't have a stored macro for `" + key + "` associated with your user.");
			}
		}).catch(() => {
			message.reply("Sorry, I don't have a stored macro for `" + key + "` associated with your user.");
			this.processingMacro = false;
		});
	}

	private listMacros(message: any) {
		this.db.collection("macros").find({ userId: message.author.id }).toArray().then((docs) => {
			if (docs.length > 0) {
				const replies: Array<string> = [];

				replies.push("I have the following macros stored for your user:");

				for (let macro of docs) {
					replies.push("**" + macro.key + "** = " + macro.value);
				}

				this.sendReplies(message, this.splitReply(replies.join("\n")));
			} else {
				message.reply("Sorry, I don't have any stored macros associated with your user.");
			}
		}).catch(() => {
			message.reply("Sorry, I don't have any stored macros associated with your user.");
		});
	}

	private removeMacro(message: any, key: string) {
		this.db.collection("macros").findOneAndDelete({ userId: message.author.id, key: key }).then((result) => {
			console.log(result);
			if (result.value) {
				message.reply("I have removes the macro for `" + key + "` associated with your user.");
			} else {
				message.reply("Sorry, I don't have a stored macro for `" + key + "` associated with your user.");
			}
		}).catch(() => {
			message.reply("Sorry, I don't have a stored macro for `" + key + "` associated with your user.");
			this.processingMacro = false;
		});
	}

	private searchCompendium(message: any, args: Array<string>, type?: string, level?: number): void {
		const search: string = args.join(" ");

		const query: any = { name: new RegExp("^" + this.escape(search), "i") };

		if (type) {
			query.recordType = type;
		} else {
			level = undefined;
		}

		this.db.collection("compendium").find(query).toArray().then((docs) => {
			if (docs.length === 0) {
				this.sendFailed(message);
			} else if (docs.length === 1) {
				this.processMatch(message, docs[0], level);
			} else {
				for (let doc of docs) {
					if (doc.name.toLowerCase() === search) {
						this.processMatch(message, doc, level);
						return;
					}
				}

				this.processOptions(message, docs);
			}
		}).catch(() => {
			this.sendFailed(message);
		});
	}

	private escape(regex: string): string {
		return regex.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
	}

	private searchSpelllist(message: any, args: Array<string>) {
		const search: string = this.escape(args[0]);
		const query: any = { classes: new RegExp(search, "i"), recordType: "spell" };

		if (args[1]) {
			query.level = parseInt(args[1], 10);
		}

		this.db.collection("compendium").find(query).sort([["level", 1], ["name", 1]]).toArray().then((docs) => {
			if (docs.length === 0) {
				this.sendFailed(message);
			} else {
				let results: Array<string> = [];
				let currentLevel: number = -1;

				for (let spell of docs) {
					if (spell.level != currentLevel) {
						if (results.length > 0) {
							results.push("");
						}
						if (spell.level == 0) {
							results.push("**Cantrips (0 Level)**");
						} else {
							results.push("**" + this.ordinal(spell.level) + " Level**");
						}
						currentLevel = spell.level;
					}

					results.push(spell.name);
				}

				const replies: Array<string> = this.splitReply(results.join("\n"));

				this.sendMessages(message, replies);
			}
		}).catch((e) => {
			this.sendFailed(message);
			console.log(e);
		});
	}

	private searchSpellslots(message: any, args: Array<string>) {
		const search: string = this.escape(args[0]);

		const query: any = { name: new RegExp(search, "i"), recordType: "class" };

		this.db.collection("compendium").findOne(query).then((doc) => {
			if (doc.hasOwnProperty("spellSlots")) {
				const replies: Array<string> = this.splitReply(this.display.displaySpellSlots(doc.spellSlots, args[1] ? parseInt(args[1], 10) : undefined).join("\n"));

				this.sendMessages(message, replies);
			} else {
				message.reply("Sorry, the class " + doc.name + " has no spell slots.");
			}
		}).catch((e) => {
			this.sendFailed(message);
		});
	}

	private searchAbilities(message: any, args: Array<string>) {
		const search: string = this.escape(args[0]);

		const query: any = { name: new RegExp(search, "i"), recordType: "class" };
		const ability: string = args.slice(1).join(" ");
		const abilitySearch: RegExp = new RegExp(this.escape(ability), "i");

		this.db.collection("compendium").findOne(query).then((doc) => {
			if (doc.hasOwnProperty("levelFeatures")) {
				const matches: Array<any> = [];
				let exactMatch: any;

				loop:
				for (let level in doc.levelFeatures) {
					for (let feat of doc.levelFeatures[level]) {
						if (feat.name.match(abilitySearch)) {
							feat.level = level;
							matches.push(feat);

							if (feat.name.toLowerCase() === ability) {
								exactMatch = feat;
								break loop;
							}
						}
					}
				}

				if (matches.length === 0) {
					message.reply("Sorry, I could not find any abilities for " + doc.name + " matching your query");
					return;
				} else {
					if (!exactMatch && matches.length === 1) {
						exactMatch = matches.length[0];
					}

					let display: Array<string> = [];

					if (exactMatch) {
						display.push("**" + exactMatch.name + "**");
						display.push("*" + doc.name + " - " + this.ordinal(exactMatch.level) + " level ability*");
						display = display.concat(exactMatch.text);

						const replies: Array<string> = this.splitReply(display.join("\n"));

						this.sendMessages(message, replies);
					} else {
						display.push("Did you mean one of:");

						for (let match of matches) {
							display.push(match.name + " *" + this.ordinal(match.level) + " level*");
						}

						const replies: Array<string> = this.splitReply(display.join("\n"));

						this.sendReplies(message, replies);
					}
				}
			} else {
				message.reply("Sorry, the class " + doc.name + " has no abilities.");
			}
		}).catch((e) => {
			this.sendFailed(message);
		});
	}

	private processOptions(message, docs) {
		let reply: string = "Did you mean one of:\n";

		for (let doc of docs) {
			reply += doc.name + " *" + doc.recordType + "*\n";
		}

		message.reply(reply);
	}

	private processMatch(message: any, doc: any, level?: number) {
		const type: string = doc.recordType;
		delete doc.recordType;
		delete doc._id;

		let reply: string = "";

		if (type === "class" && level !== null) {
			reply = this.display.displayClass(doc, level);
		} else {
			reply = this.display.display(doc, type);
		}

		const replies: Array<string> = this.splitReply(reply);

		this.sendMessages(message, replies);
	}

	private splitReply(reply: string): Array<string> {
		const replies: Array<string> = [ ];
		const maxLength: number = 2000;

		while (reply.length > maxLength) {
			const index: number = reply.lastIndexOf(" ", maxLength);
			replies.push(reply.slice(0, index));
			reply = reply.slice(index + 1);
		}

		replies.push(reply);

		return replies;
	}

	private sendMessages(message: any, replies: Array<string>): Promise<any> {
		if (replies.length > 0) {
			return message.channel.sendMessage(replies.shift()).then((msg) => {
				return this.sendMessages(message, replies);
			}).catch((err) => {
				message.reply("Sorry, something went wrong trying to post the reply. Please try again.");
				console.error(err.response.body.content);
			});
		}

		return Promise.resolve(undefined);
	}

	private sendReplies(message: any, replies: Array<string>): Promise<any> {
		if (replies.length > 0) {
			return message.reply(replies.shift()).then((msg) => {
				return this.sendReplies(message, replies);
			}).catch((err) => {
				message.reply("Sorry, something went wrong trying to post the reply. Please try again.");
				console.error(err.response.body.content);
			});
		}

		return Promise.resolve(undefined);
	}

	private sendFailed(message: any) {
		message.reply("Sorry, I couldn't find any information matching your query");
	}

	private onReady(): void {
		console.log("Let's play... Dungeons & Dragons!");
	}

	private sendHelp(message: any): void {
		const reply: string = [
			"To search the full data source run `" + this.prefix + "search query`. This will return a list of matches that you can further query.",
			"To be more specific you can use `" + this.prefix + "item`, `" + this.prefix + "race`, `" + this.prefix + "feat`, `" + this.prefix + "spell`, `" +
			this.prefix + "class`, `" + this.prefix + "monster`, or `" + this.prefix + "background`.",
			"For further information on a class's level-specific details, use `" + this.prefix + "class classname level` (e.g. `" + this.prefix + "class bard 3`).",
			"To show a class's spell slots, use `" + this.prefix + "slots classname [optional: level]` (e.g. `" + this.prefix + "slots bard 3`).",
			"To show a class's spell list, use `" + this.prefix + "spelllist classname [optional: level]` (e.g. `" + this.prefix + "spelllist bard 3`).",
			"To search class's abilites, use `" + this.prefix + "ability classname query` (e.g. `" + this.prefix + "ability barbarian rage`).",
			"",
			"To use macros, you must first set the command by using `" + this.prefix + "macro set macro name=macro expression`. This can then be recalled using `" + this.prefix + "macro macro name` and I will reply 'macro expression'.",
			"Macros are user-specific so they will only run when you use them. You can also use the shorthand `" + this.prefix + "m`.",
			"",
			"This bot supports the roll20 dice format for rolls (https://wiki.roll20.net/Dice_Reference). To roll type `" + this.prefix + "r diceString` or `" + this.prefix + "roll diceString [optional: label]` (e.g. `" + this.prefix + "r 1d20 + 5 Perception`).",
			"You can also do inline rolls with `[[diceString]]` or `[[label: diceString]]` (e.g `[[Perception: 1d20+5]]`)",
		].join("\n");

		this.sendReplies(message, this.splitReply(reply));
	}

	private sendCredits(message: any): void {
		message.channel.sendMessage("This D&D Spell & Monster Discord Bot was built with love by Discord users Verdaniss#3529 and TumnusB#4019. " +
			"The data source for this bot is processed from the XML compendium at https://github.com/ceryliae/DnDAppFiles");
	}

	private sendInvalid(message: any): void {
		message.reply("Sorry, I don't recognise that command");
	}

	private initDB(): Promise<void> {
		return mongodb.connect("mongodb://localhost:27017/discordBot").then((db: any) => {
			this.db = db;

			return this.checkDBVersion();
		});
	}

	private checkDBVersion(): Promise<void> {
		this.loadCompendium();

		return this.db.collection("metadata").findOne({ "_id": "version" }).then((doc) => {
			if (!doc) {
				return this.updateDB();
			}

			if (this.compendium.version !== doc.version) {
				return this.updateDB();
			}

			delete this.compendium;
		});
	}

	private updateDB(): Promise<void> {
		if (!this.compendium) {
			this.loadCompendium();
		}

		console.log("Updating database");
		const inserts: Array<any> = [].concat(this.compendium.item, this.compendium.feat, this.compendium.class, this.compendium.race, this.compendium.spell, this.compendium.monster, this.compendium.background);

		const col: any = this.db.collection("compendium");

		return col.remove({}).then(() => {
			return col.insertMany(inserts).then(() => {
				return this.db.collection("metadata").findOneAndUpdate({ "_id": "version"}, { "_id": "version", "version": this.compendium.version }, { upsert: true }).then(() => {
					console.log("Database updated");
					delete this.compendium;
				});
			});
		});
	}

	private loadCompendium(): void {
		this.compendium = require("./compendium.json");
	}

	private ordinal(num: number): string {
		const s: number = num % 100;

		if (s > 3 && s < 21) return num + "th";

		switch (s % 10) {
			case 1: return num + "st";
			case 2: return num + "nd";
			case 3: return num + "rd";
			default: return num + "th";
		}
	}
}

const bot: DiscordBot = new DiscordBot();

process.on("exit", () => {
	bot.kill();
});