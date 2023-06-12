export function getMode() {
    return localStorage.getItem('pcf-test-mode') || 'default';
}

export function setMode(newMode: string) {
    localStorage.setItem('pcf-test-mode', newMode);
}
