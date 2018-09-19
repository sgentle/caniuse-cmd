/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS104: Avoid inline assignments
 * DS204: Change includes calls to have a more natural evaluation order
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * DS209: Avoid top-level return
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const data = require('caniuse-db/data.json');
const colors = require('colors');
const linewrap = require('linewrap');
const open = require('open');
const path = require('path');
const osHomedir = require('os-homedir');
const os = require('os');

const { argv } = require('yargs')
  .option('short', {
    alias: 's',
    type: 'boolean',
    default: undefined,
    describe: "Short output: show browsers on one line and don't display notes or description (default when displaying multiple results)"
  }).option('long', {
    alias: 'l',
    type: 'boolean',
    default: undefined,
    describe: "Long output: show more information (default when displaying a single result)"
  }).option('oneline', {
    alias: '1',
    type: 'boolean',
    default: false,
    describe: "One-line output: just global percentages, no per-browser info"
  }).option('oneline-browser', {
    alias: '2',
    type: 'boolean',
    default: false,
    describe: "One-line output with browser info, implies --abbrev and --current"
  }).option('abbrev', {
    alias: 'a',
    type: 'boolean',
    default: false,
    describe: "Abbreviate browser names"
  }).option('percentages', {
    alias: 'p',
    type: 'boolean',
    default: false,
    describe: "Include browser version usage percentages"
  }).option('future', {
    alias: 'f',
    type: 'boolean',
    default: false,
    describe: "Include future browser versions"
  }).option('current', {
    alias: 'c',
    type: 'boolean',
    default: false,
    describe: "Don't include old browser versions, equivalent to --era e0"
  }).option('era', {
    alias: 'e',
    type: 'string',
    describe: `How many versions back to go, e0 to ${Object.keys(data.eras)[0]}`
  }).option('mobile', {
    alias: 'm',
    type: 'boolean',
    default: false,
    describe: "Include mobile browsers"
  }).option('desktop', {
    alias: 'd',
    type: 'boolean',
    default: true,
    describe: "Include desktop browsers"
  }).option('browser', {
    alias: 'b',
    type: 'string',
    describe: `Show results for these browsers, comma-separated (${Object.keys(data.agents)})`
  }).option('ascii', {
    alias: 'A',
    type: 'boolean',
    default: false,
    describe: "UTF-8 symbols replacement with ASCII description"
  }).option('web', {
    alias: 'w',
    type: 'boolean',
    default: false,
    describe: "Go to the search page on caniuse.com"
  }).option('config', {
    alias: 'C',
    type: 'string',
    default: path.join(osHomedir(), '.caniuse.json'),
    describe: "Specify a config file with default options"
  }).config('config')
  .help('help')
  ;

let resultmap = {y: "✔", n: "✘", a: "◒", u: "‽", i: "ⓘ", w: "⚠"};
const supernums = "⁰¹²³⁴⁵⁶⁷⁸⁹";

if (os.platform() === 'win32') {
  resultmap = {y: "\u221A", n: "\u00D7", a: "\u0398", u: "\u203D", i: "\u24D8", w: "\u26A0"};
}

if (argv["ascii"]) {
  resultmap = {y: "[Yes]", n: "[No]", a: "[Partly]", u: "[?!]", i: "[Info]", w: "[Warning]"};
}

if (((Date.now()/1000) - data.updated) > (30*60*60*24)) {
  console.warn(`\
${resultmap.w}  Caniuse data is more than 30 days out of date!
   Consider updating: npm install -g caniuse-cmd
\
`.yellow
  );
}

if (argv.web) {
  return open(`http://caniuse.com/#search=${encodeURIComponent(argv._.join(' '))}`);
}

const searchkey = argv._.join('').toLowerCase().replace(/\W*/g, '');
const { agents } = data;

const xwrap = linewrap((process.stdout.columns || 80), {
  skipScheme: 'ansi-color',
  whitespace: 'line',
  tabWidth: 2,
  wrapLineIndent: 0,
  wrapLineIndentBase: /\S/
}
);

// Replace our scary braille spaces with real spaces
const wrap = str => xwrap(str).replace(/\u2800/g, ' ');

if (argv["oneline-browser"]) {
  argv.abbrev = true;
  argv.short = true;
  argv.current = true;
}


const types = [];
if (argv.desktop) { types.push('desktop'); }
if (argv.mobile) { types.push('mobile'); }

const eras = Object.keys(data.eras);
const currentVersion = eras.indexOf("e0");
const versionrange = [0, currentVersion];
if (argv.future) { versionrange[1] = Infinity; }
if (argv.current) { versionrange[0] = currentVersion; }
if (argv.era) { versionrange[0] = eras.indexOf(argv.era); }

// Generate the text for a single version result
// FIXME: gross output parameter
const makeResult = function(result, nums) {
  let note;
  if (nums == null) { nums = {}; }
  const support = result.support[0];
  let out = '';
  // \u2800 is a braille space - the only kind of space I could find that
  // doesn't get split by the word wrapper
  out += (resultmap[support] || support) + "\u2800";
  if (result.version) { out += result.version; }
  if (Array.from(result.support).includes("x")) { out += "ᵖ"; }
  if (note = __guard__(result.support.match(/#(\d+)/), x => x[1])) {
    nums[note] = true;
    out += supernums[note];
  }

  if (argv.percentages && result.usage) {
    if (out.slice(-1) !== "\u2800") { out += " "; }
    out += `(${Math.round(result.usage*1)/1}%)`;
  }
  out += ' ';
  switch (support) {
    case "y": return out.green;
    case "n": return out.red;
    case "a": return out.yellow;
    default: return out;
  }
};

// Generate an array of version results for a browser
const makeResults = function(browser, stats) {
  const results = [];
  let current = {};
  for (let i = 0; i < browser.versions.length; i++) {
    let version = browser.versions[i];
    if (version && (versionrange[0] <= i && i <= versionrange[1])) {
      let support = stats[version];
      const usage = browser.usage_global[version] || 0;
      if (browser.versions[i + 1]) { version += '+'; }

      // 'p' means no-but-polyfill-available, which we can treat as no
      if (support[0] === "p") {
        support = `n${support.slice(1)}`;
      }

      // Only add a new version result when browser support changes
      if (!current.version || (current.support !== support)) {
        current = {version, support, usage: 0};
        results.push(current);
      }

      current.usage += usage;
    }
  }

  return results;
};

// Display a single feature's browser support
const showFeature = function(result, opts) {
  if (opts == null) { opts = {}; }
  if (opts.long == null) { opts.long = !opts.short; }
  if (opts.short == null) { opts.short = !opts.long; }

  let percentages = [];
  if (result.usage_perc_y) { percentages.push(resultmap.y + ` ${result.usage_perc_y}%`.green); }
  if (result.usage_perc_a) { percentages.push(resultmap.a + ` ${result.usage_perc_a}%`.yellow); }
  percentages = percentages.join(' ');

  const status = opts.long ? ` [${data.statuses[result.status]}]` : '';
  const headerSep = opts["oneline-browser"] ? ": " : "\n";
  process.stdout.write(`${result.title.bold} ${percentages}${status}` + headerSep);

  if (opts.oneline) { return; }

  if (opts.long) {
    const tags = result.categories.map(x => `#${x.replace(/\W/g,'')}`).join(' ');
    console.log(wrap(`\t${result.description.trim()} ${tags}\n`));
  }

  const out = [];
  // console.log "columns", process.stdout.columns
  if (opts.short && !opts["oneline-browser"]) { out.push('\t'); }

  const filter = function(browser) {
    if (opts.browser) {
      let needle;
      return (needle = browser, Array.from(opts.browser.split(',')).includes(needle));
    } else {
      return Array.from(types).includes(agents[browser].type);
    }
  };

  // Store which notes have been used in a result
  const need_note = {};

  for (let browser in result.stats) {
    const stats = result.stats[browser];
    if (filter(browser)) {
      if (!opts.short) { out.push("\t"); }
      if (opts.abbrev) {
        out.push(`${agents[browser].abbr} `);
      } else {
        out.push(`${agents[browser].browser} `);
      }

      const results = makeResults(agents[browser], stats);
      if (results.length === 1) {
        results[0].version = null;
      }

      for (let res of Array.from(results)) { out.push(`${makeResult(res, need_note)}`); }
      if (!opts.short) { out.push("\n"); }
    }
  }

  console.log(wrap(out.join('')));

  if (!opts.short) {
    for (let num in result.notes_by_num) {
      const note = result.notes_by_num[num];
      if (need_note[num]) {
        console.log(wrap(`\t\t${supernums[num].yellow}${note}`));
      }
    }
    if (result.notes) { return console.log(wrap(`\t ${resultmap.i}${`  ${result.notes.replace(/[\r\n]+/g, ' ')}`}`)); }
  }
};


const slowFind = function(query) {
  const results = [];
  for (let key in data.data) {
    const {title, description, keywords, categories} = data.data[key];
    const matcher = (key + title + description + keywords + categories).toLowerCase().replace(/\W*/g, '');
    if (matcher.match(query)) { results.push(key); }
  }
  return results;
};


(function() {
  let feat, features;
  if (feat = data.data[searchkey]) {
    return showFeature(feat, argv);
  } else if ((features = slowFind(searchkey)).length > 0) {
    if (argv.short == null) { argv.short = features.length > 1; }
    return (() => {
      const result = [];
      for (feat of Array.from(features)) {         result.push(showFeature(data.data[feat], argv));
      }
      return result;
    })();
  } else {
    return console.error(`${searchkey}: not found`);
  }
})();

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}