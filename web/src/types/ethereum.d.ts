interface Window {
  ethereum?: {
    request: (request: { method: string; params?: unknown[] }) => Promise<unknown>;
    on: (event: "accountsChanged" | "chainChanged", listener: (...args: unknown[]) => void) => void;
    removeListener: (event: "accountsChanged" | "chainChanged", listener: (...args: unknown[]) => void) => void;
  };
}
