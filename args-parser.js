const data = require('caniuse-db/data.json');
const path = require('path');
const osHomedir = require('os-homedir');
const yargs = require('yargs');

module.exports = yargs
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
  .help('help');
