# Dungeons and Dragons Discord Bot

This is a discord bot that provides spell and monster lists for Dungeons and Dragons Play-By-Post games. It is written in TypeScript and runs in Node.js.

To build, simply `npm install`. The postinstall task will run the typescript compiler for you. Alternatively, do `npm install -g typescript` and then `tsc --strictNullChecks` in the main directory.

To run the bot, first set the environment variable 'DISCORD_TOKEN' with the token for your discord bot. You can do this by either setting in your linux environment, or by running the task inline using:

```
DISCORD_TOKEN=<INSERT_TOKEN> npm start
```

On Windows, use `set DISCORD_TOKEN=<INSERT_TOKEN>` or set it in the environment variables dialogs.

Then use either `npm start` or `node discordBot.js` to start the bot.