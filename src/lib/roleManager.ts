import { Guild, Role } from "discord.js";
import { Bot, Context, Database, getGuildRole, getMapValueOrDefault, Injector, toggleRole } from "./";

export interface IAllowedRole {
	guildId: string;
	roleId: string;
}

export class RoleManager {
	public guildAllowedRoles: Map<string, Set<string>> = new Map();

	public async toggleRole(roleName: string, context: Context) {
		const role = getGuildRole(context.guild, roleName) as Role;

		if (await toggleRole(context, role)) {
			context.reply(`OK, I have assigned the role ${role.name}.`);
		} else {
			context.reply(`OK, I have removed the role ${role.name}.`);
		}
	}

	public guildAllowsRole(roleName: string, context: Context) {
		const role = getGuildRole(context.guild, roleName) as Role;

		return this.guildAllowedRoles.has(context.guild.id)
			&& (this.guildAllowedRoles.get(context.guild.id) as Set<string>).has(role.id);
	}

	public async loadAllowedRoles() {
		this.guildAllowedRoles.clear();

		const collection = await Injector.get(Database).getCollection("allowedRoles");
		const roles: IAllowedRole[] = await collection.find().toArray();
		const botClient = Injector.get(Bot).client;

		for (const dbRole of roles) {
			if (!botClient.guilds.has(dbRole.guildId)) { continue; }
			const guild = botClient.guilds.get(dbRole.guildId) as Guild;

			if (!guild.roles.has(dbRole.roleId)) { continue; }
			const role = guild.roles.get(dbRole.roleId) as Role;

			this.guildAllowedRoles.set(guild.id, getMapValueOrDefault(this.guildAllowedRoles, guild.id, new Set()).add(role.id));
		}
	}

	public async allowRole(context: Context) {
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

		await context.reply(`OK, I've enabled manual assignment of ${role.name}`);
	}

	public async disallowRole(context: Context) {
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
	}
}
