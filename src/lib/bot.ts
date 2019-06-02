import { Channel, Client, ClientUserGuildSettings, ClientUserSettings, Collection, Emoji, Guild, GuildMember, Message, MessageReaction, RateLimitInfo, Role, Snowflake, TextChannel, User, UserResolvable, VoiceBroadcast } from "discord.js";
import { Observable, Observer, Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { formatError } from "./index";

export class Bot {
	private static CONST_RECONNECT_ATTEMPT_LIMIT = 10;
	private static CONST_DEBUG_CHANNEL_ID = "584455733781987333";

	public messages: Subject<Message> = new Subject();
	private bot: Client = new Client();
	private reconnectAttempts = 0;
	private reconnectTimeout: NodeJS.Timeout | null = null;
	private token: string;
	private active = false;
	private unsubscribe: Subject<void> = new Subject<void>();
	private debugChannel: TextChannel | undefined;

	get isActive() {
		return this.active;
	}

	get client() {
		return this.bot;
	}

	constructor() {
		if (!("DISCORD_TOKEN" in process.env)) {
			throw new Error("Discord connection token must be provided.");
		}

		this.token = process.env.DISCORD_TOKEN as string;
	}

	public async startBot() {
		this.observe("ready")
			.pipe(takeUntil(this.unsubscribe))
			.subscribe(() => this.onReady.bind(this));

		this.observe("error")
			.pipe(takeUntil(this.unsubscribe))
			.subscribe(([error]) => {
				console.error(`Discord error recieved: ${formatError(error)}`);
				this.sendDebugMessage(`Discord error recieved: ${formatError(error)}`);
			});

		this.observe("reconnecting")
			.pipe(takeUntil(this.unsubscribe))
			.subscribe(() => {
				console.error("The bot is attempting to reconnect...");

				if (this.reconnectTimeout) {
					clearTimeout(this.reconnectTimeout);
					this.reconnectTimeout = null;
				}
			});

		this.observe("disconnect")
			.pipe(takeUntil(this.unsubscribe))
			.subscribe(() => {
				console.error("The bot was disconnected. Attempting to reconnect...");

				this.active = false;
				this.attemptReconnect();
			});

		await this.bot.login(process.env.DISCORD_TOKEN);

		this.debugChannel = this.bot.channels.get(Bot.CONST_DEBUG_CHANNEL_ID) as TextChannel;
	}

	public sendDebugMessage(message: string) {
		if (this.debugChannel) {
			this.debugChannel.send(message);
		}
	}

	public destroy() {
		this.unsubscribe.next();
		this.bot.destroy();
	}

	public observe(eventName: "channelCreate" | "channelDelete"): Observable<[Channel]>;
	public observe(eventName: "channelPinsUpdate"): Observable<[Channel, Date]>;
	public observe(eventName: "channelUpdate"): Observable<[Channel, Channel]>;
	public observe(eventName: "clientUserGuildSettingsUpdate"): Observable<[ClientUserGuildSettings]>;
	public observe(eventName: "clientUserSettingsUpdate"): Observable<[ClientUserSettings]>;
	public observe(eventName: "debug" | "warn"): Observable<[string]>;
	public observe(eventName: "disconnect"): Observable<[any]>;
	public observe(eventName: "emojiCreate" | "emojiDelete"): Observable<[Emoji]>;
	public observe(eventName: "emojiUpdate"): Observable<[Emoji, Emoji]>;
	public observe(eventName: "error"): Observable<[Error]>;
	public observe(eventName: "guildBanAdd" | "guildBanRemove"): Observable<[Guild, User]>;
	public observe(eventName: "guildCreate" | "guildDelete" | "guildUnavailable" | "guildIntegrationsUpdate"): Observable<[Guild]>;
	public observe(eventName: "guildMemberAdd" | "guildMemberAvailable" | "guildMemberRemove"): Observable<[GuildMember]>;
	public observe(eventName: "guildMembersChunk"): Observable<[GuildMember[], Guild]>;
	public observe(eventName: "guildMemberSpeaking"): Observable<[GuildMember, boolean]>;
	public observe(eventName: "guildMemberUpdate" | "presenceUpdate"): Observable<[GuildMember, GuildMember]>;
	public observe(eventName: "guildUpdate"): Observable<[Guild, Guild]>;
	public observe(eventName: "message" | "messageDelete" | "messageReactionRemoveAll"): Observable<[Message]>;
	public observe(eventName: "messageDeleteBulk"): Observable<[Collection<Snowflake, Message>]>;
	public observe(eventName: "messageReactionAdd" | "messageReactionRemove"): Observable<[MessageReaction, User]>;
	public observe(eventName: "messageUpdate"): Observable<[Message, Message]>;
	public observe(eventName: "rateLimit"): Observable<[RateLimitInfo]>;
	public observe(eventName: "ready"): Observable<[void]>;
	public observe(eventName: "reconnecting"): Observable<[VoiceBroadcast]>;
	public observe(eventName: "resume"): Observable<[number]>;
	public observe(eventName: "roleCreate"|"roleDelete"): Observable<[Role]>;
	public observe(eventName: "roleUpdate"): Observable<[Role, Role]>;
	public observe(eventName: "typingStart"|"typingStop"): Observable<[Channel, User]>;
	public observe(eventName: "userNoteUpdate"): Observable<[UserResolvable, string, string]>;
	public observe(eventName: "userUpdate"|"voiceStateUpdate"): Observable<[User, User]>;
	public observe(eventName: "webhookUpdate"): Observable<[TextChannel]>;
	public observe(eventName: string): Observable<any[]> {
		return Observable.create((observer: Observer<any[]>) => {
			const listener = (...args: any[]) => observer.next(args);
			this.bot.on(eventName, listener);

			return () => this.bot.off(eventName, listener);
		});
	}

	private onReady(): void {
		this.active = true;

		// 	tslint:disable:no-console
		console.log("Total Guild Count: " + this.bot.guilds.size);
		console.log("Total Channel Count: " + this.bot.channels.size);

		this.bot.guilds.forEach((guild) =>
			console.log(`${guild.name} - (${guild.channels.size})`));

		console.log("\nLet's play... Dungeons & Dragons!");
		// 	tslint:enable:no-console
	}

	private attemptReconnect() {
		if (this.reconnectAttempts >= Bot.CONST_RECONNECT_ATTEMPT_LIMIT) {
			return process.exit(-1);
		}

		if (!this.reconnectTimeout) {
			this.reconnectTimeout = setTimeout(async () => {
				this.reconnectTimeout = null;

				this.reconnectAttempts++;

				try {
					await this.bot.login(this.token);
				} catch (e) {
					console.error("Unable to login", e.stack);
					this.attemptReconnect();
				}
			}, 1000 * this.reconnectAttempts);
		}
	}
}
