import * as React from 'react';
import {
    DataGridBody,
    DataGrid,
    DataGridRow,
    DataGridHeader,
    DataGridCell,
    DataGridHeaderCell,
} from '@fluentui/react-data-grid-react-window';
import {
    FluentProvider,
    Input,
    Label,
    TableColumnDefinition,
    Text,
    createTableColumn,
    makeStyles,
    shorthands,
    useFluent,
    useId,
    useScrollbarWidth,
    webLightTheme,
} from '@fluentui/react-components';
import { useDebouncedResizeObserver } from '../hooks/useDebouncedResizeObserver';

const useStyles = makeStyles({
    root: {
        // Stack the label above the field
        display: 'flex',
        flexDirection: 'column',
        // Use 2px gap below the label (per the design system)
        ...shorthands.gap('2px'),
        // Prevent the example from taking the full width of the page (optional)
        maxWidth: '400px',
    },
});

export interface TesterProps {
    logEvents: LogEventRow[];
    width: number;
    height?: number;
    mode: string;
    heightMode: 'fixed' | 'auto';
    onCommand: (verb: string, args: string[]) => void;
}

export interface LogEventRow {
    index: number;
    timestamp: Date;
    message: string;
    eventName: string;
    source: string;
    [key: string]: string | Date | number;
}
export interface TesterInterface {
    refresh: (events: LogEventRow[]) => void;
}

export const Tester = React.forwardRef<TesterInterface, TesterProps>((props: TesterProps, ref) => {
    const { logEvents, onCommand, height, heightMode, width, mode } = props;

    const inputId = useId('input');
    const [command, setCommand] = React.useState('');
    const styles = useStyles();
    const { targetDocument } = useFluent();
    const scrollbarWidth = useScrollbarWidth({ targetDocument });
    const [internalLogEvents, setInternalLogEvents] = React.useState(props.logEvents);
    const [measuredHeight, setMeasuredHeight] = React.useState(0);
    const [internalMode, setInternalMode] = React.useState(mode);

    const controlHeight = (height || 0) > 0 ? `${height}px` : '100%';

    const {
        ref: containerRef,
        height: containerHeight,
        width: containerWidth,
    } = useDebouncedResizeObserver<HTMLDivElement>(200);

    React.useEffect(() => {
        setInternalLogEvents(logEvents);
    }, [logEvents]);

    const handleRefresh = (events: LogEventRow[]) => {
        setInternalLogEvents(events);
        // force refresh of the grid
        setMeasuredHeight(measuredHeight + 1);
    };

    React.useImperativeHandle(ref, () => ({
        refresh: handleRefresh,
    }));

    const columns: TableColumnDefinition<LogEventRow>[] = [
        createTableColumn<LogEventRow>({
            columnId: 'index',
            renderHeaderCell: () => {
                return '#';
            },
            renderCell: (item) => {
                return item.index.toString();
            },
        }),
        createTableColumn<LogEventRow>({
            columnId: 'event',
            renderHeaderCell: () => {
                return 'Event';
            },
            renderCell: (item) => {
                return item.eventName;
            },
        }),
        createTableColumn<LogEventRow>({
            columnId: 'source',
            renderHeaderCell: () => {
                return 'Source';
            },
            renderCell: (item) => {
                return item.source;
            },
        }),
        createTableColumn<LogEventRow>({
            columnId: 'message',
            renderHeaderCell: () => {
                return 'message';
            },
            renderCell: (item) => {
                return item.message;
            },
        }),
    ];

    const onCommandKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            // separate the command and arguments
            const args = command.split(' ');
            const verb = args.shift() || '';

            if (verb === 'mode') {
                setInternalMode(args[0]);
            }
            onCommand(verb, args);
            setCommand('');
        }
    };

    const gridHeight = heightMode === 'auto' ? (containerHeight ? containerHeight - 40 : 0) : 200;

    return (
        <FluentProvider theme={webLightTheme} style={{ display: 'flex', width: '100%' }}>
            <div
                style={{
                    display: 'flex',
                    flexGrow: 1,
                    flexDirection: 'column',
                    height: controlHeight,
                    width: `${containerWidth}px`,
                }}
            >
                <div className={styles.root}>
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                        <Label htmlFor={inputId}>Command:</Label>
                        <Text>Mode:{internalMode}</Text>
                    </div>
                    <Input
                        id={inputId}
                        value={command}
                        onChange={(e, data) => {
                            setCommand(data.value);
                        }}
                        // When the user presses enter, we'll execute the command
                        onKeyDown={onCommandKeyDown}
                    />
                </div>

                <div ref={containerRef} style={{ flex: '1' }}>
                    <DataGrid
                        items={internalLogEvents}
                        columns={columns}
                        resizableColumns
                        columnSizingOptions={{
                            index: {
                                defaultWidth: 30,
                            },
                            event: {
                                defaultWidth: 100,
                            },
                            source: {
                                defaultWidth: 100,
                            },
                            timestamp: {
                                defaultWidth: 100,
                                idealWidth: 100,
                            },
                        }}
                    >
                        <DataGridHeader style={{ paddingRight: scrollbarWidth }}>
                            <DataGridRow>
                                {({ renderHeaderCell }) => (
                                    <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                                )}
                            </DataGridRow>
                        </DataGridHeader>
                        <DataGridBody<LogEventRow> itemSize={50} height={gridHeight}>
                            {({ item, rowId }, style) => (
                                <DataGridRow<LogEventRow> key={rowId} style={style}>
                                    {(column) => <DataGridCell>{column.renderCell(item)}</DataGridCell>}
                                </DataGridRow>
                            )}
                        </DataGridBody>
                    </DataGrid>
                </div>
            </div>
        </FluentProvider>
    );
});

Tester.displayName = 'Tester';
