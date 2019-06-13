import request = require("request-promise-native");

export class FileGetter {
	private static CONST_URL_ROOT = "https://5e.tools/data";
	private static CONST_SCRAPE_FILE_ROOT = "index.json";

	public async getResource(filePath: string) {
		const pathUrl = [FileGetter.CONST_URL_ROOT, filePath].join("/");

		try {
			return await request({
				json: true,
				uri: pathUrl,
			});
		} catch (e) {
			console.error(`Error requesting uri ${pathUrl}`);
			return {};
		}
	}

	public async scrapeResource(resource: string, rootFile = FileGetter.CONST_SCRAPE_FILE_ROOT) {
		resource = resource.replace(/(^\/|\/$)/g, "");
		const baseUrl = [FileGetter.CONST_URL_ROOT, resource].join("/");
		const scrapeRootUrl = [baseUrl, rootFile].join("/");

		const scrapeTargets = await request({
			json: true,
			uri: scrapeRootUrl,
		});

		const scrapePaths = Object.values(scrapeTargets);

		return Promise.all(scrapePaths.map(async (path) => {
			const uri = [baseUrl, path].join("/");
			try {
				return await request({
					json: true,
					uri,
				});
			} catch (e) {
				console.error(`Error requesting uri ${uri}`);
				return null;
			}
		})).then((all) => all.filter((item) => item != null));
	}
}
