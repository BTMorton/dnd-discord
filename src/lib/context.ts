import { DMChannel, GroupDMChannel, Guild, Message, MessageMentions, TextChannel, User } from "discord.js";

export class Context {
	public command: string;
	public messageData: string;
	public channelPrefix: string;
	private message: Message;

	constructor(message: Message, prefix: string, command = "") {
		this.message = message;
		this.channelPrefix = prefix;
		this.command = command;

		this.messageData = message.content.replace(new RegExp(`^${prefix}${command}`, "i"), "").trim();
	}

	get rawMessage(): Message {
		return this.message;
	}

	get guild(): Guild {
		return this.message.guild;
	}

	get mentions(): MessageMentions {
		return this.message.mentions;
	}

	get content(): string {
		return this.message.content;
	}

	get user(): User {
		return this.message.author;
	}

	get channel(): TextChannel | DMChannel | GroupDMChannel {
		return this.message.channel;
	}

	get args(): string[] {
		return this.messageData.split(" ");
	}

	public delete() {
		return this.message.delete();
	}

	public reply(text: string): Promise<Message[]> {
		return this.message.reply(text, { split: true })
			.then((messages) => messages instanceof Array ? messages : [ messages ]);
	}

	public sendToChannel(text: string): Promise<Message[]> {
		return this.channel.send(text, { split: true })
			.then((messages) => messages instanceof Array ? messages : [ messages ]);
	}

	public sendPM(text: string): Promise<Message[]> {
		return this.message.author.send(text, { split: true })
			.then((messages) => messages instanceof Array ? messages : [ messages ]);
	}
}
