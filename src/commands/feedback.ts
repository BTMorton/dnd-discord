import { TextChannel } from "discord.js";
import { AddCommandMethod, Bot, Context, ICommandSet, Injector } from "../lib";
import * as consts from "../lib/constants";

const commandSet: ICommandSet = {
	loadCommands(addCommand: AddCommandMethod) {
		addCommand("reportissue", sendFeedback.bind(null, consts.ISSUE_CHANNEL_ID));
		addCommand("featurerequest", sendFeedback.bind(null, consts.FEAT_CHANNEL_ID));
		addCommand("feedback", sendFeedback.bind(null, consts.FEEDBACK_CHANNEL_ID));
	},
};

export = commandSet;

async function sendFeedback(channelId: string, context: Context) {
	const failFeedback = async () => { await context.sendToChannel("Sorry, I was unable to record your feedback"); };

	const bot = Injector.get(Bot).client;
	const server = bot.guilds.get(consts.BOT_SERVER_ID);
	if (!server) return failFeedback();

	const channel = server.channels.get(channelId) as TextChannel;
	if (!channel) return failFeedback();

	const user = context.user;
	channel.send(`From ${user.tag} in ${context.guild}: ${context.messageData}`);
	await context.reply("Thanks, your feedback has been recorded");
}
