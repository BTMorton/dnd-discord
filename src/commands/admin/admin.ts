import { Guild, Permissions, Role } from "discord.js";
import { AddCommandMethod, Bot, CommandLoader, Context, Database, getGuildRole, getMapValueOrDefault, ICommandSet, Injector, isTextChannel, isTextChannelContext, toggleRole } from "../../lib";
import { botHasPerm, hasPerm } from "./common";

//  TODO: Dynamic command loading

interface IAllowedRole {
	guildId: string;
	roleId: string;
}

class RoleManager {
	private guildAllowedRoles: Map<string, Set<string>> = new Map();
	private roleCommandList: Map<string, Set<string>> = new Map();

	public async loadCommands(addCommand: AddCommandMethod) {
		addCommand("allowrole", this.allowRole.bind(this), {
			displayValidators: [
				isTextChannelContext,
				botHasPerm.bind(null, Permissions.FLAGS.MANAGE_ROLES),  //  TODO: Bot roles
				hasPerm.bind(null, Permissions.FLAGS.MANAGE_ROLES),
			],
			validators: [
				isTextChannelContext,
				botHasPerm.bind(null, Permissions.FLAGS.MANAGE_ROLES),  //  TODO: Bot roles
				hasPerm.bind(null, Permissions.FLAGS.MANAGE_ROLES),
				(context: Context) => getGuildRole(context.guild, context.messageData) != null,
			],
		});

		addCommand("disallowrole", this.disallowRole.bind(this), {
			displayValidators: [
				isTextChannelContext,
				botHasPerm.bind(null, Permissions.FLAGS.MANAGE_ROLES),  //  TODO: Bot roles
				hasPerm.bind(null, Permissions.FLAGS.MANAGE_ROLES),
			],
			validators: [
				isTextChannelContext,
				botHasPerm.bind(null, Permissions.FLAGS.MANAGE_ROLES),  //  TODO: Bot roles
				hasPerm.bind(null, Permissions.FLAGS.MANAGE_ROLES),
				(context: Context) => getGuildRole(context.guild, context.messageData) != null,
			],
		});

		addCommand("giveme", (context) => this.toggleRole(context.messageData, context), {
			displayValidators: [
				isTextChannelContext,
				botHasPerm.bind(null, Permissions.FLAGS.MANAGE_ROLES),  //  TODO: Bot roles
			],
			validators: [
				isTextChannelContext,
				botHasPerm.bind(null, Permissions.FLAGS.MANAGE_ROLES),  //  TODO: Bot roles
				(context: Context) => getGuildRole(context.guild, context.messageData) != null,
				(context: Context) => this.guildAllowsRole(context.messageData, context),
			],
		});

		await this.loadAllowedRoles();

		this.roleCommandList.forEach((_, roleName) => {
			if (roleName.includes(" ")) { return; }

			addCommand(
				roleName,
				this.toggleRole.bind(this, roleName),
				{
					validators: [
						isTextChannelContext,
						botHasPerm.bind(null, Permissions.FLAGS.MANAGE_ROLES),  //  TODO: Bot roles
						(c) => getGuildRole(c.guild, roleName) != null,
						this.guildAllowsRole.bind(this, roleName),
					],
				},
			);
		});
	}

	private async loadAllowedRoles() {
		this.guildAllowedRoles.clear();
		this.roleCommandList.clear();

		const collection = await Injector.get(Database).getCollection("allowedRoles");
		const roles: IAllowedRole[] = await collection.find().toArray();
		const botClient = Injector.get(Bot).client;

		for (const dbRole of roles) {
			if (!botClient.guilds.has(dbRole.guildId)) { continue; }
			const guild = botClient.guilds.get(dbRole.guildId) as Guild;

			if (!guild.roles.has(dbRole.roleId)) { continue; }
			const role = guild.roles.get(dbRole.roleId) as Role;

			this.guildAllowedRoles.set(guild.id, getMapValueOrDefault(this.guildAllowedRoles, guild.id, new Set()).add(role.id));
			this.roleCommandList.set(role.name, getMapValueOrDefault(this.roleCommandList, role.name, new Set()).add(guild.id));
		}
	}

	private async allowRole(context: Context) {
		const role = getGuildRole(context.guild, context.messageData) as Role;

		const guildAllowedRoles = getMapValueOrDefault(this.guildAllowedRoles, context.guild.id, new Set());
		if (guildAllowedRoles.has(role.id)) {
			await context.reply(`Manual assignment of ${role.name} is already allowed`);
			return;
		}

		this.guildAllowedRoles.set(context.guild.id, guildAllowedRoles.add(role.id));

		const allowedRole: IAllowedRole = {
			guildId: context.guild.id,
			roleId: role.id,
		};

		const collection = await Injector.get(Database).getCollection("allowedRoles");
		await collection.insertOne(allowedRole);

		const guildsForRole = getMapValueOrDefault(this.roleCommandList, role.name, new Set());
		if (guildsForRole.size === 0 && !role.name.includes(" ")) {
			Injector.get(CommandLoader).addCommand(
				role.name,
				this.toggleRole.bind(this, role.name),
				{
					validators: [
						(c) => isTextChannel(c.channel),
						botHasPerm.bind(null, Permissions.FLAGS.MANAGE_ROLES),  //  TODO: Bot roles
						(c) => getGuildRole(c.guild, role.name) != null,
						this.guildAllowsRole.bind(this, role.name),
					],
				},
			);
		}

		this.roleCommandList.set(role.name, guildsForRole.add(role.name));

		await context.reply(`OK, I've enabled manual assignment of ${role.name}`);
	}

	private async disallowRole(context: Context) {
		const role = getGuildRole(context.guild, context.messageData) as Role;

		const guildAllowedRoles = getMapValueOrDefault(this.guildAllowedRoles, context.guild.id, new Set());
		if (!guildAllowedRoles.has(role.id)) {
			await context.reply(`Manual assignment of ${role.name} is already disabled`);
			return;
		}

		guildAllowedRoles.delete(role.id);

		const allowedRole: IAllowedRole = {
			guildId: context.guild.id,
			roleId: role.id,
		};

		const collection = await Injector.get(Database).getCollection("allowedRoles");
		await collection.deleteOne(allowedRole);

		await context.reply(`OK, I've disabled manual assignment of ${role.name}`);

		const guildsForRole = getMapValueOrDefault(this.roleCommandList, role.name, new Set());
		guildsForRole.delete(role.name);
		this.roleCommandList.set(role.name, guildsForRole);

		if (guildsForRole.size === 0 && !role.name.includes(" ")) {
			Injector.get(CommandLoader).removeCommand(role.name);
		}
	}

	private async toggleRole(roleName: string, context: Context) {
		const role = getGuildRole(context.guild, roleName) as Role;

		if (await toggleRole(context, role)) {
			context.reply(`OK, I have assigned the role ${role.name}.`);
		} else {
			context.reply(`OK, I have removed the role ${role.name}.`);
		}
	}

	private guildAllowsRole(roleName: string, context: Context) {
		const role = getGuildRole(context.guild, roleName) as Role;

		return this.guildAllowedRoles.has(context.guild.id)
			&& (this.guildAllowedRoles.get(context.guild.id) as Set<string>).has(role.id);
	}
}

const roleManager = new RoleManager();
const commandSet: ICommandSet = {
	loadCommands: roleManager.loadCommands.bind(roleManager),
};
export = commandSet;
