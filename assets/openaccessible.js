 /**
 * OpenAccessible - SAAS-Ready Accessibility Widget
 * Single-file embeddable widget: Color, Dyslexia/Dictionary, Contrast, Language,
 * Size, Cursor, Highlight, TTS, Text Align, Screen Reader/Braille support & more.
 * @license AGPL-3.0
 * @version 1.0.0
 *
 * Structure:
 * - defaultState / state: user preferences (persisted to localStorage unless guestMode)
 * - API: optional backend (apiBase) for dictionary, TTS, translate, preferences
 * - translateApiUrl: optional LibreTranslate-style endpoint (default OSS Translate); fallback apiBase then MyMemory
 * - Panel: settings UI; toolbar: floating button + position
 * - Dictionary: double-click word -> modal with word, definition, and Play word/Play definition audio
 * - TTS: browser SpeechSynthesis or server for Read page, Speak selection, dictionary modal
 *
 * Features:
 * - Mute sound: when enabled, all TTS and audio playback is suppressed (Test voice still plays for preview).
 * - Voice: select from all browser voices (grouped by language); "Test voice" plays a sample.
 * - Voice navigation: optional SpeechRecognition for hands-free commands (open/close, read page, stop, etc.).
 * - Keyboard: Alt+A (Windows) / Option+A (Mac) to open/close; Escape to close; Tab/focus trap in panel; R/S in panel for Read/Stop.
 * - Presets: built-in (High contrast, Reading, Minimal, Focus) and user-saved presets; apply via dropdown or API.
 * - Translation: OSS Translate (LibreTranslate API), then apiBase action=translate, then MyMemory; chunked for long text.
 * - Extended languages: LANGUAGES list for TTS language and Translate target (40+ languages).
 * - Utilities: debounce, throttle, getPreferredColorScheme, getPreferredReducedMotion, hasAccessibleLabel, getControlLabel.
 * - Public API: init() returns { getState, setState, openPanel, closePanel, reset, stopTTS, getPresets, applyPreset, saveCurrentAsPreset, deletePreset, showKeyboardShortcuts, showAbout, translate, version, events }.
 * - Events: openaccessible:ready, openaccessible:change, openaccessible:preset:apply, openaccessible:tts:start, openaccessible:tts:stop, openaccessible:translate:start, openaccessible:translate:done.
 */
 (function (global) {
  'use strict';

  // --- Constants ---
  const STORAGE_KEY = 'openaccessible_prefs';  // localStorage key for persisted preferences
  const WIDGET_VERSION = '1.0.0';
  const ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="Universal Access icon - body moved up more"><circle cx="256" cy="256" r="220" fill="#0F172A"/><circle cx="256" cy="256" r="240" fill="none" stroke="#22D3EE" stroke-width="14"/><circle cx="256" cy="256" r="220" fill="none" stroke="#22D3EE" stroke-width="8" opacity="0.75"/><g transform="translate(0,-22)" fill="none" stroke="#FFFFFF" stroke-linecap="round" stroke-linejoin="round"><circle cx="256" cy="150" r="44" fill="#FFFFFF" stroke="none"/><g stroke="#0F172A" stroke-width="14" stroke-linecap="round"><circle cx="238" cy="142" r="10" fill="#0F172A" stroke="none"/><circle cx="274" cy="142" r="10" fill="#0F172A" stroke="none"/><path d="M256 152 L254 162" fill="none"/><path d="M238 172 Q256 188 274 172" fill="none"/></g><path d="M132 224 L380 224" stroke-width="36"/><path d="M256 210 V334" stroke-width="44"/><path d="M256 334 L206 432" stroke-width="36"/><path d="M256 334 L306 432" stroke-width="36"/><path d="M206 444 L172 444" stroke-width="30"/><path d="M306 444 L340 444" stroke-width="30"/></g></svg>';
  const TrasU = ''; // TransU

  // --- Default state (all user preferences) ---
  const defaultState = {
    colorFilter: 'none',           // none | grayscale | invert | sepia | protanopia | deuteranopia | tritanopia | dark | light
    dyslexiaFont: false,
    contrast: 1,                   // 1 = normal, higher = more contrast
    fontSize: 100,                 // %
    cursorSize: 'default',         // default | large | xl
    highlightLinks: false,
    highlightHeadings: false,
    highlightFocus: true,
    ttsEnabled: false,
    ttsMuted: false,              // when true, no TTS or audio plays (except Test voice)
    ttsRate: 1,
    ttsPitch: 1,
    ttsVoice: null,               // selected SpeechSynthesis voice name
    voiceNavigationEnabled: false, // SpeechRecognition for voice commands
    textAlign: '',                 // '' | left | center | right | justify
    language: '',
    reduceMotion: false,
    underlineLinks: false,
    readingGuide: false,
    readingGuidePos: 0,
    toolbarPosition: 'bottom-right', // top-left | top-right | bottom-left | bottom-right
    dictionaryEnabled: false,
    simplifiedWords: false,
    screenReaderHints: true,
    letterSpacing: 'normal',       // normal | wide | wider
    lineHeight: 'normal',          // normal | relaxed | loose
    wordSpacing: 'normal',
    highlightAsRead: false,         // highlight words as TTS speaks
    translateTargetLang: '',        // e.g. es, fr
    monospaceFont: false,
    focusStrip: false,
    enlargeFocus: false,
    showLinkUrl: false,
    reduceTransparency: false,
    highlightForms: false,
contentWidth: 'full',          // full | narrow | narrower
    guestMode: false,         // when true, do not persist to localStorage
    lastPresetName: null,     // last applied preset name for UI
  };

  // --- Extended language list for TTS, translation, and panel ---
  
  // Default languages for OpenAccessible is English
  const LANGUAGES = [
    { code: '', name: 'Default' },
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)' },
    { code: 'nl', name: 'Dutch' },
    { code: 'pl', name: 'Polish' },
    { code: 'ru', name: 'Russian' },
    { code: 'uk', name: 'Ukrainian' },
    { code: 'ar', name: 'Arabic' },
    { code: 'zh', name: 'Chinese' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' },
    { code: 'zh-TW', name: 'Chinese (Traditional)' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'hi', name: 'Hindi' },
    { code: 'bn', name: 'Bengali' },
    { code: 'tr', name: 'Turkish' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'th', name: 'Thai' },
    { code: 'id', name: 'Indonesian' },
    { code: 'ms', name: 'Malay' },
    { code: 'he', name: 'Hebrew' },
    { code: 'fa', name: 'Persian' },
    { code: 'sv', name: 'Swedish' },
    { code: 'da', name: 'Danish' },
    { code: 'no', name: 'Norwegian' },
    { code: 'fi', name: 'Finnish' },
    { code: 'el', name: 'Greek' },
    { code: 'ro', name: 'Romanian' },
    { code: 'hu', name: 'Hungarian' },
    { code: 'cs', name: 'Czech' },
    { code: 'sk', name: 'Slovak' },
    { code: 'bg', name: 'Bulgarian' },
    { code: 'hr', name: 'Croatian' },
    { code: 'sr', name: 'Serbian' },
    { code: 'sl', name: 'Slovenian' },
    { code: 'et', name: 'Estonian' },
    { code: 'lv', name: 'Latvian' },
    { code: 'lt', name: 'Lithuanian' },
    { code: 'ca', name: 'Catalan' },
    { code: 'eu', name: 'Basque' },
    { code: 'gl', name: 'Galician' },
    { code: 'af', name: 'Afrikaans' },
    { code: 'sq', name: 'Albanian' },
    { code: 'hy', name: 'Armenian' },
    { code: 'az', name: 'Azerbaijani' },
    { code: 'be', name: 'Belarusian' },
    { code: 'bs', name: 'Bosnian' },
    { code: 'cy', name: 'Welsh' },
    { code: 'ga', name: 'Irish' },
    { code: 'ka', name: 'Georgian' },
    { code: 'is', name: 'Icelandic' },
    { code: 'mk', name: 'Macedonian' },
    { code: 'mt', name: 'Maltese' },
    { code: 'mn', name: 'Mongolian' },
    { code: 'ne', name: 'Nepali' },
    { code: 'pa', name: 'Punjabi' },
    { code: 'sw', name: 'Swahili' },
    { code: 'tl', name: 'Tagalog' },
    { code: 'ur', name: 'Urdu' },
  ];

  // --- Keyboard shortcuts reference (for help modal) ---
  const KEYBOARD_SHORTCUTS = [
    { keys: 'Alt+A (Win) / Option+A (Mac)', action: 'Open or close accessibility panel' },
    { keys: 'Escape', action: 'Close panel, reading view, or overlay' },
    { keys: 'Tab / Shift+Tab', action: 'Move focus between controls' },
    { keys: 'Enter / Space', action: 'Activate button or option' },
    { keys: 'R (in panel)', action: 'Read page with text-to-speech' },
    { keys: 'S (in panel)', action: 'Stop reading' },
    { keys: 'Arrow keys', action: 'Change value of range or select' },
    { keys: 'Double-click word', action: 'Open dictionary (when enabled)' },
    { keys: 'Select text + bar', action: 'Speak or translate selection' },
    { keys: 'Focus in panel', action: 'Tab cycles through all controls' },
    { keys: 'Voice (when enabled)', action: 'Say "Open accessibility", "Read page", "Stop", etc.' },
  ];
  // Built in Dictionary
  const BUILTIN_DICTIONARY = {
    a: "The first letter of the alphabet; also used before singular nouns.",
    about: "On the topic of; approximately.",
    above: "Higher than something else.",
    access: "The ability to enter, use, or reach something.",
    accessibility: "Making something usable by everyone, including people with disabilities.",
    accessible: "Easy to use or reach for all people.",
    account: "Your personal profile or login on a website or app.",
    action: "Something you do, like clicking a button.",
    active: "Turned on or currently in use.",
    add: "To put something in.",
    address: "A location, such as a home address or website address.",
    adjust: "To change a little to make something better.",
    all: "Everything or everyone.",
    allow: "To let something happen.",
    almost: "Very nearly.",
    also: "In addition; too.",
    always: "At all times.",
    amount: "How much of something there is.",
    and: "A word used to connect things.",
    answer: "A reply to a question.",
    any: "One, some, or all (no matter which).",
    app: "A program on your phone, tablet, or computer.",
    appear: "To become visible.",
    are: "Present tense of 'be' (used with you, we, they).",
    aria: "Accessibility labels and hints used in websites for screen readers.",
    around: "On every side of something; nearby.",
    arrow: "A symbol that points in a direction.",
    as: "Used to compare or describe a role.",
    ask: "To request information or help.",
    at: "Shows a place or time.",
    audio: "Sound, such as music or speech.",
    auto: "Happens automatically.",
    back: "The opposite of front; also return to the previous screen.",
    background: "The area behind text or objects on a screen.",
    bar: "A strip-shaped part of the screen, like a toolbar or progress bar.",
    be: "To exist or happen.",
    because: "For the reason that.",
    become: "To change into something.",
    before: "Earlier than.",
    begin: "To start.",
    below: "Lower than something else.",
    best: "The most good.",
    between: "In the middle of two things.",
    big: "Large in size.",
    both: "The two together.",
    bottom: "The lowest part.",
    box: "A square or rectangle area on a page or screen.",
    brightness: "How light or dark something looks.",
    browser: "The app you use to visit websites (like Chrome or Firefox).",
    button: "A control you click or tap to do something.",
    by: "Near; through the action of.",
    can: "To be able to.",
    cancel: "To stop or not continue something.",
    caption: "Text shown with an image or video to explain it.",
    card: "A small content box used in many app and website designs.",
    center: "The middle.",
    change: "To make or become different.",
    character: "A letter, number, or symbol.",
    check: "To look at something carefully or confirm it.",
    checkbox: "A small box you click to select an option.",
    choice: "An option you can pick.",
    choose: "To select one option.",
    click: "To press a mouse button or tap.",
    close: "To shut something.",
    color: "What something looks like (red, blue, green, etc.).",
    combine: "To join things together.",
    come: "To move toward something.",
    compare: "To look at differences or similarities.",
    complete: "Finished; done.",
    confirm: "To say yes or verify something.",
    connect: "To join or link together.",
    content: "The words, images, and other things shown on a page.",
    continue: "To keep going.",
    contrast: "The difference between light and dark, especially text and background.",
    control: "A part of the interface used to change something (like a button or slider).",
    copy: "To duplicate text or content.",
    corner: "The point where two edges meet.",
    could: "Used for possibility or ability in the past.",
    create: "To make something new.",
    current: "Happening now; present.",
    cursor: "The pointer on the screen or the blinking text marker.",
    dark: "With little light; opposite of light.",
    data: "Information stored or used by a program.",
    default: "The original or preset option.",
    definition: "The meaning of a word.",
    delete: "To remove something.",
    description: "Text that explains something.",
    device: "A phone, tablet, laptop, or other electronic tool.",
    did: "Past tense of 'do'.",
    different: "Not the same.",
    disable: "To turn off.",
    display: "The screen, or to show something on screen.",
    do: "To perform an action.",
    does: "Present tense of 'do' (third person).",
    done: "Finished.",
    down: "Toward a lower place.",
    drag: "To move something on screen by holding and moving it.",
    drop: "To release something you were dragging.",
    dropdown: "A menu that opens to show a list of choices.",
    dyslexia: "A condition that can make reading and spelling harder.",
    each: "Every one, considered separately.",
    easy: "Not hard.",
    edit: "To change existing text or content.",
    effect: "A visible or audible change, like blur or animation.",
    enable: "To turn on or make possible.",
    end: "To stop or finish.",
    enter: "To go in; also a keyboard key used to confirm.",
    error: "A problem or mistake.",
    escape: "A key used to cancel or close something.",
    even: "Flat or level; also used for emphasis.",
    every: "Each one in a group.",
    example: "Something used to show how something works.",
    exit: "To leave or close.",
    export: "To save or send data out to a file or another system.",
    extra: "More than usual or needed.",
    eye: "The body part used for seeing.",
    face: "The front part of the head.",
    fast: "Quick.",
    feature: "A function or tool in an app or website.",
    few: "A small number.",
    field: "A place where you type information in a form.",
    file: "A saved item on a device, like a document or image.",
    fill: "To put content into something, like a form field.",
    filter: "A setting that changes how something looks or what is shown.",
    find: "To locate something.",
    finish: "To complete.",
    first: "Before all others.",
    focus: "Where attention or keyboard input goes.",
    font: "The style of letters and symbols.",
    for: "Intended to be used by or for something.",
    form: "A set of fields used to enter information.",
    format: "The way something is arranged or structured.",
    forward: "Toward the front; next direction.",
    from: "Shows where something starts or comes from.",
    front: "The side that faces forward.",
    full: "Containing as much as possible.",
    get: "To receive or obtain.",
    go: "To move.",
    gray: "A color between black and white.",
    grayscale: "Showing only shades of gray.",
    group: "Things put together.",
    guide: "Help that shows you what to do.",
    had: "Past tense of 'have'.",
    has: "Present tense of 'have' (third person).",
    have: "To own, hold, or experience.",
    heading: "A title used to organize content.",
    hear: "To notice sound.",
    help: "Support or assistance.",
    hide: "To make not visible.",
    high: "Far up; tall.",
    highlight: "To mark or make something stand out.",
    how: "In what way.",
    icon: "A small picture or symbol for an action or feature.",
    image: "A picture.",
    import: "To bring data in from a file or another system.",
    in: "Inside.",
    include: "To contain as part of something.",
    increase: "To make larger or more.",
    information: "Facts or details.",
    input: "Something you type, select, or enter.",
    inside: "Within something.",
    invert: "To reverse, such as switching light and dark colors.",
    is: "Present tense of 'be' (third person).",
    it: "Used for a thing or idea.",
    item: "One thing in a list or group.",
    its: "Belonging to it.",
    just: "Only; exactly.",
    keep: "To continue to have or hold.",
    key: "A keyboard button; also a code used for access.",
    keyboard: "The keys used to type.",
    kind: "A type or sort.",
    know: "To understand or be aware of.",
    label: "Text that names or explains something.",
    language: "A way people communicate, like English or French.",
    large: "Big.",
    last: "Final; most recent.",
    layout: "How things are arranged on a page.",
    left: "The opposite of right.",
    letter: "A written character (A, B, C, etc.).",
    light: "Brightness; opposite of dark.",
    like: "Similar to; also to enjoy.",
    line: "A row of text or a long mark.",
    link: "Text or a button you can click to go somewhere else.",
    list: "A group of items one after another.",
    load: "To bring in and show data or a page.",
    lock: "To prevent changes or access without permission.",
    long: "Having great length; lasting a lot of time.",
    look: "To see or search visually.",
    low: "Not high.",
    main: "Most important.",
    make: "To create or cause.",
    many: "A large number.",
    match: "To be the same or fit together.",
    maybe: "Possibly.",
    mean: "To have a meaning.",
    menu: "A list of choices or commands.",
    message: "Text sent or shown to communicate something.",
    middle: "The center area.",
    mode: "A setting style, like dark mode or reading mode.",
    more: "Additional.",
    most: "The greatest amount.",
    motion: "Movement.",
    move: "To change position.",
    mute: "To turn off sound.",
    name: "A word used to identify someone or something.",
    need: "To require.",
    new: "Recently made or not used before.",
    next: "Immediately after.",
    no: "Not any; the opposite of yes.",
    none: "Not any.",
    normal: "Usual or standard.",
    not: "Used to make a statement negative.",
    note: "A short piece of information.",
    now: "At this time.",
    number: "A counting value (1, 2, 3...).",
    of: "Shows belonging or relation.",
    off: "Not on; turned off.",
    on: "Working or active; touching the surface of something.",
    once: "One time.",
    only: "No more than; just.",
    open: "Not closed; to make available or visible.",
    option: "A choice you can select.",
    or: "Used between alternatives.",
    order: "The way things are arranged or happen.",
    other: "Different from the first one.",
    out: "To the outside.",
    outside: "Not inside.",
    over: "Above.",
    page: "A single screen or document section.",
    panel: "A section of the interface, often with settings.",
    part: "A piece of a whole.",
    paste: "To insert copied text or content.",
    pause: "To stop for a short time.",
    photo: "A picture taken by a camera.",
    pitch: "How high or low a sound is.",
    place: "A position or location.",
    play: "To start sound or video.",
    point: "A small mark or a specific place.",
    position: "Where something is located.",
    prefer: "To like one thing more than another.",
    preset: "A saved group of settings.",
    press: "To push, like a button or key.",
    preview: "A view shown before the final version.",
    previous: "The one before the current one.",
    progress: "Movement toward finishing something.",
    put: "To place something somewhere.",
    question: "Something asked to get an answer.",
    quick: "Fast.",
    read: "To understand written words.",
    reading: "The activity of reading.",
    reduce: "To make smaller or less.",
    remove: "To take away.",
    repeat: "To do again.",
    replace: "To put one thing in place of another.",
    reset: "To return to the starting or default settings.",
    resize: "To change size.",
    right: "The opposite of left; also correct.",
    row: "A horizontal line of items.",
    save: "To keep something for later.",
    scale: "To make something bigger or smaller.",
    screen: "The display part of a device.",
    scroll: "To move the page up, down, or sideways.",
    search: "To look for something.",
    section: "A separate part of a page or document.",
    select: "To choose.",
    selection: "The text or items currently chosen.",
    sepia: "A brown-tinted color effect.",
    set: "To choose or place in a certain way.",
    setting: "An option that controls how something works.",
    settings: "A group of options that control an app or feature.",
    shape: "The outline or form of something.",
    shortcut: "A faster way to do something, often with keys.",
    show: "To make visible.",
    side: "One edge or direction (left/right).",
    simple: "Easy to understand.",
    size: "How big or small something is.",
    skip: "To pass over something.",
    slider: "A control you drag to change a value.",
    slow: "Not fast.",
    small: "Little in size.",
    some: "An unspecified amount.",
    sound: "What you hear; audio.",
    space: "An empty area; also the keyboard key for a blank space.",
    speak: "To say words aloud.",
    speech: "Spoken words.",
    speed: "How fast something happens.",
    start: "To begin.",
    step: "One stage in a process.",
    stop: "To end or pause.",
    store: "To keep data or items.",
    strip: "A narrow band or line.",
    style: "The way something looks.",
    support: "Help or assistance.",
    switch: "To change from one option to another.",
    tab: "A keyboard key for moving focus; also a section in an app/browser.",
    tap: "To touch the screen quickly.",
    text: "Written words.",
    than: "Used when comparing.",
    that: "Used to point to something.",
    the: "Used before a known thing.",
    their: "Belonging to them.",
    them: "Used for people or things already mentioned.",
    then: "Next; after that.",
    there: "In that place.",
    these: "More than one thing near or current.",
    they: "Used for people or things.",
    this: "Used to point to something near or current.",
    those: "More than one thing farther away or already mentioned.",
    through: "From one side to the other.",
    time: "A moment or period.",
    tip: "A helpful suggestion.",
    title: "The name of something.",
    to: "Shows direction or purpose.",
    toggle: "A switch that turns something on and off.",
    tool: "Something used to do a task.",
    toolbar: "A row or strip of buttons and controls.",
    top: "The highest part.",
    translate: "To change words from one language to another.",
    translation: "The new text after translating.",
    transparency: "How see-through something is.",
    turn: "To change direction or switch state.",
    type: "To write using a keyboard; also a kind of thing.",
    under: "Below.",
    undo: "To reverse the last action.",
    unit: "A single item or measure.",
    up: "Toward a higher place.",
    update: "To make something newer or change it.",
    use: "To do something with.",
    used: "Past tense of use.",
    user: "A person who uses a device, app, or website.",
    value: "A number, text, or setting stored in something.",
    version: "A specific release of software.",
    view: "What you can see; also to look at something.",
    visible: "Able to be seen.",
    voice: "The sound a person makes when speaking; or a TTS voice.",
    volume: "How loud or quiet a sound is.",
    want: "To wish for something.",
    was: "Past tense of 'be' (singular).",
    way: "A method or direction.",
    we: "Used to mean a group including the speaker.",
    were: "Past tense of 'be' (plural, and some singular uses).",
    what: "Used to ask about something.",
    when: "Used to ask about time.",
    where: "Used to ask about place.",
    which: "Used to ask about choices.",
    while: "During the time that.",
    white: "A very light color.",
    who: "Used to ask about a person.",
    why: "Used to ask for a reason.",
    width: "How wide something is from side to side.",
    will: "Used to show future time.",
    with: "Together or accompanied by.",
    without: "Not having something.",
    word: "A unit of language with meaning.",
    work: "To function correctly; also a task or job.",
    would: "Used for polite requests, preferences, or imagined situations.",
    wcag: "Web Content Accessibility Guidelines; rules for making websites easier to use for everyone.",
    yes: "A word used to agree or confirm.",
    you: "Used to refer to the person being spoken to.",
    your: "Belonging to you.",
    zoom: "To make content look bigger or smaller."
  };
  // Color filter options for UI or docs.
  var COLOR_FILTER_OPTIONS = [
    { value: 'none', label: 'None' },
    { value: 'grayscale', label: 'Grayscale' },
    { value: 'invert', label: 'Invert' },
    { value: 'sepia', label: 'Sepia' },
    { value: 'protanopia', label: 'Protanopia' },
    { value: 'deuteranopia', label: 'Deuteranopia' },
    { value: 'tritanopia', label: 'Tritanopia' },
    { value: 'dark', label: 'Dark theme' },
    { value: 'light', label: 'Light theme' },
  ];

  // Toolbar position options.
  var TOOLBAR_POSITION_OPTIONS = [
    { value: 'bottom-right', label: 'Bottom right' },
    { value: 'bottom-left', label: 'Bottom left' },
    { value: 'top-right', label: 'Top right' },
    { value: 'top-left', label: 'Top left' },
  ];

  // Common translation language pairs for UI hints.
  var TRANSLATE_LANG_PAIRS = [
    { from: 'en', to: 'es', label: 'English to Spanish' },
    { from: 'en', to: 'fr', label: 'English to French' },
    { from: 'en', to: 'de', label: 'English to German' },
    { from: 'en', to: 'zh', label: 'English to Chinese' },
    { from: 'en', to: 'ja', label: 'English to Japanese' },
    { from: 'es', to: 'en', label: 'Spanish to English' },
    { from: 'fr', to: 'en', label: 'French to English' },
  ];

  // Return version and basic info for debugging.
  function getVersionInfo() {
    return { version: WIDGET_VERSION, stateKeysCount: Object.keys(defaultState).length, languagesCount: LANGUAGES.length };
  }

  // --- Preset storage key and max presets ---
  const PRESETS_STORAGE_KEY = 'openaccessible_presets';
  const MAX_PRESETS = 10;
  const BUILTIN_PRESET_IDS = ['high-contrast', 'reading', 'minimal', 'focus'];

  // --- Default built-in presets (name -> partial state) ---
  const BUILTIN_PRESETS = {
    'high-contrast': {
      name: 'High contrast',
      state: { colorFilter: 'dark', contrast: 1.4, highlightFocus: true, enlargeFocus: true, reduceTransparency: true },
    },
    'reading': {
      name: 'Reading',
      state: { letterSpacing: 'wide', lineHeight: 'relaxed', wordSpacing: 'wide', fontSize: 110, dyslexiaFont: false, highlightAsRead: true },
    },
    'minimal': {
      name: 'Minimal',
      state: { colorFilter: 'none', contrast: 1, fontSize: 100, letterSpacing: 'normal', lineHeight: 'normal', wordSpacing: 'normal', highlightLinks: false, highlightHeadings: false },
    },
    'focus': {
      name: 'Focus & visibility',
      state: { highlightFocus: true, enlargeFocus: true, focusStrip: true, readingGuide: false, highlightForms: true },
    },
  };

  // --- API request timeout (ms) and retry count ---
  const API_TIMEOUT_MS = 15000;
  const API_RETRY_COUNT = 2;
  const TRANSLATE_CHUNK_MAX_CHARS = 800;
  const TRANSLATE_CHUNK_SEPARATOR = /\n\n+|\n|(?<=[.!?])\s+/;

  // --- Localization strings (en); keys used for panel labels, tooltips, messages ---
  const STRINGS = {
    panelTitle: 'Accessibility',
    closePanel: 'Close panel',
    colorContrast: 'Color & contrast',
    filter: 'Filter',
    contrast: 'Contrast',
    readingDyslexia: 'Reading & dyslexia',
    openDyslexic: 'OpenDyslexic font',
    size: 'Size',
    highlight: 'Highlight',
    links: 'Links',
    headings: 'Headings',
    focus: 'Focus',
    tts: 'Text-to-speech',
    ttsEnable: 'Enable read aloud',
    mute: 'Mute all TTS',
    rate: 'Rate',
    pitch: 'Pitch',
    voice: 'Voice',
    testVoice: 'Test voice',
    voiceNav: 'Enable voice commands',
    voiceNavHint: 'Say: open/close accessibility, read page, stop, speak selection, next heading, show headings.',
    translate: 'Translate',
    translateTo: 'Translate to',
    translateSelection: 'Translate selection',
    translatePage: 'Translate page',
    presets: 'Presets',
    applyPreset: 'Apply a preset…',
    moreSpacing: 'More spacing',
    highContrast: 'High contrast',
    navigation: 'Navigation',
    headingsList: 'Headings',
    imageDescriptions: 'Image descriptions',
    visibilityFocus: 'Visibility & focus',
    enlargeFocus: 'Enlarge focus indicator',
    showLinkUrl: 'Show link URL on focus',
    reduceTransparency: 'Reduce transparency',
    highlightForms: 'Highlight form fields',
    layout: 'Layout',
    contentWidth: 'Content width',
    full: 'Full',
    narrow: 'Narrow (65ch)',
    narrower: 'Narrower (45ch)',
    more: 'More',
    monospace: 'Monospace font',
    focusStrip: 'Focus strip (dim except line)',
    reduceMotion: 'Reduce motion',
    readingGuide: 'Reading guide',
    screenReaderHints: 'Screen reader / Braille hints',
    toolbarPosition: 'Toolbar position',
    bottomRight: 'Bottom right',
    bottomLeft: 'Bottom left',
    topRight: 'Top right',
    topLeft: 'Top left',
    settings: 'Settings',
    exportSettings: 'Export settings',
    importSettings: 'Import settings',
    keyboardShortcuts: 'Keyboard shortcuts',
    about: 'About',
    resetAll: 'Reset all',
    poweredBy: 'Powered by OpenAccessible',
    accountLinked: 'Account linked',
    selectTextFirst: 'Select text first, then click Translate selection.',
    translationUnavailable: 'Translation unavailable. Set Translate to a language and try again.',
    chooseLanguageFirst: 'Choose a language under Translate to, then click Translate page.',
    translationFailed: 'Translation failed.',
    defaultVoice: 'Default',
    highContrastPreset: 'High contrast',
    readingPreset: 'Reading',
    minimalPreset: 'Minimal',
    focusPreset: 'Focus & visibility',
    myPreset: 'My preset',
    applyPresetPlaceholder: 'Apply a preset…',
    keyboardShortcutsTitle: 'Keyboard shortcuts',
    aboutTitle: 'About',
    aboutVersion: 'Open Accessible widget',
    aboutDescription: 'Accessibility settings for WCAG 2.2 AA: color, contrast, TTS, translation, and more.',
    close: 'Close',
    readPage: 'Read page',
    stop: 'Stop',
    speakSelection: 'Speak selection',
    imageAltMissing: 'Image has no alt text',
    imageAlt: 'Image',
    headingLevel: 'Heading',
    linkOpensNewWindow: 'Opens in new window',
    linkTo: 'Link to',
    formField: 'Form field',
    formFieldNoLabel: 'Form field has no visible label',
    skipToContent: 'Skip to main content',
    loading: 'Loading…',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    export: 'Export',
    import: 'Import',
  };

  // Build <option> elements from LANGUAGES for a select (value = code, text = name).
  function buildLanguageOptions(includeDefault) {
    var frag = document.createDocumentFragment();
    if (includeDefault) {
      var def = document.createElement('option');
      def.value = '';
      def.textContent = STRINGS.defaultVoice || 'Default';
      frag.appendChild(def);
    }
    LANGUAGES.forEach(function (lang) {
      if (lang.code === '') return;
      var o = document.createElement('option');
      o.value = lang.code;
      o.textContent = lang.name;
      frag.appendChild(o);
    });
    return frag;
  }

  // --- Utility: debounce, throttle, media query helpers ---
  // Return a function that invokes fn after delay ms, canceling any pending previous call.
  function debounce(fn, delay) {
    var t = null;
    return function () {
      var self = this;
      var args = arguments;
      if (t) clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); t = null; }, delay);
    };
  }

  // Return a function that invokes fn at most once per limit ms.
  function throttle(fn, limit) {
    var last = 0;
    var timer = null;
    return function () {
      var self = this;
      var args = arguments;
      var now = Date.now();
      if (now - last >= limit) {
        last = now;
        fn.apply(self, args);
      } else if (!timer) {
        timer = setTimeout(function () {
          timer = null;
          last = Date.now();
          fn.apply(self, args);
        }, limit - (now - last));
      }
    };
  }

  // Return 'dark' or 'light' from prefers-color-scheme, or null if not supported.
  function getPreferredColorScheme() {
    if (typeof global.matchMedia !== 'function') return null;
    try {
      return global.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (_) { return null; }
  }

  // Return true if user prefers reduced motion.
  function getPreferredReducedMotion() {
    if (typeof global.matchMedia !== 'function') return false;
    try {
      return global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (_) { return false; }
  }

  // Return true if the element has an accessible name (aria-label, aria-labelledby, or associated label).
  function hasAccessibleLabel(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.getAttribute('aria-label') && el.getAttribute('aria-label').trim()) return true;
    if (el.getAttribute('aria-labelledby')) {
      var id = el.getAttribute('aria-labelledby').trim().split(/\s+/)[0];
      if (id && document.getElementById(id)) return true;
    }
    if (el.id && document.querySelector('label[for="' + el.id + '"]')) return true;
    var label = el.closest('label');
    if (label && label.control === el) return true;
    return false;
  }

  // Get a short label for form control (for screen reader hints or tooltips).
  function getControlLabel(el) {
    if (!el || el.nodeType !== 1) return '';
    var aria = el.getAttribute('aria-label');
    if (aria && aria.trim()) return aria.trim();
    var lid = el.getAttribute('aria-labelledby');
    if (lid) {
      var firstId = lid.trim().split(/\s+/)[0];
      var lab = firstId && document.getElementById(firstId);
      if (lab) return (lab.textContent || '').trim().slice(0, 100);
    }
    if (el.id) {
      var forLabel = document.querySelector('label[for="' + el.id + '"]');
      if (forLabel) return (forLabel.textContent || '').trim().slice(0, 100);
    }
    var parentLabel = el.closest('label');
    if (parentLabel && parentLabel.control === el) return (parentLabel.textContent || '').trim().slice(0, 100);
    return '';
  }

  // Apply reading-order numbers as data attributes for debugging (optional feature).
  function applyReadingOrderIndicators(root) {
    root = root || document.body;
    var el = root.querySelector ? root : document.body;
    var flow = [];
    var walk = function (node) {
      if (node.nodeType !== 1) return;
      var tag = node.tagName.toLowerCase();
      if (['script', 'style', 'noscript', 'svg', 'path'].indexOf(tag) >= 0) return;
      if (node.getAttribute('aria-hidden') === 'true') return;
      var role = node.getAttribute('role');
      if (role === 'presentation' || role === 'none') return;
      if (node.offsetParent === null && node.getBoundingClientRect().height === 0) return;
      flow.push(node);
      for (var i = 0; i < node.childNodes.length; i++) walk(node.childNodes[i]);
    };
    walk(el);
    flow.forEach(function (n, i) {
      n.setAttribute('data-oa-reading-order', String(i + 1));
    });
    return flow.length;
  }

  // Remove reading-order data attributes.
  function removeReadingOrderIndicators(root) {
    root = root || document.body;
    var all = (root.querySelectorAll ? root : document.body).querySelectorAll('[data-oa-reading-order]');
    all.forEach(function (el) { el.removeAttribute('data-oa-reading-order'); });
  }

  var formHintIdCounter = 0;
  // Ensure form controls without accessible names get a screen-reader-only hint (when highlightForms). Removes previously added hints first.
  function applyFormLabelHints(root) {
    root = root || $root || document.body;
    var container = root && root.querySelector ? root : document.body;
    var existing = container.querySelectorAll('[data-oa-form-hint]');
    existing.forEach(function (el) {
      var id = el.getAttribute('data-oa-form-hint');
      if (id) {
        var hintEl = document.getElementById(id);
        if (hintEl) hintEl.remove();
      }
      el.removeAttribute('data-oa-form-hint');
      el.removeAttribute('aria-describedby');
    });
    if (!state.highlightForms) return;
    var controls = container.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea');
    controls.forEach(function (el) {
      if (hasAccessibleLabel(el)) return;
      formHintIdCounter++;
      var hintId = 'oa-form-hint-' + formHintIdCounter;
      var hint = document.createElement('span');
      hint.id = hintId;
      hint.setAttribute('aria-hidden', 'true');
      hint.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
      hint.textContent = STRINGS.formFieldNoLabel || 'Form field has no visible label';
      hint.setAttribute('data-oa-form-hint-span', '');
      if (el.parentNode) {
        el.parentNode.insertBefore(hint, el.nextSibling);
        var described = el.getAttribute('aria-describedby') || '';
        el.setAttribute('aria-describedby', (described + ' ' + hintId).trim());
        el.setAttribute('data-oa-form-hint', hintId);
      }
    });
  }

  // Normalize and validate init options; return a safe copy for internal use.
  function normalizeInitOptions(opts) {
    var o = opts && typeof opts === 'object' ? opts : {};
    var out = {};
    if (typeof o.apiBase === 'string') out.apiBase = o.apiBase.replace(/\s+/g, '').trim();
    else if (typeof o.apiUrl === 'string') out.apiBase = o.apiUrl.replace(/\s+/g, '').trim();
    else out.apiBase = '';
    if (typeof o.apiKey === 'string') out.apiKey = o.apiKey.trim();
    else out.apiKey = '';
    if (typeof o.userId === 'string') out.userId = o.userId.trim();
    else if (typeof o.user_id === 'string') out.userId = o.user_id.trim();
    else out.userId = '';
    out.useServerTts = !!o.useServerTts;
    if (typeof o.translateApiUrl === 'string') out.translateApiUrl = o.translateApiUrl.trim();
    if (typeof o.dictionaryApiUrl === 'string') out.dictionaryApiUrl = o.dictionaryApiUrl.trim();
    if (typeof o.iconUrl === 'string' && o.iconUrl.length > 0) out.iconUrl = o.iconUrl.trim();
    if (typeof o.accountVerifyUrl === 'string' && o.accountVerifyUrl.length > 0) out.accountVerifyUrl = o.accountVerifyUrl.trim();
    if (o.root !== undefined) {
      if (typeof o.root === 'string') out.root = o.root;
      else if (o.root && o.root.nodeType === 1) out.root = o.root;
    }
    return out;
  }

  // --- Lightweight accessibility checks (return data for host or UI) ---
  // Return array of { level, text, id } for headings in root.
  function getHeadingsSummary(root) {
    root = root || document.body;
    var container = root.querySelector ? root : document.body;
    var headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    return Array.prototype.map.call(headings, function (h) {
      return { level: parseInt(h.tagName.charAt(1), 10), text: (h.textContent || '').trim().slice(0, 200), id: h.id || null };
    });
  }

  // Return array of { src, alt, width, height } for images in root; alt is empty if missing.
  function getImagesWithoutAlt(root) {
    root = root || document.body;
    var container = root.querySelector ? root : document.body;
    var images = container.querySelectorAll('img');
    var out = [];
    images.forEach(function (img) {
      var alt = (img.getAttribute('alt') || '').trim();
      out.push({ src: img.src || img.getAttribute('src') || '', alt: alt, width: img.width || 0, height: img.height || 0, missingAlt: alt === '' });
    });
    return out;
  }

  // Return array of form controls that lack an accessible label.
  function getFormFieldsWithoutLabels(root) {
    root = root || document.body;
    var container = root.querySelector ? root : document.body;
    var controls = container.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea');
    var out = [];
    controls.forEach(function (el) {
      if (!hasAccessibleLabel(el)) out.push({ tag: el.tagName.toLowerCase(), type: el.type || '', name: el.name || '', id: el.id || null });
    });
    return out;
  }

  // Return a short summary of potential issues (counts). For use in dashboard or dev tools.
  function getAccessibilitySummary(root) {
    root = root || document.body;
    var headings = getHeadingsSummary(root);
    var images = getImagesWithoutAlt(root);
    var noAlt = images.filter(function (i) { return i.missingAlt; });
    var formFields = getFormFieldsWithoutLabels(root);
    var lang = (document.documentElement.getAttribute('lang') || '').trim();
    return {
      headingsCount: headings.length,
      imagesCount: images.length,
      imagesMissingAlt: noAlt.length,
      formFieldsWithoutLabel: formFields.length,
      hasLang: lang.length > 0,
    };
  }

  // --- Event names emitted by the widget (for host integration) ---
  var WIDGET_EVENTS = {
    ready: 'Widget initialized; detail: { state, version }',
    change: 'User changed settings; detail: state',
    'preset:apply': 'Preset applied; detail: { presetId, presetName }',
    'preset:saved': 'Preset saved; detail: { presetId, presetName }',
    'preset:deleted': 'Preset deleted; detail: { presetId }',
    'tts:start': 'TTS started',
    'tts:stop': 'TTS stopped',
    'translate:start': 'Translation started; detail: { lang, length }',
    'translate:done': 'Translation finished; detail: { lang, error? }',
  };

  /*
   * Code flow overview (for maintainers):
   * - State: defaultState holds all preference keys; state is the live object, persisted to localStorage (unless guestMode).
   * - readStorage/writeStorage: load/save state; writeStorage is called after applyFromPanel and when state is updated programmatically.
   * - Presets: getSavedPresets/setSavedPresets read/write user presets; applyPreset applies built-in or saved; saveCurrentAsPreset adds a new saved preset.
   * - fetchWithTimeout: optional wrapper for fetch with AbortController timeout and retries; can be used by API calls.
   * - getFocusableElements/trapFocus: used for modals and panel focus trap; getPanelFocusables/setupPanelFocusTrap are panel-specific.
   * - showKeyboardShortcuts/showAbout: create dialogs with KEYBOARD_SHORTCUTS and version info; close on Escape or button.
   * - buildLanguageOptions: builds <option> elements from LANGUAGES for language and translateTargetLang selects.
   * - applyToDocument: applies state to $root (classes, styles, font-size, filter, etc.) and calls applyFormLabelHints when highlightForms is on.
   * - applyFormLabelHints: when state.highlightForms is true, adds aria-describedby and a screen-reader-only span for form controls without labels.
   * - normalizeInitOptions: sanitizes init(opts) so apiBase, apiKey, translateApiUrl, etc. are safe strings or defaults.
   * - requestTranslate: tries translateApiUrl (LibreTranslate format), then apiBase?action=translate, then MyMemory; calls onDone(translatedText or null).
   * - requestTranslateChunked: splits long text with splitTextIntoChunks, translates each chunk, concatenates results.
   * - getHeadingsSummary/getImagesWithoutAlt/getFormFieldsWithoutLabels/getAccessibilitySummary: return data for host or dashboards.
   * - Public API: init() returns an object with getState, setState, openPanel, closePanel, reset, stopTTS, getPresets, applyPreset, saveCurrentAsPreset,
   *   deletePreset, showKeyboardShortcuts, showAbout, translate, getHeadingsSummary, getImagesWithoutAlt, getFormFieldsWithoutLabels,
   *   getAccessibilitySummary, version, events.
   */

  // State key to short description (for debugging or generated docs).
  var STATE_KEYS_DESCRIPTION = {
    colorFilter: 'Color filter (none, grayscale, invert, sepia, protanopia, deuteranopia, tritanopia, dark, light)',
    dyslexiaFont: 'Use OpenDyslexic-style font',
    contrast: 'Contrast multiplier (1 = normal)',
    fontSize: 'Base font size percentage',
    cursorSize: 'Cursor size (default, large, xl)',
    highlightLinks: 'Highlight links',
    highlightHeadings: 'Highlight headings',
    highlightFocus: 'Highlight focus ring',
    ttsEnabled: 'Enable read-aloud on click',
    ttsMuted: 'Mute all TTS',
    ttsRate: 'Speech rate',
    ttsPitch: 'Speech pitch',
    ttsVoice: 'Selected TTS voice name',
    voiceNavigationEnabled: 'Enable voice commands',
    textAlign: 'Text alignment override',
    language: 'Content language code for TTS',
    reduceMotion: 'Respect prefers-reduced-motion',
    underlineLinks: 'Underline links',
    readingGuide: 'Show reading guide line',
    toolbarPosition: 'Toolbar position (top/bottom left/right)',
    dictionaryEnabled: 'Enable double-click dictionary',
    letterSpacing: 'Letter spacing (normal, wide, wider)',
    lineHeight: 'Line height (normal, relaxed, loose)',
    wordSpacing: 'Word spacing',
    highlightAsRead: 'Highlight words as TTS reads',
    translateTargetLang: 'Translation target language code',
    monospaceFont: 'Use monospace font',
    focusStrip: 'Focus strip (dim except current line)',
    enlargeFocus: 'Enlarge focus indicator',
    showLinkUrl: 'Show link URL on focus',
    reduceTransparency: 'Reduce transparency',
    highlightForms: 'Highlight form fields and add hints',
    contentWidth: 'Content width (full, narrow, narrower)',
    guestMode: 'Do not persist to localStorage',
  };

  // CSS classes applied by the widget to the root (openaccessible-widget-root).
  var WIDGET_ROOT_CLASSES = [
    'oa-color-grayscale', 'oa-color-invert', 'oa-color-sepia', 'oa-color-protanopia', 'oa-color-deuteranopia', 'oa-color-tritanopia', 'oa-color-dark', 'oa-color-light',
    'oa-dyslexia', 'oa-highlight-links', 'oa-highlight-headings', 'oa-focus-visible', 'oa-underline-links', 'oa-reduce-motion', 'oa-reading-guide',
    'oa-ls-wide', 'oa-ls-wider', 'oa-lh-relaxed', 'oa-lh-loose', 'oa-ws-wide', 'oa-monospace', 'oa-focus-strip', 'oa-enlarge-focus', 'oa-show-link-url',
    'oa-reduce-transparency', 'oa-highlight-forms', 'oa-content-narrow', 'oa-content-narrower',
  ];

  // Return suggested state overrides based on system preferences (reduced motion, color scheme).
  function getSuggestedSettings() {
    var suggested = {};
    if (getPreferredReducedMotion()) suggested.reduceMotion = true;
    var scheme = getPreferredColorScheme();
    if (scheme === 'dark') suggested.colorFilter = 'dark';
    else if (scheme === 'light') suggested.colorFilter = 'light';
    return suggested;
  }

  // Return default state as a plain object (for reset or export template).
  function getDefaultStateSnapshot() {
    var out = {};
    Object.keys(defaultState).forEach(function (k) {
      if (k !== 'guestMode' && k !== 'lastPresetName') out[k] = defaultState[k];
    });
    return out;
  }

  /*
   * Supported backend API actions (when apiBase is set):
   * - GET  ?action=dictionary&word=...     -> { definition: string }
   * - POST action=translate  body: { text, target } -> { translated: string }
   * - GET  ?action=preferences_load&user_id=... -> { preferences: object }
   * - POST action=preferences_save  body: { user_id, ...state } -> ok
   * - POST action=tts  body: { text, lang, rate } -> { url: string|null } (optional server TTS)
   * - GET  ?action=analytics_event&event_type=...&site_url=...&user_id=... (optional)
   * All POST requests use Content-Type: application/json. Optional X-API-Key header when apiKey is set.
   */

  /*
   * LibreTranslate / OSS Translate API (translateApiUrl):
   * POST body: { q: string, source: string (e.g. "en"), target: string (e.g. "es") }
   * Response: { translatedText: string } or error status.
   * No API key required for default endpoint; some instances support api_key in body.
   */

  // Panel section titles and data-oa-opt control names (for automation or tests).
  var PANEL_SECTIONS = [
    { title: 'Color & contrast', opts: ['colorFilter', 'contrast'] },
    { title: 'Reading & dyslexia', opts: ['dyslexiaFont'] },
    { title: 'Size', opts: ['letterSpacing', 'lineHeight', 'wordSpacing', 'fontSize', 'cursorSize'] },
    { title: 'Highlight', opts: ['highlightLinks', 'highlightHeadings', 'highlightFocus', 'underlineLinks'] },
    { title: 'Text-to-speech', opts: ['ttsEnabled', 'ttsMuted', 'highlightAsRead', 'ttsRate', 'ttsPitch', 'ttsVoice'] },
    { title: 'Voice commands', opts: ['voiceNavigationEnabled'] },
    { title: 'Translate', opts: ['translateTargetLang'] },
    { title: 'Text & language', opts: ['textAlign', 'language'] },
    { title: 'Presets', opts: [] },
    { title: 'Navigation', opts: [] },
    { title: 'Visibility & focus', opts: ['enlargeFocus', 'showLinkUrl', 'reduceTransparency', 'highlightForms'] },
    { title: 'Layout', opts: ['contentWidth'] },
    { title: 'More', opts: ['monospaceFont', 'focusStrip', 'reduceMotion', 'readingGuide', 'screenReaderHints', 'toolbarPosition'] },
    { title: 'Settings', opts: [] },
  ];

  /*
   * Internal function index (for maintainers; not exhaustive):
   * Storage: readStorage, writeStorage, getSavedPresets, setSavedPresets.
   * Presets: applyPreset, saveCurrentAsPreset, deletePreset.
   * Network: fetchWithTimeout.
   * Focus: getFocusableElements, trapFocus, getPanelFocusables, setupPanelFocusTrap.
   * Modals: showKeyboardShortcuts, showAbout.
   * Options: buildLanguageOptions, normalizeInitOptions.
   * DOM apply: applyToDocument, applyFormLabelHints, loadDyslexiaFont.
   * Panel: createPanel, syncPanelFromState, applyFromPanel, updateToolbarPosition, updateToolbarActive.
   * Toolbar: createToolbar.
   * TTS: isTtsMuted, syncTtsVoiceFromPanel, getTtsVoiceObject, applyTtsOptionsToUtterance, stopTTS, speakElement, speakSelection, testVoice,
   *   readPageWithTTS, openReadingViewAndSpeak, closeReadingView, escapeHtml, chunkTextForTts, playNextServerTts.
   * Voice nav: getSpeechRecognition, stopVoiceNavigation, startVoiceNavigation, ensureVoiceNavigation.
   * Translate: requestTranslate, requestTranslateChunked, splitTextIntoChunks, showTranslatedPageOverlay.
   * Dictionary: initDictionary, showWordModal, speakTextForModalBrowser, fetchDefinition.
   * UI: showTooltip, showHeadingsOutline, showImageDescriptions, showSelectionBar, hideSelectionBar.
   * Export/import: exportSettings, importSettingsFromFile.
   * Link URL: initLinkUrlOnFocus, onLinkFocusIn.
   * Reading guide: initReadingGuide.
   * Focus strip: ensureFocusStripMask, removeFocusStripMask.
   * API: syncApiPreferences, checkOpenAccessibleAccount, updateFooterAccountBadge.
   * A11y checks: getHeadingsSummary, getImagesWithoutAlt, getFormFieldsWithoutLabels, getAccessibilitySummary.
   * Utilities: getSuggestedSettings, getDefaultStateSnapshot, debounce, throttle, getPreferredColorScheme, getPreferredReducedMotion,
   *   hasAccessibleLabel, getControlLabel, applyReadingOrderIndicators, removeReadingOrderIndicators.
   * Icon: getScriptBase, renderIcon.
   * Styles: injectStyles.
   * Skip link: injectSkipLink.
   * Public: init, reset, togglePanel.
   *
   * State keys and types (for host or tooling):
   * colorFilter: string (none|grayscale|invert|sepia|protanopia|deuteranopia|tritanopia|dark|light)
   * dyslexiaFont: boolean
   * contrast: number (1 = normal)
   * fontSize: number (percentage)
   * cursorSize: string (default|large|xl)
   * highlightLinks, highlightHeadings, highlightFocus: boolean
   * ttsEnabled, ttsMuted: boolean
   * ttsRate, ttsPitch: number
   * ttsVoice: string|null (voice name)
   * voiceNavigationEnabled: boolean
   * textAlign: string (''|left|center|right|justify)
   * language: string (BCP 47 or '')
   * reduceMotion, underlineLinks, readingGuide: boolean
   * toolbarPosition: string (top|bottom + left|right)
   * dictionaryEnabled, simplifiedWords, screenReaderHints: boolean
   * letterSpacing: string (normal|wide|wider)
   * lineHeight: string (normal|relaxed|loose)
   * wordSpacing: string
   * highlightAsRead: boolean
   * translateTargetLang: string (language code or '')
   * monospaceFont, focusStrip, enlargeFocus, showLinkUrl: boolean
   * reduceTransparency, highlightForms: boolean
   * contentWidth: string (full|narrow|narrower)
   * guestMode: boolean (do not persist)
   * lastPresetName: string|null (UI only)
   *
   * Example OpenAccessibleConfig:
   *   window.OpenAccessibleConfig = { apiBase: 'https://api.example.com/', apiKey: 'key', translateApiUrl: 'https://translate.example.com/translate' };
   *
   * Example event listeners:
   *   window.addEventListener('openaccessible:ready', function (e) { console.log('Widget ready', e.detail.state); });
   *   window.addEventListener('openaccessible:change', function (e) { console.log('Settings changed', e.detail); });
   *   window.addEventListener('openaccessible:tts:start', function () { console.log('TTS started'); });
   *   window.addEventListener('openaccessible:translate:done', function (e) { console.log('Translate done', e.detail); });
   *
   * Example programmatic usage:
   *   var api = OpenAccessible.init({ apiBase: '/api/' });
   *   api.openPanel();
   *   api.applyPreset('high-contrast');
   *   api.translate('Hello', 'es', function (text) { console.log(text); });
   *   var summary = api.getAccessibilitySummary(); console.log(summary);
   *
   * Emit events (detail payloads):
   *   openaccessible:ready       -> { state, version }
   *   openaccessible:change       -> state (full object)
   *   openaccessible:preset:apply -> { presetId, presetName }
   *   openaccessible:preset:saved -> { presetId, presetName }
   *   openaccessible:preset:deleted -> { presetId }
   *   openaccessible:tts:start    -> {}
   *   openaccessible:tts:stop     -> {}
   *   openaccessible:translate:start -> { lang, length }
   *   openaccessible:translate:done  -> { lang, error? }
   */

  // All data-oa-opt attribute values used in the panel (for automation or validation).
  var PANEL_OPT_NAMES = [
    'colorFilter', 'contrast', 'dyslexiaFont', 'fontSize', 'cursorSize', 'highlightLinks', 'highlightHeadings', 'highlightFocus',
    'underlineLinks', 'letterSpacing', 'lineHeight', 'wordSpacing', 'ttsEnabled', 'ttsMuted', 'highlightAsRead', 'ttsRate', 'ttsPitch', 'ttsVoice',
    'voiceNavigationEnabled', 'translateTargetLang', 'textAlign', 'language', 'dictionaryEnabled', 'screenReaderHints',
    'enlargeFocus', 'showLinkUrl', 'reduceTransparency', 'highlightForms', 'contentWidth', 'monospaceFont', 'focusStrip',
    'reduceMotion', 'readingGuide', 'toolbarPosition', 'simplifiedWords',
  ];

  // Spacing option values for letter, line, word.
  var SPACING_OPTIONS = {
    letterSpacing: [{ value: 'normal', label: 'Normal' }, { value: 'wide', label: 'Wide' }, { value: 'wider', label: 'Wider' }],
    lineHeight: [{ value: 'normal', label: 'Normal' }, { value: 'relaxed', label: 'Relaxed' }, { value: 'loose', label: 'Loose' }],
    wordSpacing: [{ value: 'normal', label: 'Normal' }, { value: 'wide', label: 'Wide' }],
  };

  // Cursor size options.
  var CURSOR_SIZE_OPTIONS = [
    { value: 'default', label: 'Default' },
    { value: 'large', label: 'Large' },
    { value: 'xl', label: 'Extra large' },
  ];

  // Content width options.
  var CONTENT_WIDTH_OPTIONS = [
    { value: 'full', label: 'Full' },
    { value: 'narrow', label: 'Narrow (65ch)' },
    { value: 'narrower', label: 'Narrower (45ch)' },
  ];

  // Text align options for state.textAlign.
  var TEXT_ALIGN_OPTIONS = [
    { value: '', label: 'Default' },
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right' },
    { value: 'justify', label: 'Justify' },
  ];

  // --- Mutable state and DOM refs (state, apiBase, panel, toolbar, etc.) ---
  // State is merged with defaultState and persisted to localStorage unless guestMode is true.
  let state = { ...defaultState };
  let apiBase = '';
  let apiKey = '';
  let apiUserId = '';
  let translateApiUrl = 'https://osstranslate-cbjjn-u5208.vm.elestio.app/';  // LibreTranslate-style; set to '' to use only apiBase/MyMemory
  let dictionaryApiUrl = 'https://api.openaccessible.com/api/v1/';  // GET ?word=... returns { word, pronunciation, definition } or array; set '' to use only apiBase + built-in
  let $root = null;
  let $panel = null;
  let activeHighlights = [];
  let readingGuideEl = null;
  let ttsUtterance = null;
  let ttsSynth = null;
  let useServerTts = false;
  let serverTtsQueue = [];
  let serverTtsAudio = null;
  let serverTtsAbort = null;
  let iconUrl = '';
  let accountVerifyUrl = 'https://api.openaccessible.com/v1/verify';
  let hasOpenAccessibleAccount = false;
  let voiceRecognition = null;    // SpeechRecognition instance when voice nav is on
  let voiceRecognitionActive = false;

  // --- Storage & events ---
// Load saved preferences from localStorage into state.
  function readStorage() {
    if (state.guestMode) return;
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state = { ...defaultState, ...parsed };
      }
    } catch (_) {}
  }

  // Persist current state to localStorage (no-op when guestMode).
  function writeStorage() {
    if (state.guestMode) return;
    try {
      const toSave = { ...state };
      delete toSave.guestMode;
      delete toSave.lastPresetName;
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (_) {}
  }

  // Return list of user-saved presets from localStorage.
  function getSavedPresets() {
    try {
      const raw = global.localStorage.getItem(PRESETS_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return [];
  }

  // Save list of user presets to localStorage.
  function setSavedPresets(list) {
    try {
      global.localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(list.slice(0, MAX_PRESETS)));
    } catch (_) {}
  }

  // Apply a built-in or saved preset by id or name; updates state, document, storage, panel.
  function applyPreset(idOrName) {
    const builtin = BUILTIN_PRESETS[idOrName];
    if (builtin) {
      const patch = builtin.state;
      Object.keys(patch).forEach(function (k) {
        if (defaultState.hasOwnProperty(k)) state[k] = patch[k];
      });
      state.lastPresetName = builtin.name;
      writeStorage();
      applyToDocument();
      if ($panel) syncPanelFromState();
      syncApiPreferences('save');
      emit('preset:apply', { presetId: idOrName, presetName: builtin.name });
      return;
    }
    const saved = getSavedPresets().find(function (p) { return p.id === idOrName || p.name === idOrName; });
    if (saved && saved.state) {
      Object.keys(saved.state).forEach(function (k) {
        if (defaultState.hasOwnProperty(k)) state[k] = saved.state[k];
      });
      state.lastPresetName = saved.name;
      writeStorage();
      applyToDocument();
      if ($panel) syncPanelFromState();
      syncApiPreferences('save');
      emit('preset:apply', { presetId: saved.id, presetName: saved.name });
    }
  }

  // Save current state as a named preset. Returns new preset id or null if at limit.
  function saveCurrentAsPreset(name) {
    var list = getSavedPresets();
    if (list.length >= MAX_PRESETS) return null;
    var id = 'user-' + Date.now();
    var snapshot = {};
    Object.keys(defaultState).forEach(function (k) {
      if (k !== 'guestMode' && k !== 'lastPresetName' && state.hasOwnProperty(k)) snapshot[k] = state[k];
    });
    list.push({ id: id, name: name || 'My preset', state: snapshot });
    setSavedPresets(list);
    emit('preset:saved', { presetId: id, presetName: name || 'My preset' });
    return id;
  }

  // Delete a user preset by id.
  function deletePreset(id) {
    var list = getSavedPresets().filter(function (p) { return p.id !== id; });
    setSavedPresets(list);
    emit('preset:deleted', { presetId: id });
  }

  // Fetch with timeout and optional retries. Returns promise that resolves to response.json() or rejects.
  function fetchWithTimeout(url, options, timeoutMs, retries) {
    timeoutMs = timeoutMs || API_TIMEOUT_MS;
    retries = retries != null ? retries : API_RETRY_COUNT;
    function attempt(n) {
      var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timeoutId = null;
      if (controller) {
        timeoutId = global.setTimeout(function () { controller.abort(); }, timeoutMs);
        options = options || {};
        options.signal = controller.signal;
      }
      return fetch(url, options)
        .then(function (r) {
          if (timeoutId) global.clearTimeout(timeoutId);
          return r;
        })
        .catch(function (err) {
          if (timeoutId) global.clearTimeout(timeoutId);
          if (n < retries) return attempt(n + 1);
          return Promise.reject(err);
        });
    }
    return attempt(0).then(function (r) { return r.json ? r.json() : r.text(); });
  }

// Dispatch a custom event 'openaccessible:' + name for host page integration.
  function emit(name, detail) {
    try {
      global.dispatchEvent(new CustomEvent('openaccessible:' + name, { detail }));
    } catch (_) {}
  }

  // Return focusable elements within container (buttons, links, inputs, selects, textareas, [tabindex>=0]).
  function getFocusableElements(container) {
    if (!container || !container.querySelectorAll) return [];
    var selector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.prototype.filter.call(container.querySelectorAll(selector), function (el) {
      return el.offsetParent !== null && (el.offsetWidth > 0 || el.offsetHeight > 0);
    });
  }

  // Trap focus inside container on Tab/Shift+Tab. Call on panel or modal mount; remove listener on unmount.
  function trapFocus(container) {
    if (!container) return function () {};
    function handleKeyDown(e) {
      if (e.key !== 'Tab') return;
      var focusable = getFocusableElements(container);
      if (focusable.length === 0) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    container.addEventListener('keydown', handleKeyDown);
    return function () { container.removeEventListener('keydown', handleKeyDown); };
  }

  // Show keyboard shortcuts help modal; close on Escape or backdrop click.
  function showKeyboardShortcuts() {
    var existing = document.getElementById('oa-shortcuts-modal');
    if (existing) { existing.remove(); return; }
    var wrap = document.createElement('div');
    wrap.id = 'oa-shortcuts-modal';
    wrap.className = 'oa-reading-view';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-label', 'Keyboard shortcuts');
    var rows = KEYBOARD_SHORTCUTS.map(function (s) {
      return '<tr><td class="oa-shortcuts-keys">' + escapeHtml(s.keys) + '</td><td>' + escapeHtml(s.action) + '</td></tr>';
    }).join('');
    wrap.innerHTML = '<h4>Keyboard shortcuts</h4><button type="button" class="oa-reading-view-close" aria-label="Close">×</button><table class="oa-shortcuts-table"><tbody>' + rows + '</tbody></table>';
    function close() { wrap.remove(); }
    wrap.querySelector('.oa-reading-view-close').addEventListener('click', close);
    wrap.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    document.body.appendChild(wrap);
    var btn = wrap.querySelector('.oa-reading-view-close');
    if (btn) btn.focus();
  }

  // Show About modal (version, link).
  function showAbout() {
    var existing = document.getElementById('oa-about-modal');
    if (existing) { existing.remove(); return; }
    var wrap = document.createElement('div');
    wrap.id = 'oa-about-modal';
    wrap.className = 'oa-reading-view';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-label', 'About Open Accessible');
    wrap.innerHTML = '<h4>About</h4><button type="button" class="oa-reading-view-close" aria-label="Close">×</button><p>Open Accessible widget v' + WIDGET_VERSION + '.</p><p>Accessibility settings for WCAG 2.2 AA: color, contrast, TTS, translation, and more.</p><p><a href="https://github.com/OpenAccessible/OpenAccessible" target="_blank" rel="noopener noreferrer">GitHub</a></p>';
    function close() { wrap.remove(); }
    wrap.querySelector('.oa-reading-view-close').addEventListener('click', close);
    wrap.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    document.body.appendChild(wrap);
    var btn = wrap.querySelector('.oa-reading-view-close');
    if (btn) btn.focus();
  }

  // Resolve base URL for widget assets from the script src (e.g. for icon.svg).
  function getScriptBase() {
    const s = document.currentScript || document.querySelector('script[src*="widget"]');
    if (s && s.src) return s.src.replace(/\/[^/?#]+(?:\?.*)?$/, '/');
    return '';
  }

  // Return an icon element (img if iconUrl set, else inline SVG).
  function renderIcon(className) {
    const c = className || 'oa-icon';
    if (iconUrl) {
      const img = document.createElement('img');
      img.src = iconUrl;
      img.alt = '';
      img.className = c;
      img.setAttribute('aria-hidden', 'true');
      return img;
    }
    const wrap = document.createElement('span');
    wrap.innerHTML = ICON_SVG;
    const el = wrap.firstElementChild || wrap;
    var existing = (el.getAttribute && el.getAttribute('class')) || '';
    var newClass = (existing ? existing + ' ' : '') + c;
    if (el.setAttribute) el.setAttribute('class', newClass);
    else el.className = newClass;
    return el;
  }

  // --- Inject widget and panel styles (including word modal, dark theme, voice nav hint) ---
  // Add a single <style> block with all widget CSS if not already present.
  function injectStyles() {
    const id = 'openaccessible-styles';
    if (document.getElementById(id)) return;
    const css = `
      .openaccessible-widget-root{--oa-zoom:1;--oa-contrast:1;--oa-cursor:default;--oa-align:left;--oa-ls:normal;--oa-lh:normal;--oa-ws:normal;}
      .openaccessible-widget-root.oa-color-grayscale{filter:grayscale(1);}
      .openaccessible-widget-root.oa-color-invert{filter:invert(1);}
      .openaccessible-widget-root.oa-color-sepia{filter:sepia(1);}
      .openaccessible-widget-root.oa-color-protanopia{filter:url(#oa-protanopia);}
      .openaccessible-widget-root.oa-color-deuteranopia{filter:url(#oa-deuteranopia);}
      .openaccessible-widget-root.oa-color-tritanopia{filter:url(#oa-tritanopia);}
      .openaccessible-widget-root.oa-color-dark{filter:brightness(0.85) contrast(1.2);background:#1a1a1a !important;color:#e0e0e0 !important;}
      .openaccessible-widget-root.oa-color-light{filter:brightness(1.1) contrast(1.1);background:#f5f5f5 !important;color:#111 !important;}
      .openaccessible-widget-root.oa-dyslexia,.openaccessible-widget-root.oa-dyslexia body,.openaccessible-widget-root.oa-dyslexia .oa-panel,.openaccessible-widget-root.oa-dyslexia *{font-family:'Open-Dyslexic',OpenDyslexic,'Comic Sans MS',sans-serif !important;}
      .openaccessible-widget-root.oa-highlight-links a{outline:2px solid #0a7ea4 !important;outline-offset:2px;}
      .openaccessible-widget-root.oa-highlight-headings h1,.openaccessible-widget-root.oa-highlight-headings h2,.openaccessible-widget-root.oa-highlight-headings h3,.openaccessible-widget-root.oa-highlight-headings h4,.openaccessible-widget-root.oa-highlight-headings h5,.openaccessible-widget-root.oa-highlight-headings h6{outline:2px dashed #0a7ea4;outline-offset:4px;}
      .openaccessible-widget-root.oa-focus-visible *:focus-visible{outline:3px solid #0a7ea4 !important;outline-offset:2px !important;}
      .openaccessible-widget-root.oa-underline-links a{text-decoration:underline !important;}
      .openaccessible-widget-root.oa-reduce-motion *,.openaccessible-widget-root.oa-reduce-motion *::before,.openaccessible-widget-root.oa-reduce-motion *::after{animation-duration:0.01ms !important;animation-iteration-count:1 !important;transition-duration:0.01ms !important;}
      .openaccessible-widget-root.oa-reading-guide::after{content:'';position:fixed;left:0;top:var(--oa-guide-y,0);width:100%;height:120px;background:rgba(10,126,164,0.12);pointer-events:none;z-index:99998;}
      .openaccessible-widget-root[data-oa-align="center"]{text-align:center;}
      .openaccessible-widget-root[data-oa-align="right"]{text-align:right;}
      .openaccessible-widget-root[data-oa-align="justify"]{text-align:justify;}
      .openaccessible-widget-root.oa-ls-wide{letter-spacing:0.12em !important;}
      .openaccessible-widget-root.oa-ls-wider{letter-spacing:0.2em !important;}
      .openaccessible-widget-root.oa-lh-relaxed{line-height:1.6 !important;}
      .openaccessible-widget-root.oa-lh-loose{line-height:1.9 !important;}
      .openaccessible-widget-root.oa-ws-wide{word-spacing:0.2em !important;}
      .openaccessible-widget-root.oa-monospace{font-family:ui-monospace,monospace !important;}
      .openaccessible-widget-root.oa-focus-strip .oa-focus-strip-mask{position:fixed;left:0;right:0;top:0;bottom:0;background:linear-gradient(to bottom,rgba(0,0,0,0.55) 0%,transparent 35%,transparent 65%,rgba(0,0,0,0.55) 100%);pointer-events:none;z-index:2147483643;}
      .oa-selection-bar{position:fixed;z-index:2147483644;display:flex;gap:6px;padding:6px 10px;background:#0F172A;color:#fff;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.3);align-items:center;font-size:13px;}
      .oa-selection-bar .oa-btn-bar{padding:6px 12px;border:none;border-radius:6px;background:#22D3EE;color:#0F172A;cursor:pointer;font-weight:500;}
      .oa-selection-bar .oa-btn-bar:hover{background:#67e8f9;}
      .oa-reading-view{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:90%;max-width:520px;max-height:80vh;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 24px 48px rgba(0,0,0,0.2);z-index:2147483644;padding:24px;}
      .oa-reading-view h4{margin:0 0 16px;font-size:1rem;}
      .oa-reading-view .oa-reading-content{line-height:1.8;}
      .oa-reading-view .oa-word{transition:background 0.1s;}
      .oa-reading-view .oa-word.oa-current{background:#22D3EE;color:#0F172A;}
      .oa-reading-view-close{position:absolute;top:12px;right:12px;border:none;background:#e2e8f0;border-radius:8px;cursor:pointer;padding:6px 10px;font-size:14px;}
      body.oa-widget-dark .oa-reading-view{background:#1e293b;}
      body.oa-widget-dark .oa-reading-view .oa-word.oa-current{background:#67e8f9;color:#0F172A;}
      body.oa-widget-dark .oa-translate-overlay{background:#1e293b;color:#e2e8f0;}
      body.oa-widget-dark .oa-selection-bar{background:#1e293b;}
      .oa-translate-overlay{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:90%;max-width:560px;max-height:85vh;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 24px 48px rgba(0,0,0,0.25);z-index:2147483644;padding:24px;}
      .oa-translate-overlay h4{margin:0 0 12px;}
      .oa-translate-overlay .oa-translated-text{white-space:pre-wrap;}
      .openaccessible-widget-root.oa-enlarge-focus *:focus-visible{outline-width:4px !important;}
      .openaccessible-widget-root.oa-highlight-forms input:focus,.openaccessible-widget-root.oa-highlight-forms select:focus,.openaccessible-widget-root.oa-highlight-forms textarea:focus,.openaccessible-widget-root.oa-highlight-forms button:focus{outline:3px solid #22D3EE !important;outline-offset:2px;}
      .openaccessible-widget-root.oa-reduce-transparency .oa-panel,.openaccessible-widget-root.oa-reduce-transparency .oa-reading-view,.openaccessible-widget-root.oa-reduce-transparency .oa-translate-overlay{background:#fff !important;}
      body.oa-widget-dark .openaccessible-widget-root.oa-reduce-transparency .oa-panel,.openaccessible-widget-root.oa-reduce-transparency .oa-reading-view,.openaccessible-widget-root.oa-reduce-transparency .oa-translate-overlay{background:#1e293b !important;}
      .openaccessible-widget-root.oa-content-narrow main,.openaccessible-widget-root.oa-content-narrow [role="main"],.openaccessible-widget-root.oa-content-narrow .oa-content-wrap{max-width:65ch !important;margin-left:auto !important;margin-right:auto !important;}
      .openaccessible-widget-root.oa-content-narrower main,.openaccessible-widget-root.oa-content-narrower [role="main"],.openaccessible-widget-root.oa-content-narrower .oa-content-wrap{max-width:45ch !important;margin-left:auto !important;margin-right:auto !important;}
      .oa-overlay-list{list-style:none;margin:0;padding:8px 0;max-height:280px;overflow:auto;}
      .oa-overlay-list li{padding:8px 12px;border-radius:8px;cursor:pointer;}
      .oa-overlay-list li:hover{background:rgba(34,211,238,0.15);}
      .oa-overlay-list li a{color:inherit;text-decoration:none;}
      .oa-shortcuts-table{width:100%;border-collapse:collapse;margin-top:12px;}
      .oa-shortcuts-table td{padding:8px 12px;border-bottom:1px solid rgba(0,0,0,0.08);}
      .oa-shortcuts-keys{font-family:monospace;white-space:nowrap;}
      body.oa-widget-dark .oa-shortcuts-table td{border-color:rgba(255,255,255,0.1);}
      .oa-preset-select-wrap{margin-top:8px;}
      .oa-preset-select-wrap select{max-width:100%;}
      .oa-toolbar{position:fixed !important;z-index:2147483646 !important;font-family:system-ui,-apple-system,sans-serif !important;}
      .oa-toolbar[data-pos="bottom-right"]{bottom:20px !important;right:20px !important;}
      .oa-toolbar[data-pos="bottom-left"]{bottom:20px !important;left:20px !important;}
      .oa-toolbar[data-pos="top-right"]{top:20px !important;right:20px !important;}
      .oa-toolbar[data-pos="top-left"]{top:20px !important;left:20px !important;}
      .oa-toolbar-btn{width:56px !important;height:56px !important;border:none !important;border-radius:50% !important;background:#0F172A !important;color:#fff !important;cursor:pointer !important;display:flex !important;align-items:center !important;justify-content:center !important;box-shadow:0 4px 20px rgba(15,23,42,0.4),0 0 0 3px rgba(34,211,238,0.2) !important;transition:transform 0.2s ease,box-shadow 0.2s ease !important;padding:0 !important;margin:0 !important;}
      .oa-toolbar-btn:hover{transform:scale(1.08);box-shadow:0 6px 24px rgba(15,23,42,0.5),0 0 0 3px #22D3EE;}
      .oa-toolbar-btn:focus-visible{outline:none;box-shadow:0 6px 24px rgba(15,23,42,0.5),0 0 0 3px #22D3EE;}
      .oa-toolbar-btn.active{box-shadow:0 4px 20px rgba(34,211,238,0.35),0 0 0 3px #22D3EE;}
      .oa-toolbar-btn .oa-icon{width:32px;height:32px;display:block;}
      .oa-panel{position:fixed;z-index:2147483645;background:#fff;border-radius:16px;box-shadow:0 24px 48px rgba(15,23,42,0.15),0 0 0 1px rgba(0,0,0,0.06);max-width:380px;max-height:88vh;overflow:auto;padding:0;font-size:14px;}
      .oa-panel[data-pos="bottom-right"]{bottom:88px;right:20px;}
      .oa-panel[data-pos="bottom-left"]{bottom:88px;left:20px;}
      .oa-panel[data-pos="top-right"]{top:88px;right:20px;}
      .oa-panel[data-pos="top-left"]{top:88px;left:20px;}
      .oa-panel-header{display:flex;align-items:center;gap:12px;padding:16px 20px;background:linear-gradient(135deg,#0F172A 0%,#1e293b 100%);color:#fff;border-radius:16px 16px 0 0;}
      .oa-panel-header .oa-icon-wrap{display:flex;align-items:center;justify-content:center;flex-shrink:0;}
      .oa-panel-header .oa-icon{width:28px;height:28px;}
      .oa-panel-header h3{margin:0;font-size:1.1rem;font-weight:600;letter-spacing:0.02em;}
      .oa-tts-actions{display:flex;gap:8px;margin-bottom:12px;}
      .oa-btn-tts{padding:8px 14px;border-radius:8px;border:1px solid #22D3EE;background:#f0fdfa;color:#0e7490;cursor:pointer;font-size:13px;font-weight:500;}
      .oa-btn-tts:hover{background:#ccfbf1;}
      .oa-btn-tts:focus-visible{outline:2px solid #22D3EE;outline-offset:2px;}
      .oa-panel-body{padding:20px;}
      .oa-panel .oa-close{position:absolute;top:12px;right:12px;width:32px;height:32px;padding:0;background:rgba(255,255,255,0.1);border:none;border-radius:8px;cursor:pointer;font-size:18px;line-height:1;color:rgba(255,255,255,0.9);display:flex;align-items:center;justify-content:center;}
      .oa-panel .oa-close:hover{background:rgba(255,255,255,0.2);}
      .oa-section{margin-bottom:20px;}
      .oa-section:last-child{margin-bottom:0;}
      .oa-section-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#22D3EE;margin-bottom:10px;}
      .oa-section label{display:block;margin-bottom:6px;font-weight:500;color:#334155;}
      .oa-opt{display:flex;align-items:center;gap:10px;margin:8px 0;}
      .oa-opt input[type="checkbox"]{width:20px;height:20px;accent-color:#22D3EE;}
      .oa-opt select{flex:1;padding:8px 12px;border-radius:10px;border:1px solid #e2e8f0;background:#fff;}
      .oa-opt select:focus{border-color:#22D3EE;outline:none;}
      .oa-opt input[type="range"]{flex:1;accent-color:#22D3EE;}
      .oa-panel .oa-reset{padding:10px 16px;border-radius:10px;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;font-size:13px;font-weight:500;cursor:pointer;margin-top:8px;}
      .oa-panel .oa-reset:hover{background:#f1f5f9;}
      body.oa-widget-dark .oa-panel{background:#1e293b;box-shadow:0 24px 48px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.08);}
      body.oa-widget-dark .oa-panel-body{background:#1e293b;}
      body.oa-widget-dark .oa-section-title{color:#67e8f9;}
      body.oa-widget-dark .oa-section label{color:#cbd5e1;}
      body.oa-widget-dark .oa-opt select{background:#334155;border-color:#475569;color:#e2e8f0;}
      body.oa-widget-dark .oa-opt select:focus{border-color:#67e8f9;}
      body.oa-widget-dark .oa-panel .oa-reset{background:#334155;border-color:#475569;color:#cbd5e1;}
      body.oa-widget-dark .oa-panel .oa-reset:hover{background:#475569;}
      body.oa-widget-dark .oa-btn-tts{background:#334155;border-color:#67e8f9;color:#67e8f9;}
      body.oa-widget-dark .oa-btn-tts:hover{background:#475569;}
      body.oa-widget-dark .oa-toolbar-btn{background:#1e293b;box-shadow:0 4px 20px rgba(0,0,0,0.5),0 0 0 3px rgba(34,211,238,0.25);}
      body.oa-widget-dark .oa-toolbar-btn:hover{box-shadow:0 6px 24px rgba(0,0,0,0.5),0 0 0 3px #22D3EE;}
      body.oa-widget-dark .oa-toolbar-btn.active{box-shadow:0 4px 20px rgba(34,211,238,0.4),0 0 0 3px #22D3EE;}
      body.oa-widget-light .oa-panel{background:#f8fafc;box-shadow:0 24px 48px rgba(15,23,42,0.12),0 0 0 1px rgba(0,0,0,0.06);}
      body.oa-widget-light .oa-panel-body{background:#f8fafc;}
      body.oa-widget-light .oa-section label{color:#334155;}
      body.oa-widget-light .oa-toolbar-btn{background:#1e293b;}
      body.oa-cursor-large{cursor:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cpath fill='%23000' d='M2 2 L2 28 L8 22 L14 28 L16 26 L10 20 L16 18 Z'/%3E%3Cpath fill='%23fff' d='M2 2 L2 26 L6 22 L12 26 L14 24 L8 20 L14 18 Z'/%3E%3C/svg%3E") 0 0, auto;}
      body.oa-cursor-xl{cursor:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Cpath fill='%23000' d='M3 3 L3 42 L12 33 L21 42 L24 39 L15 30 L24 27 Z'/%3E%3Cpath fill='%23fff' d='M3 3 L3 39 L9 33 L18 39 L21 36 L12 30 L21 27 Z'/%3E%3C/svg%3E") 0 0, auto;}
      .oa-word-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:2147483646;display:flex;align-items:stretch;justify-content:flex-end;}
      .oa-word-modal{background:#fff;width:360px;max-width:100%;height:100%;overflow:auto;border-radius:16px 0 0 16px;box-shadow:-4px 0 24px rgba(0,0,0,0.2);padding:24px;position:relative;transform:translateX(100%);transition:transform 0.25s ease-out;}
      .oa-word-modal-backdrop.oa-word-sidebar-visible .oa-word-modal{transform:translateX(0);}
      .oa-word-modal .oa-word-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#22D3EE;margin:0 0 4px;}
      .oa-word-modal h2{margin:0 0 8px;font-size:1.5rem;font-weight:700;color:#0F172A;}
      .oa-word-modal .oa-word-pronunciation{margin:0 0 16px;font-size:14px;font-style:italic;color:#64748b;}
      .oa-word-modal .oa-def-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#22D3EE;margin:0 0 4px;}
      .oa-word-modal .oa-word-def{margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155;white-space:pre-wrap;}
      .oa-word-modal .oa-word-audio{display:flex;gap:10px;flex-wrap:wrap;}
      .oa-word-modal .oa-btn-audio{padding:10px 16px;border-radius:10px;border:1px solid #22D3EE;background:#f0fdfa;color:#0e7490;cursor:pointer;font-size:14px;font-weight:500;}
      .oa-word-modal .oa-btn-audio:hover{background:#ccfbf1;}
      .oa-word-modal .oa-btn-audio:focus-visible{outline:2px solid #22D3EE;outline-offset:2px;}
      .oa-word-modal .oa-close-modal{position:absolute;top:16px;right:16px;width:36px;height:36px;padding:0;background:#f1f5f9;border:none;border-radius:10px;cursor:pointer;font-size:20px;line-height:1;color:#475569;}
      .oa-word-modal .oa-close-modal:hover{background:#e2e8f0;}
      body.oa-widget-dark .oa-word-modal-backdrop{background:rgba(0,0,0,0.7);}
      body.oa-widget-dark .oa-word-modal{background:#1e293b;box-shadow:0 24px 48px rgba(0,0,0,0.5);}
      body.oa-widget-dark .oa-word-modal .oa-word-label,body.oa-widget-dark .oa-word-modal .oa-def-label{color:#67e8f9;}
      body.oa-widget-dark .oa-word-modal h2{color:#f1f5f9;}
      body.oa-widget-dark .oa-word-modal .oa-word-pronunciation{color:#94a3b8;}
      body.oa-widget-dark .oa-word-modal .oa-word-def{color:#cbd5e1;}
      body.oa-widget-dark .oa-word-modal .oa-btn-audio{background:#334155;border-color:#67e8f9;color:#67e8f9;}
      body.oa-widget-dark .oa-word-modal .oa-btn-audio:hover{background:#475569;}
      body.oa-widget-dark .oa-word-modal .oa-close-modal{background:#334155;color:#cbd5e1;}
      body.oa-widget-dark .oa-word-modal .oa-close-modal:hover{background:#475569;}
      .oa-panel-footer{margin-top:0;padding:16px 20px;text-align:center;font-size:12px;background:linear-gradient(135deg,#0F172A 0%,#1e293b 100%);color:#fff;border-radius:0 0 16px 16px;}
      .oa-panel-footer a{color:#22D3EE;text-decoration:none;}
      .oa-panel-footer a:hover{text-decoration:underline;color:#67e8f9;}
      .oa-panel-footer .oa-account-badge{display:inline-block;margin-top:4px;padding:2px 8px;border-radius:6px;background:rgba(255,255,255,0.15);color:#e2e8f0;font-size:11px;}
      .oa-panel-footer .oa-account-badge-hidden{display:none;}
      .oa-voice-nav-hint{margin:4px 0 0;font-size:12px;color:#64748b;}
      .oa-btn-test-voice{margin-top:4px;}
      body.oa-widget-dark .oa-voice-nav-hint{color:#94a3b8;}
    `;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
  }

  // Inject SVG filters for color-blindness modes (protanopia, deuteranopia, tritanopia).
  function ensureSvgFilters() {
    let svg = document.getElementById('openaccessible-filters');
    if (svg) return;
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'openaccessible-filters';
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;';
    svg.innerHTML = `
      <defs>
        <filter id="oa-protanopia"><feColorMatrix type="matrix" values="0.567,0.433,0,0,0 0.558,0.442,0,0,0 0,0.242,0.758,0,0 0,0,0,1,0"/></filter>
        <filter id="oa-deuteranopia"><feColorMatrix type="matrix" values="0.625,0.375,0,0,0 0.7,0.3,0,0,0 0,0.3,0.7,0,0 0,0,0,1,0"/></filter>
        <filter id="oa-tritanopia"><feColorMatrix type="matrix" values="0.95,0.05,0,0,0 0,0.433,0.567,0,0 0,0.475,0.525,0,0 0,0,0,1,0"/></filter>
      </defs>
    `;
    document.body.appendChild(svg);
  }

  // --- Apply current state to document (colors, font size, dyslexia font, etc.) ---
  function applyToDocument() {
    if (!$root) $root = document.documentElement;
    $root.classList.add('openaccessible-widget-root');
    $root.style.setProperty('font-size', state.fontSize + '%');
    $root.style.setProperty('filter', state.contrast !== 1 ? `contrast(${state.contrast})` : '');
    $root.dataset.oaAlign = state.textAlign || '';

    ['grayscale','invert','sepia','protanopia','deuteranopia','tritanopia','dark','light'].forEach(c => $root.classList.remove('oa-color-' + c));
    if (state.colorFilter && state.colorFilter !== 'none') $root.classList.add('oa-color-' + state.colorFilter);

    $root.classList.toggle('oa-dyslexia', !!state.dyslexiaFont);
    if (state.dyslexiaFont) loadDyslexiaFont();
    var panel = document.getElementById('openaccessible-panel');
    if (panel) panel.classList.toggle('oa-dyslexia', !!state.dyslexiaFont);
    $root.classList.toggle('oa-highlight-links', !!state.highlightLinks);
    $root.classList.toggle('oa-highlight-headings', !!state.highlightHeadings);
    $root.classList.toggle('oa-focus-visible', !!state.highlightFocus);
    $root.classList.toggle('oa-underline-links', !!state.underlineLinks);
    $root.classList.toggle('oa-reduce-motion', !!state.reduceMotion);
    $root.classList.toggle('oa-reading-guide', !!state.readingGuide);
    $root.classList.toggle('oa-ls-wide', state.letterSpacing === 'wide');
    $root.classList.toggle('oa-ls-wider', state.letterSpacing === 'wider');
    $root.classList.toggle('oa-lh-relaxed', state.lineHeight === 'relaxed');
    $root.classList.toggle('oa-lh-loose', state.lineHeight === 'loose');
    $root.classList.toggle('oa-ws-wide', state.wordSpacing === 'wide');
    $root.classList.toggle('oa-monospace', !!state.monospaceFont);
    $root.classList.toggle('oa-focus-strip', !!state.focusStrip);
    $root.classList.toggle('oa-enlarge-focus', !!state.enlargeFocus);
    $root.classList.toggle('oa-show-link-url', !!state.showLinkUrl);
    $root.classList.toggle('oa-reduce-transparency', !!state.reduceTransparency);
    $root.classList.toggle('oa-highlight-forms', !!state.highlightForms);
    $root.classList.remove('oa-content-narrow', 'oa-content-narrower');
    if (state.contentWidth === 'narrow') $root.classList.add('oa-content-narrow');
    if (state.contentWidth === 'narrower') $root.classList.add('oa-content-narrower');

    if (state.focusStrip) ensureFocusStripMask();
    else removeFocusStripMask();
    if (state.readingGuide) {
      $root.style.setProperty('--oa-guide-y', (state.readingGuidePos || 0) + 'px');
    }

    document.body.classList.remove('oa-cursor-large', 'oa-cursor-xl');
    if (state.cursorSize === 'large') document.body.classList.add('oa-cursor-large');
    if (state.cursorSize === 'xl') document.body.classList.add('oa-cursor-xl');

    if (state.colorFilter && ['protanopia','deuteranopia','tritanopia'].includes(state.colorFilter)) ensureSvgFilters();

    document.body.classList.remove('oa-widget-dark', 'oa-widget-light');
    if (state.colorFilter === 'dark') document.body.classList.add('oa-widget-dark');
    if (state.colorFilter === 'light') document.body.classList.add('oa-widget-light');
    initLinkUrlOnFocus();
    applyFormLabelHints($root);
  }

  // Load OpenDyslexic font stylesheet when dyslexia font is enabled.
  function loadDyslexiaFont() {
    if (document.getElementById('openaccessible-dyslexia-font')) return;
    const link = document.createElement('link');
    link.id = 'openaccessible-dyslexia-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.cdnfonts.com/css/open-dyslexic';
    link.onerror = function () {
      document.documentElement.style.setProperty('--oa-dyslexia-font', '"Comic Sans MS", sans-serif');
    };
    document.head.appendChild(link);
  }

  // --- Sync panel controls (checkboxes, ranges, selects) from state ---
  // Update all panel form controls to match current state (e.g. after load or reset).
  function syncPanelFromState() {
    if (!$panel) return;
    const get = (name) => $panel.querySelector(`[data-oa-opt="${name}"]`);
    const set = (name, value) => {
      const el = get(name);
      if (!el) return;
      if (el.type === 'checkbox') el.checked = !!value;
      else if (el.type === 'range') el.value = value;
      else el.value = value || '';
    };
    set('colorFilter', state.colorFilter);
    set('dyslexiaFont', state.dyslexiaFont);
    set('contrast', state.contrast);
    set('fontSize', state.fontSize);
    set('cursorSize', state.cursorSize);
    set('highlightLinks', state.highlightLinks);
    set('highlightHeadings', state.highlightHeadings);
    set('highlightFocus', state.highlightFocus);
    set('ttsEnabled', state.ttsEnabled);
    set('ttsMuted', state.ttsMuted);
    set('ttsRate', state.ttsRate);
    set('ttsPitch', state.ttsPitch);
    set('ttsVoice', state.ttsVoice);
    set('textAlign', state.textAlign);
    set('language', state.language);
    set('reduceMotion', state.reduceMotion);
    set('underlineLinks', state.underlineLinks);
    set('readingGuide', state.readingGuide);
    set('voiceNavigationEnabled', state.voiceNavigationEnabled);
    set('toolbarPosition', state.toolbarPosition);
    set('dictionaryEnabled', state.dictionaryEnabled);
    set('screenReaderHints', state.screenReaderHints);
    set('letterSpacing', state.letterSpacing);
    set('lineHeight', state.lineHeight);
    set('wordSpacing', state.wordSpacing);
    set('highlightAsRead', state.highlightAsRead);
    set('translateTargetLang', state.translateTargetLang);
    set('monospaceFont', state.monospaceFont);
    set('focusStrip', state.focusStrip);
    set('simplifiedWords', state.simplifiedWords);
    set('enlargeFocus', state.enlargeFocus);
    set('showLinkUrl', state.showLinkUrl);
    set('reduceTransparency', state.reduceTransparency);
    set('highlightForms', state.highlightForms);
    set('contentWidth', state.contentWidth);
  }

  // Read panel form values into state, persist, apply to document, and sync voice nav.
  function applyFromPanel() {
    if (!$panel) return;
    const get = (name, asNumber) => {
      const el = $panel.querySelector(`[data-oa-opt="${name}"]`);
      if (!el) return undefined;
      if (el.type === 'checkbox') return el.checked;
      if (asNumber || el.type === 'range') return Number(el.value) || 0;
      return el.value || '';
    };
    state.colorFilter = get('colorFilter') || 'none';
    state.dyslexiaFont = get('dyslexiaFont');
    state.contrast = parseFloat(get('contrast', true)) || 1;
    state.fontSize = parseInt(get('fontSize', true), 10) || 100;
    state.cursorSize = get('cursorSize') || 'default';
    state.highlightLinks = get('highlightLinks');
    state.highlightHeadings = get('highlightHeadings');
    state.highlightFocus = get('highlightFocus');
    state.ttsEnabled = get('ttsEnabled');
    state.ttsMuted = get('ttsMuted');
    state.ttsRate = parseFloat(get('ttsRate', true)) || 1;
    state.ttsPitch = parseFloat(get('ttsPitch', true)) || 1;
    state.ttsVoice = get('ttsVoice') || null;
    state.textAlign = get('textAlign') || '';
    state.language = get('language') || '';
    state.reduceMotion = get('reduceMotion');
    state.underlineLinks = get('underlineLinks');
    state.readingGuide = get('readingGuide');
    state.voiceNavigationEnabled = get('voiceNavigationEnabled');
    state.toolbarPosition = get('toolbarPosition') || 'bottom-right';
    state.dictionaryEnabled = get('dictionaryEnabled');
    state.screenReaderHints = get('screenReaderHints');
    state.letterSpacing = get('letterSpacing') || 'normal';
    state.lineHeight = get('lineHeight') || 'normal';
    state.wordSpacing = get('wordSpacing') || 'normal';
    state.highlightAsRead = get('highlightAsRead');
    state.translateTargetLang = get('translateTargetLang') || '';
    state.monospaceFont = get('monospaceFont');
    state.focusStrip = get('focusStrip');
    state.simplifiedWords = get('simplifiedWords');
    state.enlargeFocus = get('enlargeFocus');
    state.showLinkUrl = get('showLinkUrl');
    state.reduceTransparency = get('reduceTransparency');
    state.highlightForms = get('highlightForms');
    state.contentWidth = get('contentWidth') || 'full';
    writeStorage();
    applyToDocument();
    updateToolbarPosition();
    ensureVoiceNavigation();
    syncApiPreferences('save');
    emit('change', state);
  }

  // --- Position floating toolbar (top/bottom left/right) ---
  // Set toolbar and panel position from state.toolbarPosition.
  function updateToolbarPosition() {
    const pos = state.toolbarPosition || 'bottom-right';
    if ($panel) $panel.setAttribute('data-pos', pos);
    const tb = document.getElementById('openaccessible-toolbar');
    if (tb) tb.setAttribute('data-pos', pos);
  }

  // Set or clear the toolbar button active state (visual when panel is open).
  function updateToolbarActive(open) {
    const tb = document.getElementById('openaccessible-toolbar');
    const btn = tb && tb.querySelector('[data-oa-open]');
    if (btn) btn.classList.toggle('active', !!open);
  }

  // --- Build settings panel DOM (sections: Reading, Size, Highlight, TTS, Translate, etc.) ---
  // Build the settings panel DOM (once), wire controls to state, fill voice list, add Test voice and voice nav.
  function createPanel() {
    if ($panel) return $panel;
    const pos = state.toolbarPosition || 'bottom-right';
    $panel = document.createElement('div');
    $panel.id = 'openaccessible-panel';
    $panel.className = 'oa-panel';
    $panel.setAttribute('role', 'dialog');
    $panel.setAttribute('aria-label', 'Accessibility settings');
    $panel.setAttribute('data-pos', pos);
    $panel.innerHTML = `
      <div class="oa-panel-header">
        <span class="oa-icon-wrap"></span>
        <h3>Accessibility</h3>
      </div>
      <button type="button" class="oa-close" aria-label="Close panel" data-oa-close>&times;</button>
      <div class="oa-panel-body">
      <div class="oa-section">
        <div class="oa-section-title">Color &amp; contrast</div>
        <div class="oa-opt">
          <label>Filter</label>
          <select data-oa-opt="colorFilter">
            <option value="none">None</option>
            <option value="grayscale">Grayscale</option>
            <option value="invert">Invert</option>
            <option value="sepia">Sepia</option>
            <option value="protanopia">Protanopia</option>
            <option value="deuteranopia">Deuteranopia</option>
            <option value="tritanopia">Tritanopia</option>
            <option value="dark">Dark theme</option>
            <option value="light">Light theme</option>
          </select>
        </div>
        <div class="oa-opt">
          <label>Contrast</label>
          <input type="range" data-oa-opt="contrast" min="1" max="2" step="0.1" value="1">
          <span data-oa-contrast-value>1</span>
        </div>
      </div>

      <div class="oa-section">
        <div class="oa-section-title">Reading &amp; dyslexia</div>
        <div class="oa-opt">
          <input type="checkbox" data-oa-opt="dyslexiaFont" id="oa-dyslexia">
          <label for="oa-dyslexia">OpenDyslexic font</label>
        </div>
        <div class="oa-opt">
          <input type="checkbox" data-oa-opt="simplifiedWords" id="oa-simplify">
          <label for="oa-simplify">Simplify words (readability)</label>
        </div>
        <div class="oa-opt">
          <input type="checkbox" data-oa-opt="dictionaryEnabled" id="oa-dict">
          <label for="oa-dict">Dictionary (double-click word)</label>
        </div>
        <div class="oa-opt" style="margin-top:4px;">
          <span style="font-size:12px;color:#64748b;">Double-click a word to open a modal with the word, definition, and audio to hear the word or definition.</span>
        </div>
        <div class="oa-opt">
          <label>Letter spacing</label>
          <select data-oa-opt="letterSpacing">
            <option value="normal">Normal</option>
            <option value="wide">Wide</option>
            <option value="wider">Wider</option>
          </select>
        </div>
        <div class="oa-opt">
          <label>Line height</label>
          <select data-oa-opt="lineHeight">
            <option value="normal">Normal</option>
            <option value="relaxed">Relaxed</option>
            <option value="loose">Loose</option>
          </select>
        </div>
        <div class="oa-opt">
          <label>Word spacing</label>
          <select data-oa-opt="wordSpacing">
            <option value="normal">Normal</option>
            <option value="wide">Wide</option>
          </select>
        </div>
      </div>

      <div class="oa-section">
        <div class="oa-section-title">Size &amp; cursor</div>
        <div class="oa-opt">
          <label>Font size %</label>
          <input type="range" data-oa-opt="fontSize" min="80" max="150" step="5" value="100">
          <span data-oa-font-value>100</span>
        </div>
        <div class="oa-opt">
          <label>Cursor</label>
          <select data-oa-opt="cursorSize">
            <option value="default">Default</option>
            <option value="large">Large</option>
            <option value="xl">Extra large</option>
          </select>
        </div>
      </div>

      <div class="oa-section">
        <div class="oa-section-title">Highlight &amp; focus</div>
        <div class="oa-opt">
          <input type="checkbox" data-oa-opt="highlightLinks" id="oa-hlinks">
          <label for="oa-hlinks">Highlight links</label>
        </div>
        <div class="oa-opt">
          <input type="checkbox" data-oa-opt="highlightHeadings" id="oa-hhead">
          <label for="oa-hhead">Highlight headings</label>
        </div>
        <div class="oa-opt">
          <input type="checkbox" data-oa-opt="highlightFocus" id="oa-hfocus" checked>
          <label for="oa-hfocus">Highlight focus</label>
        </div>
        <div class="oa-opt">
          <input type="checkbox" data-oa-opt="underlineLinks" id="oa-ulinks">
          <label for="oa-ulinks">Underline links</label>
        </div>
      </div>

      <div class="oa-section">
        <div class="oa-section-title">Text-to-Speech</div>
        <div class="oa-opt">
          <input type="checkbox" data-oa-opt="ttsEnabled" id="oa-tts">
          <label for="oa-tts">Enable TTS</label>
        </div>
        <div class="oa-opt">
          <input type="checkbox" data-oa-opt="ttsMuted" id="oa-tts-muted">
          <label for="oa-tts-muted">Mute sound</label>
        </div>
        <div class="oa-opt">
          <input type="checkbox" data-oa-opt="highlightAsRead" id="oa-highlight-read">
          <label for="oa-highlight-read">Highlight words as you read</label>
        </div>
        <div class="oa-opt">
          <label>Rate</label>
          <input type="range" data-oa-opt="ttsRate" min="0.5" max="2" step="0.1" value="1">
        </div>
        <div class="oa-opt">
          <label>Pitch</label>
          <input type="range" data-oa-opt="ttsPitch" min="0.5" max="2" step="0.1" value="1">
        </div>
        <div class="oa-opt oa-opt-voice-row">
          <label>Voice</label>
          <select data-oa-opt="ttsVoice"><option value="">Default</option></select>
        </div>
        <div class="oa-opt">
          <button type="button" class="oa-btn-tts oa-btn-test-voice" data-oa-test-voice aria-label="Play sample with selected voice">Test voice</button>
        </div>
        <div class="oa-tts-actions">
          <button type="button" class="oa-btn-tts" data-oa-tts-read aria-label="Read page">Read</button>
          <button type="button" class="oa-btn-tts" data-oa-tts-stop aria-label="Stop">Stop</button>
          <button type="button" class="oa-btn-tts" data-oa-speak-selection aria-label="Speak selection">Speak selection</button>
        </div>
      </div>
      <div class="oa-section">
        <div class="oa-section-title">Voice navigation</div>
        <div class="oa-opt">
          <input type="checkbox" data-oa-opt="voiceNavigationEnabled" id="oa-voice-nav">
          <label for="oa-voice-nav">Enable voice commands (e.g. &quot;Open accessibility&quot;, &quot;Read page&quot;, &quot;Stop&quot;)</label>
        </div>
        <p class="oa-voice-nav-hint">Say: open/close accessibility, read page, stop, speak selection, next heading, show headings.</p>
      </div>

      <div class="oa-section">
        <div class="oa-section-title">Translate</div>
        <div class="oa-opt">
          <label>Translate to</label>
          <select data-oa-opt="translateTargetLang">
            <option value="">Off</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="pt">Portuguese</option>
            <option value="ar">Arabic</option>
            <option value="zh">Chinese</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="hi">Hindi</option>
            <option value="nl">Dutch</option>
            <option value="ru">Russian</option>
          </select>
        </div>
        <div class="oa-tts-actions">
          <button type="button" class="oa-btn-tts" data-oa-translate-selection aria-label="Translate selection">Translate selection</button>
          <button type="button" class="oa-btn-tts" data-oa-translate-page aria-label="Translate page">Translate page</button>
        </div>
      </div>

      <div class="oa-section">
        <div class="oa-section-title">Text alignment</div>
        <div class="oa-opt">
          <select data-oa-opt="textAlign">
            <option value="">Default</option>
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
            <option value="justify">Justify</option>
          </select>
        </div>
      </div>

      <div class="oa-section">
        <div class="oa-section-title">Language</div>
        <div class="oa-opt">
          <select data-oa-opt="language">
            <option value="">Default</option>
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="pt">Portuguese</option>
            <option value="ar">Arabic</option>
            <option value="zh">Chinese</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
          </select>
        </div>
      </div>

      <div class="oa-section">
        <div class="oa-section-title">Presets</div>
        <div class="oa-preset-select-wrap">
          <select data-oa-preset-select aria-label="Apply preset">
            <option value="">Apply a preset…</option>
            <option value="high-contrast">High contrast</option>
            <option value="reading">Reading</option>
            <option value="minimal">Minimal</option>
            <option value="focus">Focus &amp; visibility</option>
          </select>
        </div>
        <div class="oa-tts-actions" style="margin-top:8px">
          <button type="button" class="oa-btn-tts" data-oa-preset-spacing>More spacing</button>
          <button type="button" class="oa-btn-tts" data-oa-preset-contrast>High contrast</button>
        </div>
      </div>

      <div class="oa-section">
        <div class="oa-section-title">Navigation</div>
        <div class="oa-tts-actions">
          <button type="button" class="oa-btn-tts" data-oa-headings>Headings</button>
          <button type="button" class="oa-btn-tts" data-oa-images>Image descriptions</button>
        </div>
      </div>

      <div class="oa-section">
        <div class="oa-section-title">Visibility &amp; focus</div>
        <div class="oa-opt">
          <input type="checkbox" data-oa-opt="enlargeFocus" id="oa-enlarge-focus">
          <label for="oa-enlarge-focus">Enlarge focus indicator</label>
        </div>
        <div class="oa-opt">
          <input type="checkbox" data-oa-opt="showLinkUrl" id="oa-show-link-url">
          <label for="oa-show-link-url">Show link URL on focus</label>
        </div>
        <div class="oa-opt">
          <input type="checkbox" data-oa-opt="reduceTransparency" id="oa-reduce-transparency">
          <label for="oa-reduce-transparency">Reduce transparency</label>
        </div>
        <div class="oa-opt">
          <input type="checkbox" data-oa-opt="highlightForms" id="oa-highlight-forms">
          <label for="oa-highlight-forms">Highlight form fields</label>
        </div>
      </div>

      <div class="oa-section">
        <div class="oa-section-title">Layout</div>
        <div class="oa-opt">
          <label>Content width</label>
          <select data-oa-opt="contentWidth">
            <option value="full">Full</option>
            <option value="narrow">Narrow (65ch)</option>
            <option value="narrower">Narrower (45ch)</option>
          </select>
        </div>
      </div>

      <div class="oa-section">
        <div class="oa-section-title">More</div>
        <div class="oa-opt">
          <input type="checkbox" data-oa-opt="monospaceFont" id="oa-mono">
          <label for="oa-mono">Monospace font</label>
        </div>
        <div class="oa-opt">
          <input type="checkbox" data-oa-opt="focusStrip" id="oa-focus-strip">
          <label for="oa-focus-strip">Focus strip (dim except line)</label>
        </div>
        <div class="oa-opt">
          <input type="checkbox" data-oa-opt="reduceMotion" id="oa-motion">
          <label for="oa-motion">Reduce motion</label>
        </div>
        <div class="oa-opt">
          <input type="checkbox" data-oa-opt="readingGuide" id="oa-guide">
          <label for="oa-guide">Reading guide</label>
        </div>
        <div class="oa-opt">
          <input type="checkbox" data-oa-opt="screenReaderHints" id="oa-sr" checked>
          <label for="oa-sr">Screen reader / Braille hints</label>
        </div>
        <div class="oa-opt">
          <label>Toolbar position</label>
          <select data-oa-opt="toolbarPosition">
            <option value="bottom-right">Bottom right</option>
            <option value="bottom-left">Bottom left</option>
            <option value="top-right">Top right</option>
            <option value="top-left">Top left</option>
          </select>
        </div>
      </div>

      <div class="oa-section">
        <div class="oa-section-title">Settings</div>
        <div class="oa-tts-actions">
          <button type="button" class="oa-btn-tts" data-oa-export>Export settings</button>
          <button type="button" class="oa-btn-tts" data-oa-import>Import settings</button>
          <button type="button" class="oa-btn-tts" data-oa-shortcuts aria-label="Keyboard shortcuts">Keyboard shortcuts</button>
          <button type="button" class="oa-btn-tts" data-oa-about aria-label="About">About</button>
        </div>
        <input type="file" accept=".json,application/json" data-oa-import-file style="display:none">
        <p class="oa-shortcut-hint" style="margin:8px 0 0;font-size:12px;color:#64748b;">Keyboard: Windows Alt+A, Mac Option+A to open/close. Escape to close. Tab to move, Enter or Space to activate. In panel: R = Read page, S = Stop.</p>
      </div>

      <div class="oa-section">
        <button type="button" class="oa-reset" data-oa-reset>Reset all</button>
      </div>
      </div>
      <div class="oa-panel-footer" id="oa-panel-footer">
        <a href="https://yacoubians.com/pages/accessibility" target="_blank" rel="noopener noreferrer">Yacoubians Accessibility Statement</a>
        <br>
        <a href="https://openaccessible.com" target="_blank" rel="noopener noreferrer">Powered by OpenAccessible</a>
        <div class="oa-account-badge oa-account-badge-hidden" id="oa-account-badge" aria-hidden="true">Account linked</div>
      </div>
    `;

    $panel.querySelector('.oa-icon-wrap').appendChild(renderIcon('oa-icon'));
    $panel.querySelector('[data-oa-close]').addEventListener('click', function () { togglePanel(false); updateToolbarActive(false); });
    $panel.querySelector('[data-oa-reset]').addEventListener('click', reset);
    $panel.querySelector('[data-oa-tts-read]').addEventListener('click', readPageWithTTS);
    $panel.querySelector('[data-oa-tts-stop]').addEventListener('click', stopTTS);
    $panel.querySelector('[data-oa-speak-selection]').addEventListener('click', speakSelection);
    $panel.querySelector('[data-oa-translate-selection]').addEventListener('click', translateSelection);
    $panel.querySelector('[data-oa-translate-page]').addEventListener('click', translatePage);
    $panel.querySelector('[data-oa-preset-spacing]').addEventListener('click', applyMoreSpacingPreset);
    $panel.querySelector('[data-oa-preset-contrast]').addEventListener('click', applyHighContrastPreset);
    var presetSelect = $panel.querySelector('[data-oa-preset-select]');
    if (presetSelect) {
      presetSelect.addEventListener('change', function () {
        var val = this.value;
        if (val) { applyPreset(val); this.value = ''; }
      });
      function fillPresetSelect() {
        var opts = presetSelect.querySelectorAll('option');
        for (var i = opts.length - 1; i >= 1; i--) opts[i].remove();
        getSavedPresets().forEach(function (p) {
          var o = document.createElement('option');
          o.value = p.id;
          o.textContent = p.name;
          presetSelect.appendChild(o);
        });
      }
      fillPresetSelect();
    }
    $panel.querySelector('[data-oa-headings]').addEventListener('click', showHeadingsOutline);
    $panel.querySelector('[data-oa-images]').addEventListener('click', showImageDescriptions);
    $panel.querySelector('[data-oa-export]').addEventListener('click', exportSettings);
    $panel.querySelector('[data-oa-import]').addEventListener('click', function () { $panel.querySelector('[data-oa-import-file]').click(); });
$panel.querySelector('[data-oa-import-file]').addEventListener('change', importSettingsFromFile);
    var shortcutsBtn = $panel.querySelector('[data-oa-shortcuts]');
    if (shortcutsBtn) shortcutsBtn.addEventListener('click', showKeyboardShortcuts);
    var aboutBtn = $panel.querySelector('[data-oa-about]');
    if (aboutBtn) aboutBtn.addEventListener('click', showAbout);

    $panel.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('change', applyFromPanel);
      el.addEventListener('input', function () {
        if (this.type === 'range') {
          const v = this.dataset.oaOpt;
          if (v === 'contrast') ($panel.querySelector('[data-oa-contrast-value]') || {}).textContent = this.value;
          if (v === 'fontSize') ($panel.querySelector('[data-oa-font-value]') || {}).textContent = this.value;
        }
        applyFromPanel();
      });
    });

    document.body.appendChild($panel);
    if (state.dyslexiaFont) $panel.classList.add('oa-dyslexia');

    const voiceSelect = $panel.querySelector('[data-oa-opt="ttsVoice"]');
    if (voiceSelect && global.speechSynthesis) {
      // Populate voice dropdown: sort by language, group in optgroups, preserve selection
      function fillVoices() {
        const voices = global.speechSynthesis.getVoices().slice();
        voiceSelect.innerHTML = '<option value="">Default</option>';
        if (voices.length === 0) return;
        voices.sort(function (a, b) {
          const la = (a.lang || '').toLowerCase();
          const lb = (b.lang || '').toLowerCase();
          if (la !== lb) return la.localeCompare(lb);
          return (a.name || '').localeCompare(b.name || '');
        });
        const byLang = {};
        voices.forEach(function (v) {
          const lang = v.lang || 'other';
          if (!byLang[lang]) byLang[lang] = [];
          byLang[lang].push(v);
        });
        Object.keys(byLang).sort().forEach(function (lang) {
          const group = document.createElement('optgroup');
          group.label = lang;
          byLang[lang].forEach(function (v) {
            const o = document.createElement('option');
            o.value = v.name;
            o.textContent = v.name + (v.lang ? ' (' + v.lang + ')' : '');
            group.appendChild(o);
          });
          voiceSelect.appendChild(group);
        });
        if (state.ttsVoice) voiceSelect.value = state.ttsVoice;
      }
      fillVoices();
      if (global.speechSynthesis.onvoiceschanged !== undefined) global.speechSynthesis.onvoiceschanged = fillVoices;
    }
    var langSelect = $panel.querySelector('[data-oa-opt="language"]');
    if (langSelect) {
      langSelect.innerHTML = '';
      langSelect.appendChild(buildLanguageOptions(true));
      if (state.language) langSelect.value = state.language;
    }
    var translateSelect = $panel.querySelector('[data-oa-opt="translateTargetLang"]');
    if (translateSelect) {
      translateSelect.innerHTML = '';
      translateSelect.appendChild(buildLanguageOptions(true));
      if (state.translateTargetLang) translateSelect.value = state.translateTargetLang;
    }
    var testVoiceBtn = $panel.querySelector('[data-oa-test-voice]');
    if (testVoiceBtn) testVoiceBtn.addEventListener('click', testVoice);

    syncPanelFromState();
    updateFooterAccountBadge();
    return $panel;
  }

  // --- Check OpenAccessible.com for valid account/token and show "Account linked" in footer ---
  // Verify apiKey with account endpoint and set hasOpenAccessibleAccount for footer badge.
  function checkOpenAccessibleAccount() {
    if (!apiKey || !accountVerifyUrl) return;
    var url = accountVerifyUrl.replace(/\?.*$/, '') + (accountVerifyUrl.indexOf('?') >= 0 ? '&' : '?') + 'token=' + encodeURIComponent(apiKey);
    fetch(url, { method: 'GET', headers: { 'X-API-Key': apiKey } })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && (data.valid === true || data.account === true || data.authenticated === true)) {
          hasOpenAccessibleAccount = true;
          updateFooterAccountBadge();
        }
      })
      .catch(function () {});
  }

  // Show or hide the "Account linked" badge in panel footer based on hasOpenAccessibleAccount.
  function updateFooterAccountBadge() {
    var badge = document.getElementById('oa-account-badge');
    if (!badge) return;
    if (hasOpenAccessibleAccount) {
      badge.classList.remove('oa-account-badge-hidden');
      badge.setAttribute('aria-hidden', 'false');
    } else {
      badge.classList.add('oa-account-badge-hidden');
      badge.setAttribute('aria-hidden', 'true');
    }
  }

  // --- Floating toolbar (open panel button, position from state) ---
  // Create the floating toolbar with single button to open/close panel (once per page).
  function createToolbar() {
    if (document.getElementById('openaccessible-toolbar')) return;
    const pos = state.toolbarPosition || 'bottom-right';
    const bar = document.createElement('div');
    bar.id = 'openaccessible-toolbar';
    bar.className = 'oa-toolbar';
    bar.setAttribute('data-pos', pos);
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Accessibility');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'oa-toolbar-btn';
    btn.setAttribute('aria-label', 'Open accessibility settings');
    btn.setAttribute('title', 'Accessibility');
    btn.setAttribute('data-oa-open', '');
    btn.appendChild(renderIcon('oa-icon'));
    btn.addEventListener('click', function () {
      const open = (document.getElementById('openaccessible-panel') || {}).style.display !== 'block';
      togglePanel(open);
      btn.classList.toggle('active', open);
    });
    bar.appendChild(btn);
    document.body.appendChild(bar);
  }

  // Return list of focusable elements in the panel for keyboard nav and focus trap.
  function getPanelFocusables(panel) {
    if (!panel) return [];
    var sel = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.prototype.filter.call(panel.querySelectorAll(sel), function (el) { return el.offsetParent !== null || el === document.activeElement; });
  }
  // Trap focus inside panel (Tab wraps last→first, Shift+Tab first→last) and add R/S shortcuts for Read/Stop.
  function setupPanelFocusTrap(panel) {
    if (!panel || panel.getAttribute('data-oa-focus-trap') === 'true') return;
    panel.setAttribute('data-oa-focus-trap', 'true');
    panel.addEventListener('keydown', function (e) {
      if (panel.style.display !== 'block') return;
      var target = e.target;
      var inInput = target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA');
      if (e.key === 'Tab') {
        var focusables = getPanelFocusables(panel);
        if (focusables.length === 0) return;
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
        return;
      }
      if (!inInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        var k = e.key.toLowerCase();
        if (k === 'r') { e.preventDefault(); readPageWithTTS(); return; }
        if (k === 's') { e.preventDefault(); stopTTS(); return; }
      }
    });
  }
  // Show or hide the settings panel; focus first control when opening; update toolbar active state.
  function togglePanel(open) {
    const panel = document.getElementById('openaccessible-panel');
    if (!panel) createPanel();
    const p = document.getElementById('openaccessible-panel');
    if (open) {
      p.style.display = 'block';
      setupPanelFocusTrap(p);
      syncPanelFromState();
      updateToolbarActive(true);
      const first = p.querySelector('.oa-close, [data-oa-opt]');
      if (first && first.focus) first.focus();
    } else {
      p.style.display = 'none';
      updateToolbarActive(false);
    }
    emit('panel', { open: !!open });
  }

  // Reset all preferences to defaults, re-apply, and sync panel.
  function reset() {
    state = { ...defaultState };
    writeStorage();
    applyToDocument();
    syncPanelFromState();
    updateToolbarPosition();
    syncApiPreferences('save');
    emit('reset', state);
  }

  // --- TTS: split long text into chunks for server (sentence boundaries when possible) ---
  // Split text into chunks of maxLen, breaking at sentence end when possible for natural server TTS.
  function chunkTextForTts(text, maxLen) {
    maxLen = maxLen || 500;
    const chunks = [];
    let rest = text.replace(/\s+/g, ' ').trim();
    while (rest.length > 0) {
      if (rest.length <= maxLen) {
        chunks.push(rest);
        break;
      }
      const slice = rest.slice(0, maxLen);
      const lastPeriod = slice.lastIndexOf('.');
      const lastQuestion = slice.lastIndexOf('?');
      const lastExclaim = slice.lastIndexOf('!');
      const lastBreak = Math.max(lastPeriod, lastQuestion, lastExclaim);
      const splitAt = lastBreak > maxLen >> 1 ? lastBreak + 1 : maxLen;
      chunks.push(rest.slice(0, splitAt).trim());
      rest = rest.slice(splitAt).trim();
    }
    return chunks.filter(Boolean);
  }

  // --- TTS: play next chunk from server queue ---
  // Play the next chunk in serverTtsQueue; respects mute and aborts; advances queue or emits tts:stop when done.
  function playNextServerTts() {
    if (serverTtsQueue.length === 0 || serverTtsAbort) {
      serverTtsAudio = null;
      emit('tts:stop', {});
      return;
    }
    if (isTtsMuted()) {
      serverTtsQueue.length = 0;
      serverTtsAudio = null;
      emit('tts:stop', {});
      return;
    }
    const text = serverTtsQueue.shift();
    requestServerTts(text, function (url) {
      if (serverTtsAbort) return;
      if (isTtsMuted()) { serverTtsAudio = null; emit('tts:stop', {}); return; }
      if (!url) {
        playNextServerTts();
        return;
      }
      const audio = new Audio(url);
      serverTtsAudio = audio;
      audio.onended = audio.onerror = function () { playNextServerTts(); };
      audio.play().catch(function () { playNextServerTts(); });
    });
  }

  // --- TTS: request audio URL from API (action=tts), then onUrl(url) or onUrl(null) ---
  // Request server TTS for text; onUrl is called with the audio URL or null on failure.
  function requestServerTts(text, onUrl) {
    if (!apiBase || !text.trim()) { if (onUrl) onUrl(null); return; }
    const url = apiBase.replace(/\?.*$/, '') + '?action=tts';
    const opts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text.slice(0, 3000),
        lang: state.language || document.documentElement.lang || 'en',
        rate: state.ttsRate || 1
      })
    };
    if (apiKey) opts.headers['X-API-Key'] = apiKey;
    const ac = new AbortController();
    serverTtsAbort = function () { ac.abort(); };
    fetch(url, { ...opts, signal: ac.signal })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.url) onUrl(data.url);
        else if (onUrl) onUrl(null);
      })
      .catch(function () { if (onUrl) onUrl(null); });
  }

// True when user has muted sound; all TTS/audio should skip playback (Test voice is exempt).
  function isTtsMuted() { return !!state.ttsMuted; }

  // Ensure state.ttsVoice is current from panel (in case change event didn't fire).
  function syncTtsVoiceFromPanel() {
    if (!$panel) return;
    const sel = $panel.querySelector('[data-oa-opt="ttsVoice"]');
    if (sel) state.ttsVoice = (sel.value && sel.value.trim()) ? sel.value.trim() : null;
  }

  // Return the SpeechSynthesisVoice for state.ttsVoice, or null.
  function getTtsVoiceObject() {
    if (!global.speechSynthesis || !global.speechSynthesis.getVoices) return null;
    syncTtsVoiceFromPanel();
    if (!state.ttsVoice) return null;
    const voices = global.speechSynthesis.getVoices();
    return voices.find(function (x) { return x.name === state.ttsVoice; }) || null;
  }

  // Apply current TTS options (rate, pitch, lang, voice) to an utterance.
  function applyTtsOptionsToUtterance(u) {
    u.rate = state.ttsRate || 1;
    u.pitch = state.ttsPitch || 1;
    u.lang = state.language || document.documentElement.lang || 'en';
    var v = getTtsVoiceObject();
    if (v) u.voice = v;
  }

  // --- TTS: stop all playback (server queue + browser SpeechSynthesis) ---
  // Cancel server queue, stop any playing server audio, cancel SpeechSynthesis, close reading view.
  function stopTTS() {
    serverTtsAbort = true;
    serverTtsQueue = [];
    if (serverTtsAudio) {
      try { serverTtsAudio.pause(); serverTtsAudio.currentTime = 0; } catch (_) {}
      serverTtsAudio = null;
    }
    if (global.speechSynthesis) global.speechSynthesis.cancel();
    ttsUtterance = null;
    closeReadingView();
    emit('tts:stop', {});
  }

  // Speak the text of element el (when TTS enabled or data-oa-tts-force); respects mute.
  function speakElement(el) {
    if (!state.ttsEnabled && !el.hasAttribute('data-oa-tts-force')) return;
    if (isTtsMuted()) return;
    stopTTS();
    const text = (el.innerText || el.textContent || '').trim().slice(0, 5000);
    if (!text) return;
    if (useServerTts && apiBase) {
      serverTtsAbort = null;
      serverTtsQueue = chunkTextForTts(text, 500);
      emit('tts:start', {});
      playNextServerTts();
      return;
    }
if (!global.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    applyTtsOptionsToUtterance(u);
    global.speechSynthesis.speak(u);
  }

  // Speak the current text selection; uses server TTS if configured, else SpeechSynthesis; respects mute.
  function speakSelection() {
    if (isTtsMuted()) return;
    const sel = global.getSelection();
    const text = (sel && sel.toString() || '').trim();
    if (!text) {
      showTooltip(null, 'Select some text first, then click Speak selection.');
      return;
    }
    stopTTS();
    if (useServerTts && apiBase) {
      serverTtsAbort = null;
      serverTtsQueue = chunkTextForTts(text.slice(0, 5000), 500);
      emit('tts:start', {});
      playNextServerTts();
      return;
    }
if (!global.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text.slice(0, 5000));
    applyTtsOptionsToUtterance(u);
    global.speechSynthesis.speak(u);
    emit('tts:start', {});
  }

  // Play a short sample with the currently selected voice/rate/pitch (ignores mute so user can preview).
  function testVoice() {
    if (!global.speechSynthesis) return;
    global.speechSynthesis.cancel();
    var sample = 'This is a sample of the selected voice.';
    var u = new SpeechSynthesisUtterance(sample);
    applyTtsOptionsToUtterance(u);
    global.speechSynthesis.speak(u);
  }

  // --- Voice navigation: SpeechRecognition commands ---
  // Return SpeechRecognition constructor if available (Chrome, Edge, Safari); null otherwise.
  function getSpeechRecognition() {
    return global.SpeechRecognition || global.webkitSpeechRecognition || null;
  }
  // Stop listening and clear the recognition instance.
  function stopVoiceNavigation() {
    if (!voiceRecognition) return;
    try { voiceRecognition.stop(); } catch (_) {}
    voiceRecognition = null;
    voiceRecognitionActive = false;
  }
  // Start continuous speech recognition; match transcript to commands (open/close, read page, stop, etc.).
  function startVoiceNavigation() {
    if (!state.voiceNavigationEnabled) { stopVoiceNavigation(); return; }
    var Recognition = getSpeechRecognition();
    if (!Recognition) return;
    stopVoiceNavigation();
    var rec = new Recognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = state.language || document.documentElement.lang || 'en';
    // Map spoken phrases to actions (open/close panel, read page, stop, speak selection, headings)
    rec.onresult = function (e) {
      if (!e.results || e.results.length === 0) return;
      var last = e.results[e.results.length - 1];
      if (!last.isFinal) return;
      var transcript = (last[0] && last[0].transcript) ? last[0].transcript.trim().toLowerCase() : '';
      if (!transcript) return;
      if (/open\s*(accessibility|panel|settings)?|show\s*(accessibility|panel|settings)?/.test(transcript)) {
        togglePanel(true);
        var tb = document.getElementById('openaccessible-toolbar');
        var btn = tb && tb.querySelector('[data-oa-open]');
        if (btn) btn.classList.add('active');
        return;
      }
      if (/close\s*(accessibility|panel|settings)?|hide\s*(accessibility|panel|settings)?/.test(transcript)) {
        togglePanel(false);
        updateToolbarActive(false);
        return;
      }
      if (/read\s*page|read\s*(the\s*)?page/.test(transcript)) { readPageWithTTS(); return; }
      if (/stop|pause/.test(transcript)) { stopTTS(); return; }
      if (/speak\s*selection|read\s*selection/.test(transcript)) { speakSelection(); return; }
      if (/show\s*headings|headings\s*list/.test(transcript)) { showHeadingsOutline(); return; }
      if (/next\s*heading|previous\s*heading/.test(transcript)) {
        var headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        var current = null;
        for (var i = 0; i < headings.length; i++) {
          if (headings[i] === document.activeElement || headings[i].contains(document.activeElement)) { current = i; break; }
          if (document.activeElement && headings[i].compareDocumentPosition(document.activeElement) & Node.DOCUMENT_POSITION_CONTAINS) current = i;
        }
        if (current === null) current = -1;
        var idx = /next/.test(transcript) ? current + 1 : current - 1;
        if (idx >= 0 && idx < headings.length) headings[idx].focus();
        return;
      }
    };
    rec.onerror = function () {};
    // Restart when browser ends the session (e.g. timeout) so listening continues while enabled
    rec.onend = function () {
      if (state.voiceNavigationEnabled && voiceRecognition === rec) {
        try { rec.start(); } catch (_) {}
      }
    };
    voiceRecognition = rec;
    voiceRecognitionActive = true;
    try { rec.start(); } catch (_) {}
  }
  // Start or stop voice navigation based on state.voiceNavigationEnabled (e.g. after panel change).
  function ensureVoiceNavigation() {
    if (state.voiceNavigationEnabled) startVoiceNavigation();
    else stopVoiceNavigation();
  }

  let selectionBarEl = null;
  // --- Selection bar: Speak / Translate after user selects text ---
  // Show floating bar with Speak and Translate at (x,y) for current selection.
  function showSelectionBar(x, y) {
    hideSelectionBar();
    const bar = document.createElement('div');
    bar.className = 'oa-selection-bar';
    bar.innerHTML = '<button type="button" class="oa-btn-bar" data-oa-bar-speak>Speak</button><button type="button" class="oa-btn-bar" data-oa-bar-translate>Translate</button>';
    bar.style.left = Math.max(10, Math.min(x - 80, global.innerWidth - 200)) + 'px';
    bar.style.top = (y - 48) + 'px';
    bar.querySelector('[data-oa-bar-speak]').addEventListener('click', function () { speakSelection(); hideSelectionBar(); });
    bar.querySelector('[data-oa-bar-translate]').addEventListener('click', function () { translateSelection(); hideSelectionBar(); });
    document.body.appendChild(bar);
    selectionBarEl = bar;
  }
  // Remove the selection bar from the DOM.
  function hideSelectionBar() {
    if (selectionBarEl && selectionBarEl.parentNode) selectionBarEl.remove();
    selectionBarEl = null;
  }

  let readingViewEl = null;
  let readingViewWordSpans = [];
  // Start reading the page with TTS (browser or server); respects mute; uses highlight-as-read view if enabled.
  function readPageWithTTS() {
    if (isTtsMuted()) return;
    stopTTS();
    const text = (document.body.innerText || document.body.textContent || '').trim();
    if (!text) return;
    const max = 20000;
    const toSpeak = text.slice(0, max);
    if (state.highlightAsRead && global.speechSynthesis && !useServerTts) {
      openReadingViewAndSpeak(toSpeak);
      return;
    }
    if (useServerTts && apiBase) {
      serverTtsAbort = null;
      serverTtsQueue = chunkTextForTts(toSpeak, 500);
      emit('tts:start', {});
      playNextServerTts();
      return;
    }
    if (!global.speechSynthesis) return;
    ttsSynth = global.speechSynthesis;
    ttsUtterance = new SpeechSynthesisUtterance(toSpeak);
    applyTtsOptionsToUtterance(ttsUtterance);
    ttsSynth.speak(ttsUtterance);
    emit('tts:start', {});
  }

  // Open the reading-view dialog and speak fullText with word-by-word highlighting.
  function openReadingViewAndSpeak(fullText) {
    const words = fullText.split(/\s+/).filter(Boolean);
    if (words.length === 0) return;
    if (readingViewEl) readingViewEl.remove();
    const wrap = document.createElement('div');
    wrap.className = 'oa-reading-view';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-label', 'Reading view');
    const html = ['<h4>Reading</h4><button type="button" class="oa-reading-view-close" aria-label="Close">×</button><div class="oa-reading-content">'];
    words.forEach(function (w, i) {
      html.push('<span class="oa-word" data-oa-widx="' + i + '">' + escapeHtml(w) + '</span> ');
    });
    html.push('</div>');
    wrap.innerHTML = html.join('');
    wrap.querySelector('.oa-reading-view-close').addEventListener('click', function () { closeReadingView(); stopTTS(); });
    document.body.appendChild(wrap);
    readingViewEl = wrap;
    readingViewWordSpans = wrap.querySelectorAll('.oa-word');
    const u = new SpeechSynthesisUtterance(fullText);
    applyTtsOptionsToUtterance(u);
    u.onboundary = function (e) {
      if (e.name !== 'word' || readingViewWordSpans.length === 0) return;
      var idx = Math.min(Math.floor((e.charIndex / fullText.length) * words.length), words.length - 1);
      readingViewWordSpans.forEach(function (s) { s.classList.remove('oa-current'); });
      var span = readingViewEl && readingViewEl.querySelector('[data-oa-widx="' + idx + '"]');
      if (span) { span.classList.add('oa-current'); span.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    };
    u.onend = function () { readingViewWordSpans.forEach(function (s) { s.classList.remove('oa-current'); }); };
    global.speechSynthesis.speak(u);
    ttsUtterance = u;
    emit('tts:start', {});
  }
  // Close the reading-view overlay and clear word spans.
  function closeReadingView() {
    if (readingViewEl && readingViewEl.parentNode) readingViewEl.remove();
    readingViewEl = null;
    readingViewWordSpans = [];
  }
  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // Translate current selection to state.translateTargetLang and show in tooltip.
  function translateSelection() {
    const sel = global.getSelection();
    const text = (sel && sel.toString() || '').trim();
    if (!text) {
      showTooltip(null, 'Select text first, then click Translate selection.');
      return;
    }
    const lang = state.translateTargetLang || 'es';
    requestTranslate(text, lang, function (translated) {
      if (translated) showTooltip(sel.anchorNode, translated);
      else showTooltip(sel.anchorNode, 'Translation unavailable. Set Translate to a language and try again.');
    });
  }

  // Translate page body to state.translateTargetLang and show in overlay. Uses chunked translation for long text. *
  function translatePage() {
    const rawText = (document.body.innerText || document.body.textContent || '').trim();
    const text = rawText.slice(0, 15000);
    if (!text) return;
    const lang = state.translateTargetLang || 'es';
    if (!lang) {
      showTooltip(null, 'Choose a language under Translate to, then click Translate page.');
      return;
    }
    emit('translate:start', { lang: lang, length: text.length });
    if (text.length <= TRANSLATE_CHUNK_MAX_CHARS) {
      requestTranslate(text, lang, function (translated) {
        showTranslatedPageOverlay(translated, lang);
        emit('translate:done', { lang: lang });
      });
      return;
    }
    requestTranslateChunked(text, lang, function (translated) {
      if (!translated) { showTooltip(null, 'Translation failed.'); emit('translate:done', { lang: lang, error: true }); return; }
      showTranslatedPageOverlay(translated, lang);
      emit('translate:done', { lang: lang });
    });
  }

  // Show overlay with translated text and close button.
  function showTranslatedPageOverlay(translated, lang) {
    if (!translated) { showTooltip(null, 'Translation failed.'); return; }
    const overlay = document.createElement('div');
    overlay.className = 'oa-translate-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Translated page');
    overlay.innerHTML = '<h4>Translated page (' + lang + ')</h4><button type="button" class="oa-reading-view-close" aria-label="Close">×</button><div class="oa-translated-text"></div>';
    overlay.querySelector('.oa-translated-text').textContent = translated;
    overlay.querySelector('.oa-reading-view-close').addEventListener('click', function () { overlay.remove(); });
    document.body.appendChild(overlay);
  }

  // Split text into chunks by sentences/paragraphs, translate each, concatenate. onDone(translatedText or null).
  function requestTranslateChunked(text, targetLang, onDone) {
    var sourceLang = (state.language || document.documentElement.lang || 'en').toLowerCase().slice(0, 2);
    var chunks = splitTextIntoChunks(text, TRANSLATE_CHUNK_MAX_CHARS);
    var results = [];
    var index = 0;
    function next() {
      if (index >= chunks.length) {
        onDone(results.join(''));
        return;
      }
      var chunk = chunks[index];
      requestTranslate(chunk, targetLang, function (translated) {
        if (!translated) { onDone(null); return; }
        results.push(translated);
        index++;
        next();
      });
    }
    next();
  }

  // Split text into chunks preferring sentence/paragraph boundaries; max length per chunk.
  function splitTextIntoChunks(text, maxLen) {
    if (!text || maxLen < 1) return [];
    if (text.length <= maxLen) return [text];
    var chunks = [];
    var rest = text;
    while (rest.length > 0) {
      if (rest.length <= maxLen) {
        chunks.push(rest);
        break;
      }
      var segment = rest.slice(0, maxLen);
      var lastBreak = -1;
      var re = TRANSLATE_CHUNK_SEPARATOR;
      var m;
      while ((m = re.exec(segment)) !== null) lastBreak = m.index + m[0].length;
      if (lastBreak > 0) {
        chunks.push(rest.slice(0, lastBreak).trim());
        rest = rest.slice(lastBreak).trim();
      } else {
        var fallback = segment.length;
        for (var i = segment.length - 1; i >= 0; i--) {
          if (/[\s.,;:!?]/.test(segment[i])) { fallback = i + 1; break; }
        }
        chunks.push(rest.slice(0, fallback));
        rest = rest.slice(fallback).trim();
      }
    }
    return chunks;
  }

// Request translation from API; onDone(translatedText or null). Tries translateApiUrl (LibreTranslate), then apiBase, then MyMemory.
  function requestTranslate(text, targetLang, onDone) {
    var sourceLang = (state.language || document.documentElement.lang || 'en').toLowerCase().slice(0, 2);
    if (!targetLang) { onDone(null); return; }
    var truncated = text.slice(0, 5000).trim();
    if (!truncated) { onDone(null); return; }

    function tryOssTranslate() {
      if (!translateApiUrl) return tryBackend();
      var url = translateApiUrl.replace(/\?.*$/, '');
      var fetchOpts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q: truncated, source: sourceLang, target: targetLang }) };
      fetch(url, fetchOpts)
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r); })
        .then(function (data) {
          if (data && data.translatedText != null) onDone(data.translatedText);
          else tryBackend();
        })
        .catch(function () { tryBackend(); });
    }

    function tryBackend() {
      if (!apiBase) return tryFreeApi();
      var url = apiBase.replace(/\?.*$/, '') + '?action=translate';
      var opts = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: truncated, target: targetLang }) };
      if (apiKey) opts.headers['X-API-Key'] = apiKey;
      fetch(url, opts)
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.translated) onDone(data.translated);
          else tryFreeApi();
        })
        .catch(function () { tryFreeApi(); });
    }

    function tryFreeApi() {
      var trim500 = truncated.slice(0, 500);
      var pair = sourceLang + '|' + targetLang;
      var url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(trim500) + '&langpair=' + encodeURIComponent(pair);
      fetch(url)
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var t = data && data.responseData && data.responseData.translatedText;
          if (t && data.responseStatus !== 403) onDone(t);
          else onDone(null);
        })
        .catch(function () { onDone(null); });
    }

    tryOssTranslate();
  }

  // Apply preset: wider letter/line/word spacing.
  function applyMoreSpacingPreset() {
    state.letterSpacing = 'wide';
    state.lineHeight = 'relaxed';
    state.wordSpacing = 'wide';
    writeStorage();
    applyToDocument();
    if ($panel) syncPanelFromState();
    syncApiPreferences('save');
  }

  // Apply preset: dark color filter, higher contrast, focus highlights.
  function applyHighContrastPreset() {
    state.colorFilter = 'dark';
    state.contrast = 1.3;
    state.highlightFocus = true;
    state.enlargeFocus = true;
    writeStorage();
    applyToDocument();
    if ($panel) syncPanelFromState();
    syncApiPreferences('save');
  }

  // Show overlay listing all h1–h6 with links to scroll to each.
  function showHeadingsOutline() {
    var headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length === 0) {
      showTooltip(null, 'No headings found on this page.');
      return;
    }
    var overlay = document.createElement('div');
    overlay.className = 'oa-translate-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Page headings');
    var html = ['<h4>Headings</h4><button type="button" class="oa-reading-view-close" aria-label="Close">×</button><ul class="oa-overlay-list">'];
    headings.forEach(function (h, i) {
      var tag = h.tagName.toLowerCase();
      var text = (h.textContent || '').trim().slice(0, 80);
      var id = h.id || ('oa-h-' + i);
      if (!h.id) h.id = id;
      html.push('<li><a href="#' + id + '" data-oa-close-overlay>' + tag + ': ' + escapeHtml(text) + '</a></li>');
    });
    html.push('</ul>');
    overlay.innerHTML = html.join('');
    overlay.querySelector('.oa-reading-view-close').addEventListener('click', function () { overlay.remove(); });
    overlay.querySelectorAll('[data-oa-close-overlay]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var id = a.getAttribute('href').slice(1);
        var el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        overlay.remove();
      });
    });
    document.body.appendChild(overlay);
  }

  // Show overlay listing all images with their alt text (or placeholder).
  function showImageDescriptions() {
    var imgs = document.querySelectorAll('img');
    var list = [];
    imgs.forEach(function (img, i) {
      var alt = img.getAttribute('alt');
      var src = (img.src || '').slice(-40);
      list.push({ alt: alt === null ? '(no description)' : (alt || '(empty alt)'), src: src });
    });
    if (list.length === 0) {
      showTooltip(null, 'No images found on this page.');
      return;
    }
    var overlay = document.createElement('div');
    overlay.className = 'oa-translate-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Image descriptions');
    var html = ['<h4>Image descriptions</h4><button type="button" class="oa-reading-view-close" aria-label="Close">×</button><ul class="oa-overlay-list">'];
    list.forEach(function (item) {
      html.push('<li>' + escapeHtml(item.alt) + ' <span style="font-size:11px;color:#94a3b8;">' + escapeHtml(item.src) + '</span></li>');
    });
    html.push('</ul>');
    overlay.innerHTML = html.join('');
    overlay.querySelector('.oa-reading-view-close').addEventListener('click', function () { overlay.remove(); });
    document.body.appendChild(overlay);
  }

  // Export current state as JSON file download.
  function exportSettings() {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'openaccessible-settings.json';
    a.click();
    URL.revokeObjectURL(a.href);
    showTooltip(null, 'Settings exported.');
  }

  // Read selected JSON file and merge into state; re-apply and sync panel.
  function importSettingsFromFile(e) {
    var file = e.target.files[0];
    if (!file) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var data = JSON.parse(r.result);
        if (data && typeof data === 'object') {
          state = { ...defaultState, ...data };
          writeStorage();
          applyToDocument();
          if ($panel) syncPanelFromState();
          syncApiPreferences('save');
          showTooltip(null, 'Settings imported.');
        }
      } catch (_) {
        showTooltip(null, 'Invalid settings file.');
      }
      e.target.value = '';
    };
    r.readAsText(file);
  }

  // Attach or remove focusin listener for showing link URL in tooltip when showLinkUrl is on.
  function initLinkUrlOnFocus() {
    document.body.removeEventListener('focusin', onLinkFocusIn);
    if (!state.showLinkUrl) return;
    document.body.addEventListener('focusin', onLinkFocusIn);
  }
  // On focus of a link, show its href in a tooltip after short delay.
  function onLinkFocusIn(e) {
    if (!state.showLinkUrl) return;
    var target = e.target;
    if (target.tagName !== 'A' || !target.href) return;
    var url = target.getAttribute('href') || target.href;
    clearTimeout(window._oaLinkUrlTimer);
    window._oaLinkUrlTimer = setTimeout(function () {
      showTooltip(target, url.length > 80 ? url.slice(0, 77) + '...' : url);
    }, 400);
  }

  // --- Dictionary: double-click word -> fetch definition (dictionaryApiUrl, then apiBase, then built-in) -> show word modal ---
  // Dictionary API v1 (e.g. https://api.openaccessible.com/api/v1/): GET ?word=... returns { word, pronunciation, definition } or array of same.
  var dictionaryListenerAttached = false;

  function initDictionary() {
    if (dictionaryListenerAttached) return;
    dictionaryListenerAttached = true;

    document.body.addEventListener('dblclick', function (e) {

      if (!state.dictionaryEnabled) return;

      var sel = global.getSelection();
      var text = (sel && sel.toString() || '').trim().toLowerCase();

      if (!text || text.length > 80) return;

      e.preventDefault();
      e.stopPropagation();

      function showFallback() {
        var def = getLocalDefinition(text);
        showWordModal(
          text,
          def || 'No definition found. Try the built-in list or set dictionaryApiUrl / apiBase.'
        );
      }

      function tryDictionaryApi(cb) {
        if (!dictionaryApiUrl) return cb();

        var base = dictionaryApiUrl.replace(/\?.*$/, '');
        var url = base + (base.indexOf('?') >= 0 ? '&' : '?') + 'word=' + encodeURIComponent(text);

        fetch(url, { method: 'GET' })
          .then(function (r) { return r.ok ? r.json() : Promise.reject(r); })
          .then(function (data) {

            var parsed = parseDictionaryApiResponse(data, text);

            if (parsed) {
              showWordModal(parsed.word, parsed.definition, parsed.pronunciation);
              return;
            }

            cb();
          })
          .catch(function () { cb(); });
      }

      function tryApiBase(cb) {

        if (!apiBase) return cb();

        var url = apiBase.replace(/\/$/, '') + '/v1/?word=' + encodeURIComponent(text);
        var opts = { method: 'GET' };

        if (apiKey) {
          opts.headers = { 'X-API-Key': apiKey };
        }

        fetch(url, opts)
          .then(function (r) { return r.ok ? r.text() : Promise.reject(r); })
          .then(function (txt) {

            var d;
            try {
              d = JSON.parse(txt);
            } catch (e) {
              console.warn('[OpenAccessible] Dictionary JSON parse failed. Raw response:', txt);
              return cb();
            }

            var def = (d && d.result && d.result.definitions)
              ? d.result.definitions.map(function (x) {
                  return (x.part_of_speech ? x.part_of_speech + ": " : "") + x.definition;
                }).join("\n")
              : null;

            if (def) {
              showWordModal(text, def);
              return;
            }

            cb();
          })
          .catch(function () { cb(); });
      }

      tryDictionaryApi(function () {
        tryApiBase(function () {
          showFallback();
        });
      });

    });
  }
  // Parse Open Accessible dictionary API response: single { word, pronunciation, definition } or array; return { word, definition, pronunciation } or null.
  function parseDictionaryApiResponse(data, fallbackWord) {
    if (!data) return null;
    var item = null;
    if (Array.isArray(data) && data.length > 0) item = data[0];
    else if (data.data && Array.isArray(data.data) && data.data.length > 0) item = data.data[0];
    else if (typeof data.word === 'string' || (data.definition != null)) item = data;
    if (!item) return null;
    var def = item.definition != null ? String(item.definition).trim() : '';
    if (!def) return null;
    return {
      word: (item.word != null ? String(item.word).trim() : fallbackWord) || fallbackWord,
      definition: def,
      pronunciation: item.pronunciation != null ? String(item.pronunciation).trim() : ''
    };
  }
  function getLocalDefinition(word) {
    var w = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!w) return null;
    return BUILTIN_DICTIONARY[w] || null;
  }

  // --- Tooltip: short-lived popup (e.g. link URL on focus, export/import messages) ---
  // Show a temporary tooltip near element `near` (or top-left) with `text`; auto-remove after 6s.
  function showTooltip(near, text) {
    const id = 'oa-tooltip-' + Date.now();
    const tip = document.createElement('div');
    tip.id = id;
    tip.setAttribute('role', 'tooltip');
    tip.style.cssText = 'position:fixed;max-width:280px;padding:10px 12px;background:#1a1a2e;color:#eee;border-radius:8px;font-size:14px;z-index:2147483647;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
    tip.textContent = text;
    document.body.appendChild(tip);
    const rect = (near && near.getBoundingClientRect) ? near.getBoundingClientRect() : { left: 100, top: 100 };
    tip.style.left = Math.min(rect.left, global.innerWidth - 300) + 'px';
    tip.style.top = (rect.top - tip.offsetHeight - 8) + 'px';
    if (tip.getBoundingClientRect().top < 0) tip.style.top = (rect.bottom + 8) + 'px';
    setTimeout(() => {
      const t = document.getElementById(id);
      if (t) t.remove();
    }, 6000);
  }

  // --- Dictionary modal audio: server TTS if apiBase, else browser SpeechSynthesis ---
  // Speak text in word modal (word or definition); respects mute; calls done() when finished.
  function speakTextForModal(text, done) {
    if (!text || !text.trim()) { if (done) done(); return; }
    if (isTtsMuted()) { if (done) done(); return; }
    var t = text.trim().slice(0, 3000);
    if (apiBase) {
      requestServerTts(t, function (url) {
        if (!url) {
          speakTextForModalBrowser(t, done);
          return;
        }
        var audio = new Audio(url);
        audio.onended = audio.onerror = function () { emit('tts:stop', {}); if (done) done(); };
        emit('tts:start', {});
        audio.play().catch(function () { if (done) done(); });
      });
      return;
    }
    speakTextForModalBrowser(t, done);
  }
  // Speak text via SpeechSynthesis using widget rate/pitch/voice; used when no server TTS.
  function speakTextForModalBrowser(t, done) {
    if (!global.speechSynthesis) { if (done) done(); return; }
    // Use widget rate/pitch/voice for consistency
    global.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(t);
    applyTtsOptionsToUtterance(u);
    u.onend = u.onerror = function () { if (done) done(); };
    global.speechSynthesis.speak(u);
    emit('tts:start', {});
  }

    // --- Dictionary modal: word (+ optional pronunciation), definition, Play word / Play definition buttons ---
    // showWordModal(word, definition, pronunciation?). pronunciation shown when provided.
    function showWordModal(word, definition, pronunciation) {
      var prev = document.getElementById('oa-word-modal-root');
      if (prev) prev.remove();
      var root = document.createElement('div');
      root.id = 'oa-word-modal-root';
      root.className = 'oa-word-modal-backdrop';
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'true');
      root.setAttribute('aria-labelledby', 'oa-word-modal-title');
      var modal = document.createElement('div');
      modal.className = 'oa-word-modal';
      var wordDisplay = (word && String(word).trim()) ? escapeHtml(String(word).trim()) : '—';
      var pronDisplay = (pronunciation && String(pronunciation).trim()) ? '<p class="oa-word-pronunciation" aria-label="Pronunciation">' + escapeHtml(String(pronunciation).trim()) + '</p>' : '';
      var defDisplay = (definition && String(definition).trim()) ? escapeHtml(String(definition).trim()) : 'No definition available.';
      modal.innerHTML =
        '<button type="button" class="oa-close-modal" aria-label="Close">\u00D7</button>' +
        '<p class="oa-word-label">Word</p>' +
        '<h2 id="oa-word-modal-title">' + wordDisplay + '</h2>' +
        pronDisplay +
        '<p class="oa-def-label">Definition</p>' +
        '<p class="oa-word-def">' + defDisplay + '</p>' +
        '<div class="oa-word-audio">' +
        '<button type="button" class="oa-btn-audio" data-oa-speak-word aria-label="Play word">\u25B6 Play word</button>' +
        '<button type="button" class="oa-btn-audio" data-oa-speak-def aria-label="Play definition">\u25B6 Play definition</button>' +
        '</div>';
    root.appendChild(modal);
    function closeModal() {
      stopTTS();
      document.removeEventListener('keydown', onKey);
      root.remove();
    }
    function onKey(e) {
      if (e.key === 'Escape') closeModal();
    }
    root.addEventListener('click', function (e) {
      if (e.target === root) closeModal();
    });
    modal.querySelector('.oa-close-modal').addEventListener('click', closeModal);
    modal.querySelector('[data-oa-speak-word]').addEventListener('click', function () {
      speakTextForModal(word, null);
    });
    modal.querySelector('[data-oa-speak-def]').addEventListener('click', function () {
      speakTextForModal(definition, null);
    });
    document.body.appendChild(root);
    document.addEventListener('keydown', onKey);
    var focusEl = modal.querySelector('.oa-close-modal');
    if (focusEl) focusEl.focus();
    requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('oa-word-sidebar-visible'); }); });
  }
  function escapeHtml(s) {
    if (!s) return '';
    // Avoid XSS when showing API/local definition in modal
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  // --- Focus strip: dimmed overlay so only a band of content is visible ---
  // Create and append the focus-strip overlay when state.focusStrip is true.
  function ensureFocusStripMask() {
    if (document.getElementById('openaccessible-focus-strip')) return;
    const el = document.createElement('div');
    el.id = 'openaccessible-focus-strip';
    el.className = 'oa-focus-strip-mask';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
  }

  // Remove the focus-strip overlay.
  function removeFocusStripMask() {
    const el = document.getElementById('openaccessible-focus-strip');
    if (el) el.remove();
  }

  // --- Reading guide: CSS var --oa-guide-y follows scroll for highlight band ---
  // Listen to scroll and update --oa-guide-y so the reading-guide band follows the viewport. 
  function initReadingGuide() {
    document.addEventListener('scroll', function () {
      if (!state.readingGuide) return;
      document.documentElement.style.setProperty('--oa-guide-y', (global.scrollY + 80) + 'px');
    }, { passive: true });
  }

  // --- Skip link and main landmark for screen reader users ---
  // Add "Skip to main content" link and ensure main landmark exists when screenReaderHints is on. 
  function injectSkipLink() {
    if (!state.screenReaderHints) return;
    let skip = document.getElementById('openaccessible-skip');
    if (skip) return;
    skip = document.createElement('a');
    skip.id = 'openaccessible-skip';
    skip.href = '#openaccessible-main';
    skip.textContent = 'Skip to main content';
    skip.style.cssText = 'position:absolute;left:-9999px;z-index:2147483647;padding:8px 16px;background:#0a7ea4;color:#fff;top:0;';
    skip.addEventListener('focus', function () { this.style.left = '8px'; this.style.top = '8px'; });
    skip.addEventListener('blur', function () { this.style.left = '-9999px'; });
    document.body.insertBefore(skip, document.body.firstChild);
    let main = document.getElementById('main') || document.querySelector('main') || document.querySelector('[role="main"]');
    if (!main) {
      main = document.createElement('div');
      main.id = 'openaccessible-main';
      main.setAttribute('role', 'main');
      main.style.display = 'none';
      document.body.appendChild(main);
    }
    main.id = 'openaccessible-main';
  }

  // --- Load or save preferences from/to API (preferences_load / preferences_save) ---
  // Call API to load or save user preferences; on load, merge into state and apply. 
  function syncApiPreferences(action) {
    if (!apiBase) return;
    const q = new URLSearchParams();
    q.set('action', action === 'save' ? 'preferences_save' : 'preferences_load');
    if (apiUserId) q.set('user_id', apiUserId);
    const url = apiBase.replace(/\?.*$/, '') + '?' + q.toString();
    const opts = { method: action === 'save' ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' } };
    if (apiKey) opts.headers['X-API-Key'] = apiKey;
    if (action === 'save') opts.body = JSON.stringify({ ...state, user_id: apiUserId || undefined });
    fetch(url, opts)
      .then(r => r.json())
      .then(data => {
        if (action === 'load' && data && data.preferences) {
          state = { ...defaultState, ...data.preferences };
          writeStorage();
          applyToDocument();
          if ($panel) syncPanelFromState();
        }
      })
      .catch(() => {});
  }

  /**
   * @typedef {Object} OpenAccessibleAPI
   * @property {function():Object} getState - Returns a copy of current state.
   * @property {function(Object)} setState - Merge object into state, apply to document, persist.
   * @property {function()} openPanel - Open the accessibility panel.
   * @property {function()} closePanel - Close the panel.
   * @property {function()} reset - Reset all settings to defaults.
   * @property {function()} stopTTS - Stop any playing TTS.
   * @property {function():Array} getPresets - Return user-saved presets.
   * @property {function():Array} getBuiltinPresets - Return built-in preset id/name list.
   * @property {function(string)} applyPreset - Apply preset by id or name.
   * @property {function(string):string|null} saveCurrentAsPreset - Save current state as named preset; returns preset id or null.
   * @property {function(string)} deletePreset - Delete user preset by id.
   * @property {function()} showKeyboardShortcuts - Show keyboard shortcuts dialog.
   * @property {function()} showAbout - Show about dialog.
   * @property {function(string,string,function)} translate - Request translation; callback receives translated text or null.
   * @property {function(Element=):Array} getHeadingsSummary - Return headings in root.
   * @property {function(Element=):Array} getImagesWithoutAlt - Return images with alt status.
   * @property {function(Element=):Array} getFormFieldsWithoutLabels - Return form controls without labels.
   * @property {function(Element=):Object} getAccessibilitySummary - Return counts (headings, images missing alt, etc.).
   * @property {function():Object} getSuggestedSettings - Return suggested overrides from system prefs.
   * @property {function():Object} getDefaultStateSnapshot - Return default state object.
   * @property {string} version - Widget version string.
   * @property {Object} events - Map of event names to descriptions.
   */

  // --- Config options reference (for OpenAccessibleConfig / init(opts)) ---
  /**
   * Supported init options:
   * - apiBase (string): Base URL for backend API (e.g. https://yoursite.com/api/). Used for action=translate, dictionary, preferences_load/save, tts.
   * - apiUrl (string): Alias for apiBase.
   * - apiKey (string): Optional API key sent as X-API-Key header.
   * - userId (string): Optional user identifier for synced preferences.
   * - useServerTts (boolean): If true, TTS requests go to apiBase?action=tts instead of browser SpeechSynthesis.
   * - translateApiUrl (string): LibreTranslate-style translate endpoint. Default: OSS Translate URL. Set '' to use only apiBase and MyMemory.
   * - dictionaryApiUrl (string): Dictionary API base (e.g. https://api.openaccessible.com/api/v1/). GET ?word=... returns { word, pronunciation, definition }. Set '' to use only apiBase and built-in list.
   * - iconUrl (string): URL for toolbar icon (default: inline SVG).
   * - accountVerifyUrl (string): URL for account verification (footer badge).
   * - root (string|Element): Scope for applying styles (selector or element); default document.documentElement.
   */

  // --- Public init: opts.apiBase, opts.apiKey, opts.useServerTts, opts.accountVerifyUrl, etc. ---
  // Initialize widget: load storage, inject styles, create toolbar and panel, attach listeners. Returns API object.
  function init(opts) {
    opts = opts || {};
    var normalized = normalizeInitOptions(opts);
    apiBase = normalized.apiBase || '';
    apiKey = normalized.apiKey || '';
    apiUserId = normalized.userId || '';
    if (normalized.translateApiUrl !== undefined) translateApiUrl = normalized.translateApiUrl;
    if (normalized.dictionaryApiUrl !== undefined) dictionaryApiUrl = normalized.dictionaryApiUrl;
    iconUrl = (typeof normalized.iconUrl === 'string' && normalized.iconUrl.length > 0) ? normalized.iconUrl : '';
    if (normalized.accountVerifyUrl) accountVerifyUrl = normalized.accountVerifyUrl;
    if (normalized.root !== undefined) {
      if (typeof normalized.root === 'string') $root = document.querySelector(normalized.root) || document.documentElement;
      else if (normalized.root && normalized.root.nodeType === 1) $root = normalized.root;
    }
    useServerTts = !!normalized.useServerTts;
    useServerTts = !!opts.useServerTts;
    if (typeof opts.dictionaryApiUrl === 'string') dictionaryApiUrl = opts.dictionaryApiUrl;
    if (typeof opts.iconUrl === 'string' && opts.iconUrl.length > 0) iconUrl = opts.iconUrl;
    if (opts.accountVerifyUrl !== undefined) accountVerifyUrl = opts.accountVerifyUrl;
    if (opts.root && typeof opts.root === 'string') $root = document.querySelector(opts.root) || document.documentElement;
    else if (opts.root && opts.root.nodeType) $root = opts.root;
    readStorage();
    if (apiBase) syncApiPreferences('load');
    injectStyles();
    applyToDocument();
    if (state.dyslexiaFont) loadDyslexiaFont();
    createToolbar();
    createPanel();
    document.getElementById('openaccessible-panel').style.display = 'none';
    if (apiKey && accountVerifyUrl) checkOpenAccessibleAccount();
    initDictionary();
    initReadingGuide();
    injectSkipLink();
    ensureVoiceNavigation();
    document.body.addEventListener('click', function (e) {
      const t = e.target;
      if (t && t.closest && t.closest('#openaccessible-toolbar')) return;
      if (t && t.closest && t.closest('#openaccessible-panel')) return;
      if (t && t.closest && t.closest('.oa-selection-bar')) return;
      if (state.ttsEnabled && t.hasAttribute('data-oa-tts')) speakElement(t);
    });
    document.addEventListener('mouseup', function (e) {
      setTimeout(function () {
        const sel = global.getSelection();
        const text = (sel && sel.toString() || '').trim();
        if (text && sel.rangeCount > 0 && !e.target.closest('#openaccessible-toolbar') && !e.target.closest('#openaccessible-panel')) {
          try {
            var r = sel.getRangeAt(0);
            var rect = r.getBoundingClientRect();
            showSelectionBar(rect.left + rect.width / 2, rect.bottom);
          } catch (_) { hideSelectionBar(); }
        } else if (!text) hideSelectionBar();
      }, 10);
    });
    // Global keyboard: Escape closes panel/overlays; Alt+A (Windows) or Option+A (Mac) toggles panel
    global.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { togglePanel(false); closeReadingView(); hideSelectionBar(); return; }
      if ((e.altKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        var open = (document.getElementById('openaccessible-panel') || {}).style.display !== 'block';
        togglePanel(open);
        var tb = document.getElementById('openaccessible-toolbar');
        var btn = tb && tb.querySelector('[data-oa-open]');
        if (btn) btn.classList.toggle('active', open);
      }
    });
    emit('ready', { state, version: WIDGET_VERSION });
    return {
      getState: function () { return { ...state }; },
      setState: function (s) { state = { ...state, ...s }; applyToDocument(); writeStorage(); },
      openPanel: function () { togglePanel(true); },
      closePanel: function () { togglePanel(false); },
      reset: reset,
      stopTTS: stopTTS,
      getPresets: getSavedPresets,
      getBuiltinPresets: function () { return Object.keys(BUILTIN_PRESETS).map(function (id) { return { id: id, name: BUILTIN_PRESETS[id].name }; }); },
      applyPreset: applyPreset,
      saveCurrentAsPreset: saveCurrentAsPreset,
      deletePreset: deletePreset,
      showKeyboardShortcuts: showKeyboardShortcuts,
      showAbout: showAbout,
      translate: function (text, targetLang, done) { requestTranslate(text, targetLang, done || function () {}); },
      getHeadingsSummary: getHeadingsSummary,
      getImagesWithoutAlt: getImagesWithoutAlt,
      getFormFieldsWithoutLabels: getFormFieldsWithoutLabels,
      getAccessibilitySummary: getAccessibilitySummary,
      getSuggestedSettings: getSuggestedSettings,
      getDefaultStateSnapshot: getDefaultStateSnapshot,
      getVersionInfo: getVersionInfo,
      version: WIDGET_VERSION,
      events: WIDGET_EVENTS,
    };
  }

  // --- Auto-init on load: use OpenAccessibleConfig if set, else init({}) ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (global.OpenAccessibleConfig) init(global.OpenAccessibleConfig);
      else init({});
    });
  } else {
    if (global.OpenAccessibleConfig) init(global.OpenAccessibleConfig);
    else init({});
  }

  global.OpenAccessible = { init, version: WIDGET_VERSION };
})(typeof window !== 'undefined' ? window : this);
