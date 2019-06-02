import { Unsubscribable } from "rxjs";

export type AddListenerMethod = (name: string, observable: () => Unsubscribable) => void;

export interface IListenerSet {
	loadListeners: (addListener: AddListenerMethod) => Promise<void> | void;
}
