import { DMChannel, Guild, Message, MessageEmbed, MessageMentions, NewsChannel, TextChannel, User } from "discord.js";
import { flatMap } from "./common";

export class Context {
	public command: string;
	public channelPrefix: string;
	private message: Message;
	private _messageData!: string;
	private _args!: string[];

	constructor(message: Message, prefix: string, command = "") {
		this.message = message;
		this.channelPrefix = prefix;
		this.command = command;

		this.messageData = message.content.replace(new RegExp(`^${prefix}${command}`, "i"), "").trim();
	}

	get messageData(): string {
		return this._messageData;
	}

	set messageData(data: string) {
		this._messageData = data;
		this._args = data.split(/\s+/)
			.filter((s) => !!s);
	}

	get messageId(): string {
		return this.message.id;
	}

	get rawMessage(): Message {
		return this.message;
	}

	get guild(): Guild {
		return this.message.guild!;
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

	get channel(): TextChannel | DMChannel | NewsChannel {
		return this.message.channel;
	}

	get args(): string[] {
		return this._args;
	}

	public delete() {
		return this.message.delete();
	}

	public reply(message: string | MessageEmbed[]): Promise<Message[]> {
		const promises = typeof message === "string"
			? this.message.reply(message, { split: true })
			: Promise.all(flatMap(message, (embed) => this.splitEmbed(embed))
				.map((embed) => this.message.reply(embed))) as Promise<Message | Message[] | Message[][]>;

		return promises.then((m) => this.fixMessageArray(m));
	}

	public sendToChannel(message: string | MessageEmbed[]): Promise<Message[]> {
		const promises = typeof message === "string"
			? this.channel.send(message, { split: true })
			: Promise.all(flatMap(message, (embed) => this.splitEmbed(embed))
				.map((embed) => this.channel.send(embed))) as Promise<Message | Message[] | Message[][]>;

		return promises.then((m) => this.fixMessageArray(m));
	}

	public sendPM(message: string | MessageEmbed[]): Promise<Message[]> {
		const promises = typeof message === "string"
			? this.message.author.send(message, { split: true })
			: Promise.all(flatMap(message, (embed) => this.splitEmbed(embed))
				.map((embed) => this.message.author.send(embed))) as Promise<Message | Message[] | Message[][]>;

		return promises.then((m) => this.fixMessageArray(m));
	}

	private fixMessageArray(messages: Message | Message[] | Message[][]): Message[] {
		return messages instanceof Array
			? flatMap<Message | Message[], Message>(messages, (message) => this.fixMessageArray(message))
			: [messages];
	}

	private splitEmbed(embed: MessageEmbed) {
		if (embed.length < 6000) return [embed];

		const embeds: MessageEmbed[] = [];

		const getNewEmbed = () => {
			const newEmbed = new MessageEmbed();
			newEmbed.setTitle(embed.title);
			if (embed.color) newEmbed.setColor(embed.color);
			return newEmbed;
		};

		let lastEmbed = getNewEmbed();
		if (embed.author) lastEmbed.setAuthor(embed.author);
		if (embed.url) lastEmbed.setURL(embed.url);
		if (embed.image) lastEmbed.setImage(embed.image.url);
		if (embed.description) lastEmbed.setDescription(embed.description);

		if (embed.fields) {
			for (const field of embed.fields) {
				const totalLength = lastEmbed.length + field.name.length + field.value.length;
				if (totalLength > 6000) {
					embeds.push(lastEmbed);
					lastEmbed = getNewEmbed();
				}

				lastEmbed.addField(field.name, field.value, field.inline);
			}
		}

		if (embed.footer) { lastEmbed.setFooter(embed.footer); }

		embeds.push(lastEmbed);
		return embeds;
	}
}
