import { AddCommandMethod, Context, Database, ICommandSet, Injector, isGuildChannel, isTextChannel } from "../lib";

const commandSet: ICommandSet = {
	loadCommands(addCommand: AddCommandMethod) {
		addCommand("table", processTable, {
			aliases: ["tables"],
			help: {
				section: "Random Generation",
				shortDescription: "Commands for managing custom rollable tables",
			},
		});
	},
};

export = commandSet;

function getCollection() {
	return Injector.get(Database).getCollection("tables");
}

async function processTable(context: Context) {
	const args = context.args.slice();

	switch (args[0]) {
		case "create":
			await createTable(context, args.slice(1));
			break;
		case "add":
			await addToTable(context, args.slice(1));
			break;
		case "name":
			await setTableName(context, args.slice(1));
			break;
		case "view":
			await viewTable(context, args.slice(1).join(" "));
			break;
		case "list":
			await listTables(context);
			break;
		case "del":
		case "delete":
		case "remove":
			await deleteTable(context, args.slice(1).join(" "));
			break;
		case "roll":
			await rollTable(context, args.slice(1).join(" "));
			break;
		case "share":
			switch (args[1]) {
				case "here":
					await shareTableChannel(context, args.slice(2).join(" "));
					break;
				case "global":
					await shareTableGlobal(context, args.slice(2).join(" "));
					break;
				case "server":
					await shareTableGuild(context, args.slice(2).join(" "));
					break;
				default:
					context.reply("Sorry, I can't share with " + args[1]);
					break;
			}
			break;
		case "sharewith":
			await shareTableMentions(context, args.slice(1));
			break;
		case "unshare":
			switch (args[1]) {
				case "here":
					await unshareTableChannel(context, args.slice(2).join(" "));
					break;
				case "global":
					await unshareTableGlobal(context, args.slice(2).join(" "));
					break;
				case "server":
					await unshareTableGuild(context, args.slice(2).join(" "));
					break;
				default:
					context.reply("Sorry, I can't share with " + args[1]);
					break;
			}
			break;
		case "unsharewith":
			await unshareTableMentions(context, args.slice(1));
			break;
		default:
			await rollTable(context, args.join(" "));
			break;
	}
}

function generateTableQuery(context: Context, name?: string) {
	const query: any = { $or: [{ global: true }, { channels: context.channel.id }, { users: context.user.id }, { user: context.user.id }] };

	if (context.guild) {
		query.$or.push({ guilds: context.guild.id });
	}

	if (name) {
		return { $and: [{ name }, query] };
	} else {
		return query;
	}
}

async function createTable(context: Context, args: string[]) {
	let tableCount = 1;

	if (args.length > 0) {
		const tableNumber = parseInt(args[0], 10);

		if (!isNaN(tableNumber)) {
			tableCount = tableNumber;

			args = args.slice(1);
		}
	}

	const tableName = args.join(" ");

	const newTable: any = {
		channels: [],
		count: tableCount,
		global: false,
		guilds: [],
		name: tableName,
		rolls: [],
		user: context.user.id,
		users: [],
	};

	for (let i = 0; i < tableCount; i++) {
		newTable.rolls.push({
			name: "",
			roll: i,
			values: [],
		});
	}

	const query: any = { name: tableName };
	let shouldUpdate = true;

	const collection = (await getCollection());
	try {
		const doc = await collection.findOne(query);
		if (doc) {
			shouldUpdate = false;
		}
		// tslint:disable-next-line:no-empty
	} catch (_) { }

	if (shouldUpdate) {
		await collection.insertOne(newTable);
		await context.reply("OK, I've created that table for you.");
	} else {
		await context.reply(`Sorry, there is already a table with the name '${tableName}'.`);
	}
}

async function addToTable(context: Context, args: string[]) {
	let tableCount = 1;

	if (args.length > 0) {
		const tableNumber = parseInt(args[0], 10);

		if (!isNaN(tableNumber)) {
			tableCount = tableNumber;

			args = args.slice(1);
		}
	}

	const lines: string[] = args.join(" ").split("\n");
	const first = lines[0];
	let title = "";

	if (first.match(/^"|'/)) {
		const quote: string = first[0];
		const lastIndex: number = first.indexOf(quote, 1);
		title = first.slice(1, lastIndex);
		lines[0] = first.slice(lastIndex + 1).trim();
	} else {
		const parts: string[] = first.split(" ").filter((el) => el.trim() !== "");

		if (parts.length > 0) {
			title = parts.shift() as string;
			lines[0] = parts.join(" ").trim();
		}
	}

	if (lines[0] === "") {
		lines.shift();
	}

	const query: any = { name: title, user: context.user.id };

	const update = {
		$push: {
			[`rolls.${tableCount - 1}.values`]: {
				$each: lines,
			},
		},
	};

	const collection = await getCollection();
	const result = await collection.findOneAndUpdate(query, update);
	await result.value
		? context.reply("OK, I have updated the table for you.")
		: sendNotFound(context, title);
}

async function setTableName(context: Context, args: string[]) {
	let tableCount = 1;

	if (args.length > 0) {
		const tableNumber = parseInt(args[0], 10);

		if (!isNaN(tableNumber)) {
			tableCount = tableNumber;

			args = args.slice(1);
		}
	}

	const lines: string[] = args.join(" ").split("\n");
	const first = lines[0];
	let title = "";
	let tableName = "";

	if (first.match(/^"|'/)) {
		const quote = first[0];
		const lastIndex = first.indexOf(quote, 1);
		title = first.slice(1, lastIndex);
		tableName = first.slice(lastIndex + 1).trim();
	} else {
		const parts: string[] = first.split(" ").filter((el) => el.trim() !== "");

		if (parts.length > 0) {
			title = parts.shift() as string;
			tableName = parts.join(" ");
		}
	}

	const query: any = { name: title, user: context.user.id };
	const update = {
		$set: {
			[`rolls.${tableCount - 1}.name`]: tableName,
		},
	};

	const collection = await getCollection();
	const result = await collection.findOneAndUpdate(query, update);
	await result.value
		? await context.reply("OK, I have updated the table for you.")
		: sendNotFound(context, title);
}

async function rollTable(context: Context, name: string): Promise<void> {
	const doc = await (await getCollection()).findOne(generateTableQuery(context, name));
	if (!doc) {
		return sendNotFound(context, name);
	}

	const replies: string[] = ["**Rolling table *" + doc.name + "*:**", ""];

	for (const roll of doc.rolls) {
		if (roll.values.length > 0) {
			if (roll.name) {
				replies.push("*" + roll.name + "*");
			}

			const index: number = Math.floor(Math.random() * roll.values.length);
			const value: string = roll.values[index];
			replies.push(value);
		}
	}

	await context.sendToChannel(replies.join("\n"));
}

async function deleteTable(context: Context, name: string) {
	const query: any = { name, user: context.user.id };

	const result = await (await getCollection()).findOneAndDelete(query);
	await result.value
		? context.reply(`I have removed the table \`${name}\`.`)
		: sendNotFound(context, name);
}

async function viewTable(context: Context, name: string) {
	const doc = await (await getCollection()).findOne(generateTableQuery(context, name));
	if (!doc) {
		return sendNotFound(context, name);
	}

	const replies: string[] = [];

	replies.push("**" + doc.name + "**");
	replies.push("");

	for (const roll of doc.rolls) {
		replies.push("**1d" + roll.values.length + (roll.name.length > 0 ? " - " + roll.name : "") + "**");

		for (let i = 1; i <= roll.values.length; i++) {
			replies.push(i + ". " + roll.values[i - 1]);
		}
	}

	await context.sendToChannel(replies.join("\n"));
}

async function listTables(context: Context) {
	let docs = await (await getCollection()).find(generateTableQuery(context)).toArray();
	if (docs.length === 0) {
		await context.reply("You don't currently have access to any tables.");
		return;
	}

	let replies: string[] = [];
	const owned = docs.filter((doc: any) => doc.user === context.user.id);
	docs = docs.filter((doc: any) => doc.user !== context.user.id);

	const user = docs.filter((doc: any) => doc.users.includes(context.user.id));
	docs = docs.filter((doc: any) => !doc.users.includes(context.user.id));

	const channel = docs.filter((doc: any) => doc.channels.includes(context.channel.id));
	docs = docs.filter((doc: any) => !doc.channels.includes(context.channel.id));

	const isGuild = isGuildChannel(context.channel);
	const guild = !isGuild ? [] : docs.filter((doc: any) => doc.guilds.includes(context.guild.id));

	const global = !isGuild ? docs : docs.filter((doc: any) => !doc.guilds.includes(context.guild.id));

	if (owned.length > 0) {
		replies.push("You have created these tables:");
		replies = replies.concat(owned.map((table) => `- ${table.name}`));
	}

	if (user.length > 0) {
		if (replies.length > 0) { replies.push(""); }
		replies.push("These tables have been shared with you:");
		replies = replies.concat(user.map((table) => `- ${table.name}`));
	}

	if (channel.length > 0) {
		if (replies.length > 0) { replies.push(""); }
		replies.push("These tables are available to this channel:");
		replies = replies.concat(channel.map((table) => `- ${table.name}`));
	}

	if (guild.length > 0) {
		if (replies.length > 0) { replies.push(""); }
		replies.push("These tables are available on this server:");
		replies = replies.concat(guild.map((table) => `- ${table.name}`));
	}

	if (global.length > 0) {
		if (replies.length > 0) { replies.push(""); }
		replies.push("These tables are public:");
		replies = replies.concat(global.map((table) => `- ${table.name}`));
	}

	context.sendToChannel(replies.join("\n"));
}

async function shareTableMentions(context: Context, args: string[]) {
	const mentions = context.mentions;
	const name = args.slice(mentions.users.size + mentions.channels.size + mentions.roles.size + (mentions.everyone ? 1 : 0)).join(" ");

	const query: any = { name, user: context.user.id };
	const updateObj: any = {};
	let added: string[] = [];

	if (mentions.users.size > 0) {
		added = added.concat(mentions.users.map((user) => user.username));
		updateObj.users = { $each: mentions.users.map((user) => user.id) };
	}
	if (mentions.channels.size > 0) {
		added = added.concat(mentions.channels.map((channel) => channel.name));
		updateObj.channels = { $each: mentions.channels.map((channel) => channel.id) };
	}

	if (mentions.everyone) {
		updateObj.guilds = context.guild.id;
		added.push(context.guild.name);
	}

	const update: any = { $addToSet: updateObj };

	const result = await (await getCollection()).findOneAndUpdate(query, update);
	if (!result.value) {
		return sendNotFound(context, name);
	}

	if (result.ok) {
		const last = added.pop();
		await context.reply(`OK, I have shared the table with ${(added.length > 0 ? `${added.join(", ")} and ` : "")}${last} for you.`);
	} else {
		await context.reply("Sorry, I was unable to unshare the table for you.");
	}
}

async function shareTableGlobal(context: Context, name: string) {
	const query: any = { name, user: context.user.id };
	const update: any = { $set: { global: true } };

	const result = await (await getCollection()).findOneAndUpdate(query, update);
	if (!result.value) {
		return sendNotFound(context, name);
	}

	if (result.ok) {
		await context.reply("OK, I have made the table global for you.");
	} else {
		await context.reply("Sorry, I was unable to unshare the table for you.");
	}
}

async function shareTableGuild(context: Context, name: string) {
	const query: any = { name, user: context.user.id };
	const update: any = { $addToSet: { guilds: context.guild.id } };

	const result = await (await getCollection()).findOneAndUpdate(query, update);
	if (!result.value) {
		return sendNotFound(context, name);
	}

	if (result.ok) {
		await context.reply(`OK, I have shared the table with ${context.guild} for you.`);
	} else {
		await context.reply("Sorry, I was unable to unshare the table for you.");
	}
}

async function shareTableChannel(context: Context, name: string) {
	const query: any = { name, user: context.user.id };
	const update: any = { $addToSet: { channels: context.channel.id } };
	const channel = context.channel;

	if (!isTextChannel(channel)) {
		await context.reply("Sorry, I can only share tables with public text channels.");
		return;
	}

	const result = await (await getCollection()).findOneAndUpdate(query, update);
	if (!result.value) {
		return sendNotFound(context, name);
	}

	if (result.ok) {
		await context.reply(`OK, I have shared the table with ${channel} for you.`);
	} else {
		await context.reply("Sorry, I was unable to unshare the table for you.");
	}
}

async function unshareTableMentions(context: Context, args: string[]) {
	const mentions = context.mentions;
	const name = args.slice(mentions.users.size + mentions.channels.size + mentions.roles.size + (mentions.everyone ? 1 : 0)).join(" ");

	const query: any = { name, user: context.user.id };
	const updateObj: any = {};
	let added: string[] = [];

	if (mentions.users.size > 0) {
		added = added.concat(mentions.users.map((user) => user.username));
		updateObj.users = { $each: mentions.users.map((user) => user.id) };
	}
	if (mentions.channels.size > 0) {
		added = added.concat(mentions.channels.map((channel) => channel.name));
		updateObj.channels = { $each: mentions.channels.map((channel) => channel.id) };
	}

	if (mentions.everyone) {
		updateObj.guilds = context.guild.id;
		added.push(context.guild.name);
	}

	const update: any = { $pull: updateObj };

	const result = await (await getCollection()).findOneAndUpdate(query, update);
	if (!result.value) {
		return sendNotFound(context, name);
	}

	if (result.ok) {
		const last = added.pop();
		await context.reply(`OK, I have unshared the table with ${(added.length > 0 ? `${added.join(", ")} and ` : "")}${last} for you.`);
	} else {
		await context.reply("Sorry, I was unable to unshare the table for you.");
	}
}

async function unshareTableGlobal(context: Context, name: string) {
	const query: any = { name, user: context.user.id };
	const update: any = { $set: { global: false } };

	const result = await (await getCollection()).findOneAndUpdate(query, update);
	if (!result.value) {
		return sendNotFound(context, name);
	}

	if (result.ok) {
		await context.reply("OK, I have made the table private for you.");
	} else {
		await context.reply("Sorry, I was unable to unshare the table for you.");
	}
}

async function unshareTableGuild(context: Context, name: string) {
	const query: any = { name, user: context.user.id };
	const update: any = { $pull: { guilds: context.guild.id } };

	const result = await (await getCollection()).findOneAndUpdate(query, update);
	if (!result.value) {
		return sendNotFound(context, name);
	}

	if (result.ok) {
		await context.reply(`OK, I have unshared the table with ${context.guild} for you.`);
	} else {
		await context.reply("Sorry, I was unable to unshare the table for you.");
	}
}

async function unshareTableChannel(context: Context, name: string) {
	const query: any = { name, user: context.user.id };
	const update: any = { $pull: { channels: context.channel.id } };
	const channel = context.channel;

	if (!isTextChannel(channel)) {
		context.reply("Sorry, I can only share tables with public text channels.");
		return;
	}

	const result = await (await getCollection()).findOneAndUpdate(query, update);
	if (!result.value) {
		return sendNotFound(context, name);
	}

	if (result.ok) {
		await context.reply(`OK, I have unshared the table with ${channel} for you.`);
	} else {
		await context.reply("Sorry, I was unable to unshare the table for you.");
	}
}

async function sendNotFound(context: Context, name: string) {
	await context.reply(`Sorry, I couldn't find any tables with the name '${name}'`);
}
