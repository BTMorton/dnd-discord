export class Villain {
	public name = "Villain";
	constructor(
		public form: string,
		public scheme: string,
		public method: string,
		public weakness: string,
	) {}

	public format(): string {
		return "**" + this.name + "** - *" + this.form + "*\n" +
			"*Scheme:* " + this.scheme + "\n" +
			"*Method:* " + this.method + "\n" +
			"*Weakness:* " + this.weakness;
	}
}
