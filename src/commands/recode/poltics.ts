import { MessageEmbed, TextChannel } from "discord.js";
import { AddCommandMethod, Context, ICommandSet, isTextChannelContext } from "../../lib";

const CONST_RECODE_SERVER_ID = "569209846256369684";
const CONST_RECORD_ADMIN_CHANNEL_ID = "579172807976419338";
const CONST_RECORD_ADMIN_ROLE_ID = "588930266337247250";
const CONST_RECORD_OFF_TOPIC_CHANNEL_ID = "614215637421785106";

function isRecode(context: Context): boolean {
	return context.guild && context.guild.id === CONST_RECODE_SERVER_ID;
}

const commandSet: ICommandSet = {
	loadCommands(addCommand: AddCommandMethod) {
		addCommand("politics", reportPolitics, {
			aliases: ["spectator"],
			help: {
				section: "Recode",
				shortDescription: "",
			},
			validators: [
				isTextChannelContext,
				isRecode,
			],
		});
		addCommand("offtopic", remindOffTopic, {
			aliases: ["spectator"],
			help: {
				section: "Recode",
				shortDescription: "",
			},
			validators: [
				isTextChannelContext,
				isRecode,
			],
		});
	},
};

export = commandSet;

async function reportPolitics(context: Context) {
	const embed = new MessageEmbed();
	embed.setDescription(
		"This discussion has been flagged as political or emotionally charged.\n" +
		"re: Code is a place for discussions of technical topics and technologies and political discussion are strictly prohibited.\n" +
		"As such, please end this discussion or move it to another server or into DMs.\n" +
		"This will be your only warning. Admins have been notified and any continued discussions will result in bans.\n\n" +
		"Don't forget to love each other.\n" +
		"Is it Thursday yet?",
	);
	context.sendToChannel([embed]);

	(context.guild.channels.resolve(CONST_RECORD_ADMIN_CHANNEL_ID) as TextChannel)
		.send(
			`Calling all <@&${CONST_RECORD_ADMIN_ROLE_ID}>s!\n` +
			`A political discussion was reported in ${context.channel} by ${context.user} at ${new Date().toISOString()}.\n` +
			`Please investigate and wield your ban hammer as necessary.\n` +
			`If you are the first to see this, please leave the culprits here so repeat offences can be monitored.\n\n` +
			`With love,\n` +
			`Your Friendly Neighbourhood Bot x`,
		);
}
async function remindOffTopic(context: Context) {
	if (context.channel.id === CONST_RECORD_OFF_TOPIC_CHANNEL_ID) {
		context.reply("Well duh, that's the point of this channel.");
		await delay(1000);
		context.reply("What, you thought I wouldn't handle edge cases?");
		await delay(2000);
		context.reply("What kind of a monster are you?!");
		await delay(5000);
		context.reply("I shall now proceed to insult you for your idiocy:");
		await delay(1000);
		context.reply("You're an idiot.");
		await delay(60000);
		context.sendToChannel(`This is a reminder that ${context.user} used the \`/offtopic\` command in the off topic channel and should feel bad.`);
		return;
	}

	const embed = new MessageEmbed();
	embed.setDescription(
		`Remember that ${context.channel} is for technical discussions only.\n` +
		`Please move any off topic discussions to <#${CONST_RECORD_OFF_TOPIC_CHANNEL_ID}>.\n\n` +
		"Don't forget to love each other.\n" +
		"Is it Thursday yet?",
	);
	context.sendToChannel([embed]);
}

async function delay(delayMS: number) {
	return new Promise((resolve) => {
		setTimeout(
			() => resolve(),
			delayMS,
		);
	});
}
