// This file converts the monster list from the _posts directory of https://github.com/chisaipete/bestiary/ into a JSON file parseable by the D&D spell & monster bot. Checkout the repo for the source files to parse

const fs = require("fs");
const path = require("path");
const directory = path.join("bestiary", "_posts");
const outputFile = "parsedMonsters.json";

fs.readdir(directory, function(err, files) {
	if (err) {
		console.error(err);
		return;
	}
	
	const parsedList = {};
	const fileList = [];
	
	const promises = files.map((file) => {
		const monsterName = file.slice(11, -9);
		
		return new Promise((resolve, reject) => {
			fs.readFile(path.join(directory, file), (err, data) => {
				if (err) {
					console.error(err);
					return reject(err);
				}
				let monsterData = data.toString().split(/---|=======/g).slice(1);
				const metadata = monsterData.splice(0, 1)[0].split("\n");
				let title = "";
				
				for (let meta of metadata) {
					if (meta.startsWith("title:")) {
						title = meta.split('"')[1];
					}
				}
				
				monsterData = monsterData.join("---").split("\n\n");
				
				let abilityIndex = -1;
				
				for (let i = 0; i < monsterData.length; i++) {
					if (monsterData[i][0] === "|") {
						abilityIndex = i;
						break;
					}
				}
				
				if (abilityIndex > -1) {
					const abilityParts = monsterData[abilityIndex].split("\n");
					const abilityKeys = abilityParts[0].split("|").map((str) => str.trim());
					const abilityVals = (abilityParts.length == 3 ? abilityParts[2] : abilityParts[1]).split("|").map((str) => str.trim());
					const abilityObj = {};
					
					for (let i = 0; i < abilityKeys.length; i++) {
						switch (abilityKeys[i]) {
							case "STR":
								abilityObj.str = abilityVals[i];
								break;
							case "DEX":
								abilityObj.dex = abilityVals[i];
								break;
							case "CON":
								abilityObj.con = abilityVals[i];
								break;
							case "INT":
								abilityObj.int = abilityVals[i];
								break;
							case "WIS":
								abilityObj.wis = abilityVals[i];
								break;
							case "CHA":
								abilityObj.cha = abilityVals[i];
								break;
						}
					}
					
					const abilities = [
						"**STR**: " + abilityObj.str,
						"**DEX**: " + abilityObj.dex,
						"**CON**: " + abilityObj.con,
						"**INT**: " + abilityObj.int,
						"**WIS**: " + abilityObj.wis,
						"**CHA**: " + abilityObj.cha,
					];
					
					const abilityStr = abilities.join(" | ");
					
					monsterData.splice(abilityIndex, 1, abilityStr);
				}
				
				let actionIndex = -1;
				
				for (let i = 0; i < monsterData.length; i++) {
					if (monsterData[i].startsWith("**Action")) {
						actionIndex = i;
						break;
					}
				}
				
				if (actionIndex > -1) {
					monsterData.splice(actionIndex, 0, "");
				}
				
				resolve([monsterName, title, monsterData.join("\n")]);
			});
		});
	});
	
	Promise.all(promises).then((monsters) => {
		for (let monster of monsters) {
			parsedList[monster[0]] = {
				name: monster[1],
				description: monster[2],
			};
		}
		
		fs.writeFile(outputFile, JSON.stringify(parsedList, null, "	"), function() {
			console.log("Done");
		});
	}).catch(() => {
		console.error("there was an error");
	})
});