// This dice roller class uses the generated pegjs (https://github.com/pegjs/pegjs) file based from the grammar available at https://github.com/BTMorton/dice_roller
// You will need to download the repo and compile the grammar, then copy it into this folder to use

export class DiceRoller {
	private parser: any = require("./diceroll.js");
	private stupidDiceInsults = [
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

	public rollDice(expression: string): string {
		try {
			const roll: any = this.parser.parse(expression);

			const render: string = expression.replace(/\*/g, "\\\*") + ": " + this.render(roll);

			if (render.length > 2000) {
				return expression.replace(/\*/g, "\\\*") + " = " + roll.value;
			}

			return render;
		} catch(e) {
			if (e.message.includes("Invalid reroll target")) {
				return this.stupidDiceInsults[Math.floor(Math.random() * this.stupidDiceInsults.length)];
			}

			throw e;
		}
	}

	private render(roll: any): string {
		let render: string = "";

		let type: string = roll.type;

		if (type.startsWith("root")) {
			type = type.slice(4);
		}

		switch (type) {
			case "groupExpression":
			case "diceExpression":
				render = this.renderGroupExpr(roll);
				break;
			case "group":
				render = this.renderGroup(roll);
				break;
			case "die":
				render = this.renderDie(roll);
				break;
			case "expression":
				render = this.renderExpression(roll);
				break;
			case "roll":
				return this.renderRoll(roll);
			case "fateroll":
				return this.renderFateRoll(roll);
			case "number":
				return roll.value;
			case "fate":
				return "F";
			default:
				throw new Error("Unable to render");
		}

		if (!roll.valid) {
			render = "~~" + render.replace(/~~/g, "") + "~~";
		}

		if (roll.type.startsWith("root")) {
			return render;
		} else {
			return "(" + render + ")";
		}
	}

	private renderGroup(group: any): string {
		const replies: Array<string> = [];

		for (let die of group.dice) {
			replies.push(this.render(die));
		}

		return "{ " + replies.join(" + ") + " } = " + group.value;
	}

	private renderGroupExpr(group: any): string {
		const replies: Array<string> = [];

		for (let die of group.dice) {
			replies.push(this.render(die));
		}

		return replies.length > 1 ? "(" + replies.join(" + ") + ") = " + group.value : replies[0];
	}

	private renderDie(die: any): string {
		const replies: Array<string> = [];

		for (let roll of die.rolls) {
			replies.push(this.render(roll));
		}

		let reply: string = "(" + replies.join(", ") + ")";

		if (!["number", "fate"].includes(die.die.type) || !["number", "fate"].includes(die.count.type)) {
			reply += "[*Rolling: " + this.render(die.count) + "d" + this.render(die.die) + "*]";
		}

		reply += " = " + die.value;
		return reply;
	}

	private renderExpression(expr: any): string {
		if (expr.dice.length > 1) {
			const expressions: Array<string> = [];

			for (let i: number = 0; i < expr.dice.length - 1; i++) {
				expressions.push(this.render(expr.dice[i]));
				expressions.push(expr.ops[i]);
			}

			expressions.push(this.render(expr.dice.slice(-1)[0]));
			expressions.push("=");
			expressions.push(expr.value);

			return expressions.join(" ");
		} else if (expr.dice[0].type == "number") {
			return expr.value;
		} else {
			return this.render(expr.dice[0]);
		}
	}

	private renderRoll(roll: any): string {
		if (!roll.valid) {
			return "~~" + roll.roll + "~~";
		} else if (roll.success && roll.value == "1") {
			return "**" + roll.roll + "**";
		} else if (roll.success && roll.value == "-1") {
			return "*" + roll.roll + "*";
		} else {
			return roll.roll;
		}
	}

	private renderFateRoll(roll: any): string {
		const rollValue: string = roll.roll == 0 ? "0" : roll.roll > 0 ? "+" : "-";

		if (!roll.valid) {
			return "~~" + rollValue + "~~";
		} else if (roll.success && roll.value == "1") {
			return "**" + rollValue + "**";
		} else if (roll.success && roll.value == "-1") {
			return "*" + rollValue + "*";
		} else {
			return rollValue;
		}
	}
}