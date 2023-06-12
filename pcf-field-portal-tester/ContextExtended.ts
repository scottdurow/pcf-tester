/*specifying events types here until it is unlocked by platform*/
export interface ContextExtended<T> extends ComponentFramework.Context<T> {
    parameters: T & Record<string, any>;
    events: IEventBag;
}
export declare type IEventBag = Record<string, () => void>;
