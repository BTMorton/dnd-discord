// This dice roller class uses the generated pegjs (https://github.com/pegjs/pegjs) file based from the grammar available at https://github.com/BTMorton/dice_roller
// You will need to download the repo and compile the grammar, then copy it into this folder to use

import { DiceRoller, DiscordRollRenderer, RollBase } from "dice-roller-parser";

export class DiceRollManager {
	public static CONST_INLINE_ROLL_REGEX = /\[\[([^\]]+)\]\]/g;
	public static stupidDiceInsults = [
		"What, you think I'm stupid?",
		"Oh, yeah, because that was gonna work.",
		"Hey! Everybody! Look at Mr Clever over here!",
		"Yawn.... how about -3?",
		"you're: (a) = dick",
		"Stop trying to break me. Please.",
		"y u do dis",
		"42",
		"Nice try. Idiot.",
		"(╯°□°）╯︵ ┻━┻",
	];

	private diceRoller = new DiceRoller();
	private renderer = new DiscordRollRenderer();

	public inlineRolls(input: string): string[] {
		const matches = input.match(DiceRollManager.CONST_INLINE_ROLL_REGEX);
		if (!matches) { return []; }

		return matches.map((roll) => roll.slice(2, -2))
			.map((roll) => {
				if (!roll.includes(":")) { return roll; }
				const index = roll.indexOf(":");
				return `${roll.slice(index + 1).trim()} ${roll.slice(0, index).trim()}`;
			})
			.map((roll) => this.rollDice(roll));
	}

	public rollDice(expression: string, shortOutput = false): string {
		try {
			const roll = this.diceRoller.roll(expression);
			const escapedInput = expression.replace(/\*/g, "\\\*");
			const render = `${escapedInput}: ${this.renderer.render(roll)}`;

			if (render.length > 2000 || shortOutput) {
				return `${escapedInput} = ${roll.value}`;
			}

			return render;
		} catch (e) {
			if (e.message.includes("Invalid reroll target")) {
				return DiceRollManager.stupidDiceInsults[Math.floor(Math.random() * DiceRollManager.stupidDiceInsults.length)];
			}

			throw e;
		}
	}

	public displayRoll(roll: RollBase): string {
		return this.renderer.render(roll);
	}
}
