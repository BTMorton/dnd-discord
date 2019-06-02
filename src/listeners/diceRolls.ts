import { Message } from "discord.js";
import { filter, map } from "rxjs/operators";
import { AddListenerMethod, CommandHandler, DiceRollManager, IListenerSet, Injector } from "../lib";

const listeners: IListenerSet = {
	loadListeners(addListener: AddListenerMethod) {
		addListener("inlinerolls", subscribeToInlineRolls());
	},
};
export = listeners;

function subscribeToInlineRolls() {
	// 	Get messages that aren't already commands
	return Injector.get(CommandHandler).nonCommandMessages
		//  Look for messages with inline rolls
		.pipe(filter((message: Message) => DiceRollManager.CONST_INLINE_ROLL_REGEX.test(message.content)))
		.pipe(map((message: Message) => {
			const renders = Injector.get(DiceRollManager).inlineRolls(message.content);

			message.channel.send(renders.join("\n"));
		}));
}
