// Load dom-xpath-toolkit via the published package entry point.
import * as Toolkit from 'dom-xpath-toolkit';

const FIXTURE_PATH = './fixtures/all-elements.html';

const state = {
  currentHTML: '',
  htmlLoadedFrom: 'fixture',
  customHTML: '',
  activeHtmlTab: 'default',
};

const isFixtureSource = (source) => source === 'fixture' || source === 'fallback';
const MAX_NODE_PREVIEW = 10;

function ensureSurfaceElement(surface, selector, label) {
  if (!selector) {
    throw new Error(`${label} is required.`);
  }
  const element = surface?.querySelector(selector);
  if (!element) {
    throw new Error(`No element matched ${label} "${selector}" inside the test surface.`);
  }
  return element;
}

function getContextNode(surface, selector) {
  if (!selector) {
    return surface;
  }
  return ensureSurfaceElement(surface, selector, 'Context CSS selector');
}

function parseAttributeList(value) {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((attr) => attr.trim())
    .filter(Boolean);
}

function resolveMultipleMode(mode) {
  return mode === 'all' ? 'all' : 'first';
}

const SHARED_INPUT_TOOLTIPS = {
  preferId: 'When enabled, XPath generation favors unique id attributes before other heuristics.',
  minIndex: 'Controls when positional indexes are added to XPath steps: only when needed, always, or never.',
  attributePriority: 'Comma separated list of attributes to prioritize ahead of the default heuristics.',
  trim: 'Removes leading and trailing whitespace from the text before returning it.',
  multipleMode: 'Choose whether to return only the first match or every match as an array.',
  exact: 'Exact mode matches full text content; disable to allow partial contains matches.',
};

function normalizeMarkupForPreview(html) {
  if (typeof DOMParser === 'undefined' || !/(<html|<body)/i.test(html)) {
    return html;
  }
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const head = doc.head;
    const body = doc.body;
    const styleFragments = head
      ? Array.from(head.querySelectorAll('style, link[rel="stylesheet"]')).map((node) => node.outerHTML)
      : [];
    if (!body) {
      const serialized = doc.documentElement?.outerHTML ?? '';
      return serialized ? styleFragments.join('') + serialized : html;
    }
    const wrapper = document.createElement('div');
    wrapper.innerHTML = body.innerHTML;
    if (body.getAttribute('class')) {
      wrapper.setAttribute('class', body.getAttribute('class'));
    }
    return styleFragments.join('') + wrapper.outerHTML;
  } catch (error) {
    console.warn('Unable to normalize fixture markup', error);
    return html;
  }
}

const functionCatalog = [
  {
    id: 'getXPathForNode',
    label: 'getXPathForNode',
    description: 'Generate an absolute XPath for a node matched by CSS selector with configurable heuristics.',
    inputs: [
      { name: 'cssSelector', label: 'Target CSS selector', placeholder: '#email', required: true },
      { name: 'preferId', label: 'Prefer unique IDs?', inputType: 'checkbox', defaultValue: true },
      {
        name: 'minIndex',
        label: 'Index strategy',
        type: 'select',
        options: [
          { label: 'Auto (only when needed)', value: 'auto' },
          { label: 'Always include indexes', value: 'always' },
          { label: 'Never include indexes', value: 'never' },
        ],
        defaultValue: 'auto',
      },
      {
        name: 'attributePriority',
        label: 'Preferred attributes (comma separated)',
        placeholder: 'data-testid,name',
        helperText: 'Optional: overrides default attribute priority list.',
      },
    ],
    run: ({ cssSelector, preferId, minIndex, attributePriority }, ctx) => {
      const element = ensureSurfaceElement(ctx.surface, cssSelector, 'Target CSS selector');
      const priority = parseAttributeList(attributePriority);
      const options = {
        preferId: preferId !== false,
        minIndex: minIndex || 'auto',
      };
      if (priority.length) {
        options.preferUniqueAttributes = priority;
      }
      return {
        selector: cssSelector,
        options,
        xpath: Toolkit.getXPathForNode(element, options),
        preview: describeNode(element),
      };
    },
  },
  {
    id: 'getShortestUniqueXPath',
    label: 'getShortestUniqueXPath',
    description: 'Find the minimal-length XPath that still uniquely identifies a node.',
    inputs: [
      { name: 'cssSelector', label: 'Target CSS selector', placeholder: '.pill[data-tag="beta"]', required: true },
      { name: 'preferId', label: 'Prefer unique IDs?', inputType: 'checkbox', defaultValue: true },
      {
        name: 'minIndex',
        label: 'Index strategy',
        type: 'select',
        options: [
          { label: 'Auto', value: 'auto' },
          { label: 'Always', value: 'always' },
          { label: 'Never', value: 'never' },
        ],
        defaultValue: 'auto',
      },
    ],
    run: ({ cssSelector, preferId, minIndex }, ctx) => {
      const element = ensureSurfaceElement(ctx.surface, cssSelector, 'Target CSS selector');
      const options = { preferId: preferId !== false, minIndex: minIndex || 'auto' };
      return {
        selector: cssSelector,
        options,
        xpath: Toolkit.getShortestUniqueXPath(element, options),
      };
    },
  },
  {
    id: 'resolveXPath',
    label: 'resolveXPath',
    description: 'Resolve an XPath relative to an optional context element.',
    inputs: [
      { name: 'xpathExpression', label: 'XPath expression', placeholder: '//*[@id="email"]', required: true },
      { name: 'contextSelector', label: 'Context CSS selector (optional)', placeholder: '#forms' },
    ],
    run: ({ xpathExpression, contextSelector }, ctx) => {
      const context = getContextNode(ctx.surface, contextSelector);
      const node = Toolkit.resolveXPath(xpathExpression, context);
      return {
        xpathExpression,
        context: contextSelector || 'surface root',
        resolved: describeNode(node),
      };
    },
  },
  {
    id: 'findCommonAncestorXPath',
    label: 'findCommonAncestorXPath',
    description: 'Return the XPath of the nearest shared ancestor for two selectors.',
    inputs: [
      { name: 'firstSelector', label: 'First CSS selector', placeholder: '#email', required: true },
      { name: 'secondSelector', label: 'Second CSS selector', placeholder: '#password', required: true },
    ],
    run: ({ firstSelector, secondSelector }, ctx) => {
      const first = ensureSurfaceElement(ctx.surface, firstSelector, 'First CSS selector');
      const second = ensureSurfaceElement(ctx.surface, secondSelector, 'Second CSS selector');
      return {
        first: describeNode(first),
        second: describeNode(second),
        ancestorXPath: Toolkit.findCommonAncestorXPath([first, second]),
      };
    },
  },
  {
    id: 'getXPathForSelection',
    label: 'getXPathForSelection',
    description: 'Highlight text inside the preview, then click run to capture selection metadata.',
    inputs: [],
    run: () => Toolkit.getXPathForSelection(window.getSelection()),
  },
  {
    id: 'normalizeXPath',
    label: 'normalizeXPath',
    description: 'Trim redundant slashes or trailing separators from an XPath.',
    inputs: [{ name: 'xpathExpression', label: 'XPath expression', placeholder: ' //div///span// ', required: true }],
    run: ({ xpathExpression }) => ({ original: xpathExpression, normalized: Toolkit.normalizeXPath(xpathExpression) }),
  },
  {
    id: 'isXPathMatch',
    label: 'isXPathMatch',
    description: 'Check whether a node matches a given XPath expression.',
    inputs: [
      { name: 'cssSelector', label: 'Node CSS selector', placeholder: '#email', required: true },
      { name: 'xpathExpression', label: 'XPath expression', placeholder: '//*[@id="email"]', required: true },
      { name: 'contextSelector', label: 'Context CSS selector (optional)', placeholder: '#forms' },
    ],
    run: ({ cssSelector, xpathExpression, contextSelector }, ctx) => {
      const element = ensureSurfaceElement(ctx.surface, cssSelector, 'Node CSS selector');
      const context = getContextNode(ctx.surface, contextSelector);
      return {
        selector: cssSelector,
        xpathExpression,
        matches: Toolkit.isXPathMatch(element, xpathExpression, context),
      };
    },
  },
  {
    id: 'createXPathGenerator',
    label: 'createXPathGenerator',
    description: 'Instantiate a custom generator with default options (and optional data-* plugin).',
    inputs: [
      { name: 'cssSelector', label: 'Target CSS selector', placeholder: '.card[data-kind="warning"]', required: true },
      { name: 'preferId', label: 'Prefer unique IDs?', inputType: 'checkbox', defaultValue: true },
      {
        name: 'minIndex',
        label: 'Index strategy',
        type: 'select',
        options: [
          { label: 'Auto', value: 'auto' },
          { label: 'Always', value: 'always' },
          { label: 'Never', value: 'never' },
        ],
        defaultValue: 'auto',
      },
      {
        name: 'dataAttribute',
        label: 'Custom data-* attribute for plugin (optional)',
        placeholder: 'data-seq',
        helperText: 'When provided, a temporary plugin prefers this attribute.',
      },
    ],
    run: ({ cssSelector, preferId, minIndex, dataAttribute }, ctx) => {
      const element = ensureSurfaceElement(ctx.surface, cssSelector, 'Target CSS selector');
      const plugins = [];
      if (dataAttribute) {
        plugins.push({
          name: `playground:${dataAttribute}`,
          provideSelector({ node }) {
            const value = node.getAttribute(dataAttribute);
            return value ? `//*[@${dataAttribute}="${value}"]` : null;
          },
        });
      }
      const generator = Toolkit.createXPathGenerator({
        defaultOptions: { preferId: preferId !== false, minIndex: minIndex || 'auto' },
        plugins,
      });
      return {
        selector: cssSelector,
        options: { preferId: preferId !== false, minIndex: minIndex || 'auto', pluginAttribute: dataAttribute || null },
        xpath: generator.getXPathForNode(element),
      };
    },
  },
  {
    id: 'getElementByXPath',
    label: 'getElementByXPath',
    description: 'Resolve an element using XPath and optional context within the test surface.',
    inputs: [
      { name: 'xpathExpression', label: 'XPath expression', placeholder: '//*[@data-kind="success"]', required: true },
      { name: 'contextSelector', label: 'Context CSS selector (optional)', placeholder: '#forms' },
    ],
    run: ({ xpathExpression, contextSelector }, ctx) => {
      const context = getContextNode(ctx.surface, contextSelector);
      const element = Toolkit.getElementByXPath(xpathExpression, context);
      return {
        xpathExpression,
        context: contextSelector || 'surface root',
        element: describeNode(element),
      };
    },
  },
  {
    id: 'getElementText',
    label: 'getElementText',
    description: 'Grab textContent from a node with optional trimming.',
    inputs: [
      { name: 'cssSelector', label: 'Element CSS selector', placeholder: '.card h3', required: true },
      { name: 'trim', label: 'Trim whitespace?', inputType: 'checkbox', defaultValue: true },
    ],
    run: ({ cssSelector, trim }, ctx) => {
      const element = ensureSurfaceElement(ctx.surface, cssSelector, 'Element CSS selector');
      return {
        selector: cssSelector,
        trim: trim !== false,
        text: Toolkit.getElementText(element, trim !== false),
      };
    },
  },
  {
    id: 'getXPathById',
    label: 'getXPathById',
    description: 'Return the XPath for one/all elements by id.',
    inputs: [
      { name: 'elementId', label: 'Element id', placeholder: 'email', required: true },
      {
        name: 'multipleMode',
        label: 'Result mode',
        type: 'select',
        options: [
          { label: 'First match', value: 'first' },
          { label: 'All matches', value: 'all' },
        ],
        defaultValue: 'first',
      },
    ],
    run: ({ elementId, multipleMode }) => ({
      elementId,
      mode: multipleMode,
      result: Toolkit.getXPathById(elementId, { multiple: resolveMultipleMode(multipleMode) }),
    }),
  },
  {
    id: 'getXPathByClass',
    label: 'getXPathByClass',
    description: 'Find elements by class name and return XPath(s).',
    inputs: [
      { name: 'className', label: 'Class name', placeholder: 'pill', required: true },
      {
        name: 'multipleMode',
        label: 'Result mode',
        type: 'select',
        options: [
          { label: 'First match', value: 'first' },
          { label: 'All matches', value: 'all' },
        ],
        defaultValue: 'first',
      },
    ],
    run: ({ className, multipleMode }) => ({
      className,
      mode: multipleMode,
      result: Toolkit.getXPathByClass(className, { multiple: resolveMultipleMode(multipleMode) }),
    }),
  },
  {
    id: 'getXPathByTag',
    label: 'getXPathByTag',
    description: 'Return XPath(s) for a given tag name.',
    inputs: [
      { name: 'tagName', label: 'Tag name', placeholder: 'button', required: true },
      {
        name: 'multipleMode',
        label: 'Result mode',
        type: 'select',
        options: [
          { label: 'First match', value: 'first' },
          { label: 'All matches', value: 'all' },
        ],
        defaultValue: 'first',
      },
    ],
    run: ({ tagName, multipleMode }) => ({
      tagName,
      mode: multipleMode,
      result: Toolkit.getXPathByTag(tagName, { multiple: resolveMultipleMode(multipleMode) }),
    }),
  },
  {
    id: 'getXPathByLabel',
    label: 'getXPathByLabel',
    description: 'Locate form controls via their label text.',
    inputs: [
      { name: 'labelText', label: 'Label text', placeholder: 'Password', required: true },
      {
        name: 'multipleMode',
        label: 'Result mode',
        type: 'select',
        options: [
          { label: 'First match', value: 'first' },
          { label: 'All matches', value: 'all' },
        ],
        defaultValue: 'first',
      },
    ],
    run: ({ labelText, multipleMode }) => ({
      labelText,
      mode: multipleMode,
      result: Toolkit.getXPathByLabel(labelText, { multiple: resolveMultipleMode(multipleMode) }),
    }),
  },
  {
    id: 'getXPathByAttribute',
    label: 'getXPathByAttribute',
    description: 'Return XPath(s) for elements that expose a given attribute/value pair.',
    inputs: [
      { name: 'attributeName', label: 'Attribute name', placeholder: 'data-kind', required: true },
      { name: 'attributeValue', label: 'Attribute value (optional)', placeholder: 'warning' },
      {
        name: 'multipleMode',
        label: 'Result mode',
        type: 'select',
        options: [
          { label: 'First match', value: 'first' },
          { label: 'All matches', value: 'all' },
        ],
        defaultValue: 'all',
      },
    ],
    run: ({ attributeName, attributeValue, multipleMode }) => ({
      attributeName,
      attributeValue: attributeValue || null,
      mode: multipleMode,
      result: Toolkit.getXPathByAttribute(attributeName, attributeValue, { multiple: resolveMultipleMode(multipleMode) }),
    }),
  },
  {
    id: 'getXPathBySelector',
    label: 'getXPathBySelector',
    description: 'Convert a CSS selector into XPath(s) for matching elements.',
    inputs: [
      { name: 'cssSelector', label: 'CSS selector', placeholder: '.pill[data-tag="gamma"]', required: true },
      {
        name: 'multipleMode',
        label: 'Result mode',
        type: 'select',
        options: [
          { label: 'First match', value: 'first' },
          { label: 'All matches', value: 'all' },
        ],
        defaultValue: 'first',
      },
    ],
    run: ({ cssSelector, multipleMode }) => ({
      cssSelector,
      mode: multipleMode,
      result: Toolkit.getXPathBySelector(cssSelector, { multiple: resolveMultipleMode(multipleMode) }),
    }),
  },
  {
    id: 'getXPathByText',
    label: 'getXPathByText',
    description: 'Match elements by their text content with exact/contains modes.',
    inputs: [
      { name: 'textQuery', label: 'Text query', placeholder: 'Success Card', required: true },
      { name: 'exact', label: 'Exact match?', inputType: 'checkbox', defaultValue: true },
      {
        name: 'multipleMode',
        label: 'Result mode',
        type: 'select',
        options: [
          { label: 'First match', value: 'first' },
          { label: 'All matches', value: 'all' },
        ],
        defaultValue: 'all',
      },
    ],
    run: ({ textQuery, exact, multipleMode }) => ({
      textQuery,
      exact: exact !== false,
      mode: multipleMode,
      result: Toolkit.getXPathByText(textQuery, exact !== false, { multiple: resolveMultipleMode(multipleMode) }),
    }),
  },
  {
    id: 'select',
    label: 'select',
    description: 'Evaluate an XPath and list every matching node (preview limited to 10).',
    inputs: [
      { name: 'xpathExpression', label: 'XPath expression', placeholder: '//section[@id="forms"]//input', required: true },
      { name: 'contextSelector', label: 'Context CSS selector (optional)', placeholder: '#forms' },
    ],
    run: ({ xpathExpression, contextSelector }, ctx) => {
      const context = getContextNode(ctx.surface, contextSelector);
      const nodes = Toolkit.select(xpathExpression, context);
      return {
        count: nodes.length,
        preview: nodes.slice(0, MAX_NODE_PREVIEW).map(describeNode),
      };
    },
  },
  {
    id: 'selectOne',
    label: 'selectOne',
    description: 'Return the first node that matches an XPath expression.',
    inputs: [
      { name: 'xpathExpression', label: 'XPath expression', placeholder: '//section[@id="forms"]//input', required: true },
      { name: 'contextSelector', label: 'Context CSS selector (optional)', placeholder: '#forms' },
    ],
    run: ({ xpathExpression, contextSelector }, ctx) => {
      const context = getContextNode(ctx.surface, contextSelector);
      const node = Toolkit.selectOne(xpathExpression, context);
      return {
        xpathExpression,
        context: contextSelector || 'surface root',
        node: describeNode(node),
      };
    },
  },
  {
    id: 'getAttributeValue',
    label: 'getAttributeValue',
    description: 'Evaluate an XPath that targets a single attribute node and return its value.',
    inputs: [
      { name: 'attributeXPath', label: 'Attribute XPath', placeholder: '//img/@alt', required: true },
      { name: 'contextSelector', label: 'Context CSS selector (optional)', placeholder: '#media-panel' },
    ],
    run: ({ attributeXPath, contextSelector }, ctx) => {
      const context = getContextNode(ctx.surface, contextSelector);
      return {
        attributeXPath,
        context: contextSelector || 'surface root',
        value: Toolkit.getAttributeValue(attributeXPath, context),
      };
    },
  },
  {
    id: 'getAttributeValues',
    label: 'getAttributeValues',
    description: 'Evaluate an XPath that selects multiple attribute nodes and list their values.',
    inputs: [
      { name: 'attributeXPath', label: 'Attribute XPath', placeholder: '//*[@data-tag]/@data-tag', required: true },
      { name: 'contextSelector', label: 'Context CSS selector (optional)', placeholder: '.pill-list' },
    ],
    run: ({ attributeXPath, contextSelector }, ctx) => {
      const context = getContextNode(ctx.surface, contextSelector);
      return {
        attributeXPath,
        context: contextSelector || 'surface root',
        values: Toolkit.getAttributeValues(attributeXPath, context),
      };
    },
  },
  {
    id: 'isXPathSyntaxValid',
    label: 'isXPathSyntaxValid',
    description: 'Check whether an XPath string parses successfully.',
    inputs: [{ name: 'xpathExpression', label: 'XPath expression', placeholder: '//div', required: true }],
    run: ({ xpathExpression }) => ({ xpathExpression, valid: Toolkit.isXPathSyntaxValid(xpathExpression) }),
  },
  {
    id: 'doesXPathResolveToElement',
    label: 'doesXPathResolveToElement',
    description: 'Return true when the XPath resolves to at least one element within the context.',
    inputs: [
      { name: 'xpathExpression', label: 'XPath expression', placeholder: '//*[@id="email"]', required: true },
      { name: 'contextSelector', label: 'Context CSS selector (optional)', placeholder: '#forms' },
    ],
    run: ({ xpathExpression, contextSelector }, ctx) => {
      const context = getContextNode(ctx.surface, contextSelector);
      return {
        xpathExpression,
        context: contextSelector || 'surface root',
        resolves: Toolkit.doesXPathResolveToElement(xpathExpression, context),
      };
    },
  },
  {
    id: 'cssToXPath',
    label: 'cssToXPath',
    description: 'Convert a CSS selector into its XPath equivalent.',
    inputs: [{ name: 'cssExpression', label: 'CSS selector', placeholder: '.pill[data-tag="gamma"]', required: true }],
    run: ({ cssExpression }) => ({ cssExpression, xpath: Toolkit.cssToXPath(cssExpression) }),
  },
  {
    id: 'xpathToCss',
    label: 'xpathToCss',
    description: 'Convert a simple XPath expression into CSS (best-effort).',
    inputs: [{ name: 'xpathExpression', label: 'XPath expression', placeholder: '//*[@data-kind="success"]', required: true }],
    run: ({ xpathExpression }) => ({ xpathExpression, css: Toolkit.xpathToCss(xpathExpression) }),
  },
  {
    id: 'createHeuristicRegistry',
    label: 'createHeuristicRegistry',
    description: 'Inspect the default heuristic list and optionally register a temporary attribute-based heuristic.',
    inputs: [
      {
        name: 'attributeName',
        label: 'Custom attribute name (optional)',
        placeholder: 'aria-level',
        helperText: 'When provided, registers a heuristic that targets this attribute if present.',
      },
    ],
    run: ({ attributeName }) => {
      const registry = Toolkit.createHeuristicRegistry();
      const before = registry.list().map((heuristic) => heuristic.name);
      let registeredHeuristic = null;
      if (attributeName) {
        registry.register({
          name: `playground:${attributeName}`,
          provideSelector({ node }) {
            const value = node.getAttribute(attributeName);
            return value ? `//*[@${attributeName}="${value}"]` : null;
          },
        });
        registeredHeuristic = `playground:${attributeName}`;
      }
      const after = registry.list().map((heuristic) => heuristic.name);
      return {
        registeredHeuristic,
        heuristicsBefore: before,
        heuristicsAfter: after,
      };
    },
  },
];

functionCatalog.forEach((definition) => {
  if (!Array.isArray(definition.inputs)) {
    return;
  }
  definition.inputs.forEach((input) => {
    if (!input.tooltip && SHARED_INPUT_TOOLTIPS[input.name]) {
      input.tooltip = SHARED_INPUT_TOOLTIPS[input.name];
    }
  });
});

const dom = {
  functionSelect: document.getElementById('function-select'),
  functionInfo: document.getElementById('function-info'),
  dynamicInputs: document.getElementById('dynamic-inputs'),
  runButton: document.getElementById('run-button'),
  resultOutput: document.getElementById('result-output'),
  htmlTabButtons: document.querySelectorAll('[data-html-tab]'),
  htmlPanes: document.querySelectorAll('[data-html-pane]'),
  renderView: document.getElementById('render-view'),
  sourceView: document.getElementById('source-view'),
  htmlPlaceholder: document.getElementById('html-placeholder'),
  loadFixtureButton: document.getElementById('load-fixture'),
  fileInput: document.getElementById('file-input'),
  applyHTMLButton: document.getElementById('apply-html'),
  htmlTextarea: document.getElementById('html-textarea'),
  showHtmlSource: document.getElementById('show-html-source'),
  showHtmlSourceCustom: document.getElementById('show-html-source-custom'),
  resetButton: document.getElementById('reload-playground'),
};

function describeNode(node) {
  if (!node) {
    return null;
  }
  if (node.nodeType === Node.ATTRIBUTE_NODE) {
    return {
      type: 'attribute',
      name: node.name,
      value: node.value,
    };
  }
  if (node.nodeType === Node.TEXT_NODE) {
    return {
      type: 'text',
      value: node.textContent?.trim()?.slice(0, 200) ?? '',
    };
  }
  return {
    type: 'element',
    tagName: node.tagName,
    id: node.id || null,
    classes: node.className || null,
    snippet: node.outerHTML?.slice(0, 200) ?? node.textContent?.trim()?.slice(0, 200) ?? '',
  };
}

function formatResult(value, indent = 0) {
  const pad = '  '.repeat(indent);
  if (value == null) {
    return `${pad}${value}`;
  }
  if (Array.isArray(value)) {
    if (!value.length) {
      return `${pad}[]`;
    }
    return value.map((entry) => `${pad}- ${formatResult(entry, indent + 1).trimStart()}`).join('\n');
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (!entries.length) {
      return `${pad}{}`;
    }
    return entries
      .map(([key, val]) => {
        const formatted = formatResult(val, indent + 1);
        if (!formatted.includes('\n')) {
          return `${pad}${key}: ${formatted.trimStart()}`;
        }
        return `${pad}${key}:\n${formatted}`;
      })
      .join('\n');
  }
  return `${pad}${String(value)}`;
}

function separateVisualTargets(rawResult) {
  // Visualization removed - just return result without processing visual targets
  if (!rawResult || typeof rawResult !== 'object' || Array.isArray(rawResult)) {
    return { printableResult: rawResult };
  }
  const printableResult = { ...rawResult };
  delete printableResult.visualTargets;
  return { printableResult };
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Visualization functions removed - visualization tab no longer needed

function populateFunctionSelect() {
  dom.functionSelect.innerHTML = '';
  functionCatalog.forEach((fn, index) => {
    const option = document.createElement('option');
    option.value = fn.id;
    option.textContent = fn.label;
    if (index === 0) {
      option.selected = true;
    }
    dom.functionSelect.appendChild(option);
  });
}

function getFunctionDefinition(id) {
  return functionCatalog.find((fn) => fn.id === id) ?? functionCatalog[0];
}

function renderInputs(definition) {
  dom.dynamicInputs.innerHTML = '';
  
  const configFieldNames = [
    'preferId',
    'minIndex',
    'attributePriority',
    'trim',
    'multipleMode',
    'exact',
    'dataAttribute'
  ];
  
  const requiredInputs = (definition.inputs || []).filter(
    (input) => input.required && !configFieldNames.includes(input.name)
  );
  const optionalFlags = (definition.inputs || []).filter(
    (input) => !input.required || configFieldNames.includes(input.name)
  );

  // Render required/main inputs
  const mainInputsContainer = document.createElement('div');
  mainInputsContainer.className = 'main-inputs';
  
  requiredInputs.forEach((input) => {
    const wrapper = document.createElement('label');
    wrapper.className = 'field';
    const labelRow = document.createElement('div');
    labelRow.className = 'field-label';
    const labelText = document.createElement('span');
    labelText.textContent = input.label;
    labelRow.appendChild(labelText);
    if (input.tooltip) {
      const tooltip = document.createElement('span');
      tooltip.className = 'field-tooltip';
      tooltip.tabIndex = 0;
      tooltip.setAttribute('aria-label', input.tooltip);
      tooltip.dataset.tooltip = input.tooltip;
      tooltip.textContent = '?';
      labelRow.appendChild(tooltip);
    }
    wrapper.appendChild(labelRow);

    let field;
    if (input.type === 'textarea') {
      field = document.createElement('textarea');
      field.placeholder = input.placeholder || '';
      field.value = input.defaultValue || '';
    } else if (input.type === 'select') {
      field = document.createElement('select');
      (input.options || []).forEach((option) => {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.label;
        if (option.value === input.defaultValue) {
          opt.selected = true;
        }
        field.appendChild(opt);
      });
      if (!field.value && input.options?.length) {
        field.value = input.options[0].value;
      }
    } else {
      field = document.createElement('input');
      const fieldType = input.inputType || 'text';
      field.type = fieldType;
      if (fieldType === 'checkbox') {
        field.checked = Boolean(input.defaultValue);
      } else {
        field.placeholder = input.placeholder || '';
        field.value = input.defaultValue || '';
      }
    }
    field.name = input.name;
    if (input.required) {
      field.required = true;
    }
    wrapper.appendChild(field);

    if (input.helperText) {
      const helper = document.createElement('small');
      helper.className = 'field-helper';
      helper.textContent = input.helperText;
      wrapper.appendChild(helper);
    }
    mainInputsContainer.appendChild(wrapper);
  });
  
  dom.dynamicInputs.appendChild(mainInputsContainer);

  // Add separator and configuration section if flags exist
  if (optionalFlags.length > 0) {
    const separator = document.createElement('div');
    separator.className = 'input-separator';
    dom.dynamicInputs.appendChild(separator);

    const configHeader = document.createElement('div');
    configHeader.className = 'config-section-header';
    configHeader.innerHTML = '<i data-lucide="settings"></i><span>Configuration</span>';
    dom.dynamicInputs.appendChild(configHeader);

    const configGrid = document.createElement('div');
    configGrid.className = 'config-grid';

    optionalFlags.forEach((input) => {
      const wrapper = document.createElement('label');
      wrapper.className = 'field config-field';
      const labelRow = document.createElement('div');
      labelRow.className = 'field-label';
      const labelText = document.createElement('span');
      labelText.textContent = input.label;
      labelRow.appendChild(labelText);
      if (input.tooltip) {
        const tooltip = document.createElement('span');
        tooltip.className = 'field-tooltip';
        tooltip.tabIndex = 0;
        tooltip.setAttribute('aria-label', input.tooltip);
        tooltip.dataset.tooltip = input.tooltip;
        tooltip.textContent = '?';
        labelRow.appendChild(tooltip);
      }
      wrapper.appendChild(labelRow);

      let field;
      if (input.type === 'textarea') {
        field = document.createElement('textarea');
        field.placeholder = input.placeholder || '';
        field.value = input.defaultValue || '';
      } else if (input.type === 'select') {
        field = document.createElement('select');
        (input.options || []).forEach((option) => {
          const opt = document.createElement('option');
          opt.value = option.value;
          opt.textContent = option.label;
          if (option.value === input.defaultValue) {
            opt.selected = true;
          }
          field.appendChild(opt);
        });
        if (!field.value && input.options?.length) {
          field.value = input.options[0].value;
        }
      } else {
        field = document.createElement('input');
        const fieldType = input.inputType || 'text';
        field.type = fieldType;
        if (fieldType === 'checkbox') {
          field.checked = Boolean(input.defaultValue);
        } else {
          field.placeholder = input.placeholder || '';
          field.value = input.defaultValue || '';
        }
      }
      field.name = input.name;
      if (input.required) {
        field.required = true;
      }
      wrapper.appendChild(field);

      if (input.helperText) {
        const helper = document.createElement('small');
        helper.className = 'field-helper';
        helper.textContent = input.helperText;
        wrapper.appendChild(helper);
      }
      configGrid.appendChild(wrapper);
    });

    dom.dynamicInputs.appendChild(configGrid);

    // Re-initialize Lucide icons for the config header
    if (window.lucide && window.lucide.createIcons) {
      window.lucide.createIcons();
    }
  }
}

function handleFunctionChange() {
  const selectedId = dom.functionSelect.value;
  const definition = getFunctionDefinition(selectedId);
  dom.functionInfo.innerHTML = '<i data-lucide="info"></i>' + definition.description;
  
  // Re-initialize Lucide icons for the new icon
  if (window.lucide && window.lucide.createIcons) {
    window.lucide.createIcons();
  }
  
  renderInputs(definition);
}

function applyDeepLinkSelection() {
  try {
    if (typeof window === 'undefined' || typeof URLSearchParams === 'undefined') {
      return false;
    }
    const params = new URLSearchParams(window.location.search);
    const fn = params.get('fn');
    if (!fn) {
      return false;
    }
    const match = functionCatalog.find((entry) => entry.id === fn);
    if (!match) {
      return false;
    }
    dom.functionSelect.value = match.id;
    return true;
  } catch (error) {
    console.warn('[playground] unable to apply deep-link selection', error);
    return false;
  }
}

function collectInputValues(definition) {
  const data = {};
  (definition.inputs || []).forEach((input) => {
    const element = dom.dynamicInputs.querySelector(`[name="${input.name}"]`);
    if (!element) {
      data[input.name] = undefined;
      return;
    }
    let value;
    if ((input.inputType || '').toLowerCase() === 'checkbox') {
      value = element.checked;
    } else {
      value = element.value ?? '';
    }
    if (input.required && (value == null || (typeof value === 'string' && !value.trim()))) {
      throw new Error(`"${input.label}" is required.`);
    }
    data[input.name] = typeof value === 'string' ? value.trim() : value;
  });
  return data;
}

function setResult(message, isError = false) {
  dom.resultOutput.textContent = message;
  dom.resultOutput.classList.toggle('error', isError);
}

function runSelectedFunction() {
  try {
    const definition = getFunctionDefinition(dom.functionSelect.value);
    const inputs = collectInputValues(definition);
    const rawResult = definition.run(inputs, { surface: dom.renderView });
    const { printableResult } = separateVisualTargets(rawResult);
    setResult(formatResult(printableResult));
  } catch (error) {
    console.error('[playground] run failed', error);
    setResult(error.message || String(error), true);
  }
}

function initPlaceholderAutofill() {
  dom.dynamicInputs.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const target = event.target;
    if (
      !(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) ||
      ['checkbox', 'radio', 'file'].includes(target.type)
    ) {
      return;
    }
    const placeholder = target.getAttribute('placeholder');
    if (!placeholder || !placeholder.trim()) {
      return;
    }
    if (typeof target.value === 'string' && target.value.trim()) {
      return;
    }
    event.preventDefault();
    target.value = placeholder;
    target.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function applyHTML(html, source = 'custom', options = {}) {
  const { syncTab = true } = options;
  state.currentHTML = html;
  state.htmlLoadedFrom = source;
  if (!isFixtureSource(source)) {
    state.customHTML = html;
  }
  dom.renderView.innerHTML = normalizeMarkupForPreview(html);
  dom.sourceView.textContent = html;
  if (syncTab) {
    const nextTab = isFixtureSource(source) ? 'default' : 'custom';
    activateHtmlTab(nextTab, { skipContentUpdate: true });
  } else {
    updateHtmlViewVisibility();
  }
}

async function loadFixture() {
  try {
    const response = await fetch(FIXTURE_PATH);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const html = await response.text();
    applyHTML(html, 'fixture');
  } catch (error) {
    console.error('Unable to load fixture HTML', error);
    const fallback = `<section class="notice">
      <h3>Fixture unavailable</h3>
      <p>Serve this folder via http-server to allow fetching <code>${FIXTURE_PATH}</code>. Meanwhile you can paste your own HTML below.</p>
    </section>`;
    applyHTML(fallback, 'fallback');
  }
}

function handleFileUpload(event) {
  const [file] = event.target.files ?? [];
  const fileInputText = document.querySelector('.file-input-text');
  
  if (!file) {
    if (fileInputText) {
      fileInputText.textContent = 'Choose HTML file...';
    }
    return;
  }
  
  // Update the display text
  if (fileInputText) {
    fileInputText.textContent = file.name;
  }
  
  const reader = new FileReader();
  reader.onload = () => {
    applyHTML(String(reader.result), 'file');
  };
  reader.readAsText(file);
}

function applyTextareaHTML() {
  const html = dom.htmlTextarea.value.trim();
  if (!html) {
    alert('Paste some HTML first.');
    return;
  }
  applyHTML(html, 'textarea');
}

function updateHtmlViewVisibility() {
  const showPlaceholder = state.activeHtmlTab === 'custom' && isFixtureSource(state.htmlLoadedFrom);
  dom.htmlPlaceholder?.classList.toggle('hidden', !showPlaceholder);
  
  if (showPlaceholder) {
    dom.renderView.classList.add('hidden');
    dom.sourceView.classList.add('hidden');
    return;
  }
  
  // Check the appropriate checkbox based on active tab
  const isSourceMode = state.activeHtmlTab === 'custom' 
    ? dom.showHtmlSourceCustom?.checked || false
    : dom.showHtmlSource?.checked || false;
    
  dom.renderView.classList.toggle('hidden', isSourceMode);
  dom.sourceView.classList.toggle('hidden', !isSourceMode);
}

function handleHTMLSourceToggle() {
  updateHtmlViewVisibility();
}

function resetInputs() {
  dom.htmlTextarea.value = '';
  dom.fileInput.value = '';
  handleFunctionChange();
  dom.resultOutput.textContent = 'Inputs reset. Run a function to view output.';
}

function activateHtmlTab(target, options = {}) {
  const { skipContentUpdate = false } = options;
  const previousTab = state.activeHtmlTab;
  state.activeHtmlTab = target;
  dom.htmlTabButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.htmlTab === target);
  });
  dom.htmlPanes.forEach((pane) => {
    pane.classList.toggle('hidden', pane.dataset.htmlPane !== target);
  });

  if (skipContentUpdate) {
    updateHtmlViewVisibility();
    return;
  }

  if (previousTab === target) {
    updateHtmlViewVisibility();
    return;
  }

  if (target === 'default') {
    if (!isFixtureSource(state.htmlLoadedFrom)) {
      loadFixture();
    } else {
      updateHtmlViewVisibility();
    }
    return;
  }

  // Custom tab logic
  if (isFixtureSource(state.htmlLoadedFrom)) {
    if (state.customHTML) {
      applyHTML(state.customHTML, 'custom-restore', { syncTab: false });
    } else {
      updateHtmlViewVisibility();
    }
  } else {
    updateHtmlViewVisibility();
  }
}

function initHtmlTabs() {
  dom.htmlTabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const next = button.dataset.htmlTab || 'default';
      activateHtmlTab(next);
    });
  });

  activateHtmlTab('default', { skipContentUpdate: true });
}

function bootstrap() {
  window.domXPathToolkit = Toolkit;
  populateFunctionSelect();
  applyDeepLinkSelection();
  handleFunctionChange();
  loadFixture();
  initHtmlTabs();
  initPlaceholderAutofill();

  dom.functionSelect.addEventListener('change', handleFunctionChange);
  dom.runButton.addEventListener('click', runSelectedFunction);
  dom.loadFixtureButton?.addEventListener('click', loadFixture);
  dom.fileInput.addEventListener('change', handleFileUpload);
  dom.applyHTMLButton.addEventListener('click', applyTextareaHTML);
  dom.showHtmlSource?.addEventListener('change', handleHTMLSourceToggle);
  dom.showHtmlSourceCustom?.addEventListener('change', handleHTMLSourceToggle);
  dom.resetButton.addEventListener('click', resetInputs);
  
  // Setup file input click handler
  const fileInputDisplay = document.querySelector('.file-input-display');
  if (fileInputDisplay && dom.fileInput) {
    fileInputDisplay.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dom.fileInput.click();
    });
    // Also make it keyboard accessible
    fileInputDisplay.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        dom.fileInput.click();
      }
    });
    fileInputDisplay.setAttribute('role', 'button');
    fileInputDisplay.setAttribute('tabindex', '0');
  }
}

bootstrap();
