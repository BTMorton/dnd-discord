// This D&D Spell & Monster Discord Bot was created by Verdaniss#3529 and TumnusB#4019
// The spells list is taken from http://ephe.github.io/grimoire/
// The monster list is taken from http://chisaipete.github.io/bestiary/

const Discord = require('discord.js');
const bot = new Discord.Client();
const http = require('http');
const botToken = "";
let spellList;
let monsterList;

try {
	spellList = require("./parsedSpells.json");
} catch (e) {
	console.log("Please generate a parsed spells JSON file using spells.js");
}
try {
	monsterList = require("./parsedMonsters.json");
} catch (e) {
	console.log("Please generate a parsed monsters JSON file using monsters.js");
}


const spellBaseUrl = "http://ephe.github.io/grimoire/spells/";
const monsterBaseUrl = "http://chisaipete.github.io/bestiary/creatures/";
const prefix = "!";

bot.on('ready', () => {
  console.log("Let's play.... Dungeons & Dragons!");
});

bot.on('message', processMessage);

bot.login(botToken);

function sendHelp(message) {
	message.reply("Type !spell followed by spell name (e.g. !spell gust), or !monster followed by monster name (e.g. !monster adult white dragon), and I'll look up the relevant info for you.");
}

function sendCredits(message) {
	message.reply("This D&D Spell & Monster Discord Bot was built with love by Discord users Verdaniss#3529 and TumnusB#4019. The spell list is taken from http://ephe.github.io/grimoire/ and the monster list is taken from http://chisaipete.github.io/bestiary/");
}

function processMessage(message) {
	if (message.content[0] === prefix) {
		let args = message.content.slice(1).toLowerCase().split(" ").filter((s) => s);
		
		if (args.length === 0) {
			sendHelp(message);
		}
		
		switch (args[0]) {
			case "spell":
			case "spells":
				if (spellList) {
					if (args.length > 1) {
						let spell = args.slice(1).join("-");
						processSpell(message, spell);
					} else {
						sendHelp(message);
					}
				}
				break;
			case "monster":
			case "monsters":
				if (monsterList) {
					if (args.length > 1) {
						let monster = args.slice(1).join("-");
						processMonster(message, monster);
					} else {
						sendHelp(message);
					}
				}
				break;
			case "credit":
			case "credits":
				sendCredits(message);
				break;
			case "help":
				sendHelp(message);
				break;
		}
	}
}

function processSpell(message, spellName) {
	if (spellList.hasOwnProperty(spellName)) {
		const spell = spellList[spellName];
		
		const reply = [
			"*" + spell.name + "*",
			spell.description,
			spellBaseUrl + spellName,
		];
		
		let replyStr = reply.join("\n");
		
		const replies = [ ];
		const maxLength = 2000 - (message.author.username.length + 15);
		
		while (replyStr.length > maxLength) {
			const index = replyStr.lastIndexOf(" ", maxLength);
			replies.push(replyStr.slice(0, index));
			replyStr = replyStr.slice(index + 1);
		}
		
		replies.push(replyStr);
		
		sendReplies(message, replies);
	} else {
		message.reply("Sorry, I couldn't find any information on that spell.");
	}
}

function processMonster(message, monsterName) {
	if (monsterList.hasOwnProperty(monsterName)) {
		const monster = monsterList[monsterName];
		
		const reply = [
			"*" + monster.name + "*",
			monster.description,
			monsterBaseUrl + monsterName,
		];
		
		let replyStr = reply.join("\n");
		
		const replies = [ ];
		const maxLength = 2000 - (message.author.username.length + 15);
		
		while (replyStr.length > maxLength) {
			const index = replyStr.lastIndexOf(" ", maxLength);
			replies.push(replyStr.slice(0, index));
			replyStr = replyStr.slice(index + 1);
		}
		
		replies.push(replyStr);
		
		sendReplies(message, replies);
	} else {
		message.reply("Sorry, I couldn't find any information on that monster.");
	}
}

function sendReplies(message, replies) {
	if (replies.length > 0) {
		return message.reply("\n" + replies.shift()).then((msg) => {
			return sendReplies(message, replies);
		}).catch((err) => {
			message.reply("Sorry, something went wrong trying to post the spell reply. Please try again.");
			console.error(err.response.body.content);
		});
	}
}