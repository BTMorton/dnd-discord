import { MessageEmbed } from "discord.js";
import { AddCommandMethod, CommandLoader, Context, DatabaseCommandManager, EmbedHelper, getMapValueOrDefault, ICommandSet, Injector, isGuildChannel, IStoredCommandHelp, RoleManager, UserConfig, ValidatorMethod } from "../lib";

const commandSet: ICommandSet = {
	loadCommands(addCommand: AddCommandMethod) {
		addCommand("help", sendHelp, {
			help: {
				fullDescription: "Displays the full help text",
				section: "Help",
				shortDescription: "Displays this help text",
			},
		});
		addCommand("commandlist", listCommands, {
			aliases: ["commands"],
			help: {
				section: "Help",
				shortDescription: "Lists all commands available",
			},
		});
	},
};

export = commandSet;

async function useEmbed(context: Context) {
	let shouldUseEmbed = await Injector.get(UserConfig).getUserConfigKey(context.user.id, "useEmbed");
	if (shouldUseEmbed === undefined) shouldUseEmbed = true;
	return shouldUseEmbed;
}

async function sendHelp(context: Context) {
	const commandLoader = Injector.get(CommandLoader);
	let helpCommand = context.args[0];

	if (helpCommand) {
		if (commandLoader.commandMap.has(helpCommand)) {
			while (typeof commandLoader.commandMap.get(helpCommand) === "string") {
				helpCommand = commandLoader.commandMap.get(helpCommand) as string;
			}

			(await useEmbed(context))
				? await sendCommandHelpEmbed(context, helpCommand)
				: await sendCommandHelpText(context, helpCommand);
			return;
		}
	}

	(await useEmbed(context))
		? await sendHelpEmbed(context)
		: await sendHelpText(context);
}

async function sendHelpText(context: Context) {
	const helpSections = Injector.get(CommandLoader).helpSections;
	const helpTextEntries = [
		"The following commands are currently available. For more information use `/help commandName`.",
		...await Promise.all(Array.from(helpSections.entries(), async ([section, commands]) => [
			`${section}:`,
			...(await filterValidCommands(context, commands))
				.map((commandHelp) => commandHelp.shortDescription),
		].join("\n"))),
	];

	const dbCommands = await Injector.get(DatabaseCommandManager).getAll(context.user.id);
	const dbCommandEntry = dbCommands
		? [
			"The following custom commands are available.",
			...dbCommands.map((dbCommand) => dbCommand.command),
		].join("\n")
		: "";

	const guildRoles = Array.from(Injector.get(RoleManager).guildAllowedRoles.get(context.guild.id) ?? new Set<string>())
		.map((roleId) => context.guild.roles.resolve(roleId))
		.map((role) => role?.name)
		.filter((roleName) => !!roleName)
		.map((roleName) => `@${roleName}`);

	const guildRoleEntry = guildRoles.length > 0
		? [
			"The following roles are available to be assigned in this server.",
			...guildRoles,
		].join("\n")
		: "";

	await context.sendToChannel([
		...helpTextEntries,
		dbCommandEntry,
		guildRoleEntry,
	].join("\n\n"));
}

async function sendHelpEmbed(context: Context) {
	const helpSections = Injector.get(CommandLoader).helpSections;

	const embed = new MessageEmbed()
		.setColor("RANDOM")
		.setDescription("The following commands are currently available. For more information use `/help commandName`.");

	for (const [section, commands] of helpSections) {
		const validCommands = await filterValidCommands(context, commands);
		if (validCommands.length <= 0) { continue; }

		EmbedHelper.splitAddFields(
			embed,
			section,
			validCommands.map((commandHelp) => `**${commandHelp.name}**: ${commandHelp.shortDescription}`)
				.join("\n"),
		);
	}

	const dbCommands = await Injector.get(DatabaseCommandManager).getAll(context.user.id);
	if (dbCommands.length > 0) {
		EmbedHelper.splitAddFields(
			embed,
			"The following custom commands are available.",
			dbCommands.map((dbCommand) => dbCommand.command)
				.join("\n"),
			true,
		);
	}

	if (isGuildChannel(context.channel)) {
		const guildRoles = Array.from(Injector.get(RoleManager).guildAllowedRoles.get(context.guild.id) ?? new Set<string>())
			.map((roleId) => context.guild.roles.resolve(roleId))
			.map((role) => role?.name)
			.filter((roleName) => !!roleName)
			.map((roleName) => `@${roleName}`);

		if (guildRoles.length > 0) {
			EmbedHelper.splitAddFields(
				embed,
				"The following roles are available to be assigned in this server.",
				guildRoles.join("\n"),
				true,
			);
		}
	}

	await context.sendToChannel([embed]);
}

async function filterValidCommands(context: Context, commands: IStoredCommandHelp[]): Promise<IStoredCommandHelp[]> {
	const commandValidPromises = commands
		.map(async (command) => [
			command,
			await isCommandValidForDisplay(context, command.name),
		] as [IStoredCommandHelp, boolean]);

	return (await Promise.all(commandValidPromises))
		.filter(([_, valid]) => valid)
		.map(([command, _]) => command);
}

async function sendCommandHelpText(context: Context, command: string) {
	if (!await isCommandValidForDisplay(context, command)) {
		await commandNotFound(context, command);
		return;
	}

	const commandHelp = Injector.get(CommandLoader).commandHelp.get(command)
		?? {
		fullDescription: "No help text is available for this command.",
		section: "Other",
		shortDescription: "",
	};

	await context.sendToChannel([
		`\`${command}\` help (${commandHelp.section})`,
		commandHelp.fullDescription ?? commandHelp.shortDescription,
	].join("\n"));
}

async function sendCommandHelpEmbed(context: Context, command: string) {
	if (!await isCommandValidForDisplay(context, command)) {
		await commandNotFound(context, command);
		return;
	}

	const commandHelp = Injector.get(CommandLoader).commandHelp.get(command)
		?? {
		fullDescription: "No help text is available for this command.",
		section: "Other",
		shortDescription: "",
	};

	const embed = new MessageEmbed()
		.setColor("RANDOM")
		.setAuthor(commandHelp.section)
		.setTitle(`\`${context.channelPrefix}${command}\` help`);

	EmbedHelper.splitSetDescription(
		embed,
		commandHelp.fullDescription ?? commandHelp.shortDescription,
	);

	await context.sendToChannel([embed]);
}

async function listCommands(context: Context) {
	const commandMap = Injector.get(CommandLoader).commandMap;
	const aliases: Map<string, Set<string>> = new Map();
	const commands: Set<string> = new Set();

	commandMap.forEach((command, name) => {
		if (typeof command === "string") {
			aliases.set(command, getMapValueOrDefault(aliases, command, new Set()).add(name));
		} else {
			commands.add(name);
		}
	});

	for (const command of commands) {
		if (!await isCommandValidForDisplay(context, command)) {
			commands.delete(command);
		}
	}

	const commandList = Array.from(commands.values(),
		(command) => !aliases.has(command)
			? command
			: `${command} (aliases: ${Array.from(aliases.get(command) as Set<string>).join(", ")})`)
		.join(", ");

	await context.sendToChannel(`Here is the list of currently available commands:\n${commandList}`);
}

async function isCommandValidForDisplay(context: Context, command: string) {
	const validatorMap = Injector.get(CommandLoader).displayValidatorMap;
	if (!validatorMap.has(command)) { return true; }

	const validators = validatorMap.get(command) as ValidatorMethod[];
	const validations = await Promise.all(validators.map((val) => val(context)));
	return validations.every((res) => res);
}

async function commandNotFound(context: Context, command: string) {
	await context.reply(`Sorry, no command \`${context.channelPrefix}${command}\` found.`);
}
