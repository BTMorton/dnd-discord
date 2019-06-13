// tslint:disable: no-console
import { Database } from "../lib";
import { Importer } from "./import";

const database = new Database();
const importer = new Importer();

(async () => {
	await database.connect();

	console.log("Clearing database...");
	await importer.clear();

	console.log("Importing data...");
	const loadCount = await importer.importAll();

	console.log(`Imported ${loadCount} data items.`);

	console.log("Cleaning up...");
	await database.destroy();
})();
