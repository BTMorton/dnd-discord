// tslint:disable: no-console
import { flatMap, generateSearchStrings, partition } from "../../lib";
import { EntryType, IClassData, IClassFile, isNonPrimitiveEntry, IStored, IStoredClass, IStoredClassFeature, IStoredSubclass, ISubclass, ITypeEntries, ITypeEntryBase } from "../../models";
import { FileGetter } from "./fileGetter";
import { IImporter } from "./importer";

export class ClassImporter implements IImporter {
	private fileGetter = new FileGetter();

	public async getData() {
		console.log("Loading class data...");
		const classFiles: IClassFile[] = await this.fileGetter.scrapeResource("class");

		console.log("Converting class data...");
		const classesFeatsAndSubclasses: IStored[] = flatMap(
			flatMap(classFiles, (file) => file.class),
			(cls) => {
				const classFeats = flatMap(
					cls.classFeatures,
					(feat, index) => this.convertClassFeatures({ cls }, feat, index),
				);

				let storedClass = {
					...cls,
					...generateSearchStrings(cls.name),
					compendiumType: "class",
				} as IStoredClass;
				if (!cls.subclasses) return [storedClass, ...classFeats];

				const subclassFeatLevels = classFeats
					.filter((feat) => feat.gainSubclassFeature)
					.map((feat) => feat.level);

				const subclasses = cls.subclasses
					.map((subclass) => this.convertSubclass(cls, subclass, subclassFeatLevels));

				const allSubClassFeats = flatMap(
					subclasses,
					(subclass) => flatMap(
						subclass.subclassFeatures,
						(entries, index) =>
							this.convertClassFeatures(
								{ cls, subclass },
								this.combineNamelessEntries(entries),
								subclassFeatLevels[index],
							),
					),
				);

				storedClass = {
					...storedClass,
					subclassFeatLevels,
					subclasses,
				} as IStoredClass;

				return [
					storedClass,
					...subclasses,
					...classFeats,
					...allSubClassFeats,
				];
			},
		);

		return classesFeatsAndSubclasses;
	}

	private convertSubclass(cls: IClassData, subclass: ISubclass, subclassFeatLevels: number[]) {
		const [firstLevel, ...remainingLevels] = subclass.subclassFeatures;
		const [firstFeat, ...firstEntries] = firstLevel;

		const descriptionEntries = [];
		const featEntries = firstFeat.entries.slice();

		while (featEntries.length > 0) {
			const entry = featEntries[0];
			if (isNonPrimitiveEntry(entry) && "name" in entry) break;

			descriptionEntries.push(featEntries.shift());
		}

		const subclassFeatures = [
			[...firstEntries, ...featEntries],
			...remainingLevels.map((feats) => this.flattenSubClassFeatures(feats)),
		];

		return {
			...subclass,
			...generateSearchStrings(cls.name, subclass.name),
			className: cls.name,
			compendiumType: "subclass",
			description: descriptionEntries,
			featLevels: subclassFeatLevels,
			subclassFeatures,
			subclassTitle: cls.subclassTitle,
		} as IStoredSubclass;
	}

	private convertClassFeatures(additionalProperties: { cls: IClassData, subclass?: ISubclass }, feats: ITypeEntryBase[], level: number) {
		const classFeats = feats.map((feat) => ({
			...feat,
			...generateSearchStrings(
				additionalProperties.cls.name,
				additionalProperties.subclass
					? additionalProperties.subclass.name
					: "",
				feat.name || "",
			),
			...additionalProperties.subclass
				? { subclass: additionalProperties.subclass.name }
				: {},
			className: additionalProperties.cls.name,
			compendiumType: "classfeat",
			level,
			source: feat.source || (additionalProperties.subclass
				? additionalProperties.subclass.source
				: additionalProperties.cls.source),
		} as IStoredClassFeature));

		return classFeats;
	}

	private classFeatureEntryFilter(item: EntryType): item is ITypeEntries {
		return isNonPrimitiveEntry(item) && item.type === "entries";
	}

	private flattenSubClassFeatures(entries: ITypeEntries[]) {
		return flatMap(entries, (entry) => {
			if (!entry.name) { return entry.entries as ITypeEntries[]; }

			const parted = partition(entry.entries, this.classFeatureEntryFilter);
			return [{
				...entry,
				entries: parted.fail,
			},
			...parted.pass,
			];
		});
	}

	private combineNamelessEntries(entries: ITypeEntries[]) {
		if (entries.length === 0) return [];

		const returns: ITypeEntries[] = [];
		let lastEntry = entries[0] as ITypeEntries;

		for (let i = 1; i < entries.length; i++) {
			const entry = entries[i];
			if (entry.name) {
				returns.push(lastEntry);
				lastEntry = entry;
				continue;
			}

			lastEntry.entries.push(entry);
		}

		return [
			...returns,
			lastEntry,
		];
	}
}
