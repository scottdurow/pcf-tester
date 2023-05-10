import { useState, useMemo } from 'react';
import useResizeObserver, { ObservedSize } from 'use-resize-observer';
import * as lodash from 'lodash-es';

export function useDebouncedResizeObserver<T extends Element>(wait: number) {
    const [size, setSize] = useState<ObservedSize>({ width: undefined, height: undefined });
    const onResize = useMemo(() => lodash.debounce(setSize, wait, { leading: true }), [wait]);
    const { ref } = useResizeObserver<T>({ onResize });

    return { ref, ...size };
}
