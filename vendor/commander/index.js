function toCamelCase(name) {
  return name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function parseOptionFlags(flags) {
  const parts = flags.split(/[ ,|]+/).filter(Boolean);
  const long = parts.find((part) => part.startsWith('--'));

  if (!long) {
    throw new Error(`Only long options are supported by local commander shim: ${flags}`);
  }

  const match = /^--([^\s<]+)/.exec(long);

  if (!match) {
    throw new Error(`Invalid option flags: ${flags}`);
  }

  const rawName = match[1];
  const name = toCamelCase(rawName);
  const takesValue = flags.includes('<');

  return { rawName, name, takesValue };
}

class Command {
  constructor(definition = '') {
    this._name = '';
    this._description = '';
    this._definition = definition;
    this._options = [];
    this._requiredOptions = new Set();
    this._commands = [];
    this._action = null;
  }

  name(value) {
    this._name = value;
    return this;
  }

  description(value) {
    this._description = value;
    return this;
  }

  command(definition) {
    const child = new Command(definition);
    this._commands.push(child);
    return child;
  }

  option(flags, _description, defaultValue) {
    const parsed = parseOptionFlags(flags);
    this._options.push({ ...parsed, defaultValue });
    return this;
  }

  requiredOption(flags, description, defaultValue) {
    const parsed = parseOptionFlags(flags);
    this._options.push({ ...parsed, defaultValue });
    this._requiredOptions.add(parsed.name);
    return this;
  }

  action(fn) {
    this._action = fn;
    return this;
  }

  async parseAsync(argv) {
    const args = argv.slice(2);

    if (this._commands.length > 0) {
      const commandName = args[0];
      const command = this._commands.find((entry) => entry._definition.split(' ')[0] === commandName);

      if (!command) {
        throw new Error(`Unknown command: ${commandName ?? '(none)'}`);
      }

      await command._run(args.slice(1));
      return this;
    }

    await this._run(args);
    return this;
  }

  async _run(args) {
    const defParts = this._definition.split(' ').filter(Boolean);
    const positionals = defParts.filter((part) => part.startsWith('<') && part.endsWith('>'));
    const positionalValues = [];
    const options = Object.fromEntries(
      this._options
        .filter((option) => option.defaultValue !== undefined)
        .map((option) => [option.name, option.defaultValue])
    );

    let cursor = 0;

    while (cursor < args.length) {
      const current = args[cursor];

      if (current?.startsWith('--')) {
        const optionName = current.slice(2);
        const option = this._options.find((entry) => entry.rawName === optionName);

        if (!option) {
          throw new Error(`Unknown option: ${current}`);
        }

        if (option.takesValue) {
          const value = args[cursor + 1];

          if (!value || value.startsWith('--')) {
            throw new Error(`Option ${current} requires a value.`);
          }

          options[option.name] = value;
          cursor += 2;
          continue;
        }

        options[option.name] = true;
        cursor += 1;
        continue;
      }

      positionalValues.push(current);
      cursor += 1;
    }

    for (const requiredName of this._requiredOptions.values()) {
      const value = options[requiredName];

      if (value === undefined || value === null || value === '') {
        throw new Error(`Missing required option: --${requiredName}`);
      }
    }

    if (positionals.length > positionalValues.length) {
      throw new Error(`Missing required positional arguments for ${this._definition}`);
    }

    if (!this._action) {
      return;
    }

    if (positionals.length > 0) {
      await this._action(...positionalValues, options);
      return;
    }

    await this._action(options);
  }
}

export { Command };
