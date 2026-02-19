declare module "better-sqlite3" {
  type Statement = {
    run: (...params: unknown[]) => unknown;
    get: (...params: unknown[]) => unknown;
    all: (...params: unknown[]) => unknown[];
  };

  type Database = {
    pragma: (cmd: string) => unknown;
    exec: (sql: string) => unknown;
    prepare: (sql: string) => Statement;
    transaction: <T extends (...args: never[]) => unknown>(fn: T) => T;
  };

  interface DatabaseConstructor {
    new (filename: string): Database;
  }

  const DatabaseImpl: DatabaseConstructor;
  export default DatabaseImpl;
}
