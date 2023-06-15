import * as React from 'react';
import { getMode, setMode } from './TestMode';
import { LogEventRow, Tester, TesterInterface } from './components/Tester';
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

export class PCFTester implements ComponentFramework.ReactControl<IInputs, IOutputs> {
    private theComponent: ComponentFramework.ReactControl<IInputs, IOutputs>;
    private notifyOutputChanged: () => void;

    private eventCount: Record<string, number> = {};
    private logEvents: LogEventRow[] = [];
    private eventName: PCFEvents;
    private eventDisplayName: string;
    private context: ContextExtended<IInputs>;
    private propertyBag: Record<string, string> = {};
    private scheduleEvent: boolean;
    private state: ComponentFramework.Dictionary;

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

    private testerRef: React.RefObject<TesterInterface>;

    constructor() {
        this.testerRef = React.createRef();
    }

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
    ): void {
        this.context = context as ContextExtended<IInputs>;
        this.state = state;
        context.mode.trackContainerResize(true);
        this.notifyOutputChanged = notifyOutputChanged;
        this.setEvent(PCFEvents.init);
        this.logEvent('init', '---', false);
        this.runModeCommands();
    }

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
            case 'hidden_columns':
                {
                    const dataset = context.parameters.dataset_a;
                    if (dataset) {
                        const columns = dataset.columns.filter((c) => c.isHidden || c.order === -1);
                        const columnDisplayNames = columns.map((c) => `${c.displayName}`).join(' | ');
                        const columnLogicalNames = columns
                            .map((c) => `${c.name}${c.alias ? '(' + c.alias + ')' : ''}`)
                            .join(' | ');
                        this.logEvent('Hidden Cols', columnDisplayNames);
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
            case 'inputs':
                {
                    const fieldNames = Object.keys(context.parameters);
                    // remove the out of the box values
                    [
                        'labelForPrefix',
                        'deviceSizeMode',
                        'viewportSizeMode',
                        'syncError',
                        'scope',
                        'forceColumnLayout',
                        'autoExpand',
                        'NativeFilterExpressionToRestore',
                        'LookupAttributeNameForHierarchy',
                        'useSkypeProtocol',
                        'gridPageNumber',
                        'isNewPageRequested',
                        'enhancedPagingDisabled',
                        'isActivityTypeFilterDisabled',
                        'showAddNewCommand',
                        'emptySubgridIconAndTextChanges',
                        'emptyGridChangesIfQuickFindImprovementsEnabled',
                        'headerDialogOnTop',
                        'headerDialogPreventDismissOnScroll',
                        'listSortHeaderEnabled',
                    ].forEach((field) => {
                        const index = fieldNames.indexOf(field);
                        if (index > -1) fieldNames.splice(index, 1);
                    });

                    const parameters = context.parameters as any as Record<
                        string,
                        ComponentFramework.PropertyTypes.Property
                    >;

                    const fieldValues = fieldNames.map((fieldName) => {
                        const parameterValue = parameters[fieldName];
                        if (parameterValue) return `${fieldName}=${parameterValue?.raw}`;
                    });
                    const outputString = fieldValues.join(' | ');

                    this.logEvent(`♻️inputs ${this.incrementEventCount('inputs')}`, outputString, false);
                }
                break;

            case 'state':
                {
                    const state = this.state;
                    if (state) {
                        this.logEvent('state', JSON.stringify(state), false);
                    }
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
        this.testerRef.current?.refresh(this.logEvents);
    }

    // eslint-disable-next-line sonarjs/cognitive-complexity
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
                this.notifyOutputChanged();
                break;
            case 'notify_n':
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

    public getOutputs(): IOutputs {
        this.setEvent(PCFEvents.getOutputs);
        this.logEvent('---', JSON.stringify(this.propertyBag), true);

        return this.propertyBag;
    }

    public destroy(): void {
        // Add code to cleanup control if necessary
    }
}
