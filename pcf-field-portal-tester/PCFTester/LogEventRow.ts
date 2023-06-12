export interface LogEventRow {
    index: number;
    timestamp: Date;
    message: string;
    eventName: string;
    source: string;
    [key: string]: string | Date | number;
}
