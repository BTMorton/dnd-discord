import { Database, escapeStringForRegex, Injector } from "../";
import { IStored } from "../../models";

export class Compendium {
	public search = (search: string, type?: string, additionalQuery = {}, sort: Array<[string, number]> = [["name", 1]]) => this.doDatabaseSearch(search, type, additionalQuery);
	public query = (query: any, sort: Array<[string, number]> = [["name", 1]]) => this.doDatabaseQuery(query, sort);

	private async doDatabaseSearch<Type extends IStored>(search: string, type?: string, additionalQuery = {}) {
		const searchRegexs: RegExp[] = search.split(" ")
			.map((str: string) => new RegExp(`${str.replace(/[^\w]/g, "")}`, "i"));

		const query: any = {
			...additionalQuery,
			$or: [
				{ name: new RegExp(`${escapeStringForRegex(search)}`, "i") },
				{ searchString: new RegExp(`${search.replace(/[^\w]/g, "")}`) },
				{ $and: searchRegexs.map((regexp: RegExp) => ({ searchStrings: regexp })) },
			],
		};

		if (type) {
			query.compendiumType = escapeStringForRegex(type);
		}

		const results = await this.doDatabaseQuery(query);

		if (results.length > 1) {
			const exactRegex = new RegExp(`^${escapeStringForRegex(search)}$`, "i");
			const match = results.find((c) => exactRegex.test(c.name));

			if (match) {
				return [match];
			}
		}

		return results;
	}

	private async doDatabaseQuery<Type extends IStored>(query: any, sort: Array<[string, number]> = [["name", 1]]) {
		const collection = await this.getCollection();
		return await collection.find(query).sort(sort).toArray() as Type[];
	}

	private async getCollection() {
		return Injector.get(Database).getCollection("compendium");
	}
}
