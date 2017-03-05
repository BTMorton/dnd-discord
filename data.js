const xml2js = require("xml2js");
const fs = require("fs");

String.prototype.toTitleCase = function() {
	return this.charAt(0).toUpperCase() + this.substr(1).toLowerCase();
}

fs.readFile("compendium.xml", function(err, xmlData) {
	if (err) {
		console.error(err);
		return;
	}

	const parser = new xml2js.Parser();

	parser.parseString(xmlData, function(err, jsonResult) {
		if (err) {
			console.error(err);
			return;
		}

		const result = jsonResult.compendium;
		result.version = result.$.version;

		delete result._;
		delete result.$;

		const names = {};
		const objects = {};

		for (let type in result) {
			names[type] = [];
			objects[type] = {};

			for (let i in result[type]) {
				result[type][i] = parseObject(result[type][i]);
				result[type][i].recordType = type;

				if (result[type][i].hasOwnProperty("name")) {
					if (names[type].includes(result[type][i].name)) {
						console.log("Duplicated name " + result[type][i].name);

						const item = result[type][i];
						const match = objects[type][item.name];

						for (let key in item) {
							if (item.hasOwnProperty(key)) {
								if (!match.hasOwnProperty(key)) {
									console.log("    Was missing key: " + key);
									match[key] = item[key];
								} else if (typeof item[key] != typeof match[key]) {
									console.log("   Different key types: " + key, typeof item[key], typeof match[key]);
								} else {
									if (typeof item[key] == "string" && match[key] != item[key]) {
										console.log("    Merging different key : " + key, match[key] + ", " +item[key]);
										match[key] += ", " +item[key];
									} else if (JSON.stringify(match[key]) != JSON.stringify(item[key])) {
										console.log("    Different key: " + key + ". Not merging as not strings");
									}
								}
							}
						}

						continue;
					} else {
						names[type].push(result[type][i].name);
						objects[type][result[type][i].name] = result[type][i];
					}

					result[type][i].searchString = result[type][i].name.toLowerCase().replace(/[^\w]/g, "");
					result[type][i].searchStrings = result[type][i].name.toLowerCase().replace(/[^\w ]/g, "").split(" ");

					if (result[type][i].name == "Wight") {
						console.log("Fixing wight");
						result[type][i].resist = result[type][i].immune;
						result[type][i].immune = "poison";
						result[type][i].conditionImmune = "exhaustion, poisoned";
					}
				}

				if (type === "class") {
					if (result[type][i].autolevel) {
						for (let j in result[type][i].autolevel) {
							if (result[type][i].autolevel[j].hasOwnProperty("slots")) {
								if (!result[type][i].hasOwnProperty("spellSlots")) {
									result[type][i].spellSlots = {};
								}

								if (result[type][i].autolevel[j].slots instanceof Array) {
									result[type][i].spellSlots[result[type][i].autolevel[j].level] = result[type][i].autolevel[j].slots[0].undefined;
								} else {
									result[type][i].spellSlots[result[type][i].autolevel[j].level] = result[type][i].autolevel[j].slots;
								}
							} else if (result[type][i].autolevel[j].hasOwnProperty("feature")) {
								if (!result[type][i].hasOwnProperty("levelFeatures")) {
									result[type][i].levelFeatures = {};
								}

								if (result[type][i].autolevel[j].feature instanceof Array) {
									result[type][i].levelFeatures[result[type][i].autolevel[j].level] = result[type][i].autolevel[j].feature;
								} else {
									result[type][i].levelFeatures[result[type][i].autolevel[j].level] = [ result[type][i].autolevel[j].feature ];
								}
							}
						}
					}

					delete result[type][i].autolevel;
				}
			}
		}

		fs.readFile("5esrd.json", (error, data) => {
			if (error) {
				console.error(error);
				return;
			}

			const srd = JSON.parse(data);

			fs.readFile("srd_rule_includes.json", (error, data2) => {
				if (error) {
					console.error(error);
					return;
				}

				const includes = JSON.parse(data2);

				const rules = nestedProcessRules(includes, srd);

				result["rule"] = rules;

				fs.writeFile("compendium.json", JSON.stringify(result, null, "	"), function() {
					console.log("Done");
				});
			});
		});
	});
});

function parseObject(obj) {
	if (obj.$ && obj._) {
		obj[obj.$.category] = obj._;
		delete obj.$;
		delete obj._;
		return obj;
	}

	if (obj.$) {
		for (let prop in obj.$) {
			obj[prop] = obj.$[prop];
		}

		delete obj.$;
	}

	for (let prop in obj) {
		if (!(obj[prop] instanceof Array)) {
			obj[prop] = parseProperty(obj[prop]);
		} else if (obj[prop].length == 1 && typeof obj[prop][0] !== "object") {
			obj[prop] = parseProperty(obj[prop][0]);
		} else {
			for (let i = 0; i < obj[prop].length; i++) {
				obj[prop][i] = parseProperty(obj[prop][i]);
			}
		}
	}

	return obj;
}

function parseProperty(value) {
	if (typeof value === "object") {
		return parseObject(value);
	} else if (!isNaN(value) && value != "") {
		return parseInt(value, 10);
	} else {
		return value;
	}
}

var rulesNames = [];

function nestedProcessRules(includes, srd, parents) {
	let rules = [];

	parents = parents || [];

	for (let rule in includes) {
		if (includes[rule] === false) continue;
		if (!srd[rule]) {
			console.log("Rule " + rule + " does not exist under " + parents.join(", "));
			continue;
		}

		let ruleName = rule;

		if (ruleName.startsWith("Appendix")) {
			ruleName = ruleName.split(": ")[1];
		}

		if (rulesNames.includes(ruleName)) {
			ruleName = rule + " (" + parents.slice(-1)[0] + ")";
			console.log("Duplicate rule " + rule + " in " + parents.join(", ") + ". Renaming to " + ruleName);

			if (rulesNames.includes(ruleName)) {
				console.log("Renamed rule duplicated. Skipping rule.");
				continue;
			}
		}

		const parsedRule = {
			"name": ruleName,
			"content": [],
			"recordType": "rule"
		};

		parsedRule.searchString = rule.toLowerCase().replace(/[^\w]/g, "");
		parsedRule.searchStrings = rule.toLowerCase().replace(/[^\w ]/g, "").split(" ");

		if (parents.length > 0) {
			parsedRule.parents = parents;
		}

		if (typeof srd[rule] == "string" || srd[rule] instanceof Array || srd[rule].hasOwnProperty("table")) {
			parsedRule.content.push(srd[rule]);

			rules.push(parsedRule);
			rulesNames.push(ruleName);
		} else {
			if (srd[rule].content) {
				if (srd[rule].content instanceof Array) {
					parsedRule.content = parsedRule.content.concat(srd[rule].content);
				} else {
					parsedRule.content.push(srd[rule].content);
				}
			}

			parsedRule.children = [];

			for (let child in includes[rule]) {
				if (includes[rule][child] === false) {
					parsedRule.content.push("");
					parsedRule.content.push("**" + child + "**");
					parsedRule.content.push("");

					if (srd[rule][child].content instanceof Array) {
						parsedRule.content = parsedRule.content.concat(srd[rule][child].content);
					} else {
						parsedRule.content.push(srd[rule][child].content);
					}
				} else {
					parsedRule.children.push(child);
				}
			}

			if (parsedRule.children.length == 0) {
				delete parsedRule.children;
			}

			const newParents = parents.slice(0);

			if (parsedRule.content.length > 0) {
				rules.push(parsedRule);
				rulesNames.push(ruleName);

				newParents.push(ruleName);
			} else {
				console.log("Skipping rule " + rule + " under " + parents.join(", ") + " as it has no content");
			}

			rules = rules.concat(nestedProcessRules(includes[rule], srd[rule], newParents));
		}
	}

	return rules;
}