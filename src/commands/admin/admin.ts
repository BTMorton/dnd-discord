import { Permissions } from "discord.js";
import { AddCommandMethod, Context, getGuildRole, ICommandSet, Injector, isTextChannelContext, RoleManager } from "../../lib";
import { botHasPerm, hasPerm } from "./common";

const roleManager = Injector.get(RoleManager);
const commandSet: ICommandSet = {
	loadCommands: async (addCommand: AddCommandMethod) => {
		addCommand("allowrole", roleManager.allowRole.bind(roleManager), {
			displayValidators: [
				isTextChannelContext,
				botHasPerm.bind(null, Permissions.FLAGS.MANAGE_ROLES),  //  TODO: Bot roles
				hasPerm.bind(null, Permissions.FLAGS.MANAGE_ROLES),
			],
			help: {
				section: "Role Management",
				shortDescription: "Allows the bot to manage a role",
			},
			validators: [
				isTextChannelContext,
				botHasPerm.bind(null, Permissions.FLAGS.MANAGE_ROLES),  //  TODO: Bot roles
				hasPerm.bind(null, Permissions.FLAGS.MANAGE_ROLES),
				(context: Context) => getGuildRole(context.guild, context.messageData) != null,
			],
		});

		addCommand("disallowrole", roleManager.disallowRole.bind(roleManager), {
			displayValidators: [
				isTextChannelContext,
				botHasPerm.bind(null, Permissions.FLAGS.MANAGE_ROLES),  //  TODO: Bot roles
				hasPerm.bind(null, Permissions.FLAGS.MANAGE_ROLES),
			],
			help: {
				section: "Role Management",
				shortDescription: "Stops the bot from managing a role",
			},
			validators: [
				isTextChannelContext,
				botHasPerm.bind(null, Permissions.FLAGS.MANAGE_ROLES),  //  TODO: Bot roles
				hasPerm.bind(null, Permissions.FLAGS.MANAGE_ROLES),
				(context: Context) => getGuildRole(context.guild, context.messageData) != null,
			],
		});

		addCommand("giveme", (context) => roleManager.toggleRole(context.messageData, context), {
			displayValidators: [
				isTextChannelContext,
				botHasPerm.bind(null, Permissions.FLAGS.MANAGE_ROLES),  //  TODO: Bot roles
			],
			help: {
				section: "Role Management",
				shortDescription: "Assigns a role to the current user",
			},
			validators: [
				isTextChannelContext,
				botHasPerm.bind(null, Permissions.FLAGS.MANAGE_ROLES),  //  TODO: Bot roles
				(context: Context) => getGuildRole(context.guild, context.messageData) != null,
				(context: Context) => roleManager.guildAllowsRole(context.messageData, context),
			],
		});

		await roleManager.loadAllowedRoles();
	},
};
export = commandSet;
