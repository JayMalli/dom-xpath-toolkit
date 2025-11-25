#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import process, { stdin as stdinStream } from 'node:process';
import { Buffer } from 'node:buffer';
import { pathToFileURL } from 'node:url';
import { Command } from 'commander';
import { JSDOM } from 'jsdom';
import { getXPathForNode, getXPathForSelection, resolveXPath, findCommonAncestorXPath } from '..';

interface GlobalSourceOptions {
  file?: string;
  url?: string;
  allowHttp?: boolean;
}

type CliRuntimeOptions = GlobalSourceOptions & { json?: boolean };

function resolveCliOptions(command?: Command): CliRuntimeOptions {
  if (!command) {
    return {};
  }

  // In Commander.js v11+, optsWithGlobals() merges parent and local options
  if (typeof (command as any).optsWithGlobals === 'function') {
    return (command as any).optsWithGlobals();
  }

  // Fallback for older versions or edge cases
  const parentOptions = command.parent?.opts<CliRuntimeOptions>() ?? {};
  const localOptions = command.opts<CliRuntimeOptions>();
  return { ...parentOptions, ...localOptions };
}

async function readInput(
  opts: GlobalSourceOptions
): Promise<{ dom: JSDOM; html: string }> {
  if (opts.file) {
    const data = await readFile(opts.file, 'utf-8');
    return {
      html: data,
      dom: new JSDOM(data, { url: opts.url ?? 'https://local.test/' }),
    };
  }

  if (opts.url) {
    const url = new URL(opts.url);
    if (url.protocol !== 'https:' && !opts.allowHttp) {
      throw new Error('Refusing to fetch non-HTTPS resource without --allow-http flag.');
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL (status ${response.status}).`);
    }
    const text = await response.text();
    return {
      html: text,
      dom: new JSDOM(text, { url: url.toString() }),
    };
  }

  const chunks: Buffer[] = [];
  for await (const chunk of stdinStream) {
    chunks.push(Buffer.from(chunk));
  }
  const html = Buffer.concat(chunks).toString('utf-8');
  if (!html.trim()) {
    throw new Error('No input provided. Supply --file, --url, or pipe HTML via stdin.');
  }
  return {
    html,
    dom: new JSDOM(html, { url: 'https://local.test/' }),
  };
}

function printOutput(data: unknown, json: boolean | undefined): void {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  if (typeof data === 'string') {
    console.log(data);
    return;
  }
  console.log(JSON.stringify(data, null, 2));
}

async function handleGenerate(selector: string, _options: any, command: Command): Promise<void> {
  const opts = resolveCliOptions(command);
  const { dom } = await readInput(opts);
  const el = dom.window.document.querySelector(selector);
  if (!el) {
    throw new Error(`Selector did not match any elements: ${selector}`);
  }
  const xpath = getXPathForNode(el as Element);
  const output = { selector, xpath };
  printOutput(output, opts.json);
}

async function handleResolve(xpath: string, _options: any, command: Command): Promise<void> {
  const opts = resolveCliOptions(command);
  const { dom } = await readInput(opts);
  const match = resolveXPath(xpath, dom.window.document);
  const output = match
    ? {
        xpath,
        matched: true,
        tag: match.tagName.toLowerCase(),
        attributes: Object.fromEntries(Array.from(match.attributes).map((attr) => [attr.name, attr.value])),
      }
    : { xpath, matched: false };
  printOutput(output, opts.json);
}

async function handleInspectSelection(
  cmdOptions: { start: string; end?: string },
  command: Command
): Promise<void> {
  const opts = resolveCliOptions(command);
  const { dom } = await readInput(opts);
  const { start, end } = cmdOptions;
  const startEl = dom.window.document.querySelector(start);
  if (!startEl) {
    throw new Error(`Start selector did not match any elements: ${start}`);
  }
  const endEl = end ? dom.window.document.querySelector(end) : startEl;
  if (end && !endEl) {
    throw new Error(`End selector did not match any elements: ${end}`);
  }

  const selection = dom.window.getSelection();
  selection?.removeAllRanges();
  const range = dom.window.document.createRange();
  range.selectNodeContents(startEl);
  if (endEl && endEl !== startEl) {
    range.setEndAfter(endEl);
  }
  selection?.addRange(range);

  const snapshot = getXPathForSelection(selection ?? undefined);
  const output = {
    text: snapshot.text,
    startXPath: snapshot.startXPath,
    endXPath: snapshot.endXPath,
    commonXPath:
      snapshot.commonXPath ??
      (startEl && endEl
        ? findCommonAncestorXPath([startEl as Element, endEl as Element])
        : null),
  };
  printOutput(output, opts.json);
}

export async function runCli(argv: string[] = process.argv): Promise<void> {
  const program = new Command();
  program
    .name('dom-xpath')
    .description('CLI utilities for dom-xpath-toolkit')
    .option('--file <path>', 'Read HTML from file')
    .option('--url <url>', 'Fetch HTML from URL (HTTPS by default)')
    .option('--allow-http', 'Permit fetching non-HTTPS URLs')
    .option('--json', 'Output JSON payloads');

  program
    .command('generate')
    .description('Generate an XPath for the first match of a CSS selector')
    .argument('<selector>', 'CSS selector to locate an element')
    .action((selector: string, options: any, command: Command) =>
      handleGenerate(selector, options, command).catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 2;
      })
    );

  program
    .command('resolve')
    .description('Resolve an XPath and show details about the matched node')
    .argument('<xpath>', 'XPath expression to evaluate')
    .action((xpath: string, options: any, command: Command) =>
      handleResolve(xpath, options, command).catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 2;
      })
    );

  program
    .command('inspect-selection')
    .description('Simulate a selection defined by start/end selectors and report XPath metadata')
    .requiredOption('--start <selector>', 'CSS selector for start element')
    .option('--end <selector>', 'CSS selector for end element')
    .action((cmdOptions: { start: string; end?: string }, command: Command) =>
      handleInspectSelection(cmdOptions, command).catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 2;
      })
    );

  await program.parseAsync(argv);
}

const invokedFromCli = (() => {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  try {
    return import.meta.url === pathToFileURL(entry).href;
  } catch {
    return false;
  }
})();

if (invokedFromCli) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 2;
  });
}
