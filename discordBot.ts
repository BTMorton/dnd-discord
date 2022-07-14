// The data source for this bot is processed from the XML compendium at https://github.com/ceryliae/DnDAppFiles
// Download the full compendium XML and run data.js on it.
import { DiscordDisplay } from "./discordDisplay";
import { DiceRoller } from "./diceRoller";
import { VillainGenerator } from "./villain";
import { MongoClient as mongodb, Db } from "mongodb";
import { GuildChannel, TextChannel, Client, Message, User, Collection, AwaitMessagesOptions, CollectorFilter, Guild, RichEmbed, Role, CategoryChannel, PermissionOverwrites, Channel } from "discord.js";

interface IAwaitedReplyResponse {
	message: Message;
	item: any;
}

function isTextChannel(c: Channel): c is TextChannel {
	return c.type === "text";
}

// function isGuildChannel(c: Channel): c is GuildChannel {
// 	return ["text", "voice", "category"].includes(c.type);
// }

const CONST_MUTE_MAGE_ID = "232401294399111170";
const CREATOR_IDS: string[] = ["113046787283030016", "166248485786615808"];
const ISSUE_CHANNEL_ID = "309061456048160778";
const FEAT_CHANNEL_ID = "379286312307654666";
const FEEDBACK_CHANNEL_ID = "379293116907257856";
const BOT_DEBUG_CHANNEL_ID = "584455733781987333";
const BOT_SERVER_ID = "223813892332060672";
const MUTE_MAGE_HELPERS_ROLE_ID = "232620671790743552";
const MUTE_MAGE_BOT_ROLE_ID = "232594809926189058";
const MUTE_MAGE_OWDM_ROLE_ID = "376838160493314048";
const MUTE_MAGE_WMDM_ROLE_ID = "281275770557431808";
const MUTE_MAGE_DM_ROLE_ID = "234635573808070656";
const MUTE_MAGE_ROGUEMODE_ROLE_ID = "236501592701009920";
const MUTE_MAGE_EVERYONE_ROLE_ID = "232401294399111170";
const MUTE_MAGE_SPECTATOR_ROLE_ID = "510946568329756672";
const CONST_MAX_MULTIROLL_COUNT = 50;
const MUTE_MAGE_GRIM_LOG_CHANNEL = "438683515064680458";
const CONST_MUTE_MAGE_DIVIDER_CHANNEL = "370221981020323840";
const MUTE_MAGE_Reports_ID = "989042338775040020"

const CONST_MUTE_MAGE_ROOT_CHANNELS = [
	"232404448943538176",	// welcome
	"236965875289292800",	// announcements
	"232401738563452928",	// open-game-list
	"324132737814626305",	// lfg-posts
	"232862074370260995",	// lfg-discussion
	"232401294399111170",	// general
	"232401426104582144",	// player-chat
	"232401446019137546",	// dm-chat
	"379439864132665344",	// art
	"405396996904452116",	// book-talk
	"391715036177104906",	// serious-talk
	"427951233056374788",	// food-talk
	"237695436729745409",	// nsfw-memes-nsfw
	"236170895993995265",	// bot-playpen
	"377910760807989248",	// project-mute-sheet
	"263847732110819329",	// nerds-only
	"438683515064680458",	// grim-log
	"989042338775040020",   // reports - (automod)
];

const MM_WM_CATEGORY_IDS = [
	"370204037162729472",	//  West Marches
	"438398505997041664",	//  WM Adventures
];
const MM_OW_CATEGORY_IDS = [
	"376852465171038208",	//  Orc Wars
];
const MM_OWRC_CATEGORY_IDS = [
	"377593269175189504",	//  Orcs Only!
];

const channelUpdateMessages: string[] = [];
let channelUpdateLogTimeout: any;

class DiscordBot {
	private static CONST_MULTI_REPLY_PROMPT: string = "Did you mean one of:";
	private static CONST_AWAIT_REPLY_PROMPT: string = "If the item you are looking for is in the list, reply with the number.";
	private bot: Client;
	private token: string = process.env.DISCORD_TOKEN;
	private display: DiscordDisplay = new DiscordDisplay();
	private roller: DiceRoller = new DiceRoller();
	private defaultPrefix = "/";
	private db: Db;
	private compendium: any;
	private enablePingFunk: boolean = false;
	private enablePingUser: boolean = false;
	private validCommands: string[] = [
		"r", "roll", "rollstats", "multiroll", "multi",
		"beep", "hey", "ding", "ping",
		"spell", "spells",
		"item", "items",
		"class", "classes",
		"race", "races",
		"rule", "rules",
		"background", "backgrounds",
		"feat", "feature", "feats",
		"monster", "monsters",
		"monsterlist", "monsterslist",
		"search",
		"credit", "credits",
		"help",
		"m", "macro",
		"allhailverd", "allhailverdaniss",
		"allhailfunk", "allhailfunkenspine",
		"allhailtumnus", "allhailtumnusb",
		"allhailpi", "allhailapplepi",
		"allhailspider", "allhailkawaiispider",
		"allhailteemu",
		"spelllist", "spellslist", "spelllists", "spellist",
		"spellslots", "spellslot", "slots",
		"spellschools", "spellschool", "schools",
		"ability", "abilities", "classfeat",
		"setprefix",
		"genname",
		"bbeg",
		"table", "tables",
		"sortchannel", "oldchannel",
		"sortchannels", "oldchannels", "oldroles",
		"mfeat", "monsterfeat", "mability", "monsterability",
		"createchannels", "wm_createchannels", "ow_createchannels", "deletechannels",
		"createchannel", "wm_createchannel", "ow_createchannel", "deletechannel",
		"giveme", "roguemode", "rougemode", "lfg", "westmarch", "westmarches", "orcwars", "criticalrole", "dm",
		"spectate", "spectator",
		"enablepingfunk", "disablepingfunk", "togglepingfunk", "pingfunk", "pingofthefunk", "pfunk",
		"enablepinguser", "disablepinguser", "togglepinguser", "pinguser",
		// "test",
		"got", "gameofthrones", "avengers",
		"code", "say", "kill",
		"reportissue", "featurerequest", "feedback",
		"bugcheck",
	];
	private validRoles = ["roguemode", "rougemode", "roletest", "lfg!", "westmarches", "ow_general", "criticalrole", "dm", "spectator", "game-of-thrones-spoilers", "avengers-spoilers"];
	private schools: { [type: string]: string } = {
		"EV": "Evocation",
		"T": "Transmutation",
		"A": "Abjuration",
		"I": "Illusion",
		"N": "Necromancy",
		"C": "Conjuration",
		"EN": "Enchantment",
		"D": "Divination",
	};
	private pingCount: number = 0;
	private processingMacro: boolean = false;
	private reconnectAttempts: number = 0;
	private reconnectAttemptLimit: number = 10;
	private reconnectTimeout: any;
	private inlineRoll: RegExp = /\[\[[^\]]+\]\]/g;
	private lastUserId: string|number = 0;
	private serverPrefixes: Map<string, string> = new Map<string, string>();
	private dmPrefixes: Map<string, string> = new Map<string, string>();
	private sortingChannels: Set<string> = new Set<string>();
	private doingChannelSort: Set<string> = new Set<string>();
	private alive: boolean = false;

	constructor() {
		this.initDB().then(() => this.startBot()).then(() => {
			this.alive = true;
		}).catch((err: Error) => {
			console.error("There was an error trying to intialise the bot");
			console.error(err.message);
			this.kill();
		});
	}

	public kill(): void {
		if (!this.alive) {
			return;
		}

		if (this.bot) {
			this.bot.destroy();
		}

		if (this.db) {
			this.db.close();
		}

		this.alive = false;

		process.exit();
	}

	public logError(errorMessage: string) {
		return this.sendErrorLog(errorMessage);
	}

	private startBot(): Promise<string> {
		this.bot = new Client();
		this.bot.on("ready", this.onReady.bind(this));
		this.bot.on("message", this.processMessage.bind(this));
		this.bot.on("channelUpdate", this.channelUpdate.bind(this));

		this.bot.on("guildMemberAdd", async (member) => {
			if (member.guild.id !== CONST_MUTE_MAGE_ID) { return; }
			if (!/(twit(ter|ch)|discord)\.[a-z]{2,3}\//i.test(member.user.username)) { return; }
			try {
				await member.ban({ days: 1, reason: "Suspected bot user account." });
				this.sendMMLog(`Banned user ${member.user} as a suspected bot user account.`);
			} catch (e) {
				this.sendMMLog(`<@&232403207962230785> - Unable to ban user ${member.user} as a suspected bot user account. Error: ${e.message}`);
			}
		});

		this.bot.on("error", (error: Error) => {
			console.error(error);
		});

		this.bot.on("reconnecting", () => {
			console.error("The bot is attempting to reconnect...");

			if (this.reconnectTimeout) {
				clearTimeout(this.reconnectTimeout);
				this.reconnectTimeout = null;
			}
		});

		this.bot.on("disconnect", () => {
			console.error("The bot was disconnected. Attempting to reconnect...");
			this.attemptReconnect();
		});

		return this.bot.login(this.token);
	}

	private channelUpdate(oldChannel: TextChannel, newChannel: TextChannel): void {
		if (!newChannel.hasOwnProperty("guild") || !newChannel.hasOwnProperty("position")) { return; }
		if (oldChannel.position === newChannel.position) { return; }

		const guild = newChannel.guild;
		if (guild.id !== CONST_MUTE_MAGE_ID) { return; }
		if (this.sortingChannels.has(guild.id)) { return; }

		channelUpdateMessages.push(`${oldChannel} moved from ${oldChannel.position} to ${newChannel.position}`);

		if (channelUpdateLogTimeout) {
			clearTimeout(channelUpdateLogTimeout);
		}

		channelUpdateLogTimeout = setTimeout(() => {
			this.sendMMLog(`Found ${channelUpdateMessages.length} updated channels:\n` + channelUpdateMessages.join("\n"));
			channelUpdateMessages.splice(0);
			channelUpdateLogTimeout = null;
		}, 2000);
	}

	private attemptReconnect() {
		if (this.reconnectAttempts >= this.reconnectAttemptLimit) {
			return process.exit(-1);
		}

		if (!this.reconnectTimeout) {
			this.reconnectTimeout = setTimeout(() => {
				this.reconnectTimeout = null;
				this.reconnectAttempts++;
				this.bot.login(this.token).catch((e: Error) => {
					console.error("Unable to login", e.message);
					this.attemptReconnect();
				});
			}, 1000 * this.reconnectAttempts);
		}
	}

	private getPrefix(message: Message): string {
		if (message.channel.type === "text") {
			const server = message.guild.id;

			if (!this.serverPrefixes.has(server)) {
				this.serverPrefixes.set(server, this.defaultPrefix);
			}

			return this.serverPrefixes.get(server) as string;
		} else {
			const channel = message.channel.id;

			if (!this.dmPrefixes.has(channel)) {
				this.dmPrefixes.set(channel, this.defaultPrefix);
			}

			return this.dmPrefixes.get(channel) as string;
		}
	}

	private handleSetPrefix(message: Message, prefix: string) {
		if (!prefix) {
			message.reply("You need to specify a valid prefix.");
			return;
		}

		if (message.channel.type === "text") {
			message.guild.fetchMember(message.author).then((guildMember) => {
				if (guildMember && guildMember.hasPermission("MANAGE_GUILD")) {
					this.serverPrefixes.set(message.guild.id, prefix);

					this.db.collection("serverPrefixes").update({"server": message.guild.id}, {"server": message.guild.id, "prefix": prefix}, {upsert: true}).then(() => {
						message.reply("OK, I have updated this server's command prefix to `" + prefix + "`.");
					});
				} else {
					message.reply("Sorry, you don't have permission to do that.");
				}
			});
		} else {
			this.dmPrefixes.set(message.channel.id, prefix);

			this.db.collection("dmPrefixes").update({"channel": message.channel.id}, {"channel": message.channel.id, "prefix": prefix}, {upsert: true}).then(() => {
				message.reply("OK, I have updated this server's command prefix to `" + prefix + "`.");
			});
		}
	}

	private canManageChannels(message: Message): Promise<void> {
		return message.guild.fetchMember(message.author).then((guildMember) => {
			if (!guildMember || !guildMember.hasPermission("MANAGE_CHANNELS")) {
				console.error("User ", guildMember.nickname, " attempted to perform an administrative action without permission.");
				throw new Error("Does not have channel management permissions");
			}
		});
	}

	private isWMDM(message: Message): Promise<void> {
		return message.guild.fetchMember(message.author).then((guildMember) => {
			if (!guildMember || (!guildMember.roles.has(MUTE_MAGE_WMDM_ROLE_ID) && !guildMember.roles.has(MUTE_MAGE_HELPERS_ROLE_ID))) {
				console.error("User ", guildMember.nickname, " attempted to perform a WM DM action without permission.");
				throw new Error("Does not have west marches DM role");
			}
		});
	}

	private isOWDM(message: Message): Promise<void> {
		return message.guild.fetchMember(message.author).then((guildMember) => {
			if (!guildMember || (!guildMember.roles.has(MUTE_MAGE_OWDM_ROLE_ID) && !guildMember.roles.has(MUTE_MAGE_HELPERS_ROLE_ID))) {
				console.error("User ", guildMember.nickname, " attempted to perform an OW DM action without permission.");
				throw new Error("Does not have orc wars DM role");
			}
		});
	}

	private processMessage(message: Message): void {
		if (message.author.bot) {
			return;
		}

		if (message.content === "MURICA") {
			message.channel.send("FUCK YEAH!");
			return;
		}

		const prefix = this.getPrefix(message);

		const regex = new RegExp("^" + this.escape(prefix) + "\\w");

		if (message.content.match(regex)) {
			const args: string[] = message.content.slice(prefix.length).toLowerCase().split(/\s+/).filter((s: string) => s);

			if (args.length === 0) {
				this.sendHelp(message);
				return;
			}

			const command: string = (args.shift() as string);

			if (!(this.validCommands.includes(command))) {
				this.sendInvalid(message);
				return;
			}

			if (!["beep", "hey", "ping"].includes(command)) {
				this.pingCount = 0;
			}

			const content: string = message.content.slice(prefix.length + command.length).trim();

			switch (command) {
				case "beep":
				case "hey":
				case "ping":
				case "ding":
					this.pingCount++;

					if (this.pingCount < 4) {
						message.reply(command === "hey" ? "ho" : command === "ping" ? "pong" : command === "ding" ? "dong" : "boop");
					} else if (this.pingCount === 4) {
						message.reply("stfu");
					} else if (this.pingCount === 6) {
						message.reply("seriously stfu!");
					} else if (this.pingCount === 10) {
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
				case "rule":
				case "rules":
					this.searchCompendium(message, args, "rule");
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
				case "monsterlist":
				case "monsterslist":
					let rating: string | undefined = undefined;

					if (args[0]) {
						rating = args[0];
					}

					this.searchMonsterList(message, rating);
					break;
				case "spelllist":
				case "spellslist":
				case "spelllists":
				case "spellist":
					this.searchSpelllist(message, args);
					break;
				case "spellslots":
				case "spellslot":
				case "slots":
					this.searchSpellslots(message, args);
					break;
				case "spellschools":
				case "spellschool":
				case "schools":
					this.searchSpellSchools(message, args);
					break;
				case "mfeat":
				case "monsterfeat":
				case "mability":
				case "monsterability":
					this.searchMonsterAbilities(message, args);
					break;
				case "ability":
				case "abilities":
				case "classfeat":
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
				case "multiroll":
				case "multi":
					const countStr = args.shift() || "";
					let count = parseInt(countStr, 10);

					if (Number.isNaN(count)) {
						this.sendReplies(message, "I was unable to process the number: " + countStr + ". Rolling once...");
						count = 1;
					}

					this.processMultiRoll(message, count, args.join(" "));
					break;
				case "rollstats":
					this.rollStats(message, args[0]);
					break;
				case "table":
				case "tables":
					this.processTable(message, args);
					break;
				case "giveme":
					this.addRole(message, args[0]);
					break;
				case "westmarch":
					this.addRole(message, "westmarches");
					break;
				case "westmarches":
					this.addRole(message, "westmarches");
					break;
				case "orcwars":
					this.addRole(message, "ow_general");
					break;
				case "roguemode":
					this.addRole(message, "roguemode");
					break;
				case "rougemode":
					this.addRole(message, "rougemode");
					break;
				case "spectate":
				case "spectator":
					this.spectate(message, args[0]);
					break;
				case "lfg":
					this.addRole(message, "lfg!");
					break;
				case "criticalrole":
					this.addRole(message, "criticalrole");
					break;
				case "got":
				case "gameofthrones":
					this.addRole(message, "game-of-thrones-spoilers");
					break;
				case "avengers":
					this.addRole(message, "avengers-spoilers");
					break;
				case "dm":
					this.addRole(message, "dm");
					break;
				case "allhailverd":
				case "allhailverdaniss":
					message.channel.send("All bow before Verdaniss, for he is both wise and mighty!");
					break;
				case "allhailtumnus":
				case "allhailtumnusb":
					message.channel.send("Yeah, I guess, I mean some people are into that kinda thing...");
					break;
				case "allhailfunk":
                case "allhailfunkenspine":
                    const apocId = "467422229542731778";
                    if (message.author.id === apocId) {
                        message.channel.send("Fuck you, Apoc");
                        return;
                    }

					const funkId = "93963201586139136";
					message.channel.send("Hmm... should I ping Funk?");
					const randomNumber = Math.floor(Math.random() * 100000);

					setTimeout(() => {
						if (randomNumber === 0) {
							message.channel.send("Yes! Hey <@" + funkId + ">");
						} else if (randomNumber < 50000) {
							message.channel.send("Maybe....");

							setTimeout(() => {
								if (randomNumber === 1) {
									message.channel.send("Yes! Hey <@" + funkId + ">");
								} else {
									message.channel.send("Nahhh");
								}
							}, 2000);
						} else {
							message.channel.send("Nahhh");
						}
					}, 2000);
					break;
				case "allhailspider":
				case "allhailkawaiispider":
					message.channel.send("For some reason, KawaiiSpider thought it would be a good idea to ask for her own `" + prefix + "allhail`...");

					setTimeout(() => {
						message.channel.send("I mean seriously?");

						setTimeout(() => {
							message.channel.send("HAHAHAHAHA!");

							setTimeout(() => {
								message.channel.send("I mean, what did you expect would happen?");

								setTimeout(() => {
									message.channel.send("ARE YOU HAPPY NOW?!?!?");
								}, 5000);
							}, 1000);
						}, 1000);
					}, 1000);
					break;
				case "allhailpi":
				case "allhailapplepi":
					message.channel.send("ahahahahahahahahahahahahahaha");

					setTimeout(() => {
						message.channel.send("haha");

						setTimeout(() => {
							message.channel.send("ha");

							setTimeout(() => {
								message.channel.send("Wait, you weren't serious, were you?");
							}, 5000);
						}, 1000);
					}, 1000);
					break;
				case "allhailteemu":
					message.channel.send("Teemu used BANHAMMER");

					setTimeout(() => {
						message.channel.send("It wasn't very effective...");
					}, 5000);
					break;
				case "enablepingfunk":
					this.togglePingFunk(message, true);
					break;
				case "disablepingfunk":
					this.togglePingFunk(message, false);
					break;
				case "togglepingfunk":
					this.togglePingFunk(message);
					break;
				case "pingfunk":
				case "pingofthefunk":
				case "pfunk":
					this.pingFunk(message);
					break;
				case "enablepinguser":
					this.togglePingUser(message, true);
					break;
				case "disablepinguser":
					this.togglePingUser(message, false);
					break;
				case "togglepinguser":
					this.togglePingUser(message);
					break;
				case "pinguser":
					this.pingUser(message, args[0]);
					break;
				case "setprefix":
					this.handleSetPrefix(message, args[0]);
					break;
				case "genname":
					this.generateRandomName(message);
					break;
				case "bbeg":
					this.generateVillain(message, args.join(" "));
					break;
				case "sortchannels":
				case "sortchannel":
					this.canManageChannels(message).then(
						() => this.sortChannels(message).catch((e: Error) => this.sendError(message, e)),
						(e) => { console.error(e); this.sendInvalid(message); },
					);
					break;
				case "oldchannels":
				case "oldchannel":
					this.canManageChannels(message).then(
						() => this.listOldChannels(message).catch((e) => this.sendError(message, e)),
						(e) => { console.error(e); this.sendInvalid(message); },
					);
					break;
				case "oldroles":
					this.canManageChannels(message).then(
						() => this.listOldRoles(message).catch((e) => this.sendError(message, e)),
						(e) => { console.error(e); this.sendInvalid(message); },
					);
					break;
				case "createchannel":
				case "createchannels":
					this.canManageChannels(message).then(
						() => this.createChannel(message, args).catch((e) => this.sendError(message, e)),
						(e) => { console.error(e); this.sendInvalid(message); },
					);
					break;
				case "deletechannel":
				case "deletechannels":
					this.canManageChannels(message).then(
						() => this.deleteChannel(message).catch((e) => this.sendError(message, e)),
						(e) => { console.error(e); this.sendInvalid(message); },
					);
					break;
				case "wm_createchannel":
				case "wm_createchannels":
					this.isWMDM(message).then(
						() => this.wmCreateChannel(message, args).catch((e) => this.sendError(message, e)),
						(e) => { console.error(e); this.sendInvalid(message); },
					);
					break;
				case "ow_createchannel":
				case "ow_createchannels":
					this.isOWDM(message).then(
						() => this.owCreateChannel(message, args).catch((e) => this.sendError(message, e)),
						(e) => { console.error(e); this.sendInvalid(message); },
					);
					break;
				case "test":
					this.sendTestMessage(message);
					break;
				case "code":
					this.runCode(message, args.join(" "));
					break;
				case "kill":
					if (!CREATOR_IDS.includes(message.author.id)) {
						this.sendInvalid(message);
					} else {
						this.kill();
					}
					break;
				case "say":
					this.doSay(message);
					break;
				case "reportissue":
					this.sendFeedback(message, ISSUE_CHANNEL_ID, content);
					break;
				case "featurerequest":
					this.sendFeedback(message, FEAT_CHANNEL_ID, content);
					break;
				case "feedback":
					this.sendFeedback(message, FEEDBACK_CHANNEL_ID, content);
					break;
				case "bugcheck":
					const channelName: string = message.channel.type === "dm" ? message.author.username + " DM" : (message.channel as GuildChannel).name;

					message.channel.send("bugresponse").then(() => {
						// tslint:disable-next-line:no-console
						console.log("Successfully sent bugcheck message to channel " + channelName);
					}).catch((e) => {
						console.error("Failed to send bugcheck message to channel " + channelName, e);
					});
					break;
				default:
					this.sendInvalid(message);
			}

			return;
		}

		if (message.guild.id === CONST_MUTE_MAGE_ID) { return; }

		const matches = message.content.match(this.inlineRoll);

		if (matches && matches.length > 0) {
			const rollResults: string[] = [];

			for (let match of matches) {
				let diceString = match.slice(2, -2);

				if (diceString.indexOf(":") >= 0) {
					const flavour = diceString.slice(0, diceString.indexOf(":")).trim();
					diceString = diceString.slice(diceString.indexOf(":") + 1).trim() + " " + flavour;
				}

				try {
					const reply = this.roller.rollDice(diceString);

					rollResults.push(reply);
				} catch (e) {
					rollResults.push("Sorry, I was unable to complete the roll: " + diceString);
				}
			}

			const reply = rollResults.join("\n");
			this.sendMessages(message, reply);
		}
	}

	private processMacro(message: Message, args: string[]): void {
		if (this.processingMacro) return;

		if (args[0] === "set") {
			const splits: string[] = args.slice(1).join(" ").split("=");
			const key: string = splits[0].trim();
			const value: string = splits.slice(1).join("=").trim();

			this.saveMacro(message, key, value);
		} else if (args[0] === "list") {
			this.listMacros(message);
		} else if (args[0] === "del") {
			this.removeMacro(message, args.slice(1).join(" "));
		} else {
			this.runMacro(message, args.join(" "));
		}
	}

	private processTable(message: Message, args: string[]): void {
		switch (args[0]) {
			case "create":
				this.createTable(message, args.slice(1));
				break;
			case "add":
				this.addToTable(message, args.slice(1));
				break;
			case "name":
				this.setTableName(message, args.slice(1));
				break;
			case "view":
				this.viewTable(message, args.slice(1).join(" "));
				break;
			case "list":
				this.listTables(message);
				break;
			case "del":
			case "delete":
			case "remove":
				this.deleteTable(message, args.slice(1).join(" "));
				break;
			case "roll":
				this.rollTable(message, args.slice(1).join(" "));
				break;
			case "share":
				switch (args[1]) {
					case "here":
						this.shareTableChannel(message, args.slice(2).join(" "));
						break;
					case "global":
						this.shareTableGlobal(message, args.slice(2).join(" "));
						break;
					case "server":
						this.shareTableGuild(message, args.slice(2).join(" "));
						break;
					default:
						this.sendReplies(message, "Sorry, I can't share with " + args[1]);
						break;
				}
				break;
			case "sharewith":
				this.shareTableMentions(message, args.slice(1));
				break;
			case "unshare":
				switch (args[1]) {
					case "here":
						this.unshareTableChannel(message, args.slice(2).join(" "));
						break;
					case "global":
						this.unshareTableGlobal(message, args.slice(2).join(" "));
						break;
					case "server":
						this.unshareTableGuild(message, args.slice(2).join(" "));
						break;
					default:
						this.sendReplies(message, "Sorry, I can't share with " + args[1]);
						break;
				}
				break;
			case "unsharewith":
				this.unshareTableMentions(message, args.slice(1));
				break;
			default:
				this.rollTable(message, args.join(" "));
				break;
		}
	}

	private processRoll(message: Message, roll: string) {
		try {
			const reply = this.roller.rollDice(roll);

			this.sendMessages(message, reply);
		} catch (e) {
			message.reply("Sorry, I was unable to complete the roll: " + roll);
		}
	}

	private rollStats(message: Message, diceRoll: string) {
		if (!diceRoll) {
			diceRoll = "4d6d";
		}

		return this.processMultiRoll(message, 6, diceRoll);
	}

	private processMultiRoll(message: Message, count: number, rollFormat: string) {
		const rollResults: string[] = [];

		if (count > CONST_MAX_MULTIROLL_COUNT) {
			return this.sendReplies(message, "Nope. That's too many. I'm not going to let you abuse me anymore!");
		}

		for (let i = 0; i < count; i++) {
			try {
				const reply = this.roller.rollDice(rollFormat);

				rollResults.push(reply);
			} catch (e) {
				rollResults.push("Sorry, I was unable to complete the roll: " + rollFormat);
				break;
			}
		}

		const reply = rollResults.join("\n");
		this.sendMessages(message, reply);
	}

	private saveMacro(message: Message, key: string, value: string): void {
		const prefix = this.getPrefix(message);

		this.db.collection("macros").findOneAndUpdate({ key: key, userId: message.author.id }, { key: key, userId: message.author.id, value: value }, { upsert: true }).then((result: any) => {
			message.reply("OK, I've " + (result.value ? "updated" : "set") + " that macro for you. Type `" + prefix + "m " + key + "` to run it.");
		});
	}

	private runMacro(message: Message, key: string) {
		const prefix = this.getPrefix(message);

		this.db.collection("macros").findOne({ key: key, userId: message.author.id }).then((doc: any) => {
			if (doc) {
				const macros: string[] = doc.value.split("\n");

				this.processingMacro = true;

				for (let macro of macros) {
					if (macro[0] === prefix) {
						message.content = macro;

						this.processMessage(message);
					} else {
						this.sendMessages(message, macro);

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

	private listMacros(message: Message) {
		this.db.collection("macros").find({ userId: message.author.id }).toArray().then((docs: Array<any>) => {
			if (docs.length > 0) {
				const replies: string[] = [];

				replies.push("I have the following macros stored for your user:");

				for (let macro of docs) {
					replies.push("**" + macro.key + "** = " + macro.value);
				}

				this.sendReplies(message, replies.join("\n"));
			} else {
				message.reply("Sorry, I don't have any stored macros associated with your user.");
			}
		}).catch(() => {
			message.reply("Sorry, I don't have any stored macros associated with your user.");
		});
	}

	private removeMacro(message: Message, key: string) {
		this.db.collection("macros").findOneAndDelete({ key: key, userId: message.author.id }).then((result: any) => {
			if (result.value) {
				message.reply("I have removed the macro for `" + key + "` associated with your user.");
			} else {
				message.reply("Sorry, I don't have a stored macro for `" + key + "` associated with your user.");
			}
		}).catch(() => {
			message.reply("Sorry, I don't have a stored macro for `" + key + "` associated with your user.");
			this.processingMacro = false;
		});
	}

	private generateTableQuery(message: Message, name?: string) {
		const query: any = { $or: [ { global: true }, { channels: message.channel.id }, { users: message.author.id }, { user: message.author.id } ] };

		if (message.guild) {
			query.$or.push({ guilds: message.guild.id });
		}

		if (name) {
			return { $and: [ { name: name }, query ] };
		} else {
			return query;
		}
	}

	private createTable(message: Message, args: string[]): void {
		let tableCount = 1;

		if (args.length > 0) {
			const tableNumber = parseInt(args[0], 10);

			if (!isNaN(tableNumber)) {
				tableCount = tableNumber;

				args = args.slice(1);
			}
		}

		const tableName = args.join(" ");

		const newTable: any = {
			channels: [],
			count: tableCount,
			global: false,
			guilds: [],
			name: tableName,
			rolls: [],
			user: message.author.id,
			users: [],
		};

		for (let i = 0; i < tableCount; i++) {
			newTable.rolls.push({
				name: "",
				roll: i,
				values: [],
			});
		}

		const query: any = { name: tableName };
		let shouldUpdate = true;

		this.db.collection("tables").findOne(query).then((doc: any) => {
			if (doc) {
				shouldUpdate = false;
			}
		}).catch(() => undefined).then(() => {
			if (shouldUpdate) {
				return this.db.collection("tables").insertOne(newTable).then(() => {
					message.reply("OK, I've created that table for you.");
				});
			} else {
				message.reply("Sorry, there is already a table with that name.");
			}
		}).catch(() => {
			this.sendFailed(message);
		});
	}

	private addToTable(message: Message, args: string[]): Promise<void> {
		let tableCount = 1;

		if (args.length > 0) {
			const tableNumber = parseInt(args[0], 10);

			if (!isNaN(tableNumber)) {
				tableCount = tableNumber;

				args = args.slice(1);
			}
		}

		const lines: string[] = args.join(" ").split("\n");
		let first = lines[0];
		let title = "";

		if (first.match(/^"|'/)) {
			const quote: string = first[0];
			const lastIndex: number = first.indexOf(quote, 1);
			title = first.slice(1, lastIndex);
			lines[0] = first.slice(lastIndex + 1).trim();
		} else {
			const parts: string[] = first.split(" ").filter(el => el.trim() !== "");

			if (parts.length > 0) {
				title = <string> parts.shift();
				lines[0] = parts.join(" ").trim();
			}
		}

		if (lines[0] === "") {
			lines.shift();
		}

		const query: any = { name: title, user: message.author.id };

		return this.db.collection("tables").findOne(query).then((doc: any) => {
			if (doc) {
				for (let line of lines) {
					doc.rolls[tableCount - 1].values.push(line);
				}

				this.db.collection("tables").findOneAndUpdate(query, doc).then(() => {
					message.reply("OK, I have updated the table for you.");
				});
			} else {
				this.sendFailed(message);
			}
		}).catch(() => {
			this.sendFailed(message);
		});
	}

	private setTableName(message: Message, args: string[]): Promise<void> {
		let tableCount = 1;

		if (args.length > 0) {
			const tableNumber = parseInt(args[0], 10);

			if (!isNaN(tableNumber)) {
				tableCount = tableNumber;

				args = args.slice(1);
			}
		}

		const lines: string[] = args.join(" ").split("\n");
		let first = lines[0];
		let title = "";
		let tableName = "";

		if (first.match(/^"|'/)) {
			const quote = first[0];
			const lastIndex = first.indexOf(quote, 1);
			title = first.slice(1, lastIndex);
			tableName = first.slice(lastIndex + 1).trim();
		} else {
			const parts: string[] = first.split(" ").filter(el => el.trim() !== "");

			if (parts.length > 0) {
				title = <string> parts.shift();
				tableName = parts.join(" ");
			}
		}

		const query: any = { name: title, user: message.author.id };

		return this.db.collection("tables").findOne(query).then((doc: any) => {
			if (doc) {
				doc.rolls[tableCount - 1].name = tableName;

				this.db.collection("tables").findOneAndUpdate(query, doc).then(() => {
					message.reply("OK, I have updated the table for you.");
				});
			} else {
				this.sendFailed(message);
			}
		}).catch(() => {
			this.sendFailed(message);
		});
	}

	private rollTable(message: Message, name: string): Promise<void> {
		return this.db.collection("tables").findOne(this.generateTableQuery(message, name)).then((doc: any) => {
			if (doc) {
				const replies: string[] = ["**Rolling table *" + doc.name + "*:**", ""];

				for (let roll of doc.rolls) {
					if (roll.values.length > 0) {
						if (roll.name) {
							replies.push("*" + roll.name + "*");
						}

						const index: number = Math.floor(Math.random() * roll.values.length);
						const value: string = roll.values[index];
						replies.push(value);
					}
				}

				this.sendMessages(message, replies.join("\n"));
			} else {
				this.sendReplies(message, "Sorry, I couldn't find any tables with the name: " + name);
			}
		}).catch(() => {
			this.sendFailed(message);
		});
	}

	private deleteTable(message: Message, name: string): void {
		const query: any = { name: name, user: message.author.id };

		this.db.collection("tables").findOneAndDelete(query).then((result: any) => {
			if (result.value) {
				message.reply("I have removed the table `" + name + "`.");
			} else {
				message.reply("Sorry, I don't have a stored table called `" + name + "`.");
			}
		}).catch(() => {
			this.sendFailed(message);
		});
	}

	private viewTable(message: Message, name: string): Promise<void> {
		return this.db.collection("tables").findOne(this.generateTableQuery(message, name)).then((doc: any) => {
			if (doc) {
				const replies: string[] = [];

				replies.push("**" + doc.name + "**");
				replies.push("");

				for (let roll of doc.rolls) {
					replies.push("**1d" + roll.values.length + (roll.name.length > 0 ? " - " + roll.name : "") + "**");

					for (let i = 1; i <= roll.values.length; i++) {
						replies.push(i + ". " + roll.values[i - 1]);
					}
				}

				this.sendMessages(message, replies.join("\n"));
			} else {
				this.sendReplies(message, "Sorry, I couldn't find any tables with the name: " + name);
			}
		}).catch(() => {
			this.sendFailed(message);
		});
	}

	private listTables(message: Message): void {
		this.db.collection("tables").find(this.generateTableQuery(message)).toArray().then((docs: Array<any>) => {
			const replies: string[] = [];
			if (docs.length === 0) {
				replies.push("You don't currently have access to any tables.");
			} else {
				const owned = docs.filter((doc: any) => doc.user === message.author.id);
				docs = docs.filter((doc: any) => doc.user !== message.author.id);

				const user = docs.filter((doc: any) => doc.users.includes(message.author.id));
				docs = docs.filter((doc: any) => !doc.users.includes(message.author.id));

				const channel = docs.filter((doc: any) => doc.channels.includes(message.channel.id));
				docs = docs.filter((doc: any) => !doc.channels.includes(message.channel.id));

				const guild = docs.filter((doc: any) => doc.guilds.includes(message.guild.id));

				const global = docs.filter((doc: any) => !doc.guilds.includes(message.guild.id));

				if (owned.length > 0) {
					replies.push("You have created these tables:");

					for (let table of owned) {
						replies.push("- " + table.name);
					}
				}

				if (user.length > 0) {
					if (replies.length > 0) { replies.push(""); }
					replies.push("These tables have been shared with you:");

					for (let table of user) {
						replies.push("- " + table.name);
					}
				}

				if (channel.length > 0) {
					if (replies.length > 0) { replies.push(""); }
					replies.push("These tables are available to this channel:");

					for (let table of channel) {
						replies.push("- " + table.name);
					}
				}

				if (guild.length > 0) {
					if (replies.length > 0) { replies.push(""); }
					replies.push("These tables are available on this server:");

					for (let table of guild) {
						replies.push("- " + table.name);
					}
				}

				if (global.length > 0) {
					if (replies.length > 0) { replies.push(""); }
					replies.push("These tables are public:");

					for (let table of global) {
						replies.push("- " + table.name);
					}
				}
			}

			this.sendMessages(message, replies.join("\n"));
		});
	}

	private shareTableMentions(message: Message, args: string[]): void {
		const mentions = message.mentions;
		const name = args.slice(mentions.users.size + mentions.channels.size + mentions.roles.size + (mentions.everyone ? 1 : 0)).join(" ");

		const query: any = { name: name, user: message.author.id };
		const updateObj: any = {};
		let added: string[] = [];

		if (mentions.users.size > 0) {
			added = added.concat(mentions.users.map(user => user.username));
			updateObj.users = { $each: mentions.users.map(user => user.id) };
		}
		if (mentions.channels.size > 0) {
			added = added.concat(mentions.channels.map(channel => channel.name));
			updateObj.channels = { $each: mentions.channels.map(channel => channel.id) };
		}

		if (mentions.everyone) {
			updateObj.guilds = message.guild.id;
			added.push(message.guild.name);
		}

		const update: any = { $addToSet: updateObj };

		this.db.collection("tables").findOneAndUpdate(query, update).then((result: any) => {
			if (result.value) {
				if (result.ok) {
					message.reply("OK, I have shared the table with " + (added.length === 1 ? added[0] : added.slice(0, -1).join(", ") + " and " + added[added.length - 1]) + " for you.");
				} else {
					message.reply("Sorry, I was unable to share the table for you.");
				}
			} else {
				this.sendReplies(message, "Sorry, I was unable to find a table with the name: " + name);
			}
		});
	}

	private shareTableGlobal(message: Message, name: string): void {
		const query: any = { name: name, user: message.author.id };
		const update: any = { $set: { global: true } };

		this.db.collection("tables").findOneAndUpdate(query, update).then((result: any) => {
			if (result.value) {
				if (result.ok) {
					message.reply("OK, I have made the table global for you.");
				} else {
					message.reply("Sorry, I was unable to share the table for you.");
				}
			} else {
				this.sendReplies(message, "Sorry, I was unable to find a table with the name: " + name);
			}
		});
	}

	private shareTableGuild(message: Message, name: string): void {
		const query: any = { name: name, user: message.author.id };
		const update: any = { $addToSet: { guilds: message.guild.id } };

		this.db.collection("tables").findOneAndUpdate(query, update).then((result: any) => {
			if (result.value) {
				if (result.ok) {
					message.reply("OK, I have shared the table with " + message.guild.name + " for you.");
				} else {
					message.reply("Sorry, I was unable to share the table for you.");
				}
			} else {
				this.sendReplies(message, "Sorry, I was unable to find a table with the name: " + name);
			}
		});
	}

	private shareTableChannel(message: Message, name: string): void {
		const query: any = { name: name, user: message.author.id };
		const update: any = { $addToSet: { channels: message.channel.id } };

		if (!(message.channel instanceof TextChannel)) {
			this.sendReplies(message, "Sorry, I can only share tables with public text channels.");
			return;
		}

		this.db.collection("tables").findOneAndUpdate(query, update).then((result: any) => {
			if (result.value) {
				if (result.ok) {
					this.sendReplies(message, "OK, I have shared the table with " + (message.channel as TextChannel).name + " for you.");
				} else {
					this.sendReplies(message, "Sorry, I was unable to share the table for you.");
				}
			} else {
				this.sendReplies(message, "Sorry, I was unable to find a table with the name: " + name);
			}
		});
	}

	private unshareTableMentions(message: Message, args: string[]): void {
		const mentions = message.mentions;
		const name = args.slice(mentions.users.size + mentions.channels.size + mentions.roles.size + (mentions.everyone ? 1 : 0)).join(" ");

		const query: any = { name: name, user: message.author.id };
		const updateObj: any = {};
		let added: string[] = [];

		if (mentions.users.size > 0) {
			added = added.concat(mentions.users.map(user => user.username));
			updateObj.users = { $each: mentions.users.map(user => user.id) };
		}
		if (mentions.channels.size > 0) {
			added = added.concat(mentions.channels.map(channel => channel.name));
			updateObj.channels = { $each: mentions.channels.map(channel => channel.id) };
		}

		if (mentions.everyone) {
			updateObj.guilds = message.guild.id;
			added.push(message.guild.name);
		}

		const update: any = { $pull: updateObj };

		this.db.collection("tables").findOneAndUpdate(query, update).then((result: any) => {
			if (result.value) {
				if (result.ok) {
					message.reply("OK, I have unshared the table with " + (added.length === 1 ? added[0] : added.slice(0, -1).join(", ") + " and " + added[added.length - 1]) + " for you.");
				} else {
					message.reply("Sorry, I was unable to unshare the table for you.");
				}
			} else {
				this.sendReplies(message, "Sorry, I was unable to find a table with the name: " + name);
			}
		});
	}

	private unshareTableGlobal(message: Message, name: string): void {
		const query: any = { name: name, user: message.author.id };
		const update: any = { $set: { global: false } };

		this.db.collection("tables").findOneAndUpdate(query, update).then((result: any) => {
			if (result.value) {
				if (result.ok) {
					message.reply("OK, I have made the table private for you.");
				} else {
					message.reply("Sorry, I was unable to unshare the table for you.");
				}
			} else {
				this.sendReplies(message, "Sorry, I was unable to find a table with the name: " + name);
			}
		});
	}

	private unshareTableGuild(message: Message, name: string): void {
		const query: any = { name: name, user: message.author.id };
		const update: any = { $pull: { guilds: message.guild.id } };

		this.db.collection("tables").findOneAndUpdate(query, update).then((result: any) => {
			if (result.value) {
				if (result.ok) {
					message.reply("OK, I have unshared the table with " + message.guild.name + " for you.");
				} else {
					message.reply("Sorry, I was unable to unshare the table for you.");
				}
			} else {
				this.sendReplies(message, "Sorry, I was unable to find a table with the name: " + name);
			}
		});
	}

	private unshareTableChannel(message: Message, name: string): void {
		const query: any = { name: name, user: message.author.id };
		const update: any = { $pull: { channels: message.channel.id } };

		if (!(message.channel instanceof TextChannel)) {
			this.sendReplies(message, "Sorry, I can only share tables with public text channels.");
			return;
		}

		this.db.collection("tables").findOneAndUpdate(query, update).then((result: any) => {
			if (result.value) {
				if (result.ok) {
					message.reply("OK, I have unshared the table with " + (message.channel as TextChannel).name + " for you.");
				} else {
					message.reply("Sorry, I was unable to unshare the table for you.");
				}
			} else {
				this.sendReplies(message, "Sorry, I was unable to find a table with the name: " + name);
			}
		});
	}

	private searchCompendium(message: Message, args: string[], type?: string, level?: number): void {
		const search: string = args.join(" ");

		if (search.length <= 0) {
			this.sendReplies(message, "Please enter a search query.");
			return;
		}

		const searchRegexs: RegExp[] = search.split(" ").map((str: string) => new RegExp("^" + str.replace(/[^\w]/g, ""), "i"));

		const query: any = {
			$or: [
				{ name: new RegExp("^" + this.escape(search), "i") },
				{ searchString: new RegExp("^" + search.replace(/[^\w]/g, "")) },
				{ $and: searchRegexs.map((regexp: RegExp) => ({ searchStrings: regexp })) },
			],
		};

		if (type) {
			query.recordType = type;
		} else {
			level = undefined;
		}

		this.db.collection("compendium").find(query).toArray().then((docs: Array<any>) => {
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
		}).catch((e: Error) => {
			this.sendFailed(message);
		});
	}

	private searchSpellSchools(message: Message, args: string[]): Promise<void> {
		const schoolSearch = this.escape(args.shift() || "");
		const schoolRegExp = new RegExp(schoolSearch, "i");
		let school = "";

		for (let key in this.schools) {
			if (schoolRegExp.test(this.schools[key])) {
				school = key;
				break;
			}
		}

		if (!school) {
			return this.sendFailed(message).then(() => undefined);
		}

		let level = args.shift() || "";

		if (isNaN(parseInt(level || "NaN", 10))) {
			args.unshift(level);
			level = "";
		}

		const search: string = this.escape(args.join(" "));
		const query: any = {
			recordType: "spell",
			school: school,
		};

		if (level) { query.level = parseInt(level, 10); }
		if (search) { query.name = RegExp(search, "i"); }

		return this.db.collection("compendium").find(query).sort([["level", 1], ["name", 1]]).toArray().then((docs: Array<any>) => {
			if (docs.length === 0) {
				this.sendFailed(message);
			} else {
				let results: string[] = [];
				let currentLevel: number = -1;

				for (let spell of docs) {
					if (spell.level !== currentLevel) {
						if (results.length > 0) {
							results.push("");
						}
						if (spell.level === 0) {
							results.push("**Cantrips (0 Level)**");
						} else {
							results.push("**" + this.ordinal(spell.level) + " Level**");
						}
						currentLevel = spell.level;
					}

					results.push(spell.name + " - *" + spell.classes + "*");
				}

				const reply: string = results.join("\n");

				if (reply.length < 2000 && reply.split("\n").length < 50) {
					this.sendMessages(message, reply);
				} else {
					this.sendPM(message, reply);
				}
			}
		}).catch(() => {
			this.sendFailed(message);
		});
	}

	private escape(regex: string): string {
		if (!regex) return "";
		return regex.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
	}

	private searchSpelllist(message: Message, args: string[]) {
		const query: any = { recordType: "spell" };
		let level: number | null = null;
		let search: string | null = null;

		if (isNaN(parseInt(args[0], 10))) {
			search = this.escape(args[0]);

			if (args[1]) {
				level = parseInt(args[1], 10);
			}
		} else {
			level = parseInt(args[0], 10);
		}

		if (search != null) { query.classes = new RegExp(search, "i"); }
		if (level != null) { query.level = level; }
		if (!search && !level) {
			return this.sendReplies(message, "Please enter either a class or spell level to search.");
		}

		this.db.collection("compendium").find(query).sort([["level", 1], ["name", 1]]).toArray().then((docs: Array<any>) => {
			if (docs.length === 0) {
				this.sendFailed(message);
			} else {
				let results: string[] = [];
				let currentLevel: number = -1;

				for (let spell of docs) {
					if (spell.level !== currentLevel) {
						if (results.length > 0) {
							results.push("");
						}
						if (spell.level === 0) {
							results.push("**Cantrips (0 Level)**");
						} else {
							results.push("**" + this.ordinal(spell.level) + " Level**");
						}
						currentLevel = spell.level;
					}

					const spellSchool: string = spell.school ? this.schools[spell.school] : "";
					results.push(spell.name + (spellSchool ? " - *" + spellSchool + "*" : ""));
				}

				const reply: string = results.join("\n");

				if (reply.length > 2000 || results.length > 50) {
					this.sendPM(message, reply);
				} else {
					this.sendMessages(message, reply);
				}
			}
		}).catch(() => {
			this.sendFailed(message);
		});
	}

	private searchSpellslots(message: Message, args: string[]) {
		const search: string = this.escape(args[0]);

		const query: any = { $or: [ { name: new RegExp("^" + this.escape(search), "i") }, { searchString: new RegExp("^" + search.replace(/[^\w]/g, "")) } ], recordType: "class" };

		this.db.collection("compendium").findOne(query).then((doc: any) => {
			if ("spellSlots" in doc) {
				const reply: string = this.display.displaySpellSlots(doc.spellSlots, args[1] ? parseInt(args[1], 10) : undefined).join("\n");

				this.sendMessages(message, reply);
			} else {
				message.reply("Sorry, the class " + doc.name + " has no spell slots.");
			}
		}).catch(() => {
			this.sendFailed(message);
		});
	}

	private searchAbilities(message: Message, args: string[]) {
		const classSearch: string = this.escape(args[0]);
		const fullSearch: string = args.join(" ");

		const query: any = { $or: [ { name: new RegExp("^" + this.escape(classSearch), "i") }, { searchString: new RegExp("^" + classSearch.replace(/[^\w]/g, "")) } ], recordType: "class" };
		const ability: string = args.slice(1).join(" ");

		this.db.collection("compendium").findOne(query).then((doc: any) => {
			if (doc) {
				return this.handleFoundClassForAbilitySearch(message, ability, doc);
			}

			const altQuery: any = {
				$where: `function() {
					if (obj.levelFeatures) {
						for (var i = 1; i <= 20; i++) {
							if (obj.levelFeatures[i]) {
								for (var j = 0; j < obj.levelFeatures[i].length; j++) {
									if (obj.levelFeatures[i][j].name.match(/${this.escape(fullSearch)}/i)) {
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

			return this.db.collection("compendium").findOne(altQuery).then((subDoc: any): any => {
				if (subDoc) {
					return this.handleFoundClassForAbilitySearch(message, fullSearch, subDoc);
				}

				return this.sendFailed(message);
			});
		}).catch((err: Error) => {
			console.error(err.message);
			this.sendFailed(message);
		});
	}

	private handleFoundClassForAbilitySearch(message: Message, ability: string, doc: any) {
		const abilitySearch: RegExp = new RegExp(this.escape(ability), "i");

		if (!("levelFeatures" in doc)) {
			return message.reply("Sorry, the class " + doc.name + " has no abilities.");
		}

		const matches: Array<any> = [];
		let exactMatch: any;

		loop:
		for (let level in doc.levelFeatures) {
			if (!(level in doc.levelFeatures)) continue;

			for (let feat of doc.levelFeatures[level]) {
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
			return message.reply("Sorry, I could not find any abilities for " + doc.name + " matching your query");
		}

		if (!exactMatch && matches.length === 1) {
			exactMatch = matches[0];
		}

		let display: string[] = [];
		const replyMatch = (mess: Message, match: any) => {
			display.push("**" + match.name + "**");
			display.push("*" + doc.name + " - " + this.ordinal(match.level) + " level ability*");
			display = display.concat(match.text);

			this.sendMessages(mess, display.join("\n"));
		};

		if (exactMatch) {
			return replyMatch(message, exactMatch);
		} else {
			return this.replyOptions(message, (match) => match.name + " *" + this.ordinal(match.level) + " level*", matches).then((response: IAwaitedReplyResponse | undefined) => {
				if (!response) return;
				return replyMatch(response.message, response.item);
			});
		}
	}

	private searchMonsterAbilities(message: Message, args: string[]) {
		const search: string = args.join(" ");
		const searchRegexp: RegExp = new RegExp("^" + this.escape(search), "i");

		const query: any = { $or: [ { "trait.name": searchRegexp }, { "action.name": searchRegexp }, { "reaction.name": searchRegexp }, { "legendary.name": searchRegexp } ], recordType: "monster" };
		const project = { "trait.name": 1, "trait.text": 1, "action.name": 1, "action.text": 1, "reaction.name": 1, "reaction.text": 1, "legendary.name": 1, "legendary.text": 1, name: 1};

		this.db.collection("compendium").find(query).project(project).toArray().then((docs: Array<any>) => {
			const matches: any = {};
			const matchMonsters: any = {};
			const matchNames: string[] = [];
			let exactMatch: any;

			for (let doc of docs) {
				const options: Array<any> = [].concat(doc.trait, doc.action, doc.legendary, doc.reaction).filter((t) => !!t);

				for (let trait of options) {
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
				message.reply("Sorry, I could not find any monster abilities matching your query");
				return;
			} else {
				if (!exactMatch && matchNames.length === 1) {
					exactMatch = matches[matchNames[0]];
				}

				let display: string[] = [];
				const replyMatch = (mess: Message, match: any) => {
					display.push("**" + match.name + "**");
					display.push(match.text);

					display.push("");

					display.push("*Found In:* " + matchMonsters[match.name].join(", "));

					this.sendMessages(mess, display.join("\n"));
				};

				if (exactMatch) {
					replyMatch(message, exactMatch);
				} else {
					this.replyOptions(message, (m) => m, matchNames).then((response: IAwaitedReplyResponse | undefined) => {
						if (!response) return;
						replyMatch(response.message, matches[response.item]);
					});
				}
			}
		}).catch((e: Error) => {
			this.sendFailed(message);
		});
	}

	private searchMonsterList(message: Message, rating?: string): void {
		const query: any = { recordType: "monster" };
		let cr: string|number = "";

		if (rating !== undefined) {
			if (rating.indexOf("/") < 0) {
				cr = parseInt(<string> rating, 10);
			} else {
				cr = rating;
			}
		}

		if ((typeof cr === "string" && cr !== "") || (typeof cr === "number" && !isNaN(cr))) {
			query.cr = cr;
		} else if (rating !== undefined) {
			message.reply("You entered an invalid monster challenge rating.");
			return;
		}

		this.db.collection("compendium").find(query).sort([["cr", 1], ["name", 1]]).toArray().then((docs: Array<any>) => {
			if (docs.length === 0) {
				this.sendFailed(message);
			} else {
				let results: string[] = [];
				let currentRating = "";

				for (let monster of docs) {
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
					this.sendMessages(message, reply);
				} else {
					this.sendPM(message, reply);
				}
			}
		}).catch(() => {
			this.sendFailed(message);
		});
	}

	private processOptions(message: Message, docs: Array<any>) {
		this.replyOptions(message, (doc) =>  doc.name + " *" + doc.recordType + "*", docs).then((response: IAwaitedReplyResponse | undefined) => {
			if (!response) return;
			this.processMatch(response.message, response.item);
		});
	}

	private replyOptions(message: Message, formatter: (_: any) => string, docs: any[]) {
		const options: string[] = docs.map((doc: any, index: number) => (index + 1) + ": " + formatter(doc));
		const maxLength = 1900 - DiscordBot.CONST_AWAIT_REPLY_PROMPT.length;
		let reply = DiscordBot.CONST_MULTI_REPLY_PROMPT + "\n";
		let index = 0;

		while (index < options.length && reply.length < maxLength) {
			reply += options[index++] + "\n";
		}

		const replyPrompt = reply + "\n" + DiscordBot.CONST_AWAIT_REPLY_PROMPT;
		const responsePromise = this.sendReplies(message, replyPrompt);

		return this.getMessageFrom(responsePromise).then((respondedWith: Message | null) => {
			if (!respondedWith) return;
			return this.awaitReply(respondedWith, message.author, docs, reply);
		});
	}

	private getMessageFrom(promise: Promise<Message | Message[]>): Promise<Message | null> {
		return promise.then((messages: Message | Message[]) => {
			if (messages instanceof Array) {
				if (messages.length === 0) return null;
				return messages.pop() as Message;
			}
			return messages;
		});
	}

	private awaitReply(message: Message, user: User, docs: any[], fallback?: string) {
		const filter: CollectorFilter = function(m: Message) {
			const index = (parseInt(m.content, 10) || 0) - 1;
			return m.author.id === user.id && index >= 0 && index < docs.length;
		};
		const options: AwaitMessagesOptions = { errors: ["time"], maxMatches: 1, time: 60000 };

		return message.channel.awaitMessages(filter, options)
			.then((collected: Collection<string, Message>): any => {
				const response: Message = collected.first();
				const index = (parseInt(response.content, 10) || 0) - 1;

				if (index < 0 || index >= docs.length) return;

				const promises: Promise<any>[] = [];
				if (response.deletable) promises.push(response.delete());
				if (message.deletable) promises.push(message.delete());

				return Promise.all(promises).then(() => (<IAwaitedReplyResponse> {
					item: docs[index],
					message: response,
				}));
			}, () => {
				if (fallback) {
					message.edit(fallback);
				}
			});
	}

	private generateRandomName(message: Message): void {
		this.sendMessages(message, this.generateName());
	}

	private generateVillain(message: Message, name: string): void {
		const villain = VillainGenerator.generate();

		if (name) {
			villain.name = DiscordDisplay.toTitleCase(name);
		} else {
			villain.name = this.generateName();
		}

		this.sendMessages(message, villain.format());
	}

	private processMatch(message: Message, doc: any, level?: number) {
		const type: string = doc.recordType;
		delete doc.recordType;
		delete doc._id;

		let reply = "";

		if (type === "class" && level !== undefined) {
			reply = this.display.displayClass(doc, level);
		} else {
			reply = this.display.display(doc, type);
		}

		if (reply.length >= 2000) {
			this.tooLongReply(message);
			return this.sendPM(message, reply);
		} else {
			return this.sendMessages(message, reply);
		}
	}

	private async doChannelSort(guild: Guild): Promise<void> {
		if (guild.id !== CONST_MUTE_MAGE_ID) {
			throw new Error("Only works on MuteMage");
		}

		// tslint:disable-next-line:no-console
		console.log("Doing channel sort");

		this.sortingChannels.add(guild.id);
		this.doingChannelSort.add(guild.id);

		try {
			const guildChannels: GuildChannel[] = this.bot.channels.array().filter(channel => (<GuildChannel> channel).guild != null && (<GuildChannel> channel).guild.id === guild.id) as GuildChannel[];
			const categories: CategoryChannel[] = (guildChannels.filter(channel => channel.type === "category") as CategoryChannel[]);
			categories.sort((a, b) => a.position - b.position);

			const channels: TextChannel[] = (guildChannels.filter(channel => channel.type === "text") as TextChannel[]);

			const rootChannels: TextChannel[] = [];
			const gameChannels: TextChannel[] = [];
			const channelMap: Map<string, TextChannel[]> = new Map<string, TextChannel[]>();
			let mainDivider: TextChannel | null = null;

			for (let category of categories) {
				channelMap.set(category.id, []);
			}

			for (let channel of channels) {
				if (channel.parentID != null) {
					if (!channelMap.has(channel.parentID)) {
						channelMap.set(channel.parentID, []);
					}

					(channelMap.get(channel.parentID) as TextChannel[]).push(channel);
				} else if (CONST_MUTE_MAGE_ROOT_CHANNELS.includes(channel.id)) {
					rootChannels.push(channel);
				} else if (channel.id === CONST_MUTE_MAGE_DIVIDER_CHANNEL) {
					mainDivider = channel;
				} else {
					gameChannels.push(channel);
				}
			}
			if (!mainDivider) { return; }

			// tslint:disable:no-console
			rootChannels.sort((a, b) => CONST_MUTE_MAGE_ROOT_CHANNELS.indexOf(a.id) - CONST_MUTE_MAGE_ROOT_CHANNELS.indexOf(b.id));
			gameChannels.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

			let allChannels: Array<TextChannel> = [
				...rootChannels,
				mainDivider,
				...gameChannels,
			];

			for (let category of categories) {
				const categoryChannels: TextChannel[] | undefined = channelMap.get(category.id);
				if (!categoryChannels || categoryChannels.length === 0) continue;

				allChannels = [...allChannels, ...categoryChannels.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())) ];
			}

			await guild.setChannelPositions(
				allChannels
					.map((channel, position) => ({
						channel,
						position,
					})),
			);
		} finally {
			this.sortingChannels.delete(guild.id);
			this.doingChannelSort.delete(guild.id);
		}
		// tslint:enable:no-console
	}

	private sortChannels(message: Message) {
		if (this.doingChannelSort.has(message.guild.id)) {
			return this.sendReplies(message, "Unable to sort channels. There is a sort already in progress");
		}

		return this.sendMessages(message, "Starting channel sort. Please wait...").then(() => {
			return this.doChannelSort(message.guild);
		}).then(() => {
			let reply = "Channel order updated.";
			return this.sendReplies(message, reply);
		}).catch((e: Error) => {
			console.error(e.message);
			return this.sendReplies(message, "There was a problem updating some of the channels.");
		});
	}

	private listOldRoles(message: Message) {
		if (message.guild.id !== CONST_MUTE_MAGE_ID) {
			return this.sendInvalid(message);
		}

		const fixedRoles: string[] = [
			MUTE_MAGE_BOT_ROLE_ID,
			MUTE_MAGE_DM_ROLE_ID,
			MUTE_MAGE_EVERYONE_ROLE_ID,
			MUTE_MAGE_HELPERS_ROLE_ID,
			MUTE_MAGE_OWDM_ROLE_ID,
			MUTE_MAGE_ROGUEMODE_ROLE_ID,
			MUTE_MAGE_SPECTATOR_ROLE_ID,
			MUTE_MAGE_WMDM_ROLE_ID,
			"232403207962230785",   //  Admin
			"286362255065481216",   //  Avrae
			"343810940539502592",   //  LFG!
			"281193177896189954",   //  WestMarches
			"376835964686958595",   //  ow_general
			"377498912493404162",   //  ow_orcs
			"384179473748197389",   //  D1-C3

		];

		const channels: Collection<string, GuildChannel> = message.guild.channels;
		const roles: Role[] = message.guild.roles.array();

		const mismatchedRoles: Role[] = roles.filter(r => !channels.exists("name", r.name));
		const emptyRoles: Role[] = roles.filter(r => r.members.size === 0 && !mismatchedRoles.includes(r));

		const oldRoles: Role[] = mismatchedRoles.concat(emptyRoles).filter(r => !fixedRoles.includes(r.id));

		const reply = "The following roles do not have an associated channel, or do not have any members:\n" + oldRoles.join("\n");
		return this.sendMessages(message, reply);
	}

	private async listOldChannels(message: Message) {
		const channels: TextChannel[] = ((this.bot.channels.array()
			.filter((channel): channel is GuildChannel => (<GuildChannel> channel).guild != null) as GuildChannel[])
			.filter(channel => channel.guild.id === message.guild.id)
			.filter((channel): channel is TextChannel => channel.type === "text")  as TextChannel[])
			.filter(channel => !CONST_MUTE_MAGE_ROOT_CHANNELS.includes(channel.id))
			.filter(channel => channel.id !== CONST_MUTE_MAGE_DIVIDER_CHANNEL);

		const monthAgo = Date.now() - (1000 * 60 * 60 * 24 * 7 * 4);

		const promises = channels.map(async channel => {
			try {
				const messages = await channel.fetchMessages({ limit: 1 });
				const lastMessage = messages.first();

				if (lastMessage) {
					const timestamp = lastMessage.editedTimestamp || lastMessage.createdTimestamp;

					if (timestamp < monthAgo) {
						return channel;
					}
				} else {
					console.error("Could not get last message for " + channel.name + ", assuming none.");

					if (channel.createdTimestamp < monthAgo) {
						return channel;
					}
				}
			} catch (e) {
				console.error("Could not get last message for " + channel.name, e.message);
			}
		});

		const foundChannels: TextChannel[] = (await Promise.all(promises))
			.filter((channel): channel is TextChannel => channel != null);

		foundChannels.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

		const reply = "The following channels have not had any activity in the past four weeks:\n" + foundChannels.join("\n");
		return this.sendMessages(message, reply);
	}

	private wmCreateChannel(message: Message, args: string[]): Promise<any> {
		if (message.guild.id !== CONST_MUTE_MAGE_ID) {
			return this.sendInvalid(message);
		}

		let channelName = args[0];
		if (!channelName.startsWith("wm_")) {
			channelName = "wm_" + channelName;
		}

		const channel = message.guild.channels.array().find(c => c.name === channelName);

		if (channel) {
			return this.sendReplies(message, "Sorry, I could not create channel " + channelName + " as the channel already exists.");
		}

		const wmdms = message.guild.roles.get(MUTE_MAGE_WMDM_ROLE_ID);
		const helpers = message.guild.roles.get(MUTE_MAGE_HELPERS_ROLE_ID);
		const bot = message.guild.roles.get(MUTE_MAGE_BOT_ROLE_ID);
		const everyone = message.guild.roles.get(MUTE_MAGE_EVERYONE_ROLE_ID);

		if (!wmdms || !bot || !everyone || !helpers) {
			return this.sendError(message, new Error("Unable to find all roles"));
		}

		return message.guild.createRole({ mentionable: true, name: channelName, permissions: [] }).then(role => {
			const perms: Array<any> = [
				{	allow: 0,						deny: 0x800 + 0x400,		id: everyone.id,	type: "role" },	// 	@everyone
				{	allow: 0x400 + 0x800,			deny: 0,					id: role.id,		type: "role" },	// 	channel
				{	allow: 0x400 + 0x800 + 0x2000,	deny: 0,					id: bot.id,			type: "role" },	// 	Bot
				{	allow: 0x400 + 0x800 + 0x2000,	deny: 0,					id: helpers.id,		type: "role" },	// 	Helpers
				{	allow: 0x400 + 0x800 + 0x2000,	deny: 0,					id: wmdms.id,		type: "role" },	// 	WM DM
			];

			this.sortingChannels.add(message.guild.id);

			return  Promise.all([
				message.guild.createChannel(channelName, "text", perms),
				message.guild.createChannel(channelName + "_ooc", "text", perms),
			]).then(channels => (
				this.wmSetCategory(channels as TextChannel[])
					.catch(error => this.sendReplies(message, "Unable to add channels to West Marches category."))
					.then(() => channels)
			)).then(channels => (
				this.sendReplies(message, "Channel " + channels[0] + " created.")
			)).then(() => {
				const users = message.mentions.users.array();
				const promises: Promise<any>[] = users.map(user => message.guild.fetchMember(user.id).then(member => member.addRole(role)));
				return Promise.all(promises.concat(this.sortChannels(message)));
			}).then(() => {
				this.sortingChannels.delete(message.guild.id);
			});
		});
	}

	private wmSetCategory(channels: TextChannel[], index = 0): Promise<void> {
		if (index >= MM_WM_CATEGORY_IDS.length) return Promise.reject(new Error("Ran out of category channels to add."));

		const category: CategoryChannel = this.bot.channels.get(MM_WM_CATEGORY_IDS[index]) as CategoryChannel;
		if (!category) return Promise.reject(new Error("Unable to find category channel."));

		return Promise.all(channels.map(c => c.setParent(category)))
			.then(() => undefined, () => this.wmSetCategory(channels, index++));
	}

	private owCreateChannel(message: Message, args: string[]): Promise<any> {
		if (message.guild.id !== CONST_MUTE_MAGE_ID) {
			return this.sendInvalid(message);
		}

		let channelName = args[0];
		if (!channelName.startsWith("ow")) {
			channelName = "owr_" + channelName;
		}

		const channel = message.guild.channels.array().find(c => c.name === channelName);

		if (channel) {
			return this.sendReplies(message, "Sorry, I could not create channel " + channelName + " as the channel already exists.");
		}

		const owdms = message.guild.roles.get(MUTE_MAGE_OWDM_ROLE_ID);
		const helpers = message.guild.roles.get(MUTE_MAGE_HELPERS_ROLE_ID);
		const bot = message.guild.roles.get(MUTE_MAGE_BOT_ROLE_ID);
		const everyone = message.guild.roles.get(MUTE_MAGE_EVERYONE_ROLE_ID);

		if (!owdms || !bot || !everyone || !helpers) {
			return this.sendError(message, new Error("Unable to find all roles"));
		}

		return message.guild.createRole({ mentionable: true, name: channelName, permissions: [] }).then(role => {
			const perms: Array<any> = [
				{	allow: 0,						deny: 0x800 + 0x400,		id: everyone.id,	type: "role" },	// 	@everyone
				{	allow: 0x400 + 0x800,			deny: 0,					id: role.id,		type: "role" },	// 	channel
				{	allow: 0x400 + 0x800 + 0x2000,	deny: 0,					id: bot.id,			type: "role" },	// 	Bot
				{	allow: 0x400 + 0x800 + 0x2000,	deny: 0,					id: helpers.id,		type: "role" },	// 	Helpers
				{	allow: 0x400 + 0x800 + 0x2000,	deny: 0,					id: owdms.id,		type: "role" },	// 	OW DM
			];

			this.sortingChannels.add(message.guild.id);

			return  Promise.all([
				message.guild.createChannel(channelName, "text", perms),
				message.guild.createChannel(channelName + "_ooc", "text", perms),
			]).then(channels => {
				const promise: Promise<void> = channelName.startsWith("owrc")
					? this.owrcSetCategory(channels as TextChannel[])
					: this.owSetCategory(channels as TextChannel[]);

				return promise
					.catch(error => this.sendReplies(message, "Unable to add channels to Orc Wars category."))
					.then(() => channels);
			}).then(channels => (
				this.sendReplies(message, "Channel " + channels[0] + " created.")
			)).then(() => {
				const users = message.mentions.users.array();
				const promises: Promise<any>[] = users.map(user => message.guild.fetchMember(user.id).then(member => member.addRole(role)));
				return Promise.all(promises.concat(this.sortChannels(message)));
			}).then(() => {
				this.sortingChannels.delete(message.guild.id);
			});
		});
	}

	private owSetCategory(channels: TextChannel[], index = 0): Promise<void> {
		if (index >= MM_OW_CATEGORY_IDS.length) return Promise.reject(new Error("Ran out of category channels to add."));

		const category: CategoryChannel = this.bot.channels.get(MM_OW_CATEGORY_IDS[index]) as CategoryChannel;
		if (!category) return Promise.reject(new Error("Unable to find category channel."));

		return Promise.all(channels.map(c => c.setParent(category)))
			.then(() => undefined, () => this.wmSetCategory(channels, index++));
	}

	private owrcSetCategory(channels: TextChannel[], index = 0): Promise<void> {
		if (index >= MM_OWRC_CATEGORY_IDS.length) return Promise.reject(new Error("Ran out of category channels to add."));

		const category: CategoryChannel = this.bot.channels.get(MM_OWRC_CATEGORY_IDS[index]) as CategoryChannel;
		if (!category) return Promise.reject(new Error("Unable to find category channel."));

		return Promise.all(channels.map(c => c.setParent(category)))
			.then(() => undefined, () => this.wmSetCategory(channels, index++));
	}

	private createChannel(message: Message, args: string[]): Promise<any> {
		if (message.guild.id !== CONST_MUTE_MAGE_ID) {
			return this.sendInvalid(message);
		}

		const channelName = args[0];

		const channel = message.guild.channels.array().find(c => c.name === channelName);

		if (channel) {
			return this.sendReplies(message, "Sorry, I could not create channel " + channelName + " as the channel already exists.");
		}

		const helpers = message.guild.roles.get(MUTE_MAGE_HELPERS_ROLE_ID);
		const bot = message.guild.roles.get(MUTE_MAGE_BOT_ROLE_ID);
		const dm = message.guild.roles.get(MUTE_MAGE_DM_ROLE_ID);
		const spectator = message.guild.roles.get(MUTE_MAGE_SPECTATOR_ROLE_ID);
		const everyone = message.guild.roles.get(MUTE_MAGE_EVERYONE_ROLE_ID);

		if (!helpers || !spectator || !dm || !bot || !everyone) {
			return this.sendError(message, new Error("Unable to find all roles"));
		}

		return message.guild.createRole({ mentionable: true, name: channelName, permissions: [] }).then(role => {
			const perms: Array<any> = [
				{	allow: 0,						deny: 0x800 + 0x400,	id: everyone.id,	type: "role"	},	// 	@everyone
				{	allow: 0x400,					deny: 0,				id: spectator.id,	type: "role"	},	// 	Spectator
				{	allow: 0x400 + 0x800,			deny: 0,				id: role.id,		type: "role"	},	// 	channel
				{	allow: 0x2000,					deny: 0,				id: dm.id,			type: "role"	},	// 	DM
				{	allow: 0x400 + 0x800 + 0x2000,	deny: 0,				id: bot.id,			type: "role"	},	// 	Bot
				{	allow: 0x400 + 0x800 + 0x2000,	deny: 0,				id: helpers.id,		type: "role"	},	// 	Helpers
			];

			const oocPerms: Array<any> = [
				{	allow: 0,						deny: 0x800 + 0x400,	id: everyone.id,	type: "role"	},	// 	@everyone
				{	allow: 0x400 + 0x800,			deny: 0,				id: role.id,		type: "role"	},	// 	channel
				{	allow: 0x2000,					deny: 0,				id: dm.id,			type: "role"	},	// 	DM
				{	allow: 0x400 + 0x800 + 0x2000,	deny: 0,				id: bot.id,			type: "role"	},	// 	Bot
				{	allow: 0x400 + 0x800 + 0x2000,	deny: 0,				id: helpers.id,		type: "role"	},	// 	Helpers
			];

			this.sortingChannels.add(message.guild.id);

			return  Promise.all([
				message.guild.createChannel(channelName, "text", perms),
				message.guild.createChannel(channelName + "_ooc", "text", oocPerms),
			]).then(channels => (
				this.sendReplies(message, "Channel " + channels[0] + " created.")
			)).then(() => {
				const users = message.mentions.users.array();
				const promises: Promise<any>[] = users.map(user => message.guild.fetchMember(user.id).then(member => member.addRole(role)));
				return Promise.all(promises.concat(this.sortChannels(message)));
			});
		});
	}

	private async spectate(message: Message, channelName: string) {
		if (message.mentions.channels.size === 0 && (channelName == null || channelName === "")) {
			return this.addRole(message, "spectator");
		}

		let channel: GuildChannel | null = null;
		if (message.mentions.channels.size > 0) {
			channel = message.mentions.channels.first();
		} else if (channelName != null && channelName !== "") {
			channel = this.bot.channels
				.find(c => isTextChannel(c)
					&& c.guild.id === CONST_MUTE_MAGE_ID
					&& new RegExp("^" + this.escape(channelName) + "$", "i").test(c.name)) as TextChannel;
		}

		if (channel == null) {
			return this.sendReplies(message, `Unable to find a channel matching '${channelName}'`);
		}

		try {
			const perms = channel.permissionOverwrites;

			if (perms.has(message.author.id)) {
				(perms.get(message.author.id) as PermissionOverwrites).delete();

				await this.sendReplies(message, `Spectating disabled for channel ${channel}`);
			} else {
				await channel.overwritePermissions(message.author, {
					"VIEW_CHANNEL": true,
				} as any);

				await this.sendReplies(message, `Spectating enabled for channel ${channel}`);
			}
		} catch (e) {
			return await this.sendReplies(message, `Sorry, I was unable to update spectate status for channel ${channel}`);
		}
	}

	private async deleteChannel(message: Message) {
		if (message.guild.id !== CONST_MUTE_MAGE_ID) {
			return this.sendInvalid(message);
		}

		const channel: TextChannel = message.channel as TextChannel;

		if (channel.type !== "text") {
			return;
		}

		const channelName = channel.name;

		const role = message.guild.roles.find("name", channelName);
		const oocChannel = this.bot.channels.find(c => (
			(<GuildChannel> c).guild.id === message.guild.id &&
			(<TextChannel> c).name === channelName + "_ooc"
		));

		const deleteConfirmationMessage = await this.sendReplies(
			message,
			`I am about to delete ${channel.toString()}, ${oocChannel.toString()} and ${role.toString()}.\n` +
			`To confirm the delete, reply "yes" to this message within 60 seconds.`,
		);

		const filter: CollectorFilter = (m: Message) => m.author.id === message.author.id
			&& ["yes", "y"].includes(m.content.toLowerCase());

		const options: AwaitMessagesOptions = { errors: ["time"], maxMatches: 1, time: 60000 };

		try {
			await message.channel.awaitMessages(filter, options);

			await Promise.all([
				channel.delete(),
				oocChannel.delete(),
				role.delete(),
			]);
		} catch (e) {
			if (Array.isArray(deleteConfirmationMessage)) {
				deleteConfirmationMessage.forEach(m => m.delete());
			} else {
				deleteConfirmationMessage.delete();
			}
		}
	}

	private addRole(message: Message, roleName: string): Promise<any> {
		if (message.guild.id !== CONST_MUTE_MAGE_ID && message.guild.id !== "223813892332060672") {
			return this.sendInvalid(message);
		}

		if (!this.validRoles.includes(roleName.toLowerCase())) {
			return this.sendInvalid(message);
		}

		const role = message.guild.roles.find(r => new RegExp("^" + this.escape(roleName) + "$", "i").test(r.name));

		if (!role) {
			return this.sendInvalid(message);
		}

		return message.guild.fetchMember(message.author.id).then(member => {
			if (member.roles.has(role.id)) {
				return member.removeRole(role).then(() => {
					return this.sendReplies(message, "OK, I have removed the role " + role.name + ".");
				});
			} else {
				return member.addRole(role).then(() => {
					return this.sendReplies(message, "OK, I have assigned the role " + role.name + ".");
				});
			}
		});
	}

	private tooLongReply(message: Message): void {
		if (message.channel.type === "dm") {
			return;
		}

		if (this.lastUserId !== message.author.id) {
			this.sendReplies(message, "The output from your command was too long, so I have sent you a direct message with the contents.");
		}

		this.lastUserId = message.author.id;
	}

	private sendMessages(message: Message, reply: string): Promise<Message | Message[]> {
		if (reply.length > 0) {
			return message.channel.send(reply, { split: true }).catch((err: Error) => {
				message.reply("Sorry, something went wrong trying to post the reply. Please try again.");
				// console.error(err.response.body.content);
				console.error(err.message);

				return [];
			});
		}

		return Promise.resolve([]);
	}

	private sendReplies(message: Message, reply: string): Promise<Message | Message[]> {
		if (reply.length > 0) {
			return message.reply(reply, { split: true }).catch((err: Error) => {
				message.reply("Sorry, something went wrong trying to post the reply. Please try again.");
				// console.error(err.response.body.content);
				console.error(err.message);

				return [];
			});
		}

		return Promise.resolve([]);
	}

	private sendPM(message: Message, reply: string): Promise<Message | Message[]> {
		if (reply.length > 0) {
			return message.author.send(reply, { split: true }).catch((err: Error) => {
				message.reply("Sorry, something went wrong trying to post the reply. Please try again.");
				// console.error(err.response.body.content);
				console.error(err.message);

				return [];
			});
		}

		return Promise.resolve([]);
	}

	private sendFailed(message: Message) {
		return message.reply("Sorry, I couldn't find any information matching your query.");
	}

	private sendError(message: Message, error: Error) {
		console.error("Caught error: ", error);
		return message.reply("Sorry, there was an error processing your query.");
	}

	private onReady(): void {
		const servers: string[] = [];

		for (let channel of this.bot.channels.array()) {
			if (channel instanceof GuildChannel && servers.indexOf(channel.guild.name) < 0) {
				servers.push(channel.guild.name);
			}
		}

		// 	tslint:disable:no-console
		console.log("Channels: " + this.bot.channels.array().length);
		console.log("Servers: " + servers.join(", "));

		this.db.collection("serverPrefixes").find().toArray().then((docs: Array<any>) => {
			for (let doc of docs) {
				this.serverPrefixes.set(doc.server, doc.prefix);
			}
		});
		this.db.collection("dmPrefixes").find().toArray().then((docs: Array<any>) => {
			for (let doc of docs) {
				this.dmPrefixes.set(doc.channel, doc.prefix);
			}
		});

		console.log("Let's play... Dungeons & Dragons!");
		// 	tslint:enable:no-console
	}

	private sendHelp(message: Message): void {
		const prefix: string = this.getPrefix(message);

		const reply: string = [
			"**Compendium Searching**",
			"To search the full data source run `" + prefix + "search [query]`. This will return a list of matches that you can further query.",
			"To be more specific you can use `" + prefix + "item`, `" + prefix + "race`, `" + prefix + "feat`, `" + prefix + "spell`, `" + prefix + "class`, `" + prefix + "monster`, `" + prefix + "background`, or `" + prefix + "rule`.",
			"To show a rule definition, use `" + prefix + "rule [rulename]` (e.g. `" + prefix + "rule actions in combat`).",
			"For further information on a class's level-specific details, use `" + prefix + "class [classname] [level]` (e.g. `" + prefix + "class bard 3`).",
			"To show a class's spell slots, use `" + prefix + "slots [classname] [optional: level]` (e.g. `" + prefix + "slots bard 3`).",
			"To show a class's spell list, use `" + prefix + "spelllist [classname] [optional: level]` (e.g. `" + prefix + "spelllist bard 3`).",
			"To show monsters by challenge rating, use `" + prefix + "monsterlist [optional: level]` (e.g. `" + prefix + "monsterlist 1/4`).",
			"To search class's abilites, use `" + prefix + "ability [classname] [query]` (e.g. `" + prefix + "ability barbarian rage`).",
			"To search monster abilities use `" + prefix + "mfeat [query]`, `" + prefix + "monsterfeat  [query]`, `" + prefix + "mability [query]`, or `" + prefix + "monsterability [query]` (e.g. `" + prefix + "mfeat life drain`).",
			"To search spells by school use `" + prefix + "spellschools [school] [optional: level]` or `" + prefix + "schools [school] [optional: level]` (e.g. `" + prefix + "schools abjuration 3`).",
			"",
			"**Macros**",
			"To use macros, you must first set the command by using `" + prefix + "macro set macro name=macro expression`. This can then be recalled using `" + prefix + "macro macro name` and I will reply 'macro expression'.",
			"Macros are user-specific so they will only run when you use them. You can also use the shorthand `" + prefix + "m`.",
			"To remove a macro, use `" + prefix + "m del macro name`. This will remove the stored macro from your user. To view all macros associated with your user, use `" + prefix + "m list`.",
			"",
			"**Dice Rolling**",
			"This bot supports the roll20 dice format for rolls (https://wiki.roll20.net/Dice_Reference). To roll type `" + prefix + "r diceString` or `" + prefix + "roll diceString [optional: label]` (e.g. `" + prefix + "r 1d20 + 5 Perception`).",
			"You can also do inline rolls with `[[diceString]]` or `[[label: diceString]]` (e.g `[[Perception: 1d20+5]]`)",
			"If you wish to roll a character's stats, you can quickly roll 6 dice using `" + prefix + "rollstats [rollString = 4d6d]`, where rollString allows you to pass in a custom dice format (defaults to `4d6d`).",
			"",
			"**Name and Villain Generation**",
			"To generate a random NPC name, based upon the DM Screen tables, use the `" + prefix + "genname` command.",
			"To generate a random Villain, based upon the DMG tables, use the `" + prefix + "bbeg [optional: villain name]` command. If you do not specify a name, one will be generated randomly using the `" + prefix + "genname` command.",
			"",
			"**Tables**",
			"To use rollable tables, use the `" + prefix + "table` command. To create a table do `" + prefix + "table create [optional: numberOfRolls] [tableName]`.",
			"To add a value to a table you own: `" + prefix + "table add [optional: rollNumber=1] \"[tableName]\" [newValue]` or:",
			"```",
			"" + prefix + "table add [optional: rollNumber=1] \"[tableName]\"",
			"[newValue...]",
			"```",
			"To name a specific roll use `" + prefix + "table name [optional: rollNumber=1] \"[tableName]\" [rollName]`.",
			"To view a table use `" + prefix + "table view [tableName]`.",
			"To roll a table use `" + prefix + "table roll [tableName]` or `" + prefix + "table [tableName]`.",
			"To delete a table you own use `" + prefix + "table del [tableName]`.",
			"To list all tables available to you use `" + prefix + "table list`",
			"To share a table you own use `" + prefix + "table share [here|server|global] [tableName]` to share with the current channel (here), current server (server) or to make the table public (global).",
			"You can also use `" + prefix + "table sharewith [mention...] [tableName]`, where `[mention]` is one or more Users, Channels or `@everyone` to share with the current server.",
			"To unshare a table, use `unshare` and `unsharewith` respectively.",
			"",
			"**Feedback**",
			"You can report bugs or other issues using `" + prefix + "reportIssue [issue description]`.",
			"You can request new features using `" + prefix + "featureRequest [feature description]`.",
			"You can give us feedback using `" + prefix + "feedback [feedback]`.",
			"These will be posted in the corresponding channels on the bot development server.",
			"",
			"**General**",
			"`" + prefix + "credits` will print a list of credits for the bot.",
			"`" + prefix + "help` will print this help text.",
		].join("\n");

		this.sendPM(message, reply);

		if (message.channel.type !== "dm") {
			this.sendReplies(message, "I have sent the help list to you in a private message.");
		}
	}

	private sendCredits(message: Message) {
		return message.channel.send([
			"This D&D Spell & Monster Discord Bot was built with love by Discord users Verdaniss#3529 and TumnusB#4019.",
			"The data source for this bot is processed from the XML compendium at https://github.com/ceryliae/DnDAppFiles",
		].join("\n"));
	}

	private sendInvalid(message: Message) {
		return message.reply("Sorry, I don't recognise that command");
	}

	private initDB(): Promise<void> {
		let userAuth = "";

		if (process.env.MONGO_USER && process.env.MONGO_PASS) {
			userAuth = process.env.MONGO_USER + ":" + process.env.MONGO_PASS + "@";
		}

		return mongodb.connect("mongodb://" + userAuth + "localhost:27017/discordBot").then((db: Db) => {
			this.db = db;

			return this.checkDBVersion();
		});
	}

	private checkDBVersion(): Promise<void> {
		this.loadCompendium();

		return this.db.collection("metadata").findOne({ "_id": "version" }).then((doc: any) => {
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

		// tslint:disable-next-line:no-console
		console.log("Updating database");
		const inserts: Array<any> = [].concat(this.compendium.item, this.compendium.feat, this.compendium.class, this.compendium.race, this.compendium.spell, this.compendium.monster, this.compendium.background, this.compendium.rule);

		const col: any = this.db.collection("compendium");

		return col.remove({}).then(() => {
			return col.insertMany(inserts).then(() => {
				return this.db.collection("metadata").findOneAndUpdate({ "_id": "version"}, { "_id": "version", "version": this.compendium.version }, { upsert: true }).then(() => {
					// tslint:disable-next-line:no-console
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

	private generateName(): string {
		const nameStart = [ "", "", "", "", "a", "be", "de", "el", "fa", "jo", "ki", "la", "ma", "na", "o", "pa", "re", "si", "ta", "va" ];
		const nameMiddle = [ "bar", "ched", "dell", "far", "gran", "hal", "jen", "kel", "lim", "mor", "net", "penn", "quil", "rong", "sark", "shen", "tur", "vash", "yor", "zen" ];
		const nameEnd = [ "", "a", "ac", "ai", "al", "am", "an", "ar", "ea", "el", "er", "ess", "ett", "ic", "id", "il", "in", "is", "or", "us" ];

		let name: string = nameStart[Math.floor(Math.random() * nameStart.length)] +
			nameMiddle[Math.floor(Math.random() * nameMiddle.length)] +
			nameEnd[Math.floor(Math.random() * nameEnd.length)];

		return DiscordDisplay.toTitleCase(name);
	}

	private sendTestMessage(message: Message): void {
		if (!CREATOR_IDS.includes(message.author.id)) {
			this.sendInvalid(message);
			return;
		}

		const embed = new RichEmbed();
		embed.setTitle("Test embed");
		embed.setDescription("Some words here");
		embed.setColor("#6758FF");
		embed.addField("test", "inline field", true);
		// embed.addField("test", "test field");
		message.channel.sendEmbed(embed);
	}

	private togglePingFunk(message: Message, active?: boolean) {
		if (!CREATOR_IDS.includes(message.author.id) && message.author.id !== "93963201586139136") {
			return this.sendInvalid(message);
		}

		if (active === undefined) {
			this.enablePingFunk = !this.enablePingFunk;
		} else {
			this.enablePingFunk = active;
		}

		return this.sendReplies(message, "`/pingfunk` command has been " + (this.enablePingFunk ? "en" : "dis") + "abled.");
	}

	private pingFunk(message: Message) {
		if (message.guild.id !== CONST_MUTE_MAGE_ID) {
			return this.sendInvalid(message);
		}

		if (!this.enablePingFunk) {
			return this.sendInvalid(message);
		}

		return this.bot.fetchUser("93963201586139136").then((funk: any) => {
			return this.sendMessages(message, "" + funk).then(() => {
				return message.delete();
			});
		}).catch(() => {
			this.sendInvalid(message);
		});
	}

	private togglePingUser(message: Message, active?: boolean) {
		if (!CREATOR_IDS.includes(message.author.id) && message.author.id !== "93963201586139136") {
			return this.sendInvalid(message);
		}

		if (active === undefined) {
			this.enablePingUser = !this.enablePingUser;
		} else {
			this.enablePingUser = active;
		}

		return this.sendReplies(message, "`/pingfunk` command has been " + (active ? "en" : "dis") + "abled.");
	}

	private pingUser(message: Message, user: string) {
		if (message.guild.id !== CONST_MUTE_MAGE_ID) {
			return this.sendInvalid(message);
		}

		if (!this.enablePingUser) {
			return this.sendInvalid(message);
		}

		if (message.mentions.users.size === 0 && !user) {
			return this.sendReplies(message, "Yeah, you're just being stupid now");
		}

		if (message.mentions.users.size === 0) {
			return this.bot.fetchUser(user).then(u => {
				this.sendMessages(message, "" + u).then(() => message.delete());
			}).catch(() => {
				this.sendInvalid(message);
			});
		}

		return this.sendMessages(message, "" + message.mentions.users.first()).then(() => {
			return message.delete();
		}).catch(() => {
			this.sendInvalid(message);
		});
	}

	private runCode(message: Message, content: string): void {
		if (!CREATOR_IDS.includes(message.author.id)) {
			this.sendInvalid(message);
			return;
		}

		try {
			// tslint:disable-next-line:no-eval
			eval(message.content.replace(this.getPrefix(message) + "code ", ""));
		} catch (e) {
			this.sendReplies(message, "YOU FUCKED UP, RETARD!\nError: " + e.message);
		}
	}

	private doSay(message: Message): void {
		if (!CREATOR_IDS.includes(message.author.id)) {
			this.sendInvalid(message);
			return;
		}

		let messageContent: string = message.content;
		const prefix: string = this.getPrefix(message);

		messageContent = messageContent.replace(new RegExp("^" + prefix + "say"), "").trim();
		this.sendMessages(message, messageContent);
		message.delete();
	}

	private sendFeedback(message: Message, channelId: string, feedback: string) {
		const failFeedback = () => this.sendMessages(message, "Sorry, I was unable to record your feedback");

		const server = this.bot.guilds.get(BOT_SERVER_ID);
		if (!server) return failFeedback();

		const channel = server.channels.get(channelId) as TextChannel;
		if (!channel) return failFeedback();

		const user = message.author;
		channel.send("From " + user.tag + " in " + message.guild + ": " + feedback);
		return this.sendReplies(message, "Thanks, your feedback has been recorded");
	}

	private sendMMLog(log: string) {
		const channel = this.bot.channels.get(MUTE_MAGE_GRIM_LOG_CHANNEL) as TextChannel;
		if (!channel) return;

		return channel.send(log, { split: true });
	}

	private sendErrorLog(log: string) {
		const channel = this.bot.channels.get(BOT_DEBUG_CHANNEL_ID) as TextChannel;
		if (!channel) return;

		return channel.send(log, { split: true });
	}
}

const bot: DiscordBot = new DiscordBot();

process.on("exit", () => {
	bot.kill();
});

process.on("unhandledRejection", (reason: Error, p: Promise<any>) => {
	console.error("Unhandled Rejection at: Promise", p, "reason:", formatError(reason));
	bot.logError(`Unhandled Rejection: ${formatError(reason)}`);
});

process.on("uncaughtException", (err: Error) => {
	console.error(`Caught exception: ${formatError(err)}`);
	bot.logError(`Caught exception: ${formatError(err)}`);
});

function formatError(error: any) {
	if (!(error instanceof Error)) { return error.toString(); }

	const stack = error.stack || "";
	return stack.split("\n")
		.slice(0, 2)
		.map((s) => s.trim())
		.join(" ");
}
