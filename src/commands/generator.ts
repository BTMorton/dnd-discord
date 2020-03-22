import { AddCommandMethod, capitalise, Context, ICommandSet, VillainGenerator } from "../lib";

const commandSet: ICommandSet = {
	loadCommands(addCommand: AddCommandMethod) {
		addCommand("genname", generateRandomName, {
			help: {
				section: "Random Generation",
				shortDescription: "Random character name generation",
			},
		});
		addCommand("bbeg", generateVillain, {
			help: {
				section: "Random Generation",
				shortDescription: "Random campaign villain generation",
			},
		});
	},
};

export = commandSet;

function generateRandomName(context: Context): void {
	context.sendToChannel(generateName());
}

function generateVillain(context: Context): void {
	const villain = VillainGenerator.generate();

	if (context.messageData) {
		villain.name = capitalise(context.messageData);
	} else {
		villain.name = generateName();
	}

	context.sendToChannel(villain.format());
}

function generateName(): string {
	const nameStart = ["", "", "", "", "a", "be", "de", "el", "fa", "jo", "ki", "la", "ma", "na", "o", "pa", "re", "si", "ta", "va"];
	const nameMiddle = ["bar", "ched", "dell", "far", "gran", "hal", "jen", "kel", "lim", "mor", "net", "penn", "quil", "rong", "sark", "shen", "tur", "vash", "yor", "zen"];
	const nameEnd = ["", "a", "ac", "ai", "al", "am", "an", "ar", "ea", "el", "er", "ess", "ett", "ic", "id", "il", "in", "is", "or", "us"];

	const name = nameStart[Math.floor(Math.random() * nameStart.length)] +
		nameMiddle[Math.floor(Math.random() * nameMiddle.length)] +
		nameEnd[Math.floor(Math.random() * nameEnd.length)];

	return capitalise(name);
}
