import { Subscribable } from "rxjs";

export type AddListenerMethod = (name: string, observable: Subscribable<any>) => void;

export interface IListenerSet {
	loadListeners: (addListener: AddListenerMethod) => Promise<void> | void;
}
