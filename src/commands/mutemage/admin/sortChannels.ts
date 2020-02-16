import { AddCommandMethod, ICommandSet } from "../../../lib/command";
import { hasRole } from "../../admin/common";
import * as MuteMage from "../common";

const commandSet: ICommandSet = {
	loadCommands(addCommand: AddCommandMethod) {
		addCommand("sortchannels", MuteMage.sortChannels, {
			aliases: ["sortchannel"],
			help: {
				section: "Mute Mage Administration",
				shortDescription: "Sorts game channels",
			},
			validators: [
				MuteMage.isMuteMage,
				hasRole.bind(null, MuteMage.CONST_HELPERS_ROLE_ID),
			],
		});
	},
};

export = commandSet;
