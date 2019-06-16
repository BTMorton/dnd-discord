// This dice roller class uses the generated pegjs (https://github.com/pegjs/pegjs) file based from the grammar available at https://github.com/BTMorton/dice_roller
// You will need to download the repo and compile the grammar, then copy it into this folder to use

import { DiceExpressionRoll, DiceRoller, DiceRollResult, DieRoll, ExpressionRoll, FateDieRoll, GroupRoll, RollBase } from "dice_roller";

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

	public inlineRolls(input: string): string[] {
		const matches = input.match(DiceRollManager.CONST_INLINE_ROLL_REGEX);
		if (!matches) { return []; }

		return matches.map((roll) => roll.slice(2, -2))
			.map((roll) => this.rollDice(roll));
	}

	public rollDice(expression: string, shortOutput = false): string {
		try {
			const roll = this.diceRoller.roll(expression);
			const escapedInput = expression.replace(/\*/g, "\\\*");
			const render = `${escapedInput}: ${this.render(roll, true)}`;

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

	private render(roll: RollBase, root = false): string {
		let render = "";

		const type: string = roll.type;

		switch (type) {
			case "diceexpressionroll":
				render = this.renderGroupExpr(roll as DiceExpressionRoll);
				break;
			case "grouproll":
				render = this.renderGroup(roll as GroupRoll);
				break;
			case "die":
				render = this.renderDie(roll as DiceRollResult);
				break;
			case "expressionroll":
				render = this.renderExpression(roll as ExpressionRoll);
				break;
			case "roll":
				return this.renderRoll(roll as DieRoll);
			case "fateroll":
				return this.renderFateRoll(roll as FateDieRoll);
			case "number":
				const label = roll.label
					? ` (${roll.label})`
					: "";
				return `${roll.value}${label}`;
			case "fate":
				return `F`;
			default:
				throw new Error("Unable to render");
		}

		if (!roll.valid) {
			render = "~~" + render.replace(/~~/g, "") + "~~";
		}

		if (root) { return render; }

		return roll.label ? `(${roll.label}: ${render})` : `(${render})`;
	}

	private renderGroup(group: GroupRoll): string {
		const replies: string[] = [];

		for (const die of group.dice) {
			replies.push(this.render(die));
		}

		return "{ " + replies.join(" + ") + " } = " + group.value;
	}

	private renderGroupExpr(group: DiceExpressionRoll): string {
		const replies: string[] = [];

		for (const die of group.dice) {
			replies.push(this.render(die));
		}

		return replies.length > 1 ? "(" + replies.join(" + ") + ") = " + group.value : replies[0];
	}

	private renderDie(die: DiceRollResult): string {
		const replies: string[] = [];

		for (const roll of die.rolls) {
			replies.push(this.render(roll));
		}

		let reply: string = "(" + replies.join(", ") + ")";

		if (!["number", "fate"].includes(die.die.type) || die.count.type !== "number") {
			reply += "[*Rolling: " + this.render(die.count) + "d" + this.render(die.die) + "*]";
		}

		reply += ` = ${die.value}${die.matched ? " Matches" : ""}`;
		return reply;
	}

	private renderExpression(expr: ExpressionRoll): string {
		if (expr.dice.length > 1) {
			const expressions: string[] = [];

			for (let i = 0; i < expr.dice.length - 1; i++) {
				expressions.push(this.render(expr.dice[i]));
				expressions.push(expr.ops[i]);
			}

			expressions.push(this.render(expr.dice.slice(-1)[0]));
			expressions.push("=");
			expressions.push(expr.value + "");

			return expressions.join(" ");
		} else if (expr.dice[0].type === "number") {
			return expr.value + "";
		} else {
			return this.render(expr.dice[0]);
		}
	}

	private renderRoll(roll: DieRoll): string {
		let rollDisplay = `${roll.roll}`;
		if (!roll.valid) {
			rollDisplay = `~~${roll.roll}~~`;
		} else if (roll.success && roll.value === 1) {
			rollDisplay = `**${roll.roll}**`;
		} else if (roll.success && roll.value === -1) {
			rollDisplay = `*${roll.roll}*`;
		}

		if (roll.matched) {
			rollDisplay = `__${rollDisplay}__`;
		}

		if (roll.label) {
			rollDisplay = ` (${rollDisplay})`;
		}

		return rollDisplay;
	}

	private renderFateRoll(roll: FateDieRoll): string {
		const rollValue: string = roll.roll === 0
			? "0"
			: roll.roll > 0
				? "+"
				: "-";

		let rollDisplay = `${roll.roll}`;
		if (!roll.valid) {
			rollDisplay = `~~${rollValue}~~`;
		} else if (roll.success && roll.value === 1) {
			rollDisplay = `**${rollValue}**`;
		} else if (roll.success && roll.value === -1) {
			rollDisplay = `*${rollValue}*`;
		}

		if (roll.matched) {
			rollDisplay = `__${rollDisplay}__`;
		}

		if (roll.label) {
			rollDisplay = ` (${rollDisplay})`;
		}

		return rollDisplay;
	}
}
