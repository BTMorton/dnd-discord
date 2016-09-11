// The data source for this bot is processed from the XML compendium at https://github.com/ceryliae/DnDAppFiles
// Download the full compendium XML and run data.js on it.
import { DiscordDisplay } from "./discordDisplay";
const mongodb: any = require("mongodb").MongoClient;
const Discord: any = require("discord.js");

class DiscordBot {
	private bot: any;
	private token: string = "MjIzOTA0NDIzMTU4NjExOTY5.CrYEcQ.qgxnK6gnJW1SmiPXt-KllCHzFpg";
	private display: DiscordDisplay;
	private prefix = "~";
	private db: any;
	private compendium: any;
	private validCommands: Array<string> = [ "beep", "hey", "ping", "spell", "spells", "item", "items", "class", "classes", "race", "races", "background", "backgrounds", "feat", "feats", "monster", "monsters", "search", "credit", "credits", "help", "m", "macro", "allhailverd", "allhailverdaniss", "allhailtumnus", "allhailtumnusb" ];
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
				case "feats":
					this.searchCompendium(message, args, "feat");
					break;
				case "monster":
				case "monsters":
					this.searchCompendium(message, args, "monster");
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
				this.sendMessages(message, doc.value.split("\n"));
			} else {
				message.reply("Sorry, I don't have a stored macro for `" + key + "` associated with your user.");
			}
		});
	}
	
	private searchCompendium(message: any, args: Array<string>, type?: string, level?: number): void {
		const search: string = args.join(" ");
		
		const query: any = { name: new RegExp("^" + search, "i") };
		
		if (type) {
			query.recordType = type;
		} else {
			level = null;
		}
		
		this.db.collection("compendium").find(query).limit(10).toArray().then((docs) => {
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
		
		const replies = [ ];
		const maxLength = 2000;
		
		while (reply.length > maxLength) {
			const index = reply.lastIndexOf(" ", maxLength);
			replies.push(reply.slice(0, index));
			reply = reply.slice(index + 1);
		}
		
		replies.push(reply);
		
		this.sendMessages(message, replies);
	}
	
	private sendMessages(message: any, replies: Array<string>): Promise<any> {
		if (replies.length > 0) {
			return message.channel.sendMessage(replies.shift()).then((msg) => {
				return this.sendMessages(message, replies);
			}).catch((err) => {
				message.reply("Sorry, something went wrong trying to post the spell reply. Please try again.");
				console.error(err.response.body.content);
			});
		}
	}
	
	private sendReplies(message: any, replies: Array<string>): Promise<any> {
		if (replies.length > 0) {
			return message.reply(replies.shift()).then((msg) => {
				return this.sendReplies(message, replies);
			}).catch((err) => {
				message.reply("Sorry, something went wrong trying to post the spell reply. Please try again.");
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
			"For further information on a class's level-specific details, use `~class classname level` (e.g. `~class bard 3`).\n\n" +
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
}

const bot: DiscordBot = new DiscordBot();

process.on("exit", () => {
	bot.kill();
})