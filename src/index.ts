import { DiscordBot, formatError, Injector } from "./lib";

const discordBot = Injector.get(DiscordBot);
discordBot.start();

process.on("exit", () => {
	discordBot.shutdown();
});

process.on("unhandledRejection", (reason, p) => {
	console.error("Unhandled Rejection at: Promise", p, "reason:", formatError(reason));
	discordBot.logError(`Unhandled Rejection: ${formatError(reason)}`);
});

process.on("uncaughtException", (err) => {
	console.error(`Caught exception: ${formatError(err)}`);
	discordBot.logError(`Caught exception: ${formatError(err)}`);
});
