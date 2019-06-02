import { AddCommandMethod, ICommandSet } from "../../lib/command";
import { Context } from "../../lib/context";

const commandSet: ICommandSet = {
	loadCommands(addCommand: AddCommandMethod) {
		addCommand("allhailverdaniss", allHailVerdaniss, { aliases: ["allhailverd"] });
		addCommand("allhailtumnusb", allHailTumnus, { aliases: ["allhailtumnus"] });
		addCommand("allhailkawaiispider", allHailKawaiiSpider, { aliases: ["allhailspider"] });
		addCommand("allhailapplepi", allHailApplepi, { aliases: ["allhailpi"] });
		addCommand("allhailteemu", allHailTeemu);
		addCommand("allhailfunkenspine", allHailFunkenspine, { aliases: ["allhailfunk"] });
	},
};

export = commandSet;

function delay(timeout: number) {
	return new Promise((resolve) => setTimeout(resolve, timeout));
}

async function allHailVerdaniss(context: Context) {
	await context.sendToChannel("All bow before Verdaniss, for he is both wise and mighty!");
}

async function allHailTumnus(context: Context) {
	await context.sendToChannel("Yeah, I guess, I mean some people are into that kinda thing...");
}

async function allHailKawaiiSpider(context: Context) {
	await context.sendToChannel("For some reason, KawaiiSpider thought it would be a good idea to ask for her own allhail...");

	await delay(1000);
	await context.sendToChannel("I mean seriously?");

	await delay(1000);
	await context.sendToChannel("HAHAHAHAHA!");

	await delay(1000);
	await context.sendToChannel("I mean, what did you expect would happen?");

	await delay(5000);
	await context.sendToChannel("ARE YOU HAPPY NOW?!?!?");
}

async function allHailApplepi(context: Context) {
	await context.sendToChannel("ahahahahahahahahahahahahahaha");

	await delay(1000);
	await context.sendToChannel("haha");

	await delay(1000);
	await context.sendToChannel("ha");

	await delay(1000);
	await context.sendToChannel("Wait, you weren't serious, were you?");
}

async function allHailTeemu(context: Context) {
	await context.sendToChannel("Teemu used BANHAMMER");

	await delay(5000);
	await context.sendToChannel("It wasn't very effective...");
}

async function allHailFunkenspine(context: Context) {
	const apocId = "467422229542731778";
	if (context.user.id === apocId) {
		await context.sendToChannel("Fuck you, Apoc");
		return;
	}

	const funkId = "93963201586139136";
	await context.sendToChannel("Hmm... should I ping Funk?");
	const randomNumber = Math.floor(Math.random() * 100000);

	await delay(2000);

	if (randomNumber === 0) {
		await context.sendToChannel("Yes! Hey <@" + funkId + ">");
		return;
	}

	if (randomNumber >= 50000) {
		await context.sendToChannel("Nahhh");
		return;
	}

	await context.sendToChannel("Maybe....");

	await delay(2000);
	if (randomNumber === 1) {
		await context.sendToChannel("Yes! Hey <@" + funkId + ">");
	} else {
		await context.sendToChannel("Nahhh");
	}
}
