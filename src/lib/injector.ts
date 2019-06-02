export type InjectableConstructor<Y> = new () => Y;

export class Injector {
	private static classes: Map<InjectableConstructor<any>, any> = new Map();

	public static get<T>(injectable: InjectableConstructor<T>): T {
		if (!Injector.classes.has(injectable)) {
			Injector.classes.set(injectable, new injectable());
		}

		return Injector.classes.get(injectable);
	}
}
