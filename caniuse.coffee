data = require 'caniuse-db/data.json'
colors = require 'colors'
linewrap = require 'linewrap'
open = require 'open'
path = require 'path'
osHomedir = require 'os-homedir'
os = require('os')

argv = require 'yargs'
  .option 'short',
    alias: 's'
    type: 'boolean'
    default: undefined
    describe: "Short output: show browsers on one line and don't display notes or description (default when displaying multiple results)"
  .option 'long',
    alias: 'l'
    type: 'boolean'
    default: undefined
    describe: "Long output: show more information (default when displaying a single result)"
  .option 'oneline',
    alias: '1'
    type: 'boolean'
    default: false
    describe: "One-line output: just global percentages, no per-browser info"
  .option 'oneline-browser',
    alias: '2'
    type: 'boolean'
    default: false
    describe: "One-line output with browser info, implies --abbrev and --current"
  .option 'abbrev',
    alias: 'a'
    type: 'boolean'
    default: false
    describe: "Abbreviate browser names"
  .option 'percentages',
    alias: 'p'
    type: 'boolean'
    default: false
    describe: "Include browser version usage percentages"
  .option 'future',
    alias: 'f'
    type: 'boolean'
    default: false
    describe: "Include future browser versions"
  .option 'current',
    alias: 'c'
    type: 'boolean'
    default: false
    describe: "Don't include old browser versions, equivalent to --era e0"
  .option 'era',
    alias: 'e'
    type: 'string'
    describe: "How many versions back to go, e0 to #{Object.keys(data.eras)[0]}"
  .option 'mobile',
    alias: 'm'
    type: 'boolean'
    default: false
    describe: "Include mobile browsers"
  .option 'desktop',
    alias: 'd'
    type: 'boolean'
    default: true
    describe: "Include desktop browsers"
  .option 'browser',
    alias: 'b'
    type: 'string'
    describe: "Show results for these browsers, comma-separated (#{Object.keys(data.agents)})"
  .option 'ascii',
    alias: 'A'
    type: 'boolean'
    default: false
    describe: "UTF-8 symbols replacement with ASCII description"
  .option 'web',
    alias: 'w'
    type: 'boolean'
    default: false
    describe: "Go to the search page on caniuse.com"
  .option 'config',
    alias: 'C'
    type: 'string'
    default: path.join(osHomedir(), '.caniuse.json')
    describe: "Specify a config file with default options"
  .config 'config'
  .help 'help'
  .argv

resultmap = y: "✔", n: "✘", a: "◒", u: "‽", i: "ⓘ", w: "⚠"
supernums = "⁰¹²³⁴⁵⁶⁷⁸⁹"

if (os.platform() == 'win32')
  resultmap = y: "\u221A", n: "\u00D7", a: "\u0473", u: "\u203D", i: "\u24D8", w: "\u26A0"

if argv["ascii"]
  resultmap = y: "[Yes]", n: "[No]", a: "[Partly]", u: "[?!]", i: "[Info]", w: "[Warning]"

if (Date.now()/1000 - data.updated) > 30*60*60*24
  console.warn """
    #{resultmap.w}  Caniuse data is more than 30 days out of date!
       Consider updating: npm install -g caniuse-cmd

  """.yellow

if argv.web
  return open "http://caniuse.com/#search=#{encodeURIComponent argv._.join ' '}"

searchkey = argv._.join('').toLowerCase().replace(/\W*/g, '')
agents = data.agents

xwrap = linewrap (process.stdout.columns or 80),
  skipScheme: 'ansi-color'
  whitespace: 'line'
  tabWidth: 2
  wrapLineIndent: 0
  wrapLineIndentBase: /\S/

# Replace our scary braille spaces with real spaces
wrap = (str) -> xwrap(str).replace(/\u2800/g, ' ')

if argv["oneline-browser"]
  argv.abbrev = true
  argv.short = true
  argv.current = true


types = []
types.push 'desktop' if argv.desktop
types.push 'mobile' if argv.mobile

eras = Object.keys(data.eras)
currentVersion = eras.indexOf("e0")
versionrange = [0, currentVersion]
versionrange[1] = Infinity if argv.future
versionrange[0] = currentVersion if argv.current
versionrange[0] = eras.indexOf(argv.era) if argv.era

# Generate the text for a single version result
# FIXME: gross output parameter
makeResult = (result, nums={}) ->
  support = result.support[0]
  out = ''
  # \u2800 is a braille space - the only kind of space I could find that
  # doesn't get split by the word wrapper
  out += (resultmap[support] || support) + "\u2800"
  out += result.version if result.version
  out += "ᵖ" if "x" in result.support
  if note = result.support.match(/#(\d+)/)?[1]
    nums[note] = true
    out += supernums[note]

  if argv.percentages and result.usage
    out += " " unless out.slice(-1) is "\u2800"
    out += "(#{Math.round(result.usage*1)/1}%)"
  out += ' '
  switch support
    when "y" then out.green
    when "n" then out.red
    when "a" then out.yellow
    else out

# Generate an array of version results for a browser
makeResults = (browser, stats) ->
  results = []
  current = {}
  for version, i in browser.versions when version and versionrange[0] <= i <= versionrange[1]
    support = stats[version]
    usage = browser.usage_global[version] || 0
    version += '+' if browser.versions[i + 1]

    # 'p' means no-but-polyfill-available, which we can treat as no
    if support[0] == "p"
      support = "n" + support.slice(1)

    # Only add a new version result when browser support changes
    if !current.version || current.support != support
      current = version: version, support: support, usage: 0
      results.push current

    current.usage += usage

  results

# Display a single feature's browser support
showFeature = (result, opts={}) ->
  opts.long ?= !opts.short
  opts.short ?= !opts.long

  percentages = []
  percentages.push resultmap.y + " #{result.usage_perc_y}%".green if result.usage_perc_y
  percentages.push resultmap.a + " #{result.usage_perc_a}%".yellow if result.usage_perc_a
  percentages = percentages.join(' ')

  status = if opts.long then " [#{data.statuses[result.status]}]" else ''
  headerSep = if opts["oneline-browser"] then ": " else "\n"
  process.stdout.write "#{result.title.bold} #{percentages}#{status}" + headerSep

  return if opts.oneline

  if opts.long
    tags = result.categories.map((x) -> '#'+x.replace(/\W/g,'')).join(' ')
    console.log wrap '\t' + result.description.trim() + ' ' + tags + '\n'

  out = []
  # console.log "columns", process.stdout.columns
  out.push '\t' if opts.short && !opts["oneline-browser"]

  filter = (browser) ->
    if opts.browser
      browser in opts.browser.split(',')
    else
      agents[browser].type in types

  # Store which notes have been used in a result
  need_note = {}

  for browser, stats of result.stats when filter browser
    out.push "\t" unless opts.short
    if opts.abbrev
      out.push "#{agents[browser].abbr} "
    else
      out.push "#{agents[browser].browser} "

    results = makeResults(agents[browser], stats)
    if results.length == 1
      results[0].version = null

    out.push "#{makeResult res, need_note}" for res in results
    out.push "\n" unless opts.short

  console.log wrap out.join('')

  unless opts.short
    for num, note of result.notes_by_num when need_note[num]
      console.log wrap "\t\t#{supernums[num].yellow}#{note}"
    console.log wrap "\t " + resultmap.i + "  #{result.notes.replace(/[\r\n]+/g, ' ')}" if result.notes


slowFind = (query) ->
  results = []
  for key, {title, description, keywords, categories} of data.data
    matcher = (key + title + description + keywords + categories).toLowerCase().replace(/\W*/g, '')
    results.push key if matcher.match(query)
  results


do ->
  if feat = data.data[searchkey]
    showFeature feat, argv
  else if (features = slowFind searchkey).length > 0
    argv.short ?= features.length > 1
    showFeature data.data[feat], argv for feat in features
  else
    console.error "#{searchkey}: not found"
