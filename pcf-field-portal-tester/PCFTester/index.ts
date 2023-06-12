import { getMode, setMode } from './TestMode';
import { LogEventRow } from './LogEventRow';
import { IInputs, IOutputs } from './ManifestTypes';
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
    updateView: '🔶',
    Command: '🚀',
    getOutputs: '🔼',
};

export class PCFTester implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private notifyOutputChanged: () => void;

    private eventCount: Record<string, number> = {};
    // initialize private field logEvents of type LogEventRow[] with 20 rows of dummy data
    private logEvents: LogEventRow[] = [];
    private eventName: PCFEvents;
    private eventDisplayName: string;
    private context: ContextExtended<IInputs>;
    private propertyBag: Record<string, string> = {};
    private scheduleEvent: boolean;
    private state: ComponentFramework.Dictionary;
    container: HTMLDivElement;

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

    //private testerRef: React.RefObject<TesterInterface>;

    /**
     * Empty constructor.
     */
    constructor() {
        //this.testerRef = React.createRef();
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
        container: HTMLDivElement,
    ): void {
        this.context = context as ContextExtended<IInputs>;
        this.state = state;
        this.container = container;
        context.mode.trackContainerResize(true);
        this.notifyOutputChanged = notifyOutputChanged;
        this.setEvent(PCFEvents.init);
        this.logEvent('init', '---', false);
        this.runModeCommands();
        this.render();
    }

    /**
     * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
     * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
     * @returns ReactElement root react element for the control
     */
    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this.context = context as ContextExtended<IInputs>;
        this.setEvent(PCFEvents.updateView);
        // for each mode call runCommand
        this.runModeCommands();

        if (this.scheduleEvent) {
            this.scheduleEvent = false;
            this.context.events.OnAction();
        }

        // clear the container child nodes
        this.render();
    }

    private render() {
        this.container.innerHTML = '';

        // add a label with the current mode
        const mode = getMode();
        const modeLabel = document.createElement('label');
        modeLabel.innerText = `Mode: ${mode}`;
        this.container.appendChild(modeLabel);

        // set the overflow of the container to scroll
        this.container.style.overflow = 'scroll';
        // set the height of the container to be the form height
        this.container.style.height = this.context.mode.allocatedHeight + 'px';

        // add a textbox that calls onCommand when enter is pressed
        const input = document.createElement('input');
        input.type = 'text';
        input.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                const command = input.value;
                input.value = '';
                const args = command.split(' ');
                const verb = args.shift();
                if (verb) this.onCommand(verb, args);
            }
        });

        // add a table of logEvents, with a column for index, event, source, message
        const table = document.createElement('table');
        const header = document.createElement('tr');
        const headerColumns = ['index', 'eventName', 'source', 'message'];
        headerColumns.forEach((columnName) => {
            const th = document.createElement('th');
            th.innerText = columnName;
            header.appendChild(th);
        });
        table.appendChild(header);

        this.logEvents.forEach((row) => {
            const tr = document.createElement('tr');
            headerColumns.forEach((columnName) => {
                const td = document.createElement('td');
                td.innerText = row[columnName].toString();
                tr.appendChild(td);
            });
            table.appendChild(tr);
        });

        this.container.appendChild(input);
        this.container.appendChild(table);
        // set focus on the textbox
        input.focus();
    }

    private runModeCommands() {
        const modes = getMode().split(',');
        modes.forEach((mode) => this.runCommand(mode));
    }

    // eslint-disable-next-line sonarjs/cognitive-complexity
    private runCommand(mode: string) {
        const context = this.context;
        switch (mode) {
            case 'clearevents':
                this.logEvents = [];
                break;
            case 'error':
                // prevent error on first render!
                if (this.getEventCount(PCFEvents.updateView) > 1) throw new Error('Error from updateView');
                break;
            case 'data':
                {
                    const dataset = context.parameters.dataset_a;
                    if (dataset) {
                        const columns = dataset.columns.filter((c) => !c.isHidden && c.order !== -1);
                        const datasetChanged =
                            context.updatedProperties.indexOf('dataset') > -1 ||
                            context.updatedProperties.indexOf('records_dataset_a') > -1;
                        if (!dataset.loading && datasetChanged) {
                            // List the data
                            dataset.sortedRecordIds.reverse().forEach((id, index) => {
                                const row = dataset.records[id];
                                const rowIndex = dataset.sortedRecordIds.length - index;
                                const rowData = columns.map((c) => `${row.getFormattedValue(c.name)}`).join(' | ');
                                this.logEvent('Row ' + rowIndex.toString(), rowData, false);
                            });
                        }
                    }
                }
                break;
            case 'columns':
                {
                    const dataset = context.parameters.dataset_a;
                    if (dataset) {
                        const columns = dataset.columns.filter((c) => !c.isHidden && c.order !== -1);
                        const columnDisplayNames = columns.map((c) => `${c.displayName}`).join(' | ');
                        const columnLogicalNames = columns
                            .map((c) => `${c.name}${c.alias ? '(' + c.alias + ')' : ''}`)
                            .join(' | ');
                        this.logEvent('Cols', columnDisplayNames);
                        this.logEvent('Cols (logical/alias)', columnLogicalNames);
                    }
                }
                break;
            case 'dataset':
                {
                    const dataset = context.parameters.dataset_a;
                    if (dataset) {
                        const datasetInfo = {
                            isLoading: dataset.loading,
                            isError: dataset.error,
                            errorMessage: dataset.errorMessage,
                            rowCount: dataset.sortedRecordIds.length,
                            total: dataset.paging.totalResultCount,
                            firstPageNumber: dataset.paging.firstPageNumber,
                            lastPageNumber: dataset.paging.lastPageNumber,

                            hasPreviousPage: dataset.paging.hasPreviousPage,
                            hasNextPage: dataset.paging.hasNextPage,
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
                                } | lastPage:${datasetInfo.lastPageNumber} | ${
                                    datasetInfo.hasPreviousPage ? '⬅️' : ''
                                }  ${datasetInfo.hasNextPage ? '➡️' : ''}`,
                                false,
                            );
                        }
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

            case 'state':
                {
                    const state = this.state;
                    if (state) {
                        this.logEvent('state', JSON.stringify(state), false);
                    }
                }
                break;
            case 'bound':
                {
                    // log each of the bound properties
                    const boundProperties = Object.keys(context.parameters).filter((p) => p.startsWith('bound_'));
                    // concat the values of the bound properties
                    const value = boundProperties
                        .map((boundProperty) => `${boundProperty}=${context.parameters[boundProperty]?.raw}`)
                        .join(' ');

                    this.logEvent('bound', value, false);
                }
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
        const row = { ...event, index: this.logEvents.length + 1 } as LogEventRow;

        this.logEvents.unshift(row);

        if (forceRefresh) this.refreshItems();
    }
    private refreshItems() {
        //this.testerRef.current?.refresh(this.logEvents);
        this.render();
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
            case 'setstate':
                {
                    // Set the state to the second argument
                    this.state = this.state || {};
                    this.state[args[0]] = args[1];
                    this.context.mode.setControlState(this.state);
                }
                break;
            case 'clearstate':
                {
                    this.context.mode.setControlState({});
                }
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
                            this.propertyBag['output_1'] = 'notify ' + i.toString();
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
                this.render();
                //this.testerRef.current?.refresh(this.logEvents);

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
