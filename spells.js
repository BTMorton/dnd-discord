// This file converts the spell list from the _posts directory of https://github.com/ephe/grimoire/ into a JSON file parseable by the D&D spell & monster bot. Checkout the repo for the source files to parse

const fs = require("fs");
const path = require("path");
const directory = path.join("grimoire", "_posts");
const outputFile = "parsedSpells.json";

fs.readdir(directory, function(err, files) {
	if (err) {
		console.error(err);
		return;
	}
	
	const parsedList = {};
	const fileList = [];
	
	const promises = files.map((file) => {
		const spellName = path.basename(file, path.extname(file)).slice(11);
		
		return new Promise((resolve, reject) => {
			fs.readFile(path.join(directory, file), (err, data) => {
				if (err) {
					console.error(err);
					return reject(err);
				}
				const spellData = data.toString().split(/---|=======/g).slice(1);
				const metadata = spellData[0].split("\n");
				let title = "";
				
				for (let meta of metadata) {
					if (meta.startsWith("title:")) {
						title = meta.split('"')[1];
					}
				}
				
				resolve([spellName, title, spellData[1].slice(2).replace(/\n\n/g, "\n")]);
			});
		});
	});
	
	Promise.all(promises).then((spells) => {
		for (let spell of spells) {
			parsedList[spell[0]] = {
				name: spell[1],
				description: spell[2],
			};
		}
		
		fs.writeFile(outputFile, JSON.stringify(parsedList, null, "	"), function() {
			console.log("Done");
		});
	}).catch(() => {
		console.error("there was an error");
	})
});