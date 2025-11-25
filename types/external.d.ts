declare module 'commander' {
  class Command {
    name(value: string): this;
    description(value: string): this;
    option(flags: string, description?: string): this;
    requiredOption(flags: string, description?: string): this;
    argument(name: string, description?: string): this;
    action(handler: (...args: any[]) => void): this;
    command(name: string): Command;
    parseAsync(argv?: readonly string[]): Promise<Command>;
    opts<T>(): T;
    parent?: Command;
  }
  export { Command };
}

declare module 'jsdom' {
  export class JSDOM {
    constructor(html?: string, options?: { url?: string });
    window: Window & { document: Document; getSelection(): Selection | null };
  }
}

declare module 'node:process' {
  import process from 'process';
  export * from 'process';
  export default process;
}

declare module 'node:buffer' {
  export * from 'buffer';
}

declare module 'node:url' {
  export * from 'url';
}
