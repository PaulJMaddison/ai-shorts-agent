export class Command {
  constructor(definition?: string);
  name(value: string): this;
  description(value: string): this;
  command(definition: string): Command;
  option(flags: string, description?: string, defaultValue?: string): this;
  requiredOption(flags: string, description?: string, defaultValue?: string): this;
  action(fn: (...args: any[]) => unknown | Promise<unknown>): this;
  parseAsync(argv: string[]): Promise<this>;
}
