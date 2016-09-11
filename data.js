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
		
		for (let type in result) {
			for (let i in result[type]) {
				result[type][i] = parseObject(result[type][i]);
				result[type][i].recordType = type;
				
				if (type === "class") {
					if (result[type][i].autolevel) {
						for (let j in result[type][i].autolevel) {
							if (result[type][i].autolevel[j].hasOwnProperty("slots")) {
								if (!result[type][i].hasOwnProperty("spellSlots")) {
									result[type][i].spellSlots = {};
								}
								
								if (result[type][i].autolevel[j].slots.undefined) {
									result[type][i].spellSlots[result[type][i].autolevel[j].level] = result[type][i].autolevel[j].slots.undefined;
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
		
		fs.writeFile("compendium.json", JSON.stringify(result, null, "	"), function() {
			console.log("Done");
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

