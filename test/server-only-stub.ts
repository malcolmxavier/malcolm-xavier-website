// Vitest stub for the Next.js `server-only` sentinel package.
// In production builds Next intercepts this import and ensures
// the file isn't bundled into client code; in our node-only
// test environment the package isn't installed and we just need
// the import to resolve to nothing.
export {};
