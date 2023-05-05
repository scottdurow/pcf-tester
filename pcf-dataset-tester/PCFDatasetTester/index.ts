import * as React from 'react';
import { getMode, setMode } from './TestMode';
import { LogEventRow, Tester, TesterInterface } from './components/Tester';
import { IInputs, IOutputs } from './generated/ManifestTypes';
import { ContextExtended } from '../ContextExtended';
import { random } from 'lodash-es';

const enum PCFEvents {
    init = 'init',
    updateView = 'updateView',
    getOutputs = 'getOutputs',
    Command = 'Command',
}
const EventNameMap: Record<PCFEvents, string> = {
    init: '🟢',
    updateView: '🔃',
    Command: '🚀',
    getOutputs: '📤',
};

export class PCFDatasetTester implements ComponentFramework.ReactControl<IInputs, IOutputs> {
    private theComponent: ComponentFramework.ReactControl<IInputs, IOutputs>;
    private notifyOutputChanged: () => void;

    private eventCount: Record<string, number> = {};
    // initialize private field logEvents of type LogEventRow[] with 20 rows of dummy data
    private logEvents: LogEventRow[] = [];
    private eventName: PCFEvents;
    private eventDisplayName: string;
    private context: ContextExtended<IInputs>;
    private propertyBag: Record<string, string> = {};
    scheduleEvent: boolean;

    private incrementEventCount(event: string): number {
        if (this.eventCount[event]) {
            this.eventCount[event]++;
        } else {
            this.eventCount[event] = 1;
        }
        return this.eventCount[event];
    }
    private getEventCount(event: string) {
        return this.eventCount[event] ?? 0;
    }

    testerRef: React.RefObject<TesterInterface>;

    /**
     * Empty constructor.
     */
    constructor() {
        this.testerRef = React.createRef();
    }

    /**
     * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
     * Data-set values are not initialized here, use updateView.
     * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
     * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
     * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
     */
    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
    ): void {
        this.context = context as ContextExtended<IInputs>;
        context.mode.trackContainerResize(true);
        this.notifyOutputChanged = notifyOutputChanged;
        this.setEvent(PCFEvents.init);
        this.logEvent('---', '---', false);
    }

    /**
     * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
     * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
     * @returns ReactElement root react element for the control
     */
    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        this.setEvent(PCFEvents.updateView);
        // for each mode call runCommand
        this.runModeCommands();

        if (this.scheduleEvent) {
            this.scheduleEvent = false;
            this.context.events.OnAction();
        }

        return React.createElement(Tester, {
            ref: this.testerRef,
            logEvents: this.logEvents,
            mode: getMode(),
            width: context.mode.allocatedWidth,
            height: (context.mode.allocatedHeight ?? -1) > 0 ? context.mode.allocatedHeight : undefined,
            heightMode: (context.parameters.formHeight?.raw || 0) > 50 ? 'fixed' : 'auto',
            onCommand: this.onCommand.bind(this),
        });
    }

    private runModeCommands() {
        const modes = getMode().split(',');
        modes.forEach((mode) => this.runCommand(mode));
    }

    private runCommand(mode: string) {
        const context = this.context;
        switch (mode) {
            case 'error':
                // prevent error on first render!
                if (this.getEventCount(PCFEvents.updateView) > 1) throw new Error('Error from updateView');
                break;

            case 'dataset':
                {
                    const datasetInfo = {
                        isLoading: context.parameters.dataset_a.loading,
                        isError: context.parameters.dataset_a.error,
                        errorMessage: context.parameters.dataset_a.errorMessage,
                        rowCount: context.parameters.dataset_a.sortedRecordIds.length,
                        total: context.parameters.dataset_a.paging.totalResultCount,
                        firstPageNumber: context.parameters.dataset_a.paging.firstPageNumber,
                        lastPageNumber: context.parameters.dataset_a.paging.lastPageNumber,

                        hasPreviousPage: context.parameters.dataset_a.paging.hasPreviousPage,
                        hasNextPage: context.parameters.dataset_a.paging.hasNextPage,
                    };

                    const source = `📁dataset ${this.incrementEventCount('dataset')}`;
                    if (datasetInfo.isLoading) {
                        this.logEvent(source, '⌛', false);
                    } else if (datasetInfo.isError) {
                        this.logEvent(source, `⚠️${datasetInfo.errorMessage}`, false);
                    } else {
                        this.logEvent(
                            source,
                            `${datasetInfo.rowCount}/${datasetInfo.total}  | firstPage:${
                                datasetInfo.firstPageNumber
                            } | lastPage:${datasetInfo.lastPageNumber} | ${datasetInfo.hasPreviousPage ? '⬅️' : ''}  ${
                                datasetInfo.hasNextPage ? '➡️' : ''
                            }`,
                            false,
                        );
                    }
                }
                break;
            case 'size':
                this.logEvent(
                    `📦Size ${this.incrementEventCount('size')}`,
                    `width=${context.mode.allocatedWidth} height=${context.mode.allocatedHeight}`,
                    false,
                );

                break;
            case 'updates':
                this.logEvent(
                    `🧿updates ${this.incrementEventCount('updates')}`,
                    context.updatedProperties.join(' | '),
                    false,
                );
                break;
            default:
                this.logEvent('---', '---', false);
        }
    }

    private setEvent(eventName: PCFEvents) {
        this.eventName = eventName;
        this.eventDisplayName = `${EventNameMap[eventName]} ${this.incrementEventCount(eventName || 'none')}`;
    }
    private logEvent(source: string, message: string, forceRefresh = true) {
        const event = { eventName: this.eventDisplayName, source, message } as LogEventRow;
        event.timestamp = new Date();
        this.logEvents.unshift({ ...event, index: this.logEvents.length + 1 } as LogEventRow);
        if (forceRefresh) this.refreshItems();
    }
    private refreshItems() {
        this.testerRef.current?.refresh(this.logEvents);
    }

    public onCommand(verb: string, args: string[]): void {
        this.setEvent(PCFEvents.Command);
        // get the command and arguments as as array of strings
        switch (verb) {
            case 'event':
                this.propertyBag['output_2'] = `Event Value ${random(1, 100)}`;
                this.context.events.OnAction();
                break;
            case 'eventnotify':
                this.propertyBag['output_2'] = `Event Value ${random(1, 100)}`;
                this.context.events.OnAction();
                this.notifyOutputChanged();
                break;
            case 'eventschedule':
                this.propertyBag['output_2'] = `Event Value ${random(1, 100)}`;
                this.scheduleEvent = true;
                this.notifyOutputChanged();
                break;
            case 'setselection':
                this.context.parameters.dataset_a.setSelectedRecordIds([
                    this.context.parameters.dataset_a.sortedRecordIds[0],
                ]);
                break;
            case 'clearproperty':
                delete this.propertyBag[args[0]];
                break;
            case 'set':
                this.propertyBag[args[0]] = args[1];
                break;
            case 'pagesize':
                this.context.parameters.dataset_a.paging.setPageSize(parseInt(args[0]));
                break;
            case 'report':
                this.runModeCommands();
                this.refreshItems();
                break;
            case 'mode':
                {
                    // set the mode to the second argument
                    const mode = args[0];
                    setMode(mode);
                    this.notifyOutputChanged();
                }
                break;
            case 'notify':
                {
                    //get the count from the first argument
                    const count = parseInt(args[0]) || 1;
                    // get duration of interval from second argument
                    const duration = parseInt(args[1]) || 0;

                    // call notifyOutputChanged 20 times inside a setTimeout 100 times separated by 100ms
                    for (let i = 0; i < count; i++) {
                        setTimeout(() => {
                            this.notifyOutputChanged();
                        }, i * duration);
                    }
                }
                break;
            case 'cls':
            case 'clear':
                // clear logEvents
                this.logEvents = [];
                this.eventCount = {};
                this.testerRef.current?.refresh(this.logEvents);

                break;
            case 'add':
                {
                    const numberToAdd = parseInt(args[0]) || 1;
                    // add numberToAdd test events
                    for (let i = 1; i <= numberToAdd; i++) {
                        this.logEvent('add', 'Test message ' + i.toString());
                    }
                }
                break;
            case 'refresh': {
                this.context.parameters.dataset_a.refresh();
                break;
            }
            case 'loadnextpage':
                this.context.parameters.dataset_a.paging.loadNextPage();
                break;
            case 'loadpreviouspage':
                this.context.parameters.dataset_a.paging.loadPreviousPage();
                break;
            case 'loadexactpage':
                this.context.parameters.dataset_a.paging.loadExactPage(parseInt(args[0]));
                break;
        }
    }
    /**
     * It is called by the framework prior to a control receiving new data.
     * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as “bound” or “output”
     */
    public getOutputs(): IOutputs {
        this.setEvent(PCFEvents.getOutputs);
        this.logEvent('---', JSON.stringify(this.propertyBag), true);

        return this.propertyBag;
    }

    /**
     * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
     * i.e. cancelling any pending remote calls, removing listeners, etc.
     */
    public destroy(): void {
        // Add code to cleanup control if necessary
    }
}
