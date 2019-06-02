import { Context } from "./context";

export type ValidatorMethod = (context: Context) => boolean | Promise<boolean>;

export interface ICommandOptions {
	aliases?: string[];
	validators?: ValidatorMethod[];
	displayValidators?: ValidatorMethod[];
}

export type CommandMethod = (context: Context) => void | Promise<void>;

export type AddCommandMethod = (name: string, command: CommandMethod, options?: ICommandOptions) => void;

export interface ICommandSet {
	loadCommands: (addCommand: AddCommandMethod) => Promise<void> | void;
}
