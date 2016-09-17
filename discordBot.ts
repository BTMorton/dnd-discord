// The data source for this bot is processed from the XML compendium at https://github.com/ceryliae/DnDAppFiles
// Download the full compendium XML and run data.js on it.
import { DiscordDisplay } from "./discordDisplay";
const mongodb: any = require("mongodb").MongoClient;
const Discord: any = require("discord.js");

class DiscordBot {
	private bot: any;
	private token: string = "MjIzODE1MzIxMjg5NDkwNDMy.CrTaNQ.Rua8LpE3jHCmI9NqA_FFuVzcKVk";
	private display: DiscordDisplay;
	private prefix = "~";
	private db: any;
	private compendium: any;
	private validCommands: Array<string> = [ "beep", "hey", "ping", "spell", "spells", "item", "items", "class", "classes", "race", "races", "background", "backgrounds", "feat", "feature", "feats", "monster", "monsters", "search", "credit", "credits", "help", "m", "macro", "allhailverd", "allhailverdaniss", "allhailtumnus", "allhailtumnusb", "allhailpi", "allhailapplepi", "spelllist", "spellslist", "spelllists", "spellslots", "spellslot", "slots", "ability", "abilities" ];
	private pingCount: number = 0;
	
	constructor() {
		this.initDB().then(() => this.startBot()).then(() => {
			this.display = new DiscordDisplay();
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
		this.bot.login(this.token);
		
		return Promise.resolve(undefined);
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
			let args = message.content.slice(1).toLowerCase().split(" ").filter((s) => s);
			
			if (args.length === 0) {
				this.sendHelp(message);
				return;
			}
			
			const command: string = args.splice(0, 1)[0];
			
			if (this.validCommands.indexOf(command) == -1) {
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
					this.pingCount++;
					
					if (this.pingCount < 4) {
						message.reply(command == "hey" ? "ho" : command == "ping" ? "pong" : "boop");
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
					let level;
					
					if (!isNaN(args.slice(-1))) {
						level = parseInt(args.splice(-1), 10);
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
		}
	}
	
	private processMacro(message: any, args: Array<string>): void {
		if (args[0] == "set") {
			const splits = args.slice(1).join(" ").split("=");
			const key = splits[0].trim();
			const value = splits.slice(1).join("=").trim();
			
			this.saveMacro(message, key, value);
		} else {
			this.runMacro(message, args.join(" "));
		}
	}
	
	private saveMacro(message: any, key: string, value: string): void {
		this.db.collection('macros').findOneAndUpdate({ userId: message.author.id, key: key }, { userId: message.author.id, key: key, value: value }, { upsert: true }).then((result) => {
			message.reply("OK, I've " + (result.value ? "updated" : "set") + " that macro for you. Type `" + this.prefix + "m " + key + "` to run it.");
		});
	}
	
	private runMacro(message: any, key: string) {
		this.db.collection('macros').findOne({ userId: message.author.id, key: key }).then((doc) => {
			if (doc) {
				const macros = doc.value.split("\n");
				
				for (let macro of macros) {
					console.log(macro);
					if (macro[0] === this.prefix) {
						message.content = macro;
						this.processMessage(message);
					} else {
						this.sendMessages(message, macro);
					}
				}
			} else {
				message.reply("Sorry, I don't have a stored macro for `" + key + "` associated with your user.");
			}
		}).catch(() => {
			message.reply("Sorry, I don't have a stored macro for `" + key + "` associated with your user.");
		});
	}
	
	private searchCompendium(message: any, args: Array<string>, type?: string, level?: number): void {
		const search: string = this.escape(args.join(" "));
		
		const query: any = { name: new RegExp("^" + search, "i") };
		
		if (type) {
			query.recordType = type;
		} else {
			level = null;
		}
		
		this.db.collection("compendium").find(query).toArray().then((docs) => {
			if (docs.length == 0) {
				this.sendFailed(message);
			} else if (docs.length == 1) {
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
		return regex.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
	}
	
	private searchSpelllist(message: any, args: Array<string>) {
		const search: string = this.escape(args[0]);
		
		const query: any = { classes: new RegExp(search, "i"), recordType: "spell" };
		
		if (args[1]) {
			query.level = parseInt(args[1], 10);
		}
		
		this.db.collection("compendium").find(query).sort([["level", 1], ["name", 1]]).toArray().then((docs) => {
			if (docs.length == 0) {
				this.sendFailed(message);
			} else {
				let results = [];
				let currentLevel = -1;
				
				for (let spell of docs) {
					if (spell.level != currentLevel) {
						if (results.length > 0) {
							results.push("");
						}
						if (spell.level == 0) {
							results.push("**Cantrips (0 Level)**");
						} else {
							results.push("**" + (spell.level == 1 ? "1st" : (spell.level == 2 ? "2nd" : (spell.level == 3 ? "3rd" : spell.level+"th"))) + " Level**");
						}
						currentLevel = spell.level;
					}
					
					results.push(spell.name);
				}
				
				const replies = this.splitReply(results.join("\n"));
				
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
				const replies = this.splitReply(this.display.displaySpellSlots(doc.spellSlots, args[1] ? parseInt(args[1], 10) : null).join("\n"));
				
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
				const matches = [];
				let exactMatch;
				
				loop:
				for (let level in doc.levelFeatures) {
					for (let feat of doc.levelFeatures[level]) {
						if (feat.name.match(abilitySearch)) {
							feat.level = level;
							matches.push(feat);
							
							if (feat.name.toLowerCase() == ability) {
								exactMatch = feat;
								break loop;
							}
						}
					}
				}
				
				if (!exactMatch && matches.length == 1) {
					exactMatch = matches.length[0];
				}
				
				let display = [];
				
				if (exactMatch) {
					display.push("**" + exactMatch.name + "**");
					display.push("*" + doc.name + " - " + this.ordinal(exactMatch.level) + " level ability*");
					display = display.concat(exactMatch.text);
					
					const replies = this.splitReply(display.join("\n"));
					
					this.sendMessages(message, replies);
				} else {
					display.push("Did you mean one of:");
					
					for (let match of matches) {
						display.push(match.name + " *" + this.ordinal(match.level) + " level*");
					}
					
					const replies = this.splitReply(display.join("\n"));
					
					this.sendReplies(message, replies);
				}
				
			} else {
				message.reply("Sorry, the class " + doc.name + " has no spell slots.");
			}
		}).catch((e) => {
			this.sendFailed(message);
		});
	}
	
	private processOptions(message, docs) {
		let reply: string = "Did you mean one of:\n";
		
		for (let doc of docs) {
			reply += doc.name +" *" + doc.recordType + "*\n";
		}
		
		message.reply(reply);
	}
	
	private processMatch(message: any, doc: any, level?: number) {
		const type = doc.recordType;
		delete doc.recordType;
		delete doc._id;
		
		let reply: string = "";
		
		if (type == "class" && level !== null) {
			reply = this.display.displayClass(doc, level);
		} else {
			reply = this.display.display(doc, type);
		}
		
		const replies = this.splitReply(reply);
		
		this.sendMessages(message, replies);
	}
	
	private splitReply(reply: string): Array<string> {
		const replies = [ ];
		const maxLength = 2000;
		
		while (reply.length > maxLength) {
			const index = reply.lastIndexOf(" ", maxLength);
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
	}
	
	private sendFailed(message: any) {
		message.reply("Sorry, I couldn't find any information matching your query");
	}
	
	private onReady(): void {
		console.log("Let's play... Dungeons & Dragons!")
	}
	
	private sendHelp(message: any): void {
		message.reply("To search the full data source run `" + this.prefix + "search query`. This will return a list of matches that you can further query.\n" +
			"To be more specific you can use `" + this.prefix + "item`, `" + this.prefix + "race`, `" + this.prefix + "feat`, `" + this.prefix + "spell`, `" +
			this.prefix + "class`, `" + this.prefix + "monster`, or `" + this.prefix + "background`.\n" +
			"For further information on a class's level-specific details, use `~class classname level` (e.g. `~class bard 3`).\n" +
			"To show a class's spell slots, use `~slots classname [optional: level]` (e.g. `~slots bard 3`).\n" +
			"To show a class's spell list, use `~spelllist classname [optional: level]` (e.g. `~spelllist bard 3`).\n" +
			"To search class's abilites, use `~ability classname query` (e.g. `~ability barbarian rage`).\n\n" +
			"To use macros, you must first set the command by using `~macro set macro name=macro expression`. This can then be recalled using `~macro macro name` and I will reply 'macro expression'.\n" +
			"Macros are user-specific so they will only run when you use them. You can also use the shorthand `~m`.");
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
		const inserts = [].concat(this.compendium.item, this.compendium.feat, this.compendium.class, this.compendium.race, this.compendium.spell, this.compendium.monster, this.compendium.background);
		
		const col = this.db.collection("compendium");
		
		return col.remove({}).then(() => {
			return col.insertMany(inserts).then(() => {
				return this.db.collection("metadata").insertOne({ "_id": "version", "version": this.compendium.version }).then(() => {
					console.log("Database updated");
					delete this.compendium;
				})
			});
		});
	}
	
	private loadCompendium(): void {
		this.compendium = require("./compendium.json");
	}
	
	private ordinal(num: number): string {
		const s = num % 100;
		
		if (s > 3 && s < 21) return num + "th";
		
		switch (s % 10){
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
})