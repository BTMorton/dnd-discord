var fs = require("fs");

var rulesNames = [];

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

		// console.log(rules);
		fs.writeFile("rulesData.json", JSON.stringify(rules, null, "	"), (err) => {
			if (err) {
				console.error(err);
			}
		});
	});
});

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
			}

			rules = rules.concat(nestedProcessRules(includes[rule], srd[rule], newParents));
		}
	}

	return rules;
}