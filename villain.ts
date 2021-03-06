// 	tslint:disable:no-console
export class Villain {
	public name: string = "Villain";
	constructor(public form: string, public scheme: string, public method: string, public weakness: string) {}

	public format(): string {
		return "**" + this.name + "** - *" + this.form + "*\n" +
			"*Scheme:* " + this.scheme + "\n" +
			"*Method:* " + this.method + "\n" +
			"*Weakness:* " + this.weakness;
	}

	public print(): void {
		console.log(this.format());
	}
}

export class VillainGenerator {
	private static forms: string[] = [
		"Beast or monstrosity with no particular agenda",
		"Aberration bent on corruption or domination",
		"Fiend bent on corruption or destruction",
		"Dragon bent on domination and plunder",
		"Giant bent on plunder",
		"Undead with any agenda",
		"Undead with any agenda",
		"Fey with a mysterious goal",
		"Humanoid cultist",
		"Humanoid cultist",
		"Humanoid conqueror",
		"Humanoid conqueror",
		"Humanoid seeking revenge",
		"Humanoid schemer seeking to rule",
		"Humanoid schemer seeking to rule",
		"Humanoid criminal mastermind",
		"Humanoid raider or ravager",
		"Humanoid raider or ravager",
		"Humanoid under a curse",
		"Misguided humanoid zealot",
	];
	private static schemes: Array<any> = [
		{
			how: [
				"Acquire a legendary item to prolong life",
				"Ascend to godhood",
				"Become undead or obtain a younger body",
				"Steal a planar creature's essence",
			],
			scheme: "Immortality",
		},
		{
			how: [
				"Seize a position of power or title",
				"Win a contest or tournament",
				"Win favor with a powerful individual",
				"Place a pawn in a position of power",
			],
			scheme: "Influence",
		},
		{
			how: [
				"Obtain an ancient artifact",
				"Build a construct or magical device",
				"Carry out a deity's wishes",
				"Offer sacrifices to a deity",
				"Contact a lost deity or power",
				"Open a gate to another world",
			],
			scheme: "Magic",
		},
		{
			how: [
				"Fulfill an apoca lyptic prophecy",
				"Enact the vengeful will of a god or patron",
				"Spread a vile contagion",
				"Overthrow a government",
				"Trigger a natural disaster",
				"Utterly destroy a bloodline or clan",
			],
			scheme: "Mayhem",
		},
		{
			how: [
				"Prolong the life of a loved one",
				"Prove worthy of another person's love",
				"Raise or restore a dead loved one",
				"Destroy rivals for another person's affection",
			],
			scheme: "Passion",
		},
		{
			how: [
				"Conquer a region or incite a rebellion",
				"Seize control of an army",
				"Become the power behind the throne",
				"Gain the favor of a ruler",
			],
			scheme: "Power",
		},
		{
			how: [
				"Avenge a past humiliation or insult",
				"Avenge a past imprisonment or injury",
				"Avenge the death of a loved one",
				"Retrieve stolen property and punish the thief",
			],
			scheme: "Revenge",
		},
		{
			how: [
				"Control natural resources or trade",
				"Marry into wealth",
				"Plunder ancient ruins",
				"Steal land, goods, or money",
			],
			scheme: "Wealth",
		},
	];
	private static methods: Array<any> = [
		{
			how: [
				"Blight",
				"Crop failure",
				"Drought",
				"Famine",
			],
			method: "Agricultural Devastation",
		},
		{
			method: "Assault or Beatings",
		},
		{
			method: "Bounty Hunting or Assassination",
		},
		{
			how: [
				"Bribery",
				"Enticement",
				"Eviction",
				"Imprisonment",
				"Kidnapping",
				"Legal intimidation",
				"Press gangs",
				"Shackling",
				"Slavery",
				"Threats or harassment",
			],
			method: "Captivity or Coercion",
		},
		{
			how: [
				"Breach of contract",
				"Cheating",
				"Fast talking",
				"Fine print",
				"Fraud or swindling",
				"Quackery or tricks",
			],
			method: "Confidence Scams",
		},
		{
			how: [
				"Conquer a region or incite a rebellion",
				"Seize control of an army",
				"Become the power behind the throne",
				"Gain the favour of a ruler",
			],
			method: "Defamation",
		},
		{
			method: "Dueling",
		},
		{
			how: [
				"Beheading",
				"Burning at the stake",
				"Burying alive",
				"Crucifixion",
				"Drawing and Quartering",
				"Hanging",
				"Impalement",
				"Sacrifice (living)",
			],
			method: "Execution",
		},
		{
			method: "Impersonation or disguise",
		},
		{
			method: "Lying or perjury",
		},
		{
			how: [
				"Hauntings",
				"Illusions",
				"Infernal bargains",
				"Mind control",
				"Petrification",
				"Raising or animating the dead",
				"Summoning monsters",
				"Weather control",
			],
			method: "Magical Mayhem",
		},
		{
			how: [
				"Assassination",
				"Cannibalism",
				"Dismemberment",
				"Drowning",
				"Electrocution",
				"Euthanasia (involuntary)",
				"Disease",
				"Poisoning",
				"Stabbing",
				"Strangulation or suffocation",
			],
			method: "Murder",
		},
		{
			method: "Neglect",
		},
		{
			how: [
				"Betrayal or treason",
				"Conspiracy",
				"Espionage or spying",
				"Genocide",
				"Oppression",
				"Raising taxes",
			],
			method: "Politics",
		},
		{
			how: [
				"Curses",
				"Desecration",
				"False gods",
				"Heresy or cults",
			],
			method: "Religion",
		},
		{
			method: "Stalking",
		},
		{
			how: [
				"Arson",
				"Blackmail or extortion",
				"Burglary",
				"Counterfeiting",
				"Highway robbery",
				"Looting",
				"Mugging",
				"Poaching",
				"Seizing property",
				"Smuggling",
			],
			method: "Theft or Property Crime",
		},
		{
			how: [
				"Acid",
				"Blinding",
				"Branding",
				"Racking",
				"Thumbscrews",
				"Whipping",
			],
			method: "Torture",
		},
		{
			how: [
				"Adultery",
				"Drugs or alcohol",
				"Gambling",
				"Seduction",
			],
			method: "Vice",
		},
		{
			how: [
				"Ambush",
				"Invasion",
				"Massacre",
				"Mercenaries",
				"Rebellion",
				"Terrorism",
			],
			method: "Warfare",
		},
	];

	private static weaknesses: string[] = [
		"A hidden object holds the villain's soul.",
		"The villain's power is broken if the death of its true love is avenged",
		"The villain is weakened in the presence of a particular artifact",
		"A special weapon deals extra damage when used against the villain",
		"The villain is destroyed if it speaks its true name",
		"An ancient prophecy or riddle reveals how the villain can be overthrown",
		"The villain falls when an ancient enemy forgives its past actions",
		"The villain loses its power if a mystic bargain it struck long ago is completed.",
	];

	public static generate() {
		let schemeObj: any = VillainGenerator.schemes[Math.floor(Math.random() * VillainGenerator.schemes.length)];
		let scheme = "";

		if (schemeObj.how) {
			scheme = schemeObj.scheme + " - " + schemeObj.how[Math.floor(Math.random() * schemeObj.how.length)];
		} else {
			scheme = schemeObj.scheme;
		}

		let methodObj = VillainGenerator.methods[Math.floor(Math.random() * VillainGenerator.methods.length)];
		let method = "";

		if (methodObj.how) {
			method = methodObj.method + " - " + methodObj.how[Math.floor(Math.random() * methodObj.how.length)];
		} else {
			method = methodObj.method;
		}

		const form: string = VillainGenerator.forms[Math.floor(Math.random() * VillainGenerator.forms.length)];
		const weakness: string = VillainGenerator.weaknesses[Math.floor(Math.random() * VillainGenerator.weaknesses.length)];

		return new Villain(form, scheme, method, weakness);
	}
}
