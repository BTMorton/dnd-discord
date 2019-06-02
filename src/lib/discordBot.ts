import { Bot, CommandHandler, Database, Injector } from "./index";

export class DiscordBot {
	private db = Injector.get(Database);
	private bot = Injector.get(Bot);
	private commandHandler = Injector.get(CommandHandler);

	public async start() {
		try {
			await this.db.connect();
			await this.bot.startBot();
			await this.commandHandler.start();
		} catch (e) {
			console.error("Error enountered during start-up:", e.stack);
			this.shutdown();
		}
	}

	public async shutdown() {
		await Promise.all([
			this.commandHandler.destroy(),
			this.bot.destroy(),
			this.db.destroy(),
		]);
	}

	public logError(message: string) {
		this.bot.sendDebugMessage(message);
	}
}
