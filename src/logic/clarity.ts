import { IMPACT_AREA_LABELS } from "../constants/quadrants";
import { evaluateTriage, getQuadrantGuidance } from "./triage";
import { sanitizeAiActionTitle, sanitizeAiDecisionGroupLabel } from "../services/ai-cleanup";
import type { AiCleanupResult } from "../types/ai-cleanup";
import { getCanonicalClarityTaskKey, normalizeClarityTaskTitle } from "../utils/clarity-title-cleanup";
import type {
  ClarityAnalysis,
  ClarityCandidate,
  ClarityCandidateRelationship,
  ClarityDecisionGroup,
  ClarityMode,
  ClarityQuestion,
  ClarityQuestionKind,
  DecisionGate,
  DecisionShape,
  DueWindow,
  ImpactArea,
  ImportanceSignal,
  Quadrant,
  TriageResult,
  TriageAnswers,
} from "../types/decision";

type ContextSignalKind =
  | "lowEnergy"
  | "deadlinePressure"
  | "lowTimePressure"
  | "shortTimeWindow"
  | "moneySpeed"
  | "higherValue"
  | "socialPressure";

interface ContextSignal {
  kind: ContextSignalKind;
  label: string;
}

interface ReasonFactor {
  tag: string;
  weight: number;
  explanation: string;
}

const MAX_CLARITY_BOARD_ITEMS = 10;
const MAX_CLARITY_GROUP_ITEMS = 8;

const FOG_PHRASES = [
  "don't know",
  "dont know",
  "not sure",
  "too many things",
  "overwhelmed",
  "brain dump",
  "foggy",
  "decide whether",
  "should i",
  "whether to",
];

const FILLER_PREFIXES = [
  /^do i\s+/i,
  /^(?:i|we)\s+(?:need|have)\s+to\s+do\s+(?:one|two|three|four|five|several|a\s+few|\d+)?\s*things:\s*/i,
  /^(?:i|we)\s+(?:need|have)\s+to\s+handle\s+(?:one|two|three|four|five|several|a\s+few|\d+)?\s*things:\s*/i,
  /^(?:one|two|three|four|five|\d+)\s+things:\s*/i,
  /^things:\s*/i,
  /^also i(?:['’]m| am) (?:also\s+)?(?:still )?deciding whether (?:to|i should)\s+/i,
  /^also i(?:['’]m| am) (?:also\s+)?(?:still )?trying to decide whether (?:to|i should)\s+/i,
  /^i(?:['’]m| am) (?:also\s+)?(?:still )?deciding whether (?:to|i should)\s+/i,
  /^i(?:['’]m| am) (?:also\s+)?(?:still )?trying to decide whether (?:to|i should)\s+/i,
  /^(?:still )?trying to decide whether (?:to|i should)\s+/i,
  /^need to (?:still )?decide whether (?:to|i should)\s+/i,
  /^decide whether to\s+/i,
  /^deciding whether to\s+/i,
  /^i don't know whether to\s+/i,
  /^i dont know whether to\s+/i,
  /^whether to\s+/i,
  /^i need to\s+/i,
  /^need to\s+/i,
  /^i should\s+/i,
  /^should i\s+/i,
  /^also\s+/i,
  /^and\s+/i,
  /^or\s+/i,
];

const TITLE_PREFIXES = [/^focus on getting\s+/i, /^focus on\s+/i, /^getting\s+/i, /^do\s+/i];
const OPTION_INTRO_PREFIXES = [
  /^do i\s+/i,
  /^should i\s+/i,
  /^whether to\s+/i,
  /^decide whether to\s+/i,
  /^deciding whether to\s+/i,
  /^(?:still )?trying to decide whether (?:to|i should)\s+/i,
  /^need to (?:still )?decide whether (?:to|i should)\s+/i,
  /^i(?:['’]m| am) (?:also\s+)?(?:still )?deciding whether (?:to|i should)\s+/i,
  /^i(?:['’]m| am) (?:also\s+)?(?:still )?trying to decide whether (?:to|i should)\s+/i,
];
const META_LANGUAGE_PATTERNS = [
  /\bdecide between\b/i,
  /\bthey all matter for different reasons\b/i,
  /\bthe real options are\b/i,
  /\breal options are\b/i,
  /\bthe options are\b/i,
  /\b(?:best|cleaner)\s+(?:first|next)\s+option\b/i,
  /\bwhat should come second\b/i,
  /\bwhat should wait\b/i,
  /\bwhat can wait\b/i,
  /\bwhat do i do first\b/i,
  /\bwhat should i actually do first\b/i,
  /\bclearest next move\b/i,
  /\bclearest next step\b/i,
  /\bwhat to do (?:now|next|instead)\b/i,
  /\bhow to handle it\b/i,
  /\bhandle first\b/i,
  /\bactually handle first\b/i,
  /\bactually do first\b/i,
  /\bfirst move\b/i,
  /\bcan wait\b/i,
  /\b(?:sort|sorting|rank|ranking)\s+(?:a\s+)?(?:full|crowded|messy)?\s*(?:decision\s+)?board\b/i,
  /\bcollapse this into one fake priority\b/i,
  /\bwithout flattening the board\b/i,
  /\bthrow meaningful tasks into ignore too aggressively\b/i,
  /\bwithout dropping anything important\b/i,
  /\bwithout dropping meaningful work\b/i,
  /\bwithout dropping real work\b/i,
  /\bwithout dropping meaningful items\b/i,
  /\boversimplify them\b/i,
  /^\s*(?:what|which|how)\s+/i,
];
const CONTEXT_ONLY_PATTERNS = [
  /^(?:but\s+)?i(?:['’]m| am)\s+(?:mentally\s+)?(?:tired|hungry|exhausted|drained|fatigued|low energy|burned out|burnt out)\b/i,
  /^(?:but\s+)?i feel overwhelmed\b/i,
  /^(?:but\s+)?i(?:\s+do\s+not|\s+don't)?\s+want clarity\b/i,
  /^(?:but\s+)?i(?:\s+do\s+not|\s+don't)?\s+want to make (?:the )?(?:wrong move|a mistake)\b/i,
  /\bout of panic\b/i,
  /^\s*i urgently need cash flow soon\b/i,
  /\bcash flow soon\b/i,
  /^\s*(?:but\s+)?money\b.+\b(?:would help|helps)\b/i,
  /\bwould help me right now\b/i,
  /\bwon[’']?t directly bring in money today\b/i,
  /\bbefore i feel good about it\b/i,
  /\bi feel good about it\b/i,
  /\bit would be better if\b/i,
  /\bi do not want the app to collapse this into one fake priority\b/i,
  /\bthrow meaningful tasks into ignore too aggressively\b/i,
  /^\s*(?:because|since|as)\b/i,
];
const ACTION_VERB_PATTERNS = [
  /\b(?:call|email|send|fix|finish|rest|book|schedule|wait|reply|respond|answer|follow up|cold email|cold call|cold calling|clean up|cleanup|clean|prioriti[sz]e|focus on|keep|switch|choose|pay|invoice|ship|submit|review|reach out|outreach|delegate|automate|reduce|ignore|quit|resign|sign|buy|sell|start|stop|contact|prepare|ask|record|organi[sz]e|reorgani[sz]e|write|draft|build|update|edit|sort|handle|polish|revise|rehearse|publish|post|back up|backup|approve|repair|rewrite|troubleshoot|package|confirm|reconcile|trim|archive|label)\b/i,
];
const OPTION_NOUN_PATTERNS = [
  /\bclients?\b/i,
  /\bcollaborator\b/i,
  /\bfeedback\b/i,
  /\bpartner\b/i,
  /\bdraft\b/i,
  /\btravel\b/i,
  /\bagenda\b/i,
  /\bquote\b/i,
  /\bhomepage\b/i,
  /\bassets?\b/i,
  /\bnewsletter\b/i,
  /\btemplate\b/i,
  /\bexpenses?\b/i,
  /\bproposal\b/i,
  /\bpresentation\b/i,
  /\bwebsite\b/i,
  /\bsignup\b/i,
  /\binquiries?\b/i,
  /\bcheckout\b/i,
  /\bautomation\b/i,
  /\bheadline\b/i,
  /\blanding\s+page\b/i,
  /\bpricing\b/i,
  /\boutreach\b/i,
  /\bemail\b/i,
  /\bcontract\b/i,
  /\brevision\b/i,
  /\breminder\b/i,
  /\bcold email\b/i,
  /\bcold calling\b/i,
  /\bcalling\b/i,
  /\badmin\b/i,
  /\blandlord\b/i,
  /\binvoice\b/i,
  /\bmeeting\b/i,
  /\bnotes\b/i,
  /\bbooking\b/i,
  /\blink\b/i,
  /\bservices?\b/i,
  /\brest\b/i,
  /\bbreak\b/i,
  /\bportfolio\b/i,
  /\bfaq\b/i,
  /\bpage\b/i,
  /\bcontent\b/i,
  /\btestimonial\b/i,
  /\bsocial proof\b/i,
  /\bvisibility\b/i,
  /\breferrals?\b/i,
  /\bdiscovery\s+call\b/i,
  /\bquestions?\b/i,
  /\bpayment\s+link\b/i,
  /\bshared\s+folder\b/i,
  /\bhandoff\b/i,
  /\btalking points\b/i,
  /\bcalendar\b/i,
  /\bdemo\b/i,
  /\bvideo\b/i,
  /\bfiles?\b/i,
  /\bleads?\b/i,
  /\bslides?\b/i,
  /\breceipts?\b/i,
  /\bbookkeeping\b/i,
  /\bhero\s+section\b/i,
  /\bwidget\b/i,
  /\bcrm\b/i,
  /\btags\b/i,
  /\bapproval\b/i,
  /\bexplainer\b/i,
  /\bsubscriptions?\b/i,
  /\brefunds?\b/i,
];
const CONTEXT_PATTERNS: Array<{ kind: ContextSignalKind; label: string; expression: RegExp }> = [
  {
    kind: "lowEnergy",
    label: "Energy feels low right now.",
    expression: /\b(?:hungry|hunger|tired|tiredness|exhausted|drained|fatigued|low energy|low on energy|burned out|burnt out)\b/i,
  },
  {
    kind: "deadlinePressure",
    label: "There is real time pressure around this.",
    expression:
      /\b(?:deadline|due|today|tonight|tomorrow|urgent|asap|immediately|eod|end of day|this week|before\s+\d|by\s+\d)\b/i,
  },
  {
    kind: "lowTimePressure",
    label: "There is no hard deadline here.",
    expression: /\b(?:no hard deadline|not urgent|nothing is due yet|no real deadline)\b/i,
  },
  {
    kind: "shortTimeWindow",
    label: "There is only a short working window right now.",
    expression:
      /\b(?:only have|just have|have)\s+(?:about\s+)?(?:10|15|20|30|45)\s+minutes\b|\bshort window\b|\blimited time\b|\bno bandwidth\b|\bvery little time\b/i,
  },
  {
    kind: "moneySpeed",
    label: "Cash timing seems to matter here.",
    expression:
      /\b(?:cash flow soon|money faster|get paid faster|paid faster|receive money faster|receive money from (?:them|this) faster|cash faster|pay faster|sooner)\b/i,
  },
  {
    kind: "higherValue",
    label: "One path appears to have higher upside.",
    expression: /\b(?:pay more|higher paying|higher value|more value|long term|credibility matters)\b/i,
  },
  {
    kind: "socialPressure",
    label: "There may be relationship or work consequences here.",
    expression: /\b(?:client|landlord|boss|team|partner|friend|family|reputation|collaborator|feedback)\b/i,
  },
];

const AREA_KEYWORDS: Record<ImpactArea, RegExp[]> = {
  money: [/\bbill\b/i, /\binvoice\b/i, /\bbudget\b/i, /\bpayment\b/i, /\bpayments?\b/i, /\bexpenses?\b/i, /\bcash\b/i, /\bmoney\b/i, /\brent\b/i, /\bconversions?\b/i, /\brevenue\b/i, /\bsales\b/i, /\bpricing\b/i, /\binquiries?\b/i, /\bquote\b/i],
  health: [/\bdoctor\b/i, /\bhealth\b/i, /\bsleep\b/i, /\brest\b/i, /\btherapy\b/i, /\bworkout\b/i, /\bexercise\b/i],
  safety: [/\bsafety\b/i, /\brepair\b/i, /\bleak\b/i, /\bdanger\b/i, /\bsecurity\b/i],
  work: [
    /\bclient\b/i,
    /\bcollaborator\b/i,
    /\bfeedback\b/i,
    /\bpartner\b/i,
    /\bdraft\b/i,
    /\bapproval\b/i,
    /\bdecision\b/i,
    /\btravel\b/i,
    /\bagenda\b/i,
    /\bquote\b/i,
    /\btemplate\b/i,
    /\bnewsletter\b/i,
    /\bhomepage\b/i,
    /\bassets?\b/i,
    /\bpayments?\b/i,
    /\bexpenses?\b/i,
    /\bproposal\b/i,
    /\bpresentation\b/i,
    /\bwebsite\b/i,
    /\bsignup\b/i,
    /\bnewsletter\s+signup\b/i,
    /\bcontact\s+form\b/i,
    /\bcheckout\b/i,
    /\bcalendar\b/i,
    /\bonboarding\b/i,
    /\bbug\b/i,
    /\bautomation\b/i,
    /\bheadline\b/i,
    /\blanding\s+page\b/i,
    /\bfaq\b/i,
    /\boutreach\b/i,
    /\bcontent\b/i,
    /\btestimonial\b/i,
    /\btalking\s+points\b/i,
    /\bpricing\b/i,
    /\bemail\b/i,
    /\badmin\b/i,
    /\bmeeting\b/i,
    /\bnotes?\b/i,
    /\bprep\b/i,
    /\bpitch\s+deck\b/i,
    /\bdeck\b/i,
    /\bleads?\b/i,
    /\bcontract\b/i,
    /\brevision\b/i,
    /\bbooking\s+link\b/i,
    /\bservices?\s+page\b/i,
    /\bdemo\s+video\b/i,
    /\bproject\b/i,
    /\bfiles?\b/i,
    /\bwork\b/i,
  ],
  housing: [/\blandlord\b/i, /\blease\b/i, /\bapartment\b/i, /\bhome\b/i, /\bhousing\b/i, /\brent\b/i],
  longTermGoals: [
    /\bportfolio\b/i,
    /\bwebsite\b/i,
    /\bcontent\b/i,
    /\btestimonial\b/i,
    /\bsocial proof\b/i,
    /\bvisibility\b/i,
    /\bfaq\b/i,
    /\bhomepage\b/i,
    /\btemplate\b/i,
    /\bservices?\s+page\b/i,
    /\bdemo\s+video\b/i,
    /\bstrategy\b/i,
    /\bproposal\b/i,
    /\blearn\b/i,
    /\bplan\b/i,
    /\bgoal\b/i,
  ],
  relationships: [/\bfriend\b/i, /\bfamily\b/i, /\bpartner\b/i, /\bcall\b/i, /\bfollow up\b/i, /\bcheck in\b/i, /\bcollaborator\b/i, /\bfeedback\b/i, /\bquote\b/i],
  reputation: [
    /\bclient\b/i,
    /\bcollaborator\b/i,
    /\bpartner\b/i,
    /\bdraft\b/i,
    /\bapproval\b/i,
    /\bdecision\b/i,
    /\bquote\b/i,
    /\bhomepage\b/i,
    /\btemplate\b/i,
    /\bnewsletter\b/i,
    /\boutreach\b/i,
    /\bfollow up\b/i,
    /\bproposal\b/i,
    /\bpresentation\b/i,
    /\bwebsite\b/i,
    /\bsignup\b/i,
    /\bcontact\s+form\b/i,
    /\bcheckout\b/i,
    /\bheadline\b/i,
    /\bonboarding\b/i,
    /\bportfolio\b/i,
    /\bcontent\b/i,
    /\btestimonial\b/i,
    /\bsocial proof\b/i,
    /\bvisibility\b/i,
    /\bservices?\s+page\b/i,
    /\bbooking\s+link\b/i,
    /\bcontract\b/i,
    /\brevision\b/i,
    /\bdemo\s+video\b/i,
    /\bprepared\b/i,
    /\bpublic\b/i,
    /\bship\b/i,
    /\breferrals?\b/i,
  ],
};

const KEYWORDS = {
  urgentToday: [/\bnow\b/i, /\btoday\b/i, /\btonight\b/i, /\basap\b/i, /\burgent\b/i, /\bright away\b/i, /\bimmediately\b/i, /\beod\b/i, /\bend of day\b/i],
  urgentTomorrow: [/\btomorrow\b/i, /\bfirst thing\b/i],
  urgentWeek: [/\bthis week\b/i, /\bfriday\b/i, /\bmonday\b/i, /\btuesday\b/i, /\bwednesday\b/i, /\bthursday\b/i, /\bweekend\b/i],
  hardDeadline: [
    /\bdeadline\b/i,
    /\bdue\s+(?:today|tonight|tomorrow|this week|this weekend|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday|later)\b/i,
    /\b(?:by|before)\s+(?:today|tonight|tomorrow|this week|this weekend|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday|eod|end of day|\d{1,2}(?::\d{2})?\s?(?:am|pm)?)\b/i,
  ],
  severeDelay: [/\blandlord\b/i, /\brent\b/i, /\binvoice\b/i, /\bhealth\b/i, /\bdoctor\b/i, /\bpayment\b/i, /\bquote\b/i],
  disruptiveDelay: [
    /\boutreach\b/i,
    /\bleads?\b/i,
    /\bcollaborator\b/i,
    /\bfeedback\b/i,
    /\bpresentation\b/i,
    /\bsignup\b/i,
    /\bcheckout\b/i,
    /\bpricing\b/i,
    /\bautomation\b/i,
    /\bheadline\b/i,
    /\bbooking\s+link\b/i,
    /\bcontract\b/i,
    /\brevision\b/i,
    /\badmin\b/i,
    /\bemail\b/i,
    /\bcontent\b/i,
    /\bnotes?\b/i,
    /\bdocs?\b/i,
    /\bcall\b/i,
    /\bpayment\s+link\b/i,
    /\breferrals?\b/i,
    /\bhomepage\b/i,
    /\btemplate\b/i,
    /\btravel\b/i,
    /\bagenda\b/i,
    /\bquote\b/i,
    /\bassets?\b/i,
    /\bnewsletter\b/i,
  ],
  relief: [/\binbox\b/i, /\badmin\b/i, /\bemail\b/i, /\blandlord\b/i, /\bcall\b/i, /\bdocs?\b/i, /\breply\b/i, /\bdecision\b/i, /\brest\b/i],
  longTerm: [/\bproposal\b/i, /\bwebsite\b/i, /\bhealth\b/i, /\bexercise\b/i, /\bstrategy\b/i, /\bgoal\b/i, /\bplan\b/i],
  easyToUndo: [/\bcall\b/i, /\bemail\b/i, /\bsend\b/i, /\bfollow up\b/i, /\boutreach\b/i, /\bschedule\b/i, /\brest\b/i, /\bbook\b/i],
  mostlyNoise: [/\bscreenshots?\b/i, /\breorgani[sz]e\b/i, /\btidy\b/i, /\bdoomscroll\b/i, /\blater maybe\b/i],
};

const PRIORITY_BOARD_PATTERNS = [
  /\bcrowded board\b/i,
  /\bfull decision board\b/i,
  /\bcrowded mix\b/i,
  /\bmessy decision board\b/i,
  /\bwithout dropping anything important\b/i,
  /\bwithout dropping meaningful work\b/i,
  /\bwithout dropping meaningful items\b/i,
  /\bmultiple important things\b/i,
  /\bcompeting priorities\b/i,
  /\boversimplify them\b/i,
  /\bfew competing priorities\b/i,
  /\bfull board\b/i,
  /\bwhat is still in play\b/i,
  /\bwhat can sit lighter\b/i,
  /\bwhat can wait a bit\b/i,
  /\bwhat can wait\b/i,
  /\brank(?:ed|ing)? the board\b/i,
  /\bfake priority\b/i,
  /\bthrow useful tasks away too quickly\b/i,
];

const SUPPORT_TOKEN_STOPWORDS = new Set([
  "reply",
  "respond",
  "follow",
  "send",
  "prepare",
  "fix",
  "organize",
  "record",
  "update",
  "clean",
  "cleanup",
  "project",
  "site",
  "work",
  "task",
  "thing",
  "things",
  "page",
  "short",
  "later",
  "week",
  "today",
  "tomorrow",
  "recently",
  "showed",
  "interest",
]);

const clamp = (value: number, min = 0, max = 4) => Math.max(min, Math.min(max, Number(value.toFixed(2))));
const DUE_WINDOW_PRIORITY: Record<DueWindow, number> = {
  today: 4,
  tomorrow: 3,
  thisWeek: 2,
  later: 1,
  noDeadline: 0,
};

const hasAnyMatch = (value: string, expressions: RegExp[]) => expressions.some((expression) => expression.test(value));

const isParagraphLikeInput = (value: string) => value.split(/\s+/).length > 18 || /[.?!]/.test(value);
export const shouldUseAiCleanup = (value: string) => Boolean(value.replace(/\s+/g, " ").trim());

const dedupe = (values: string[]) => {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const dedupeSignals = (signals: ContextSignal[]) => {
  const seen = new Set<string>();
  return signals.filter((signal) => {
    if (seen.has(signal.kind)) {
      return false;
    }

    seen.add(signal.kind);
    return true;
  });
};

const joinReasonFragments = (fragments: string[]) => {
  if (fragments.length === 1) {
    return fragments[0];
  }

  if (fragments.length === 2) {
    return `${fragments[0]} and ${fragments[1]}`;
  }

  return `${fragments.slice(0, -1).join(", ")}, and ${fragments.at(-1)}`;
};

type LegacyAiItem = NonNullable<AiCleanupResult["items"]>[number];

const mapAiQuadrant = (quadrant: LegacyAiItem["quadrant"]): Quadrant => {
  switch (quadrant) {
    case "do_now":
      return "doNow";
    case "schedule":
      return "schedule";
    case "delegate":
      return "delegate";
    case "eliminate":
    default:
      return "eliminate";
  }
};

const getDueWindowFromAiUrgency = (
  urgency: number,
  costOfDelay: number
): { hasDeadline: boolean; dueWindow: DueWindow } => {
  if (urgency >= 5) {
    return { hasDeadline: true, dueWindow: "today" };
  }

  if (urgency >= 4) {
    return { hasDeadline: true, dueWindow: costOfDelay >= 4 ? "today" : "tomorrow" };
  }

  if (urgency >= 3 && costOfDelay >= 3) {
    return { hasDeadline: true, dueWindow: "thisWeek" };
  }

  if (urgency >= 3) {
    return { hasDeadline: true, dueWindow: "later" };
  }

  return { hasDeadline: false, dueWindow: "noDeadline" };
};

const getDelayImpactFromAi = (costOfDelay: number): TriageAnswers["delayImpact"] => {
  if (costOfDelay >= 5) {
    return "severe";
  }

  if (costOfDelay >= 4) {
    return "disruptive";
  }

  if (costOfDelay >= 2) {
    return "annoying";
  }

  return "none";
};

const getImportanceSignalFromAi = (importance: number, upside: number): ImportanceSignal => {
  if (importance >= 4 || upside >= 4) {
    return "meaningful";
  }

  if (importance <= 2 && upside <= 2) {
    return "mostlyNoise";
  }

  return "unclear";
};

const getHandlingChoiceFromAi = (
  quadrant: Quadrant,
  friction: number,
  reversibility: number
): TriageAnswers["handlingChoice"] => {
  if (quadrant === "delegate") {
    if (friction >= 4) {
      return "reduce";
    }

    return reversibility >= 4 ? "automate" : "delegate";
  }

  if (quadrant === "eliminate") {
    return "ignore";
  }

  return "direct";
};

const computeCompositeScore = (
  triageResult: ClarityCandidate["triageResult"],
  delayCostScore: number,
  reliefScore: number,
  longTermScore: number,
  reversibilityScore: number,
  executionEaseScore: number
) => {
  const matrixScore = triageResult.urgencyScore * 0.6 + triageResult.importanceScore * 0.85;
  return Number(
    (
      matrixScore +
      delayCostScore * 0.72 +
      reliefScore * 0.76 +
      longTermScore * 0.62 +
      reversibilityScore * 0.28 +
      executionEaseScore * 0.38
    ).toFixed(2)
  );
};

const increaseDelayImpact = (delayImpact: TriageAnswers["delayImpact"]) => {
  switch (delayImpact) {
    case "none":
      return "annoying" as const;
    case "annoying":
      return "disruptive" as const;
    case "disruptive":
      return "severe" as const;
    case "severe":
    default:
      return "severe" as const;
  }
};

const hasExplicitCompareScaffold = (value: string) =>
  /\b(decide between|which one|vs\.?|versus|whether to|should i)\b/i.test(value);

const stripDisplayOrdinalPrefix = (value: string) =>
  value
    .replace(/^\s*(?:\((?:[1-5])\)|[1-5][.:]|(?:one|two|three|four|five|first|second|third|fourth|fifth):)\s*/i, "")
    .trim();

const stripDisplayMetaLead = (value: string) =>
  value
    .replace(
      /^(?:the real options are|real options are|the options are|actually handle first|actually do first|handle first|do first|what should (?:i\s+)?actually do first(?:,?\s*what should come second,?\s*and?\s*what can wait)?|what should come second|what can wait|what should wait|what to do (?:now|next|first)|which is the cleaner move|which is the clearer shape|this looks like the move|this looks like the clearer option|here(?:['’]?)s the cleaner option|here(?:['’]?)s the clearer shape|decision)\s*[:,-]?\s*/i,
      ""
    )
    .trim();

const stripDisplayTrailingConjunction = (value: string) => value.replace(/\b(?:or|and|but)\s*$/i, "").trim();

const cleanDisplayText = (value: string) =>
  stripDisplayTrailingConjunction(
    stripDisplayMetaLead(stripDisplayOrdinalPrefix(value.replace(/[.?!]+$/g, "").replace(/\s+/g, " ").trim()))
  );

const stripOptionIntro = (value: string) =>
  OPTION_INTRO_PREFIXES.reduce((currentValue, expression) => currentValue.replace(expression, ""), value).trim();

const cleanCandidate = (value: string) => {
  const withoutBullets = value.replace(/^[\s\-*•\d.)]+/, "").trim();
  const withoutPrefixes = FILLER_PREFIXES.reduce(
    (currentValue, expression) => currentValue.replace(expression, ""),
    withoutBullets
  );

  return withoutPrefixes
    .replace(/\b(?:or|and|but)\s*$/i, "")
    .replace(/[.,;:?!]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const toSentenceCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const removeWhyClause = (value: string) => value.replace(/\s+(?:because|since|so that|so|as)\s+.+$/i, "").trim();
const removeOptionContextTail = (value: string) =>
  value.replace(/\s*,?\s*(?:even though|although|though|despite)\s+.+$/i, "").replace(/\s+\bbut\b\s+.+$/i, "").trim();

const naturalizeOptionTitle = (value: string) => {
  let nextValue = value
    .replace(/\binstead\b/gi, "")
    .replace(/\s+for outreach\b/i, "")
    .replace(/^send (?:a )?cold email\b/i, "cold email")
    .replace(/^do cold email\b/i, "cold email")
    .replace(/^send (?:a )?cold call\b/i, "cold calling")
    .replace(/^do cold calling\b/i, "cold calling")
    .replace(/^cold calling for outreach\b/i, "cold calling")
    .replace(/^prioriti[sz]e\s+(american|us|dubai|uk|eu|local|international)\s+clients\b/i, "$1 clients")
    .replace(/^prioriti[sz]e\s+/i, "")
    .replace(/^focus on\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (/^(american|us|dubai|uk|eu|local|international)\s+clients\b/i.test(nextValue)) {
    return toSentenceCase(nextValue);
  }

  return toSentenceCase(nextValue);
};

const buildCandidateTitle = (value: string) => {
  const canonical = normalizeClarityTaskTitle(value);
  if (canonical) {
    return canonical;
  }

  const cleaned = cleanDisplayText(cleanCandidate(value));
  const withoutContext = removeOptionContextTail(removeWhyClause(cleaned));
  const withoutSubjectLead = withoutContext
    .replace(/^(?:i\s+(?:could|can|should|might|will|would)\s+|i\s+want\s+to\s+|i\s+need\s+to\s+)/i, "")
    .trim();
  const simplified = TITLE_PREFIXES.reduce(
    (currentValue, expression) => currentValue.replace(expression, ""),
    withoutSubjectLead
  ).trim();

  return naturalizeOptionTitle((simplified || withoutSubjectLead || withoutContext || cleaned).replace(/[.?!]+$/g, "").trim());
};

const extractContextSignals = (rawInput: string) =>
  dedupeSignals(
    CONTEXT_PATTERNS.filter(({ expression }) => expression.test(rawInput)).map(({ kind, label }) => ({
      kind,
      label,
    }))
  );

const inferSharedActionBase = (leftOption: string) => {
  const withoutContext = removeWhyClause(stripOptionIntro(leftOption));
  const withoutTimeAnchor = withoutContext
    .replace(/\s+\b(?:during|after|before|around|at|on|in)\b.+$/i, "")
    .replace(/\s+\b(?:now|later|today|tomorrow|tonight)\b.*$/i, "")
    .trim();

  return withoutTimeAnchor || withoutContext;
};

const inferInheritedTiming = (leftOption: string, rightOption: string) => {
  const normalizedRight = rightOption.toLowerCase();

  if (/^after\b/.test(normalizedRight)) {
    if (/\bduring (?:my\s+)?lunch(?: break)?\b/i.test(leftOption)) {
      return "after lunch";
    }

    return "later";
  }

  if (/^later\b/.test(normalizedRight)) {
    return "later";
  }

  if (/^tomorrow\b/.test(normalizedRight)) {
    return "tomorrow";
  }

  if (/^now\b/.test(normalizedRight)) {
    return "now";
  }

  return rightOption;
};

const normalizeInheritedOption = (leftOption: string, rightOption: string) => {
  const cleanedRight = cleanCandidate(rightOption)
    .replace(/^(?:(?:i can|can|i could|could|i should|should)\s+)?(?:do it|do this|it|this)\s+/i, "")
    .trim();

  if (!cleanedRight) {
    return cleanCandidate(leftOption);
  }

  if (/^(?:after|later|tomorrow|tonight|today|now|before|during)\b/i.test(cleanedRight)) {
    const baseAction = inferSharedActionBase(leftOption);
    const inheritedTiming = inferInheritedTiming(leftOption, cleanedRight);
    return [baseAction, inheritedTiming].filter(Boolean).join(" ").trim();
  }

  return cleanedRight;
};

const extractBinaryOptionTexts = (rawInput: string) => {
  if (shouldPreferTaskBoard(rawInput)) {
    return null;
  }

  const normalized = getCompareSourceText(rawInput)
    .replace(/[•·]/g, "\n")
    .replace(/\s+(?:vs\.?|versus)\s+/gi, " or ")
    .replace(/\s*,\s*or\s+/gi, " or ")
    .replace(/\s+/g, " ")
    .trim();

  if (/[\n;]/.test(normalized) || /\b(?:also|plus)\b/i.test(normalized)) {
    return null;
  }

  if (!(hasExplicitCompareScaffold(normalized) || /\s+\bor\b\s+/i.test(normalized))) {
    return null;
  }

  const parts = normalized.split(/\s+\bor\b\s+/i);
  if (parts.length !== 2) {
    return null;
  }

  const left = cleanCandidate(parts[0]);
  const right = normalizeInheritedOption(left, parts[1]);
  const options = filterEligibleCandidates([left, right], normalized, "alternatives");

  return options.length === 2 ? options : null;
};

const extractCompareOptionTexts = (rawInput: string) => {
  if (shouldPreferTaskBoard(rawInput)) {
    return null;
  }

  const normalized = getCompareSourceText(rawInput)
    .replace(/[•·]/g, "\n")
    .replace(/\s+(?:vs\.?|versus)\s+/gi, " or ")
    .replace(/\s+/g, " ")
    .trim();

  if (!(hasExplicitCompareScaffold(normalized) || /\s+\bor\b\s+/i.test(normalized))) {
    return null;
  }

  const compareParts = normalized
    .split(/\s+\bor\b\s+/i)
    .flatMap((part) => part.split(/\s*,\s*/))
    .map(cleanCandidate)
    .filter((value) => value.length > 2);
  const options = filterEligibleCandidates(compareParts, normalized, "alternatives");
  return options.length > 1 ? options : null;
};

const getContextAlignmentScore = (text: string, contextSignals: ContextSignal[]) => {
  let score = 0;

  contextSignals.forEach((signal) => {
    if (signal.kind === "lowEnergy") {
      if (/\b(after lunch|after|later|rest|break)\b/i.test(text)) {
        score += 0.95;
      }

      if (/\b(during lunch|during my lunch break|skip lunch|now|right away|immediately)\b/i.test(text)) {
        score -= 0.95;
      }
    }

    if (signal.kind === "deadlinePressure") {
      if (/\b(now|today|right away|immediately|before|during)\b/i.test(text)) {
        score += 0.85;
      }

      if (/\b(after|later|tomorrow)\b/i.test(text)) {
        score -= 0.65;
      }
    }

    if (signal.kind === "lowTimePressure") {
      if (/\b(after|later|this week|wait|schedule|rest)\b/i.test(text)) {
        score += 0.35;
      }

      if (/\b(now|today|right away|immediately)\b/i.test(text)) {
        score -= 0.3;
      }
    }

    if (
      signal.kind === "moneySpeed" &&
      /\b(faster|sooner|cash|receive money faster|receive money from (?:them|this) faster|get paid faster|pay faster)\b/i.test(text)
    ) {
      score += 1.05;
    }

    if (signal.kind === "higherValue" && /\b(pay more|higher paying|higher value|long term)\b/i.test(text)) {
      score += 0.7;
    }

    if (signal.kind === "socialPressure" && /\b(client|landlord|boss|team|partner)\b/i.test(text)) {
      score += 0.35;
    }
  });

  return clamp(score, -2, 2);
};

const splitDecisionSegments = (rawInput: string) =>
  rawInput
    .replace(/\s+/g, " ")
    .split(
      /(?<=[.?!])\s+|(?:,\s*|\s+)(?=(?:(?:also|and|plus)\s+)?(?:should i|do i|i(?:['’]m| am)\s+(?:also\s+)?(?:still\s+)?(?:trying to\s+)?decid(?:e|ing)|need to\s+(?:still\s+)?decide whether))/i
    )
    .map((segment) => segment.trim())
    .filter(Boolean);

const NUMBERED_SEGMENT_LEAD = /^(?:one|two|three|four|five|1|2|3|4|5)[.:]\s*/i;

const splitEnumeratedSegments = (rawInput: string) => {
  const normalized = rawInput.replace(/[•·]/g, "\n").replace(/\s+/g, " ").trim();
  const matches = [
    ...normalized.matchAll(
      /(?:^|\s)((?:one|two|three|four|five|1|2|3|4|5)[.:]\s+.*?)(?=(?:\s(?:one|two|three|four|five|1|2|3|4|5)[.:]\s+)|$)/gis
    ),
  ];

  if (!matches.length) {
    return [];
  }

  return matches
    .map((match) => match[1]?.trim() ?? "")
    .map((segment) => segment.replace(NUMBERED_SEGMENT_LEAD, "").trim())
    .filter(Boolean);
};

const looksLikeDecisionLead = (value: string) =>
  /^(?:also\s+)?(?:should i|do i|whether to|i(?:['’]m| am)\s+(?:also\s+)?(?:still\s+)?(?:trying to\s+)?decid(?:e|ing)|need to\s+(?:still\s+)?decide whether)/i.test(
    value.trim()
  );

const inferCandidateRelationship = (
  sourceText: string,
  candidateTexts: string[]
): ClarityCandidateRelationship =>
  candidateTexts.length >= 3 && PRIORITY_BOARD_PATTERNS.some((pattern) => pattern.test(sourceText))
    ? "tasks"
    : candidateTexts.length > 1 && (hasExplicitCompareScaffold(sourceText) || /\s+\bor\b\s+/i.test(sourceText))
      ? "alternatives"
      : "tasks";

const isMetaLanguage = (value: string) => META_LANGUAGE_PATTERNS.some((pattern) => pattern.test(value));

const isContextOnlyFragment = (value: string) => CONTEXT_ONLY_PATTERNS.some((pattern) => pattern.test(value));

const hasActionVerb = (value: string) => ACTION_VERB_PATTERNS.some((pattern) => pattern.test(value));

const hasOptionNoun = (value: string) => OPTION_NOUN_PATTERNS.some((pattern) => pattern.test(value));

const isEligibleCandidate = (
  value: string,
  relationship: ClarityCandidateRelationship,
  sourceText: string
) => {
  const cleaned = cleanCandidate(value);
  const normalized = cleaned.toLowerCase();

  if (!cleaned || cleaned.length <= 2) {
    return false;
  }

  if (isMetaLanguage(cleaned) || isContextOnlyFragment(cleaned)) {
    return false;
  }

  if (isOutcomeOnlyFragment(cleaned)) {
    return false;
  }

  if (isSupportEvidenceClause(cleaned)) {
    return false;
  }

  if (isSupportOnlyAggregate(cleaned)) {
    return false;
  }

  if (
    /\b(?:would help|helps me right now|should wait|can wait|feel good about it|mentally tired|very hungry|tired right now)\b/i.test(
      cleaned
    )
  ) {
    return false;
  }

  if (hasActionVerb(cleaned)) {
    return true;
  }

  if (normalizeClarityTaskTitle(cleaned)) {
    return true;
  }

  if (relationship === "alternatives") {
    if (
      hasOptionNoun(cleaned) &&
      !/^(?:but\s+)?(?:i|it|this|that)\b/i.test(normalized) &&
      !/\b(?:would|could|should|might)\b/i.test(normalized)
    ) {
      return true;
    }

    if (/\b(?:now|later|today|tomorrow|after lunch|before lunch|after work|this week)\b/i.test(normalized)) {
      return true;
    }
  }

  if (
    relationship === "tasks" &&
    hasOptionNoun(cleaned) &&
    !/^(?:but\s+)?(?:i|it|this|that)\b/i.test(normalized) &&
    !/\b(?:would|could|should|might)\b/i.test(normalized) &&
    !/\bneeds?\b.+\b(?:before i feel|before we feel|until i feel)\b/i.test(normalized)
  ) {
    return true;
  }

  if (
    relationship === "tasks" &&
    /^(?:the|a|an)\s+\w.+\b(?:needs?|requires?)\b/i.test(normalized) &&
    !/\b(?:before i feel|feel good about it|would help me)\b/i.test(normalized)
  ) {
    return true;
  }

  return sourceText.trim() === cleaned && hasOptionNoun(cleaned);
};

const filterEligibleCandidates = (
  candidateTexts: string[],
  sourceText: string,
  relationship: ClarityCandidateRelationship
) => {
  const normalizedCandidates =
    relationship === "alternatives"
      ? candidateTexts
          .flatMap((candidateText) => splitActionListClause(candidateText))
          .map(cleanCandidate)
      : candidateTexts.map(cleanCandidate);
  const filtered = dedupe(normalizedCandidates).filter((candidateText) =>
    isEligibleCandidate(candidateText, relationship, sourceText)
  );

  return filtered;
};

const trimLeadingConnector = (value: string) =>
  value.replace(/^(?:and|but|so|also|then)\s+/i, "").trim();

const protectCompoundActionPairs = (value: string) =>
  value
    .replace(/\breview\s+and\s+approve\b/gi, "review & approve")
    .replace(/\bback\s+up\s+and\s+(organi[sz]e|reorgani[sz]e)\b/gi, "back up & $1")
    .replace(/\barchive\s+and\s+label\b/gi, "archive & label");

const restoreCompoundActionPairs = (value: string) => value.replace(/\s*&\s*/g, " and ");

const splitPromptSentences = (rawInput: string) =>
  rawInput
    .replace(/[•·]/g, "\n")
    .replace(/\s+/g, " ")
    .split(/(?<=[.?!])\s+|[;\n]+/)
    .map((segment) => trimLeadingConnector(segment.trim()))
    .filter(Boolean);

const splitShorthandTaskFragments = (rawInput: string) =>
  splitPromptSentences(rawInput)
    .flatMap((segment) => segment.split(/\s*(?:\/|\|)\s*/))
    .map(cleanCandidate)
    .filter(Boolean);

const splitSupportClauses = (rawInput: string) =>
  splitPromptSentences(rawInput)
    .flatMap((segment) => segment.split(/,\s+|\s+\band\b\s+(?=(?:the|this|that|it)\b)/i))
    .map((segment) => cleanCandidate(segment))
    .filter(Boolean);

const isOutcomeOnlyFragment = (value: string) => {
  const cleaned = cleanCandidate(value);
  if (!cleaned) {
    return false;
  }

  if (hasActionVerb(cleaned) || /\b(?:needs?|requires?)\b/i.test(cleaned)) {
    return false;
  }

  const looksLikeOutcome =
    /^(?:the|a|an|this|that)\s+.+\b(?:could|would|may|might)\b/i.test(cleaned) ||
    /\b(?:could turn into|would reduce|may be hurting|might be hurting|affects?\b|would improve|could improve)\b/i.test(
      cleaned
    );

  if (looksLikeOutcome) {
    return true;
  }

  if (hasActionVerb(cleaned) || /\b(?:needs?|requires?)\b/i.test(cleaned)) {
    return false;
  }

  return false;
};

const isSupportEvidenceClause = (value: string) => {
  const cleaned = cleanCandidate(value);
  if (!cleaned) {
    return false;
  }

  const startsLikeAction =
    /^(?:i\s+(?:can|could|should|might|need|have|want|will|would)\s+)?(?:reply|respond|send|contact|call|message|follow up|fix|finish|complete|review|submit|reach out|email|prepare|ask|pay|invoice|record|organi[sz]e|reorgani[sz]e|clean up|cleanup|clean|write|draft|build|update|edit|sort|handle|polish|revise|rehearse|publish|post|back up|backup|approve|repair|rewrite|troubleshoot|package|confirm|reconcile|trim|archive|label)\b/i.test(
      cleaned
    );

  if (startsLikeAction) {
    return false;
  }

  if (!/^(?:the|this|that|it)\b/i.test(cleaned) && Boolean(normalizeClarityTaskTitle(cleaned))) {
    return false;
  }

  return (
    /\bmatters?\b/i.test(cleaned) ||
    /^(?:the|this|that|it)\s+.+\bmatters?\s+(?:because|since|as)\b/i.test(cleaned) ||
    /\b(?:could lead to|could improve|could strengthen|helps visibility|reduces?\s+risk|may be costing|may be blocking|affects how|slow someone else down|miss something important)\b/i.test(
      cleaned
    )
  );
};

const isSupportOnlyAggregate = (value: string) => {
  const cleaned = cleanCandidate(value);
  if (!cleaned) {
    return false;
  }

  const commaCount = cleaned.match(/,/g)?.length ?? 0;
  const outcomeMarkerCount =
    cleaned.match(/\b(?:could|would|may|might|affects?|hurting|costing|reduce|improve|help)\b/gi)?.length ?? 0;
  const startsLikeAction =
    /^(?:i\s+(?:need|have|want|can|could|should|might|will|would)\s+to\s+|(?:send|reply|respond|follow up|call|fix|book|pay|prepare|ask|record|organi[sz]e|reorgani[sz]e|clean up|cleanup|clean|write|draft|build|update|edit|sort|handle|finish|complete|review|submit|reach out|contact|email|message|polish|revise|rehearse|publish|post|back up|backup|approve|repair|rewrite|troubleshoot|package|confirm|reconcile|trim|archive|label)\b)/i.test(
      cleaned
    );

  return !startsLikeAction && commaCount >= 2 && outcomeMarkerCount >= 2;
};

const getCompareSourceText = (rawInput: string) => {
  const compareSegments = splitPromptSentences(rawInput).filter(
    (segment) =>
      (hasExplicitCompareScaffold(segment) || /\s+\bor\b\s+/i.test(segment)) &&
      (hasActionVerb(segment) ||
        splitActionListClause(segment).some(
          (part) => hasActionVerb(part) || Boolean(normalizeClarityTaskTitle(part)) || hasOptionNoun(part)
        ))
  );

  if (compareSegments.length) {
    return compareSegments.join(" ");
  }

  return rawInput;
};

const shouldPreferTaskBoard = (rawInput: string) =>
  PRIORITY_BOARD_PATTERNS.some((pattern) => pattern.test(rawInput)) || extractActionClauses(rawInput).length >= 3;

const simpleSingularize = (value: string) => {
  if (value.length <= 3) {
    return value;
  }

  if (/ies$/.test(value)) {
    return `${value.slice(0, -3)}y`;
  }

  if (/sses$/.test(value) || /ss$/.test(value)) {
    return value;
  }

  if (/s$/.test(value)) {
    return value.slice(0, -1);
  }

  return value;
};

const getCandidateSupportKeywords = (candidateText: string) => {
  const rawText = [candidateText, buildCandidateTitle(candidateText)].join(" ");

  return Array.from(
    new Set(
      rawText
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .map((token) => simpleSingularize(token))
        .filter((token) => token.length >= 4 && !SUPPORT_TOKEN_STOPWORDS.has(token))
    )
  );
};

const getBaseCandidateClause = (candidateText: string) => {
  const candidateSentences = splitPromptSentences(candidateText);
  const candidateClauses = (candidateSentences.length ? candidateSentences : [candidateText])
    .flatMap((segment) =>
      protectCompoundActionPairs(segment).split(
        /,\s+|\s+\band\b\s+(?=(?:i\s+still\s+need\s+to|i\s+need\s+to|send|reply|respond|follow up|call|fix|book|pay|prepare|ask|record|organi[sz]e|clean up|cleanup|clean|write|draft|build|update|edit|sort|polish|revise|rehearse|publish|post|back up|backup|repair|rewrite|troubleshoot|package|confirm|reconcile|trim|archive|label))/i
      )
    )
    .map((segment) => cleanCandidate(restoreCompoundActionPairs(segment)))
    .filter(Boolean);

  const explicitActionClause = candidateClauses.find(
    (clause) => Boolean(normalizeClarityTaskTitle(clause)) || hasActionVerb(clause)
  );

  if (explicitActionClause) {
    return explicitActionClause;
  }

  return candidateClauses[0] ?? cleanCandidate(candidateText);
};

const buildCandidateSourceText = (
  candidateText: string,
  rawInput: string,
  allCandidateTexts: string[]
) => {
  const cleanedCandidate = getBaseCandidateClause(candidateText);
  const keywords = getCandidateSupportKeywords(cleanedCandidate);
  if (!keywords.length) {
    return cleanedCandidate;
  }

  const otherCandidateTitles = new Set(
    allCandidateTexts
      .filter((value) => value !== candidateText)
      .map((value) => buildCandidateTitle(value).toLowerCase())
  );
  const supportClauses = splitSupportClauses(rawInput).filter((clause) => {
    if (!clause || clause.toLowerCase() === cleanedCandidate.toLowerCase()) {
      return false;
    }

    if (otherCandidateTitles.has(buildCandidateTitle(clause).toLowerCase())) {
      return false;
    }

    if (
      isMetaLanguage(clause) ||
      isContextOnlyFragment(clause) ||
      (!isOutcomeOnlyFragment(clause) && !isSupportEvidenceClause(clause))
    ) {
      return false;
    }

    const normalizedClause = clause.toLowerCase();
    return keywords.some((keyword) => normalizedClause.includes(keyword));
  });

  return [cleanedCandidate, ...supportClauses.slice(0, 2)].join(". ");
};

const INLINE_TASK_PREFIX =
  "(?:i\\s+(?:also\\s+)?(?:still\\s+)?(?:need|have)\\s+to\\s+|(?:also\\s+)?(?:still\\s+)?(?:need|have)\\s+to\\s+|i\\s+want\\s+to\\s+)?";
const CLAUSE_SPLIT_TARGET =
  "(?:need|have|want|should|could|can|must|will|won['’]?t|would|send|reply|respond|answer|follow up|call|fix|book|pay|prepare|ask|rest|ship|submit|review|reach out|record|organi[sz]e|reorgani[sz]e|clean up|cleanup|clean|write|draft|build|update|edit|sort|polish|revise|rehearse|publish|post|back up|backup|repair|rewrite|troubleshoot|package|confirm|reconcile|trim|archive|label)\\b";
const ACTION_LIST_SPLIT_TARGET =
  "(?:send|reply|respond|answer|follow up|call|fix|book|pay|prepare|ask|rest|review|submit|ship|reach out|contact|email|message|write|move|schedule|prioriti[sz]e|focus on|record|organi[sz]e|reorgani[sz]e|clean up|cleanup|clean|draft|build|update|edit|sort|handle|finish|complete|polish|revise|rehearse|publish|post|back up|backup|repair|rewrite|troubleshoot|package|confirm|reconcile|trim|archive|label|client\\s+revision|invoice\\s+reminder|demo\\s+video|portfolio\\s+page|services?\\s+page|case\\s+study|booking\\s+link|booking\\s+widget|meeting\\s+notes|meeting\\s+prep|warm\\s+leads?|messy\\s+files?|contact\\s+form|signup\\s+issue|checkout\\s+flow|testimonial\\s+video|talking\\s+points|pricing\\s+follow\\-?up|content|presentation|newsletter\\s+signup|travel\\s+details|proposal\\s+template|strategy\\s+call|agenda|quote|homepage\\s+copy|hero\\s+section|project\\s+assets?|payments?\\s+and\\s+expenses?|subscriptions?\\s+and\\s+refunds?|calendar\\s+booking\\s+step|(?:us|american)\\s+proposal|revised?\\s+(?:proposal|contract)|contract\\s+revision|outstanding\\s+revision|overdue\\s+payment|email\\s+automation|landing\\s+page\\s+headline|discovery\\s+call\\s+questions?|faq|payment\\s+link|shared\\s+folder\\s+structure|team\\s+handoff|slides?|receipts?\\s+for\\s+bookkeeping|crm\\s+tags|explainer|collaborator\\s+waiting\\s+for\\s+approval)";

const mergeFragmentedClauses = (clauses: string[]) => {
  const merged: string[] = [];
  let pendingPrefix = "";

  clauses.forEach((clause) => {
    const trimmed = trimLeadingConnector(clause.trim());
    if (!trimmed) {
      return;
    }

    if (/^(?:i|we|it|this|that)$/i.test(trimmed)) {
      pendingPrefix = pendingPrefix ? `${pendingPrefix} ${trimmed}` : trimmed;
      return;
    }

    const nextClause = pendingPrefix ? `${pendingPrefix} ${trimmed}` : trimmed;
    pendingPrefix = "";
    merged.push(nextClause);
  });

  if (pendingPrefix && merged.length) {
    merged[merged.length - 1] = `${merged[merged.length - 1]} ${pendingPrefix}`.trim();
  }

  return merged;
};

const splitActionListClause = (clause: string) =>
  protectCompoundActionPairs(clause)
    .split(
      new RegExp(
        `,\\s+(?=(?:i\\s+could\\s+|i\\s+can\\s+|i\\s+should\\s+|i\\s+might\\s+|${INLINE_TASK_PREFIX}${ACTION_LIST_SPLIT_TARGET}))|\\s+\\band\\b\\s+(?=(?:${INLINE_TASK_PREFIX}${ACTION_LIST_SPLIT_TARGET}))|\\s+\\bor\\b\\s+(?=(?:${INLINE_TASK_PREFIX}${ACTION_LIST_SPLIT_TARGET}))`,
        "i"
      )
    )
    .map((part) => restoreCompoundActionPairs(trimLeadingConnector(part.trim())))
    .filter(Boolean);

const splitActionClauses = (rawInput: string) =>
  mergeFragmentedClauses(
    protectCompoundActionPairs(rawInput)
      .replace(/[•·]/g, "\n")
      .replace(/\s+/g, " ")
      .split(new RegExp(`(?<=[.?!])\\s+|[;\\n]+|\\s+(?=(?:but|and|also|then|so)\\s+(?:i\\s+)?${CLAUSE_SPLIT_TARGET})`, "i"))
      .map((clause) => restoreCompoundActionPairs(trimLeadingConnector(clause.trim())))
      .filter(Boolean)
  );

const normalizeActionClause = (value: string) => {
  const cleaned = cleanCandidate(value);
  const shouldSalvageEmbeddedAction =
    /^(?:help me|i need help|i have a messy board|i have a crowded(?:\s+\w+)? board|i need the clearest|i need to choose)\b/i.test(
      cleaned
    ) ||
    /:\s*(?:send|reply|respond|answer|follow up|call|fix|book|pay|prepare|ask|record|organi[sz]e|reorgani[sz]e|clean up|cleanup|clean|write|draft|build|update|edit|sort|handle|finish|complete|review|submit|reach out|contact|email|message|polish|revise|rehearse|publish|post|back up|backup|approve|repair|rewrite|troubleshoot|package|confirm|reconcile|trim|archive|label)\b/i.test(
      cleaned
    );
  const salvageSource = shouldSalvageEmbeddedAction && /:\s*/.test(cleaned)
    ? cleaned.split(/:\s*/).slice(1).join(": ").trim()
    : cleaned;
  const salvaged = shouldSalvageEmbeddedAction
    ? cleanCandidate(
        salvageSource.replace(
          /^.*?(?=\b(?:send|reply|respond|answer|follow up|call|fix|book|pay|prepare|ask|record|organi[sz]e|reorgani[sz]e|clean up|cleanup|clean|write|draft|build|update|edit|sort|handle|finish|complete|review|submit|reach out|contact|email|message|polish|revise|rehearse|publish|post|back up|backup|approve|repair|rewrite|troubleshoot|package|confirm|reconcile|trim|archive|label)\b)/i,
          ""
        )
      )
    : "";
  const base = salvaged || cleaned;
  const withoutReasonTail = base
    .replace(/\s+(?:because|since|so|as)\s+.+$/i, "")
    .replace(/\s+\b(?:but|although|though)\b\s+.+$/i, "")
    .trim();

  const withoutNeedPrefix = withoutReasonTail
    .replace(/^(?:i\s+need\s+to|need\s+to|i\s+have\s+to|have\s+to|i\s+could|i\s+can|i\s+should|i\s+might|i\s+would)\s+/i, "")
    .trim();

  return withoutNeedPrefix || withoutReasonTail || cleaned;
};

const extractActionClauses = (rawInput: string) => {
  const enumeratedClauses = splitEnumeratedSegments(rawInput)
    .map((segment) => sanitizeAiActionTitle(segment, rawInput) || normalizeActionClause(segment))
    .filter((clause) => clause.length > 2)
    .filter((clause) => !isMetaLanguage(clause) && !isContextOnlyFragment(clause));

  if (enumeratedClauses.length > 1) {
    return filterEligibleCandidates(enumeratedClauses, rawInput, inferCandidateRelationship(rawInput, enumeratedClauses));
  }

  const clauses = splitActionClauses(rawInput);
  const actionClauses = clauses
    .flatMap(splitActionListClause)
    .map(normalizeActionClause)
    .filter((clause) => clause.length > 2)
    .filter((clause) => !isMetaLanguage(clause) && !isContextOnlyFragment(clause));

  return filterEligibleCandidates(actionClauses, rawInput, "tasks");
};

const mergeMissingActionTexts = (primaryActionTexts: string[], fallbackActionTexts: string[]) => {
  const merged = [...primaryActionTexts];
  const keyIndex = new Map<string, number>();

  const getMergeableTitle = (value: string) => {
    const canonical = normalizeClarityTaskTitle(value);
    if (canonical) {
      return canonical;
    }

    const fallbackTitle = buildCandidateTitle(value);
    return normalizeClarityTaskTitle(fallbackTitle);
  };

  primaryActionTexts.forEach((actionText, index) => {
    const title = getMergeableTitle(actionText);
    const key = title ? getCanonicalClarityTaskKey(title) || title.toLowerCase() : "";
    if (key && !keyIndex.has(key)) {
      keyIndex.set(key, index);
    }
  });

  fallbackActionTexts.forEach((actionText) => {
    const title = getMergeableTitle(actionText);
    const key = title ? getCanonicalClarityTaskKey(title) || title.toLowerCase() : "";
    if (!key) {
      return;
    }

    const existingIndex = keyIndex.get(key);
    if (existingIndex === undefined) {
      keyIndex.set(key, merged.length);
      merged.push(actionText);
      return;
    }

    if (getCandidateSourcePriority(actionText) > getCandidateSourcePriority(merged[existingIndex])) {
      merged[existingIndex] = actionText;
    }
  });

  return merged;
};

const buildMergedCandidateTexts = (primaryActionTexts: string[], fallbackActionTexts: string[]) =>
  dedupeItems(collapseEquivalentActionTexts(mergeMissingActionTexts(primaryActionTexts, fallbackActionTexts)));

const getDeterministicBoardCandidateTexts = (rawInput: string) =>
  buildMergedCandidateTexts(extractActionClauses(rawInput), extractCandidateTexts(rawInput));

const preserveMeaningfulMultiTaskBoard = (
  normalizedInput: string,
  mergedCandidateTexts: string[],
  selectedDecisionGroupId?: string
) => {
  if (selectedDecisionGroupId) {
    return {
      candidateTexts: mergedCandidateTexts.slice(0, MAX_CLARITY_BOARD_ITEMS),
      preservedFromFullInput: false,
      fullBoardCandidateTexts: mergedCandidateTexts,
    };
  }

  const fullBoardCandidateTexts = buildMergedCandidateTexts(
    extractCandidateTexts(normalizedInput),
    extractActionClauses(normalizedInput)
  );

  if (fullBoardCandidateTexts.length >= 2 && mergedCandidateTexts.length < fullBoardCandidateTexts.length) {
    return {
      candidateTexts: fullBoardCandidateTexts.slice(0, MAX_CLARITY_BOARD_ITEMS),
      preservedFromFullInput: true,
      fullBoardCandidateTexts,
    };
  }

  return {
    candidateTexts: mergedCandidateTexts.slice(0, MAX_CLARITY_BOARD_ITEMS),
    preservedFromFullInput: false,
    fullBoardCandidateTexts,
  };
};

const getCandidateSourcePriority = (value: string) => {
  const cleaned = cleanCandidate(value);
  const title = buildCandidateTitle(cleaned);
  let score = 0;

  if (title) {
    score += 3;
  }

  if (/\b(?:today|tomorrow|urgent|cash flow|rent|deadline|faster|warmer)\b/i.test(cleaned)) {
    score += 2.5;
  }

  if (/\b(?:because|already expects|still needs|may look unreliable|affecting|credibility)\b/i.test(cleaned)) {
    score += 0.5;
  }

  const actionVerbCount =
    cleaned.match(
      /\b(?:reply|respond|send|contact|call|message|follow up|fix|finish|complete|review|submit|reach out|email|prepare|ask|pay|invoice|record|organi[sz]e|reorgani[sz]e|clean up|cleanup|clean|write|draft|build|update|edit|sort|handle|polish|revise|rehearse|publish|post|back up|backup|approve|repair|rewrite|troubleshoot|package|confirm|reconcile|trim|archive|label)\b/gi
    )?.length ?? 0;

  if (actionVerbCount >= 1) {
    score += 1.35;
  }

  if (actionVerbCount > 1) {
    score -= 3;
  }

  if (/[,:;]/.test(cleaned) && actionVerbCount > 1) {
    score -= 1.2;
  }

  if (/\s+\b(?:or|and)\b\s+/i.test(cleaned) && actionVerbCount > 1) {
    score -= 1.2;
  }

  if (title && cleaned.toLowerCase() === title.toLowerCase()) {
    score += 1.2;
  }

  if (cleaned.split(/\s+/).length <= 6) {
    score += 0.8;
  } else if (cleaned.split(/\s+/).length >= 12) {
    score -= 0.8;
  }

  if (isOutcomeOnlyFragment(cleaned) && actionVerbCount === 0) {
    score -= 4.2;
  }

  if (
    actionVerbCount === 0 &&
    /^(?:the|this|that|it)\b/i.test(cleaned) &&
    /\b(?:affects?|hurting|costing|could|would|may|might|reduce|improve|help)\b/i.test(cleaned)
  ) {
    score -= 1.4;
  }

  return score;
};

const collapseEquivalentActionTexts = (values: string[]) => {
  const merged: string[] = [];
  const keyIndex = new Map<string, number>();

  values.forEach((value) => {
    const cleaned = cleanCandidate(value);
    if (!cleaned) {
      return;
    }

    const title =
      normalizeClarityTaskTitle(cleaned) || normalizeClarityTaskTitle(buildCandidateTitle(cleaned));
    if (!title) {
      return;
    }

    const key = getCanonicalClarityTaskKey(title) || title.toLowerCase();
    const existingIndex = keyIndex.get(key);
    if (existingIndex === undefined) {
      keyIndex.set(key, merged.length);
      merged.push(value);
      return;
    }

    const existing = merged[existingIndex];
    if (getCandidateSourcePriority(cleaned) > getCandidateSourcePriority(existing)) {
      merged[existingIndex] = value;
    }
  });

  return merged;
};

const countCompareScaffolds = (value: string) =>
  (value.match(/\b(?:do i|should i|whether to|decide whether to|deciding whether to|vs\.?|versus)\b/gi) ?? [])
    .length;

const hasExplicitSeparateDecisionSignal = (rawInput: string) => {
  const segments = splitDecisionSegments(rawInput);
  const explicitDecisionSegments = segments.filter((segment) => looksLikeDecisionLead(segment)).length;

  if (explicitDecisionSegments >= 2) {
    return true;
  }

  if (/\b(?:also|plus)\s+(?:i(?:['’]m| am)\s+)?(?:still\s+)?(?:trying to\s+)?decid(?:e|ing)\b/i.test(rawInput)) {
    return true;
  }

  return countCompareScaffolds(rawInput) >= 2;
};

const hasClearlySeparateCompareDecisions = (
  rawInput: string,
  decisionGroups: ClarityDecisionGroup[]
) => {
  if (!hasExplicitSeparateDecisionSignal(rawInput)) {
    return false;
  }

  const compareGroups = decisionGroups.filter(
    (group) => group.candidateRelationship === "alternatives" && group.candidateTexts.length > 1
  );

  return compareGroups.length >= 2;
};

const shouldDescribeAsSeparateChoices = (
  rawInput: string,
  decisionGroups: ClarityDecisionGroup[]
) => {
  if (decisionGroups.length <= 1) {
    return false;
  }

  return hasClearlySeparateCompareDecisions(rawInput, decisionGroups);
};

const shouldKeepStructuredActionsCombined = (
  rawInput: string,
  cleanup: AiCleanupResult,
  decisionGroups: ClarityDecisionGroup[],
  cleanedActionTitles: string[],
  extractedFallbackActions: string[],
  selectedDecisionGroupId?: string
) => {
  if (selectedDecisionGroupId) {
    return false;
  }

  if (cleanedActionTitles.length >= 3) {
    return true;
  }

  if (cleanup.decision_type === "foggy_dump") {
    return true;
  }

  if (Math.max(cleanedActionTitles.length, extractedFallbackActions.length) >= 3) {
    return !hasClearlySeparateCompareDecisions(rawInput, decisionGroups);
  }

  if (!hasExplicitSeparateDecisionSignal(rawInput) && extractedFallbackActions.length >= 3) {
    return true;
  }

  if (decisionGroups.length <= 1) {
    return false;
  }

  const allGroupsAreSingleAction = decisionGroups.every((group) => group.candidateTexts.length <= 1);
  if (allGroupsAreSingleAction) {
    return true;
  }

  return false;
};

const isShortNounLikeOption = (value: string) =>
  !/^(send|call|email|fix|rest|book|schedule|wait|move|take|protect|keep|follow up|reply|start)\b/i.test(
    value
  ) && value.split(/\s+/).length <= 4;

const getOptionJoiner = (titles: string[]) =>
  titles.length === 2 && titles.every((title) => isShortNounLikeOption(title)) ? "vs" : "or";

const buildTradeoffHint = (sourceText: string, candidateTexts: string[]) => {
  const normalized = sourceText.toLowerCase();
  const titles = candidateTexts.map(buildCandidateTitle);

  if (
    /pay more|higher paying|higher value/i.test(normalized) &&
    /receive money faster|receive money from (?:them|this) faster|get paid faster|paid faster|money faster|cash faster|pay faster/i.test(
      normalized
    )
  ) {
    return "Higher pay vs faster payment.";
  }

  if (
    /during (?:my\s+)?lunch(?: break)?/i.test(normalized) &&
    /\bafter\b/i.test(normalized) &&
    /hungry|tired|low energy/i.test(normalized)
  ) {
    return "Sending sooner vs protecting your energy.";
  }

  if (/\bnow\b/i.test(normalized) && /\b(?:later|after|tomorrow)\b/i.test(normalized)) {
    return "Act sooner vs wait a bit.";
  }

  if (/\bprioriti[sz]e\b/i.test(normalized) && /\bkeep it broad\b/i.test(normalized)) {
    return "Focused niche vs broader reach.";
  }

  if (titles.length === 2 && /\bclients\b/i.test(titles[0]) && /\bclients\b/i.test(titles[1])) {
    return `${titles[0]} vs ${titles[1]}.`;
  }

  return undefined;
};

const buildDecisionGroupLabel = (candidateTexts: string[], sourceText: string) => {
  const titles = candidateTexts.map(buildCandidateTitle).map(cleanDisplayText);
  if (titles.length <= 1) {
    return titles[0] ?? "This decision";
  }

  if (titles.length === 2) {
    return `${titles[0]} ${getOptionJoiner(titles)} ${titles[1]}`;
  }

  const tradeoffHint = buildTradeoffHint(sourceText, candidateTexts);
  if (tradeoffHint && / vs /i.test(tradeoffHint)) {
    return tradeoffHint.replace(/\.$/, "");
  }

  return `${titles.slice(0, 2).join(", ")}, and ${titles[2]}`;
};

const detectDecisionGroups = (rawInput: string): ClarityDecisionGroup[] =>
  splitDecisionSegments(rawInput)
    .map((segment, index) => {
      const candidateTexts = extractCandidateTexts(segment);
      const relationship = inferCandidateRelationship(segment, candidateTexts);

      const isDecisionSegment =
        looksLikeDecisionLead(segment) ||
        hasExplicitCompareScaffold(segment) ||
        (relationship === "alternatives" && candidateTexts.length <= 2);

      if (!isDecisionSegment || candidateTexts.length < 1 || candidateTexts.length > MAX_CLARITY_GROUP_ITEMS) {
        return null;
      }

      return {
        id: `decision-group-${index + 1}`,
        label: buildDecisionGroupLabel(candidateTexts, segment),
        sourceText: segment.replace(/[.?!]+$/g, "").trim(),
        candidateTexts,
        candidateRelationship: relationship,
        ...(buildTradeoffHint(segment, candidateTexts)
          ? { tradeoffHint: buildTradeoffHint(segment, candidateTexts) }
          : {}),
      };
    })
    .filter((group): group is ClarityDecisionGroup => Boolean(group));

const scoreDecisionGroup = (group: ClarityDecisionGroup) => {
  const contextSignals = extractContextSignals(group.sourceText);
  const candidates = group.candidateTexts.map((candidateText, index) =>
    buildCandidate(candidateText, index, contextSignals)
  );
  const sortedCandidates = sortCandidates(candidates, contextSignals);
  const highestDelay = Math.max(...sortedCandidates.map((candidate) => candidate.delayCostScore));
  const hasDeadline = sortedCandidates.some((candidate) => candidate.triageAnswers.hasDeadline) ? 0.85 : 0;
  const hardToUndoWeight = Math.max(...sortedCandidates.map((candidate) => 4 - candidate.reversibilityScore)) * 0.35;

  return (sortedCandidates[0]?.compositeScore ?? 0) + highestDelay * 0.7 + hasDeadline + hardToUndoWeight;
};

const pickPrimaryDecisionGroup = (decisionGroups: ClarityDecisionGroup[]) =>
  [...decisionGroups].sort((left, right) => scoreDecisionGroup(right) - scoreDecisionGroup(left))[0];

const extractCandidateTexts = (rawInput: string) => {
  const enumeratedCandidates = splitEnumeratedSegments(rawInput)
    .map((segment) => sanitizeAiActionTitle(segment, rawInput) || buildCandidateTitle(normalizeActionClause(segment)))
    .filter((value) => value.length > 2);
  const enumeratedRelationship = inferCandidateRelationship(rawInput, enumeratedCandidates);
  const eligibleEnumeratedCandidates = filterEligibleCandidates(
    enumeratedCandidates,
    rawInput,
    enumeratedRelationship
  );

  if (eligibleEnumeratedCandidates.length > 1) {
    return eligibleEnumeratedCandidates;
  }

  const binaryOptions = extractBinaryOptionTexts(rawInput);
  if (binaryOptions) {
    return binaryOptions;
  }

  const compareOptions = extractCompareOptionTexts(rawInput);
  if (compareOptions) {
    return compareOptions;
  }

  const normalized = rawInput
    .replace(/[•·]/g, "\n")
    .replace(/\s+(?:vs\.?|versus)\s+/gi, ", ")
    .replace(/\s+/g, " ")
    .trim();
  const compareSourceText = getCompareSourceText(normalized);
  const preferTaskBoard = shouldPreferTaskBoard(normalized);

  if (!preferTaskBoard && (hasExplicitCompareScaffold(compareSourceText) || /\s+\bor\b\s+/i.test(compareSourceText))) {
    const compareSplit = filterEligibleCandidates(
      splitActionClauses(compareSourceText)
        .flatMap(splitActionListClause)
        .map(cleanCandidate)
        .filter((value) => value.length > 2),
      compareSourceText,
      "alternatives"
    );

    if (compareSplit.length > 1) {
      return compareSplit;
    }
  }

  const paragraphActions = isParagraphLikeInput(normalized) ? extractActionClauses(normalized) : [];

  const shorthandFragments = dedupe(splitShorthandTaskFragments(normalized));
  const shorthandRelationship = inferCandidateRelationship(normalized, shorthandFragments);
  const eligibleShorthandFragments = filterEligibleCandidates(
    shorthandFragments,
    normalized,
    shorthandRelationship
  );

  if (eligibleShorthandFragments.length > 1 && eligibleShorthandFragments.length >= paragraphActions.length) {
    return eligibleShorthandFragments;
  }

  if (paragraphActions.length > 1) {
    return paragraphActions;
  }

  const delimiterSplit = normalized
    .split(/[\n,;]+/)
    .map(cleanCandidate)
    .filter((value) => value.length > 2);
  const delimiterRelationship = inferCandidateRelationship(normalized, delimiterSplit);
  const eligibleDelimiterSplit = filterEligibleCandidates(delimiterSplit, normalized, delimiterRelationship);

  if (eligibleDelimiterSplit.length > 1) {
    return eligibleDelimiterSplit;
  }

  if (!preferTaskBoard && (hasExplicitCompareScaffold(compareSourceText) || /\s+\bor\b\s+/i.test(compareSourceText))) {
    const compareSplit = compareSourceText
      .split(/\s+\bor\b\s+/i)
      .map(cleanCandidate)
      .filter((value) => value.length > 2);
    const eligibleCompareSplit = filterEligibleCandidates(compareSplit, compareSourceText, "alternatives");

    if (eligibleCompareSplit.length > 1) {
      return eligibleCompareSplit;
    }
  }

  const candidates = dedupe(
    normalized
      .split(/[\n,;]+/)
      .map(cleanCandidate)
      .filter((value) => value.length > 2)
  );
  const relationship = inferCandidateRelationship(normalized, candidates);
  const eligibleCandidates = filterEligibleCandidates(candidates, normalized, relationship);

  if (eligibleCandidates.length) {
    return eligibleCandidates;
  }

  const cleanedWhole = cleanCandidate(normalized);
  return isEligibleCandidate(cleanedWhole, "tasks", normalized) ? [cleanedWhole] : [];
};

const getDueWindow = (text: string): { hasDeadline: boolean; dueWindow: DueWindow } => {
  if (
    /\b(?:expects?\s+(?:a\s+)?reply|waiting on(?:\s+(?:me|this|my feedback))?|waiting on feedback|someone is waiting on|someone is actively waiting|waiting for a quote|person waiting for a quote|another person is waiting on me|someone else is blocked by me|blocked by me|owe(?:s)? (?:them )?a reply|needs an answer|wants a decision from me|reply from me today|already expects|asked for pricing)\b/i.test(
      text
    )
  ) {
    return { hasDeadline: true, dueWindow: "today" };
  }

  if (hasAnyMatch(text, KEYWORDS.urgentToday)) {
    return { hasDeadline: true, dueWindow: "today" };
  }

  if (hasAnyMatch(text, KEYWORDS.urgentTomorrow)) {
    return { hasDeadline: true, dueWindow: "tomorrow" };
  }

  if (hasAnyMatch(text, KEYWORDS.urgentWeek)) {
    return { hasDeadline: true, dueWindow: "thisWeek" };
  }

  if (hasAnyMatch(text, KEYWORDS.hardDeadline)) {
    return { hasDeadline: true, dueWindow: "later" };
  }

  return { hasDeadline: false, dueWindow: "noDeadline" };
};

const inferImpactAreas = (text: string) =>
  (Object.keys(AREA_KEYWORDS) as ImpactArea[]).filter((area) => hasAnyMatch(text, AREA_KEYWORDS[area]));

const inferImportanceSignal = (text: string, impactAreas: ImpactArea[]): ImportanceSignal => {
  if (hasAnyMatch(text, KEYWORDS.mostlyNoise)) {
    return "mostlyNoise";
  }

  if (
    impactAreas.includes("health") ||
    impactAreas.includes("housing") ||
    impactAreas.includes("money") ||
    impactAreas.includes("work") ||
    impactAreas.includes("relationships") ||
    impactAreas.includes("reputation") ||
    impactAreas.includes("longTermGoals") ||
    /client|collaborator|feedback|proposal|template|revised proposal|presentation|travel|agenda|quote|signup|newsletter|checkout|pricing|content|testimonial|social proof|talking points|contract|landlord|doctor|rest|cold email|cold calling|booking link|calendar booking|contact form|onboarding|bug|homepage|assets?|payments?|expenses?|conversions?|pitch deck|demo video|inquiries?|visibility/i.test(
      text
    )
  ) {
    return "meaningful";
  }

  return impactAreas.length > 1 ? "meaningful" : "unclear";
};

const inferHandlingChoice = (text: string) => {
  if (/delegate|handoff|assign|ask .* to|send to/i.test(text)) {
    return "delegate" as const;
  }

  if (/automate|template|system|recurring|shortcut/i.test(text)) {
    return "automate" as const;
  }

  if (/ignore|skip|let it go/i.test(text) || hasAnyMatch(text, KEYWORDS.mostlyNoise)) {
    return "ignore" as const;
  }

  if (/trim|reduce|simplify/i.test(text)) {
    return "reduce" as const;
  }

  return "direct" as const;
};

const inferDelayImpact = (text: string, impactAreas: ImpactArea[]) => {
  if (hasActiveWaitingPressure(text)) {
    return "severe" as const;
  }

  if (hasBackgroundStress(text) && (impactAreas.includes("housing") || impactAreas.includes("relationships"))) {
    return "severe" as const;
  }

  if (hasAnyMatch(text, KEYWORDS.severeDelay) || impactAreas.includes("health") || impactAreas.includes("housing")) {
    return "severe" as const;
  }

  if (hasBackgroundStress(text)) {
    return "disruptive" as const;
  }

  if (/\b(?:meeting\s+prep|prepare\s+meeting\s+prep|prepare\s+notes?|meeting\s+notes?)\b/i.test(text)) {
    return "annoying" as const;
  }

  if (/\b(?:review and approve|approve)\b.*\bdraft\b.*\b(?:waiting on|blocked by me)\b/i.test(text)) {
    return "severe" as const;
  }

  if (/\b(?:respond|reply)\b.*\bquote\b.*\bwaiting\b|\bquote\b.*\bactively\s+waiting\b|\bwaiting\s+for\s+a\s+quote\b/i.test(text)) {
    return "severe" as const;
  }

  if (/\btalking\s+points\b.*\bcall\b/i.test(text)) {
    return "annoying" as const;
  }

  if (/\brehearse\b.*\bpresentation\b.*\btomorrow\b|\bpresentation\b.*\btomorrow\b/i.test(text)) {
    return "disruptive" as const;
  }

  if (/\bcollaborator\b.*\bfeedback\b|\bfeedback\b.*\bcollaborator\b/i.test(text)) {
    return "disruptive" as const;
  }

  if (/\bsignup\b.*\b(?:issue|flow|form)\b.*\b(?:blocking|costing|inquiries?)\b/i.test(text)) {
    return "severe" as const;
  }

  if (/\bcheckout\b.*\bflow\b.*\b(?:conversion|conversions|clunky|frustrating|drop[- ]?off)\b/i.test(text)) {
    return "disruptive" as const;
  }

  if (/\b(?:pricing|price quote)\b/i.test(text) && /\bfollow up|send|reply|respond/i.test(text)) {
    return "disruptive" as const;
  }

  if (/\bnewsletter\s+signup\b.*\b(?:broken|costing|leads?)\b|\bbroken\s+newsletter\s+signup\b/i.test(text)) {
    return "severe" as const;
  }

  if (/\bcalendar\b.*\bbooking\b.*\bstep\b.*\b(?:broken|losing inquiries?|conversion|conversions)\b|\bbroken\s+calendar\s+booking\s+step\b/i.test(text)) {
    return "severe" as const;
  }

  if (/\breconcile\b.*\bpayments?\b.*\bexpenses?\b|\bpayments?\b.*\bexpenses?\b.*\bstress/i.test(text)) {
    return "disruptive" as const;
  }

  if (/\btravel\s+details\b.*\bnext\s+week\b|\bagenda\b.*\bstrategy\s+call\b.*\btomorrow\b/i.test(text)) {
    return "annoying" as const;
  }

  if (/\bhomepage\s+copy\b|\bproposal\s+template\b/i.test(text)) {
    return "annoying" as const;
  }

  if (/\bpublish\b.*\bcontent\b|\bcontent\b.*\bvisibility\b|\bmomentum\b/i.test(text)) {
    return "annoying" as const;
  }

  if (/\b(?:revised?\s+proposal|proposal)\b.*\b(?:waiting|send today|today|trust|client)\b/i.test(text)) {
    return "severe" as const;
  }

  if (/\b(?:reply|message|email|follow up)\b.*\bclient\b/i.test(text) && !hasActiveWaitingPressure(text)) {
    return "annoying" as const;
  }

  if (/\b(?:warm\s+leads?|warmer\b.*\blead)\b/i.test(text)) {
    return "disruptive" as const;
  }

  if (/\bwebsite\b.*\b(?:credibility|trust|conversion|broken|issue)\b/i.test(text)) {
    return "disruptive" as const;
  }

  if (/\bbooking\s+link\b.*\b(?:broken|conversion|conversions|hurting)\b/i.test(text)) {
    return "severe" as const;
  }

  if (/\b(?:contact\s+form|onboarding)\b.*\b(?:broken|bug|frustrating users?|conversion|conversions|hurting)\b/i.test(text)) {
    return "disruptive" as const;
  }

  if (/\boverdue\b.*\bpayment\b|\bpayment\b.*\boverdue\b/i.test(text)) {
    return "severe" as const;
  }

  if (/\bproposal\b.*\b(?:deadline|due|today|tomorrow|client|needs work)\b/i.test(text)) {
    return "disruptive" as const;
  }

  if (hasAnyMatch(text, KEYWORDS.disruptiveDelay)) {
    return "disruptive" as const;
  }

  if (/reply|quote|call|book|booking link|calendar booking|rest|admin|follow up|warm lead|invoice reminder|notes?|travel details|agenda/i.test(text)) {
    return "annoying" as const;
  }

  return "none" as const;
};

const getSuggestedCategory = (impactAreas: ImpactArea[]) => {
  const primaryArea = impactAreas[0];
  return primaryArea ? IMPACT_AREA_LABELS[primaryArea] : "";
};

const getMentalReliefScore = (text: string) => {
  let score = hasAnyMatch(text, KEYWORDS.relief) ? 2.2 : 1;

  if (/rest|sleep|break/i.test(text)) {
    score += 0.9;
  }

  if (/landlord|reply|quote|admin|docs?|invoice reminder|booking link|calendar booking|warm leads?|conversions?|feedback|pricing|contract|travel details|payments?|expenses?/i.test(text)) {
    score += 0.5;
  }

  if (hasBackgroundStress(text)) {
    score += 0.85;
  }

  return clamp(score);
};

const getLongTermScore = (text: string, impactAreas: ImpactArea[]) => {
  let score = hasAnyMatch(text, KEYWORDS.longTerm) ? 2.4 : 0.8;
  if (impactAreas.includes("longTermGoals") || impactAreas.includes("health")) {
    score += 0.8;
  }

  return clamp(score);
};

const getReversibilityScore = (text: string) => {
  let score = hasAnyMatch(text, KEYWORDS.easyToUndo) ? 2.6 : 1.4;
  if (/\b(quit|resign|break up|move out|sign|submit final|fire|hire|sell|buy|commit)\b/i.test(text)) {
    score -= 1.1;
  }

  if (/\b(major rebuild|rebuild|irreversible|permanent)\b/i.test(text)) {
    score -= 0.8;
  }

  return clamp(score);
};

const getExecutionEaseScore = (text: string, contextSignals: ContextSignal[]) => {
  let score = 1.5;
  const lowEnergyContext = contextSignals.some((signal) => signal.kind === "lowEnergy");
  const shortTimeContext = contextSignals.some((signal) => signal.kind === "shortTimeWindow");

  if (/\b(call|email|send|reply|quote|book|booking link|calendar booking|rest|follow up|schedule|wait|after lunch|later|notes?|feedback|pricing|agenda|travel details|reconcile)\b/i.test(text)) {
    score += 0.8;
  }

  if (/\b(reply|message|call|follow up|send invoice|invoice reminder|contact landlord|booking link|calendar booking|warm leads?|pricing|quote|feedback)\b/i.test(text)) {
    score += 0.35;
  }

  if (/\b(?:review and approve|approve)\b.*\bdraft\b|\bdraft\b.*\bwaiting on\b|\bpartner\b.*\bdecision\b/i.test(text)) {
    score += 0.55;
  }

  if (/\b(?:booking\s+link|calendar\s+booking\s+step|contact\s+form|newsletter\s+signup|onboarding\s+(?:bug|flow)|signup\s+(?:issue|flow|form)|checkout\s+flow)\b/i.test(text)) {
    score += 0.45;
  }

  if (/\borgani[sz]e\b.*\bfiles?\b/i.test(text)) {
    score -= 0.2;
  }

  if (/\brecord\b.*\bdemo\b.*\bvideo\b/i.test(text)) {
    score -= 0.35;
  }

  if (/\b(cold calling|cold call)\b/i.test(text)) {
    score -= 0.7;
  }

  if (/\b(finish|proposal|strategy|rebuild|prioriti[sz]e|services page|testimonial video)\b/i.test(text)) {
    score -= 0.35;
  }

  if (/\bfix\b/i.test(text) && /\b(?:website issues?|parts of my website|major bug|rebuild|services page)\b/i.test(text)) {
    score -= 0.35;
  }

  if (/\b(polished proposal|proposal still needs work|parts of my website|website issues)\b/i.test(text)) {
    score -= 0.4;
  }

  if (text.split(/\s+/).length <= 4) {
    score += 0.25;
  }

  if (lowEnergyContext && /\b(after lunch|after|later|rest|break)\b/i.test(text)) {
    score += 0.65;
  }

  if (lowEnergyContext && /\b(during lunch|during my lunch break|skip lunch|now|right away|immediately)\b/i.test(text)) {
    score -= 0.75;
  }

  if (shortTimeContext && /\b(call|email|send|reply|quote|follow up|invoice reminder|send invoice|booking link|calendar booking|notes?|agenda|travel details|organi[sz]e)\b/i.test(text)) {
    score += 0.6;
  }

  if (shortTimeContext && /\b(proposal|website|rebuild|strategy|services page)\b/i.test(text)) {
    score -= 0.8;
  }

  return clamp(score);
};

const getUpsideScore = (
  candidate: Pick<ClarityCandidate, "longTermScore" | "triageAnswers" | "sourceText">,
  contextSignals: ContextSignal[]
) => {
  let score = candidate.longTermScore * 0.7;

  if (candidate.triageAnswers.importanceSignal === "meaningful") {
    score += 1.1;
  } else if (candidate.triageAnswers.importanceSignal === "unclear") {
    score += 0.45;
  }

  if (
    candidate.triageAnswers.impactAreas.some((area) =>
      ["money", "work", "longTermGoals", "reputation", "relationships", "health"].includes(area)
    )
  ) {
    score += 0.55;
  }

  if (
    contextSignals.some((signal) => signal.kind === "higherValue") &&
    /\b(pay more|higher paying|higher value|more value|long term)\b/i.test(candidate.sourceText)
  ) {
    score += 0.7;
  }

  if (
    contextSignals.some((signal) => signal.kind === "moneySpeed") &&
    /\b(receive money faster|receive money from (?:them|this) faster|get paid faster|paid faster|money faster|cash faster|pay faster|faster)\b/i.test(
      candidate.sourceText
    )
  ) {
    score += 0.45;
  }

  return clamp(score);
};

const hasActiveWaitingPressure = (text: string) =>
  /\b(?:expects?\s+(?:a\s+)?reply|waiting on(?:\s+(?:me|this|my feedback))?|waiting on feedback|someone is waiting on|someone is actively waiting|waiting for a quote|person waiting for a quote|another person is waiting on me|someone else is blocked by me|blocked by me|gone quiet after asking|owe(?:s)? (?:them )?a reply|needs an answer|wants a decision from me|reply from me today|already expects|asked for pricing)\b/i.test(
    text
  );

const hasBackgroundStress = (text: string) =>
  /\b(?:stressful|background stress|mental drag|sitting in my head|rent timing|creates more pressure|becoming stressful|stressing me|uncertainty about money)\b/i.test(
    text
  );

const hasFastCashAngle = (text: string) =>
  /\b(?:cash flow soon|get paid faster|paid faster|pay faster|money sooner|money faster|bring in money|conversions?|revenue|sales|pricing|quote|inquiries?)\b/i.test(
    text
  );

const hasHeavyExecution = (text: string) =>
  !/\b(?:booking\s+link|contact\s+form|onboarding\s+(?:bug|flow)|signup\s+(?:issue|flow|form)|checkout\s+flow)\b/i.test(text) &&
  /\b(?:proposal still needs work|polished proposal|finish proposal|proposal|website|services page|rebuild|strategy|parts of my website)\b/i.test(
    text
  );

const hasLightExecution = (text: string) =>
  /\b(?:reply|message|call|follow up|email|send invoice|invoice reminder|contact landlord|booking link|notes?|agenda|travel details|reconcile|archive|label|organi[sz]e|review and approve|approve.*draft|partner.*decision)\b/i.test(
    text
  );

const toLowerTitle = (value: string) => value.charAt(0).toLowerCase() + value.slice(1);

const getBoardPriorityAdjustment = (
  candidate: Pick<
    ClarityCandidate,
    | "sourceText"
    | "triageAnswers"
    | "delayCostScore"
    | "executionEaseScore"
    | "longTermScore"
    | "reliefScore"
    | "decisionFitScore"
  >,
  contextSignals: ContextSignal[]
) => {
  let score = 0;
  const lowEnergyContext = contextSignals.some((signal) => signal.kind === "lowEnergy");
  const shortTimeContext = contextSignals.some((signal) => signal.kind === "shortTimeWindow");

  if (hasActiveWaitingPressure(candidate.sourceText)) {
    score += 1.45;
  }

  if (candidate.triageAnswers.dueWindow === "today") {
    score += 1.05;
  } else if (candidate.triageAnswers.dueWindow === "tomorrow") {
    score += hasActiveWaitingPressure(candidate.sourceText) ? 0.45 : 0.05;
  }

  if (candidate.delayCostScore >= 3.2) {
    score += 0.7;
  } else if (candidate.delayCostScore >= 2.5) {
    score += 0.38;
  }

  if (hasBackgroundStress(candidate.sourceText)) {
    score += 0.45;
  }

  if (lowEnergyContext && (candidate.executionEaseScore >= 2.55 || hasLightExecution(candidate.sourceText))) {
    score += 0.55;
  }

  if (lowEnergyContext && hasHeavyExecution(candidate.sourceText) && candidate.executionEaseScore <= 2) {
    score -= 0.95;
  }

  if (shortTimeContext && (candidate.executionEaseScore >= 2.7 || hasLightExecution(candidate.sourceText))) {
    score += 0.7;
  }

  if (shortTimeContext && hasHeavyExecution(candidate.sourceText)) {
    score -= 1.15;
  }

  if (hasFastCashAngle(candidate.sourceText)) {
    score += candidate.triageAnswers.dueWindow === "today" ? 0.32 : 0.95;
  }

  if (/\b(?:booking\s+link|calendar\s+booking\s+step)\b.*\b(?:broken|conversion|conversions|hurting|losing inquiries?)\b/i.test(candidate.sourceText)) {
    score += 0.7;
  }

  if (
    /\b(?:contact\s+form|newsletter\s+signup|onboarding)\b.*\b(?:broken|bug|frustrating users?|conversion|conversions|costing me inquiries|costing leads?|hurting)\b/i.test(
      candidate.sourceText
    )
  ) {
    score += 0.7;
  }

  if (
    /\b(?:signup\s+(?:issue|flow|form)|checkout\s+flow)\b.*\b(?:blocking|costing|conversion|conversions|clunky|inquiries?|hurting)\b/i.test(
      candidate.sourceText
    )
  ) {
    score += 0.7;
  }

  if (/\bleads?\b.*\b(?:showed interest|interested|money|revenue|cash)\b/i.test(candidate.sourceText)) {
    score += 0.45;
  }

  if (/\b(?:pricing|asked for pricing)\b/i.test(candidate.sourceText)) {
    score += 0.45;
  }

  if (/\bquote\b/i.test(candidate.sourceText) && hasActiveWaitingPressure(candidate.sourceText)) {
    score += 0.7;
  }

  if (/\bcollaborator\b.*\bfeedback\b/i.test(candidate.sourceText) && hasActiveWaitingPressure(candidate.sourceText)) {
    score += 0.45;
  }

  if (candidate.reliefScore >= 2.8) {
    score += 0.22;
  }

  if (candidate.longTermScore >= 2.8 && lowEnergyContext && hasHeavyExecution(candidate.sourceText)) {
    score -= 0.45;
  }

  if (
    candidate.triageAnswers.dueWindow === "tomorrow" &&
    !hasActiveWaitingPressure(candidate.sourceText) &&
    (lowEnergyContext || shortTimeContext)
  ) {
    score -= 0.45;
  }

  if (
    lowEnergyContext &&
    /\brecord\b.*\bdemo\b.*\bvideo\b/i.test(candidate.sourceText) &&
    !candidate.triageAnswers.hasDeadline
  ) {
    score -= 0.45;
  }

  score += candidate.decisionFitScore * 0.2;
  return Number(score.toFixed(2));
};

const getDecisionGate = (
  candidates: Pick<ClarityCandidate, "delayCostScore" | "reversibilityScore">[],
  decisionShape: DecisionShape
): DecisionGate => {
  const highestDelay = Math.max(...candidates.map((candidate) => candidate.delayCostScore));
  const lowestReversibility = Math.min(...candidates.map((candidate) => candidate.reversibilityScore));

  if (decisionShape === "foggy_dump" || highestDelay >= 3.4 || lowestReversibility <= 1.1) {
    return "careful";
  }

  if (highestDelay <= 2.8 && lowestReversibility >= 2.1) {
    return "fast";
  }

  return "moderate";
};

const buildOptionReasonFactors = (
  candidate: Pick<
    ClarityCandidate,
    | "triageAnswers"
    | "delayCostScore"
    | "reversibilityScore"
    | "executionEaseScore"
    | "decisionFitScore"
    | "reliefScore"
    | "longTermScore"
    | "sourceText"
  >,
  runnerUp: Pick<
    ClarityCandidate,
    | "triageAnswers"
    | "delayCostScore"
    | "reversibilityScore"
    | "executionEaseScore"
    | "decisionFitScore"
    | "reliefScore"
    | "longTermScore"
    | "sourceText"
  >,
  contextSignals: ContextSignal[]
): ReasonFactor[] => {
  const lowEnergyContext = contextSignals.some((signal) => signal.kind === "lowEnergy");
  const deadlineContext = contextSignals.some((signal) => signal.kind === "deadlinePressure");
  const higherValueContext = contextSignals.some((signal) => signal.kind === "higherValue");
  const moneySpeedContext = contextSignals.some((signal) => signal.kind === "moneySpeed");
  const factors: ReasonFactor[] = [];
  const delayDiff = candidate.delayCostScore - runnerUp.delayCostScore;
  const easeDiff = candidate.executionEaseScore - runnerUp.executionEaseScore;
  const fitDiff = candidate.decisionFitScore - runnerUp.decisionFitScore;
  const reliefDiff = candidate.reliefScore - runnerUp.reliefScore;
  const reversibilityDiff = candidate.reversibilityScore - runnerUp.reversibilityScore;
  const upsideDiff = getUpsideScore(candidate, contextSignals) - getUpsideScore(runnerUp, contextSignals);
  const deadlineDiff =
    DUE_WINDOW_PRIORITY[candidate.triageAnswers.dueWindow] - DUE_WINDOW_PRIORITY[runnerUp.triageAnswers.dueWindow];

  if (deadlineDiff >= 1 || delayDiff >= 0.9 || (deadlineContext && candidate.delayCostScore >= 2.7)) {
    factors.push({
      tag: "delay matters",
      weight: 3.4 + Math.max(delayDiff, deadlineDiff * 0.45),
      explanation: "delay matters more on this side, so leaving it parked would cost more than waiting on the next strongest item",
    });
  }

  if (
    lowEnergyContext &&
    /\b(after lunch|after|later|rest|break|tomorrow)\b/i.test(candidate.sourceText) &&
    candidate.delayCostScore <= runnerUp.delayCostScore + 0.35
  ) {
    factors.push({
      tag: "protects energy",
      weight: 3.3 + Math.max(fitDiff, easeDiff, 0),
      explanation: "it fits your current energy better, so you do not have to force the harder version of the choice",
    });
  }

  if (fitDiff >= 0.6) {
    factors.push({
      tag: "fits the moment",
      weight: 2.9 + fitDiff,
      explanation: "it lines up better with the constraint already in the situation, so it should feel easier to trust",
    });
  }

  if (easeDiff >= 0.55) {
    factors.push({
      tag: "low friction",
      weight: 2.8 + easeDiff,
      explanation: "it has less friction to start, which makes follow-through more likely",
    });
  }

  if (reversibilityDiff >= 0.55 || (candidate.reversibilityScore >= 2.4 && runnerUp.reversibilityScore <= 1.8)) {
    factors.push({
      tag: "reversible",
      weight: 2.75 + Math.max(reversibilityDiff, 0),
      explanation: "it is easier to adjust if the first read turns out to be slightly wrong",
    });
  }

  if (upsideDiff >= 0.65 || (higherValueContext && /pay more|higher paying|higher value|long term/i.test(candidate.sourceText))) {
    factors.push({
      tag: "meaningful upside",
      weight: 2.7 + Math.max(upsideDiff, 0),
      explanation: moneySpeedContext
        ? "it keeps the stronger upside in view, while the next strongest item mostly wins on speed"
        : "it carries the stronger payoff from here, so the return on choosing it first looks better",
    });
  }

  if (
    moneySpeedContext &&
    /\b(receive money faster|receive money from (?:them|this) faster|get paid faster|paid faster|money faster|cash faster|pay faster|faster)\b/i.test(
      candidate.sourceText
    )
  ) {
    factors.push({
      tag: "faster payoff",
      weight: 2.65,
      explanation: "it gets the cash or response cycle moving sooner, which makes the near-term upside more concrete",
    });
  }

  if (reliefDiff >= 0.55) {
    factors.push({
      tag: "mental relief",
      weight: 2.55 + reliefDiff,
      explanation: "it should remove more mental drag once it moves, which makes it easier to stand behind as the first step",
    });
  }

  if (!factors.length) {
    factors.push(
      easeDiff >= -0.2
        ? {
            tag: "easier to execute",
            weight: 2.2 + Math.max(easeDiff, 0),
            explanation: "it looks a little easier to execute cleanly, which lowers the chance of getting stuck before you even start",
          }
        : {
            tag: "low downside",
            weight: 2.1,
            explanation: "the downside of choosing this first is low enough that you can keep the decision light without creating much risk",
          }
    );
  }

  return factors;
};

const buildStandaloneReasonFactors = (
  candidate: Pick<
    ClarityCandidate,
    | "triageResult"
    | "triageAnswers"
    | "reliefScore"
    | "reversibilityScore"
    | "delayCostScore"
    | "executionEaseScore"
    | "longTermScore"
    | "sourceText"
  >,
  options: {
    decisionShape: DecisionShape;
    decisionGate: DecisionGate;
    contextSignals: ContextSignal[];
  }
): ReasonFactor[] => {
  const lowEnergyContext = options.contextSignals.some((signal) => signal.kind === "lowEnergy");
  const factors: ReasonFactor[] = [];

  if (candidate.triageAnswers.hasDeadline || candidate.delayCostScore >= 2.7) {
    factors.push({
      tag: "time pressure",
      weight: 3.2 + candidate.delayCostScore,
      explanation: "delay would create enough pressure that leaving it untouched is likely to cost you more later",
    });
  }

  if (candidate.longTermScore >= 2.3 || candidate.triageAnswers.importanceSignal === "meaningful") {
    factors.push({
      tag: "meaningful upside",
      weight: 2.8 + candidate.longTermScore * 0.2,
      explanation: "it affects something that matters beyond the moment, so there is a real payoff to handling it well",
    });
  }

  if (candidate.executionEaseScore >= 2.4) {
    factors.push({
      tag: lowEnergyContext ? "fits your energy" : "easier to execute",
      weight: 2.6 + candidate.executionEaseScore * 0.15,
      explanation: lowEnergyContext
        ? "it fits your current capacity well enough that starting should feel lighter than it looks"
        : "it is clear enough to move without a lot of setup or hesitation",
    });
  }

  if (candidate.reversibilityScore >= 2.4) {
    factors.push({
      tag: "reversible",
      weight: 2.45 + candidate.reversibilityScore * 0.12,
      explanation: "you can start with a small step and still adjust later if new information shows up",
    });
  }

  if (candidate.reliefScore >= 2.4) {
    factors.push({
      tag: "mental relief",
      weight: 2.35 + candidate.reliefScore * 0.18,
      explanation: "moving it should take noticeable mental drag out of the background",
    });
  }

  if (!factors.length) {
    factors.push({
      tag: "low downside",
      weight: 2,
      explanation: "it stays relatively safe to keep this light while you focus on what matters more",
    });
  }

  return factors;
};

const buildLeadReasoning = (
  leader: Pick<
    ClarityCandidate,
    | "title"
    | "sourceText"
    | "triageAnswers"
    | "triageResult"
    | "delayCostScore"
    | "executionEaseScore"
    | "longTermScore"
    | "reliefScore"
    | "reversibilityScore"
    | "decisionFitScore"
  >,
  alternatives: Array<
    Pick<
      ClarityCandidate,
      | "title"
      | "sourceText"
      | "triageAnswers"
      | "triageResult"
      | "delayCostScore"
      | "executionEaseScore"
      | "longTermScore"
      | "reliefScore"
      | "reversibilityScore"
      | "decisionFitScore"
    >
  >,
  contextSignals: ContextSignal[]
) => {
  const runnerUp = alternatives[0] ?? null;
  if (!runnerUp) {
    return {
      calmingWhy: "This leads because it has the clearest immediate weight on the board.",
      reasonTags: ["clearest immediate weight"],
    };
  }

  const leaderTitle = leader.title;
  const runnerTitle = toLowerTitle(runnerUp.title);
  const secondAlt = alternatives[1] ?? null;
  const lowEnergyContext = contextSignals.some((signal) => signal.kind === "lowEnergy");
  const lines: string[] = [];
  const tags: string[] = [];

  if (
    hasActiveWaitingPressure(leader.sourceText) ||
    (leader.triageAnswers.dueWindow === "today" &&
      (runnerUp.triageAnswers.dueWindow !== "today" || runnerUp.delayCostScore < leader.delayCostScore))
  ) {
    lines.push(
      `${leaderTitle} leads because there is explicit waiting pressure today, while ${runnerTitle} matters but can follow in a calmer block.`
    );
    tags.push("waiting pressure");
  } else if (
    hasBackgroundStress(leader.sourceText) &&
    leader.delayCostScore >= runnerUp.delayCostScore &&
    leader.executionEaseScore >= runnerUp.executionEaseScore - 0.25
  ) {
    lines.push(
      `${leaderTitle} leads because delaying it keeps background stress active, while ${runnerTitle} can wait without getting worse as fast.`
    );
    tags.push("cost of delay", "mental relief");
  } else if (
    lowEnergyContext &&
    leader.executionEaseScore >= runnerUp.executionEaseScore + 0.4 &&
    runnerUp.longTermScore >= leader.longTermScore
  ) {
    lines.push(
      `${leaderTitle} leads because it is lighter to execute with your current energy, while ${runnerTitle} has more upside but needs a heavier block.`
    );
    tags.push("energy fit", "low friction");
  } else if (leader.delayCostScore >= runnerUp.delayCostScore + 0.55) {
    lines.push(
      `${leaderTitle} leads because it gets worse faster if you leave it untouched, while ${runnerTitle} is still meaningful but loses on immediate downside.`
    );
    tags.push("cost of delay");
  } else if (leader.executionEaseScore >= runnerUp.executionEaseScore + 0.45) {
    lines.push(
      `${leaderTitle} leads because it is easier to complete cleanly right now, while ${runnerTitle} would ask for more setup or steadier energy.`
    );
    tags.push("low friction", lowEnergyContext ? "energy fit" : "execution ease");
  } else if (leader.longTermScore >= runnerUp.longTermScore + 0.6) {
    lines.push(
      `${leaderTitle} leads because the upside is more meaningful without making the start much heavier, while ${runnerTitle} is cleaner but less consequential.`
    );
    tags.push("meaningful upside");
  } else if (runnerUp.longTermScore >= leader.longTermScore + 0.45) {
    lines.push(
      `${leaderTitle} leads because it is more executable right now, while ${runnerTitle} has bigger upside but needs a heavier block than this moment supports.`
    );
    tags.push(lowEnergyContext ? "energy fit" : "execution ease", "meaningful upside");
  } else if (runnerUp.executionEaseScore >= leader.executionEaseScore + 0.45) {
    lines.push(
      `${leaderTitle} still leads because the downside of waiting is sharper, even though ${runnerTitle} would be easier to knock out quickly.`
    );
    tags.push("cost of delay", "execution ease");
  } else {
    lines.push(
      `${leaderTitle} leads because it carries the stronger immediate pressure, while ${runnerTitle} stays just behind it on this board.`
    );
    tags.push("clearest immediate weight");
  }

  if (
    !lines.some((line) => line.toLowerCase().includes(runnerTitle)) &&
    hasFastCashAngle(runnerUp.sourceText) &&
    !hasFastCashAngle(leader.sourceText)
  ) {
    lines.push(
      `${runnerUp.title} stays in play because it may move money sooner, but it does not beat the immediate pressure on ${leaderTitle.toLowerCase()}.`
    );
    tags.push("cash timing");
  } else if (
    !lines.some((line) => line.toLowerCase().includes(runnerTitle)) &&
    runnerUp.longTermScore > leader.longTermScore + 0.4 &&
    lowEnergyContext
  ) {
    lines.push(
      `${runnerUp.title} still matters because the upside is bigger, but it is heavier than this board needs first.`
    );
    tags.push("energy fit");
  } else if (!lines.some((line) => line.toLowerCase().includes(runnerTitle))) {
    lines.push(
      `${runnerUp.title} still matters, but it can follow after the first move without creating the same immediate downside.`
    );
  }

  if (
    secondAlt &&
    lines.length < 3 &&
    hasFastCashAngle(secondAlt.sourceText) &&
    !lines.some((line) => line.toLowerCase().includes(toLowerTitle(secondAlt.title)))
  ) {
    lines.push(
      `${secondAlt.title} remains in play because cash timing matters, but it still sits behind the cleaner first move.`
    );
    tags.push("cash timing");
  }

  return {
    calmingWhy: lines.slice(0, 3).join(" "),
    reasonTags: Array.from(new Set(tags)).slice(0, 3),
  };
};

const pickReasonFactors = (factors: ReasonFactor[]) =>
  [...factors]
    .sort((left, right) => right.weight - left.weight)
    .filter(
      (factor, index, sortedFactors) =>
        sortedFactors.findIndex((candidateFactor) => candidateFactor.tag === factor.tag) === index
    )
    .slice(0, 3);

const buildCandidateReasoning = (
  candidate: Pick<
    ClarityCandidate,
    | "triageResult"
    | "triageAnswers"
    | "reliefScore"
    | "reversibilityScore"
    | "delayCostScore"
    | "executionEaseScore"
    | "decisionFitScore"
    | "longTermScore"
    | "sourceText"
  >,
  runnerUp: Pick<
    ClarityCandidate,
    | "triageResult"
    | "triageAnswers"
    | "reliefScore"
    | "reversibilityScore"
    | "delayCostScore"
    | "executionEaseScore"
    | "decisionFitScore"
    | "longTermScore"
    | "sourceText"
  > | null,
  options: {
    decisionShape: DecisionShape;
    decisionGate: DecisionGate;
    contextSignals: ContextSignal[];
  }
) => {
  const selectedFactors = pickReasonFactors(
    runnerUp
      ? buildOptionReasonFactors(candidate, runnerUp, options.contextSignals)
      : buildStandaloneReasonFactors(candidate, options)
  );

  const explanation =
    options.decisionShape === "option_choice" && runnerUp
      ? `This ${candidate.triageResult.quadrant === "schedule" ? "edges ahead" : "wins"} because ${joinReasonFragments(
          selectedFactors.map((factor) => factor.explanation)
        )}.`
      : `This looks strongest because ${joinReasonFragments(selectedFactors.map((factor) => factor.explanation))}.`;

  return {
    calmingWhy: explanation,
    reasonTags: selectedFactors.map((factor) => factor.tag),
  };
};

const buildCandidate = (
  candidateText: string,
  index: number,
  contextSignals: ContextSignal[] = [],
  analysisSourceText?: string
): ClarityCandidate => {
  const sourceText = analysisSourceText ?? candidateText;
  const normalizedText = sourceText.toLowerCase();
  const impactAreas = inferImpactAreas(normalizedText);
  const due = getDueWindow(normalizedText);
  const triageAnswers: TriageAnswers = {
    hasDeadline: due.hasDeadline,
    dueWindow: due.dueWindow,
    delayImpact: inferDelayImpact(normalizedText, impactAreas),
    impactAreas,
    importanceSignal: inferImportanceSignal(normalizedText, impactAreas),
    handlingChoice: inferHandlingChoice(normalizedText),
  };
  const triageResult = evaluateTriage(triageAnswers);
  const delayCostScore =
    triageAnswers.delayImpact === "severe"
      ? 3.7
      : triageAnswers.delayImpact === "disruptive"
        ? 2.7
        : triageAnswers.delayImpact === "annoying"
          ? 1.6
          : 0.6;
  const reliefScore = getMentalReliefScore(normalizedText);
  const longTermScore = getLongTermScore(normalizedText, impactAreas);
  const reversibilityScore = getReversibilityScore(normalizedText);
  const executionEaseScore = getExecutionEaseScore(normalizedText, contextSignals);
  const decisionFitScore = getContextAlignmentScore(normalizedText, contextSignals);
  const compositeScore = computeCompositeScore(
    triageResult,
    delayCostScore,
    reliefScore,
    longTermScore,
    reversibilityScore,
    executionEaseScore
  );

  const title = buildCandidateTitle(candidateText);

  const candidate: ClarityCandidate = {
    id: `candidate-${index + 1}`,
    title,
    sourceText: toSentenceCase(cleanCandidate(sourceText)),
    category: getSuggestedCategory(impactAreas),
    triageAnswers,
    triageResult,
    delayCostScore,
    longTermScore,
    reliefScore,
    reversibilityScore,
    executionEaseScore,
    decisionFitScore,
    compositeScore: Number((compositeScore + decisionFitScore).toFixed(2)),
    calmingWhy: "",
    reasonTags: [],
  };

  return candidate;
};

const buildAiTriageResult = (
  item: LegacyAiItem,
  triageAnswers: TriageAnswers
): TriageResult => {
  const quadrant = mapAiQuadrant(item.quadrant);
  const guidance = getQuadrantGuidance(quadrant, triageAnswers);

  return {
    urgencyScore: Number((item.urgency * 2).toFixed(1)),
    importanceScore: Number((item.importance * 2).toFixed(1)),
    quadrant,
    recommendation: guidance.recommendation,
    nextStep: guidance.nextStep,
    explanation: item.why,
    urgencyReasons: [
      item.urgency >= 4
        ? "The AI intake marked this as carrying real time pressure."
        : "The AI intake did not mark this as highly time-sensitive.",
      item.cost_of_delay >= 4
        ? "Waiting would make the downside grow meaningfully."
        : "The downside of waiting is present, but not extreme.",
    ],
    importanceReasons: [
      item.importance >= 4
        ? "The AI intake marked this as meaningfully important."
        : "The AI intake did not rate this as especially central.",
      item.upside >= 4
        ? "There is meaningful upside if this goes well."
        : "The upside looks moderate rather than exceptional.",
    ],
  };
};

const buildAiCandidate = (
  item: LegacyAiItem,
  index: number,
  contextSignals: ContextSignal[]
): ClarityCandidate => {
  const sourceText = [item.title, item.details, item.why].filter(Boolean).join(". ");
  const normalizedText = sourceText.toLowerCase();
  const impactAreas = inferImpactAreas([item.title, item.details].filter(Boolean).join(". ").toLowerCase());
  const due = getDueWindowFromAiUrgency(item.urgency, item.cost_of_delay);
  const triageAnswers: TriageAnswers = {
    hasDeadline: due.hasDeadline,
    dueWindow: due.dueWindow,
    delayImpact: getDelayImpactFromAi(item.cost_of_delay),
    impactAreas,
    importanceSignal: getImportanceSignalFromAi(item.importance, item.upside),
    handlingChoice: getHandlingChoiceFromAi(mapAiQuadrant(item.quadrant), item.friction, item.reversibility),
  };
  const triageResult = buildAiTriageResult(item, triageAnswers);
  const delayCostScore = clamp((item.cost_of_delay - 1) * 0.95 + 0.4);
  const longTermScore = clamp((item.upside - 1) * 0.9 + 0.6);
  const reliefScore = clamp(((6 - item.friction) + item.energy_fit) / 2.1);
  const reversibilityScore = clamp((item.reversibility - 1) * 0.95);
  const executionEaseScore = clamp(((6 - item.friction) + item.energy_fit) / 2.2);
  const decisionFitScore = clamp(getContextAlignmentScore(normalizedText, contextSignals) + (item.energy_fit - 3) * 0.35, -2, 2);
  const urgencyWeight = item.urgency * 0.95;
  const importanceWeight = item.importance * 1.15;
  const delayWeight = item.cost_of_delay * 1.05;
  const easeWeight = (6 - item.friction) * 0.62;
  const energyWeight = item.energy_fit * 0.58;
  const upsideWeight = item.upside * 0.72;
  const reversibilityWeight = item.reversibility * 0.32;
  const quadrantBonus =
    item.quadrant === "do_now" ? 0.7 : item.quadrant === "schedule" ? 0.42 : item.quadrant === "delegate" ? 0.18 : 0;
  const compositeScore = Number(
    (
      urgencyWeight +
      importanceWeight +
      delayWeight +
      easeWeight +
      energyWeight +
      upsideWeight +
      reversibilityWeight +
      quadrantBonus +
      decisionFitScore
    ).toFixed(2)
  );

  return {
    id: item.id || `candidate-${index + 1}`,
    title: buildCandidateTitle(item.title),
    sourceText: toSentenceCase(cleanCandidate(sourceText)),
    category: getSuggestedCategory(impactAreas),
    triageAnswers,
    triageResult,
    delayCostScore,
    longTermScore,
    reliefScore,
    reversibilityScore,
    executionEaseScore,
    decisionFitScore,
    compositeScore,
    calmingWhy: item.why,
    reasonTags: [],
  };
};

const refreshCandidate = (
  candidate: ClarityCandidate,
  patch: {
    triageAnswers?: Partial<TriageAnswers>;
    delayCostScore?: number;
    reliefScore?: number;
    longTermScore?: number;
    reversibilityScore?: number;
    decisionFitScore?: number;
  }
) => {
  const nextImpactAreas = patch.triageAnswers?.impactAreas ?? candidate.triageAnswers.impactAreas;
  const triageAnswers: TriageAnswers = {
    ...candidate.triageAnswers,
    ...patch.triageAnswers,
    impactAreas: nextImpactAreas,
  };
  const triageResult = evaluateTriage(triageAnswers);
  const delayCostScore = patch.delayCostScore ?? candidate.delayCostScore;
  const reliefScore = patch.reliefScore ?? candidate.reliefScore;
  const longTermScore = patch.longTermScore ?? candidate.longTermScore;
  const reversibilityScore = patch.reversibilityScore ?? candidate.reversibilityScore;
  const executionEaseScore = candidate.executionEaseScore;
  const decisionFitScore = patch.decisionFitScore ?? candidate.decisionFitScore;

  const nextCandidate: ClarityCandidate = {
    ...candidate,
    triageAnswers,
    triageResult,
    delayCostScore,
    reliefScore,
    longTermScore,
    reversibilityScore,
    executionEaseScore,
    decisionFitScore,
    compositeScore: Number(
      (
        computeCompositeScore(
          triageResult,
          delayCostScore,
          reliefScore,
          longTermScore,
          reversibilityScore,
          executionEaseScore
        ) +
        decisionFitScore
      ).toFixed(2)
    ),
  };

  return nextCandidate;
};

const sortCandidates = (candidates: ClarityCandidate[], contextSignals: ContextSignal[] = []) =>
  [...candidates].sort((left, right) => {
    const rightPriority = right.compositeScore + getBoardPriorityAdjustment(right, contextSignals);
    const leftPriority = left.compositeScore + getBoardPriorityAdjustment(left, contextSignals);
    return rightPriority - leftPriority;
  });

const dedupeItems = (values: string[]) => {
  const seen = new Set<string>();

  return values.filter((value) => {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const getQuestionKind = (topCandidates: ClarityCandidate[]): ClarityQuestionKind => {
  const [first, second] = topCandidates;

  if (first.triageAnswers.hasDeadline || second.triageAnswers.hasDeadline) {
    return "deadline";
  }

  if (Math.abs(first.reliefScore - second.reliefScore) <= 0.45) {
    return "relief";
  }

  if (Math.abs(first.longTermScore - second.longTermScore) <= 0.45) {
    return "longTerm";
  }

  return "downside";
};

const getQuestionPrompt = (kind: ClarityQuestionKind) => {
  switch (kind) {
    case "deadline":
      return "Which one has a real deadline first?";
    case "relief":
      return "Which one would create the most relief if handled?";
    case "longTerm":
      return "Which one matters most long term?";
    case "downside":
    default:
      return "Which one has the biggest downside if delayed?";
  }
};

const getDecisionShape = (
  mode: ClarityMode,
  candidateRelationship: ClarityCandidateRelationship,
  decisionGroups: ClarityDecisionGroup[],
  activeDecisionGroupId?: string
): DecisionShape => {
  if (decisionGroups.length > 1 && !activeDecisionGroupId) {
    return "multiple_decisions";
  }

  if (candidateRelationship === "alternatives" && mode !== "single") {
    return "option_choice";
  }

  if (mode === "fog") {
    return "foggy_dump";
  }

  return "single_action";
};

const buildDecisionLabel = (
  decisionShape: DecisionShape,
  candidateTexts: string[],
  activeDecisionGroup?: ClarityDecisionGroup
) => {
  if (decisionShape !== "option_choice" || candidateTexts.length < 2) {
    return undefined;
  }

  if (activeDecisionGroup?.label) {
    const cleanedLabel = cleanDisplayText(activeDecisionGroup.label);
    return cleanedLabel.includes("?") ? cleanedLabel : `${cleanedLabel}?`;
  }

  const titles = candidateTexts.map(buildCandidateTitle).map(cleanDisplayText);
  const tradeoffHint = buildTradeoffHint(candidateTexts.join(" "), candidateTexts);

  if (titles.length === 2) {
    return tradeoffHint && / vs /i.test(tradeoffHint)
      ? `${tradeoffHint.replace(/\.$/, "")}?`
      : `${titles[0]} ${getOptionJoiner(titles)} ${titles[1]}?`;
  }

  return `Which is the cleaner move: ${titles.slice(0, 3).join(", ")}?`;
};

const getSummary = (
  mode: ClarityMode,
  candidateCount: number,
  narrowedFromCount?: number,
  rawInput?: string
) => {
  if (rawInput && shouldPreferTaskBoard(rawInput)) {
    if (narrowedFromCount && narrowedFromCount > candidateCount) {
      return `The input looked crowded, so the app narrowed ${narrowedFromCount} possibilities down to the few that matter most right now.`;
    }

    return "This is one crowded decision board, so the app ordered what matters most first.";
  }

  if (mode === "single") {
    return "One thing came through clearly, so the app kept the answer direct.";
  }

  if (mode === "compare") {
    return "This looks like a real choice between a few options, so the app ranked the clearest move first.";
  }

  if (narrowedFromCount && narrowedFromCount > candidateCount) {
    return `The input looked crowded, so the app narrowed ${narrowedFromCount} possibilities down to the few that matter most right now.`;
  }

  return "The input looked a little foggy, so the app pulled out the likely options before making a calmer recommendation.";
};

const orderCandidatesForPresentation = (
  candidates: ClarityCandidate[],
  presentation?: AiCleanupResult["presentation"]
) => {
  if (!presentation) {
    return candidates;
  }

  const nowIds = new Set(presentation.show_now);
  const nextIds = new Set(presentation.show_next);
  const laterIds = new Set(presentation.show_later);

  const bucketOrder = (candidate: ClarityCandidate) => {
    if (nowIds.has(candidate.id)) {
      return 0;
    }

    if (nextIds.has(candidate.id)) {
      return 1;
    }

    if (laterIds.has(candidate.id)) {
      return 2;
    }

    return 1;
  };

  return [...candidates].sort((left, right) => {
    const bucketDiff = bucketOrder(left) - bucketOrder(right);
    if (bucketDiff !== 0) {
      return bucketDiff;
    }

    return right.compositeScore - left.compositeScore;
  });
};

const prioritizeSelectedCandidate = (
  candidates: ClarityCandidate[],
  selectedId?: string
) => {
  if (!selectedId) {
    return candidates;
  }

  const selectedIndex = candidates.findIndex((candidate) => candidate.id === selectedId);
  if (selectedIndex <= 0) {
    return candidates;
  }

  return [candidates[selectedIndex], ...candidates.slice(0, selectedIndex), ...candidates.slice(selectedIndex + 1)];
};

export const createClarityFailureAnalysis = (
  rawInput: string,
  failureTitle = "I couldn't get a reliable read of this yet.",
  failureMessage = "Try again, or switch to the manual breakdown if you want a deterministic read."
): ClarityAnalysis => ({
  status: "failed",
  rawInput,
  source: "local",
  mode: "fog",
  decisionShape: "foggy_dump",
  decisionGate: "careful",
  contextKinds: [],
  contextHints: [],
  summary: failureTitle,
  firstMove: null,
  candidates: [],
  activeItems: [],
  laterItems: [],
  waiting: [],
  question: null,
  candidateRelationship: "tasks",
  decisionGroups: [],
  failureTitle,
  failureMessage,
});

const finalizeAnalysis = (
  rawInput: string,
  mode: ClarityMode,
  candidates: ClarityCandidate[],
  narrowedFromCount?: number,
  selectedId?: string,
  options?: {
    source?: "ai" | "local";
    structuredCleanup?: AiCleanupResult;
    candidateRelationship?: ClarityCandidateRelationship;
    decisionGroups?: ClarityDecisionGroup[];
    activeDecisionGroupId?: string;
    contextSignals?: ContextSignal[];
    decisionLabelTexts?: string[];
    aiSummary?: AiCleanupResult["summary"];
    presentation?: AiCleanupResult["presentation"];
  }
): ClarityAnalysis => {
  if (!candidates.length) {
    return createClarityFailureAnalysis(rawInput);
  }

  const sortedCandidates = prioritizeSelectedCandidate(
    sortCandidates(candidates, options?.contextSignals ?? []),
    selectedId
  );
  const candidateRelationship = options?.candidateRelationship ?? "tasks";
  const decisionGroups = options?.decisionGroups ?? [];
  const activeDecisionGroupId = options?.activeDecisionGroupId;
  const activeDecisionGroup = decisionGroups.find((group) => group.id === activeDecisionGroupId);
  const contextSignals = options?.contextSignals ?? [];
  const decisionShape = getDecisionShape(mode, candidateRelationship, decisionGroups, activeDecisionGroupId);
  const decisionGate = getDecisionGate(sortedCandidates, decisionShape);
  const enrichedCandidates = sortedCandidates.map((candidate, index) => {
    const runnerUp = sortedCandidates[index === 0 ? 1 : 0] ?? null;
    const reasoning = buildCandidateReasoning(candidate, runnerUp, {
      decisionShape,
      decisionGate,
      contextSignals,
    });

    return {
      ...candidate,
      calmingWhy: reasoning.calmingWhy,
      reasonTags: reasoning.reasonTags,
    };
  });
  if (enrichedCandidates.length) {
    const leadReasoning = buildLeadReasoning(enrichedCandidates[0], enrichedCandidates.slice(1, 3), contextSignals);
    enrichedCandidates[0] = {
      ...enrichedCandidates[0],
      calmingWhy: leadReasoning.calmingWhy,
      reasonTags: leadReasoning.reasonTags,
    };
  }
  const topCandidates = enrichedCandidates.slice(0, 2);
  const scoreGap =
    topCandidates.length === 2 ? topCandidates[0].compositeScore - topCandidates[1].compositeScore : 9;
  const shouldAskQuestion =
    options?.source !== "ai" &&
    !selectedId &&
    mode !== "single" &&
    topCandidates.length === 2 &&
    scoreGap < (decisionGate === "careful" ? 1.25 : 0.95) &&
    decisionGate !== "fast" &&
    !(decisionGroups.length > 1 && !activeDecisionGroupId);

  const question: ClarityQuestion | null = shouldAskQuestion
    ? {
        kind: getQuestionKind(topCandidates),
        prompt: getQuestionPrompt(getQuestionKind(topCandidates)),
        candidateIds: topCandidates.map((candidate) => candidate.id),
      }
    : null;

  const orderedCandidates = prioritizeSelectedCandidate(
    orderCandidatesForPresentation(enrichedCandidates, options?.presentation),
    selectedId
  );
  const presentedCandidates =
    orderedCandidates.length &&
    (orderedCandidates[0].triageResult.quadrant === "eliminate" ||
      orderedCandidates[0].triageAnswers.handlingChoice === "ignore")
      ? [
          alignBestMoveCandidate(orderedCandidates[0], orderedCandidates[0].calmingWhy),
          ...orderedCandidates.slice(1),
        ]
      : orderedCandidates;
  const presentation = options?.presentation;
  const laterIds = new Set(presentation?.show_later ?? []);
  const activeItems = presentedCandidates.filter(
    (candidate, index) => index > 0 && !laterIds.has(candidate.id)
  );
  const laterItems = presentedCandidates.filter(
    (candidate) => laterIds.has(candidate.id)
  );

  return {
    status: "ready",
    rawInput,
    source: options?.source ?? "local",
    mode,
    decisionShape,
    decisionGate,
    decisionLabel: buildDecisionLabel(
      decisionShape,
      options?.decisionLabelTexts ?? candidates.map((candidate) => candidate.title),
      activeDecisionGroup
    ),
    contextKinds: contextSignals.map((signal) => signal.kind),
    contextHints: contextSignals.map((signal) => signal.label),
    summary:
      options?.aiSummary?.situation ??
      (decisionGroups.length > 1
        ? shouldDescribeAsSeparateChoices(rawInput, decisionGroups)
          ? activeDecisionGroupId
            ? `I found ${decisionGroups.length} separate choices here. This resolves the one with the clearest immediate weight first, and another decision remains for later.`
            : `I found ${decisionGroups.length} separate choices here, so the app ranked the whole board by immediate weight instead of collapsing it too early.`
          : activeDecisionGroupId
            ? "A few meaningful priorities are competing here, so the app resolved the current board before moving to the rest."
            : "This is one crowded decision board, so the app ordered what matters most first."
        : decisionShape === "option_choice"
          ? decisionGate === "fast"
            ? "This looks like a contained choice, so the app kept the answer light and direct."
            : "This looks like a real option choice, so the app weighed the options before recommending the cleaner move."
          : getSummary(mode, enrichedCandidates.length, narrowedFromCount, rawInput)),
    aiSummary: options?.aiSummary,
    firstMove: presentedCandidates[0],
    candidates: presentedCandidates,
    activeItems,
    laterItems,
    waiting: laterItems.length ? laterItems : presentedCandidates.slice(1),
    question,
    candidateRelationship,
    decisionGroups,
    activeDecisionGroupId,
    narrowedFromCount,
    structuredCleanup: options?.structuredCleanup,
  };
};

const getAiBoardCandidateSignals = (title: string) => extractContextSignals(title);

const alignBestMoveCandidate = (
  candidate: ClarityCandidate,
  whyFirst: string
): ClarityCandidate => {
  const hasImmediatePressure =
    candidate.triageAnswers.dueWindow === "today" ||
    hasActiveWaitingPressure(candidate.sourceText) ||
    candidate.triageAnswers.delayImpact === "severe" ||
    (candidate.triageAnswers.delayImpact === "disruptive" && candidate.executionEaseScore >= 2.2);
  const alignedQuadrant: Quadrant =
    candidate.triageResult.quadrant === "doNow"
      ? "doNow"
      : hasImmediatePressure
        ? "doNow"
        : "schedule";
  const alignedTriageAnswers: TriageAnswers =
    candidate.triageAnswers.handlingChoice === "ignore"
      ? {
          ...candidate.triageAnswers,
          handlingChoice: "direct",
        }
      : candidate.triageAnswers;
  const evaluatedTriageResult = evaluateTriage(alignedTriageAnswers);
  const guidance = getQuadrantGuidance(alignedQuadrant, alignedTriageAnswers);
  const alignedTriageResult: TriageResult = {
    ...evaluatedTriageResult,
    quadrant: alignedQuadrant,
    recommendation: guidance.recommendation,
    nextStep: guidance.nextStep,
    explanation: whyFirst || candidate.triageResult.explanation,
  };

  return {
    ...candidate,
    triageAnswers: alignedTriageAnswers,
    triageResult: alignedTriageResult,
    compositeScore: Number(
      (
        computeCompositeScore(
          alignedTriageResult,
          candidate.delayCostScore,
          candidate.reliefScore,
          candidate.longTermScore,
          candidate.reversibilityScore,
          candidate.executionEaseScore
        ) + candidate.decisionFitScore
      ).toFixed(2)
    ),
    calmingWhy: whyFirst || candidate.calmingWhy,
  };
};

export const analyzeStructuredClarityInput = (
  rawInput: string,
  cleanup: AiCleanupResult,
  selectedDecisionGroupId?: string
): ClarityAnalysis => {
  const normalizedInput = rawInput.replace(/\s+/g, " ").trim();
  const decisionGroups: ClarityDecisionGroup[] = (cleanup.decision_groups ?? [])
    .map((group) => {
      const candidateTexts = dedupeItems((group.items ?? []).map((item) => cleanCandidate(item)).filter(Boolean));
      if (!candidateTexts.length) {
        return null;
      }

      return {
        id: group.id,
        label: cleanDisplayText(group.label || buildDecisionGroupLabel(candidateTexts, candidateTexts.join(", "))),
        sourceText: candidateTexts.join(". "),
        candidateTexts,
        candidateRelationship: group.candidate_relationship,
      };
    })
    .filter((group): group is ClarityDecisionGroup => Boolean(group));
  const activeDecisionGroup =
    decisionGroups.find((group) => group.id === selectedDecisionGroupId) ??
    (decisionGroups.length === 1 ? decisionGroups[0] : undefined);
  const scopedSourceText = activeDecisionGroup?.sourceText ?? normalizedInput;
  const contextSignals = extractContextSignals([normalizedInput, ...cleanup.context_notes].join(". "));
  const aiBoardCandidateTexts = dedupeItems([
    ...cleanup.considered_items,
    ...decisionGroups.flatMap((group) => group.candidateTexts),
  ]);
  const deterministicBoardCandidateTexts = getDeterministicBoardCandidateTexts(normalizedInput);
  const primaryCandidateTexts = activeDecisionGroup?.candidateTexts.length
    ? activeDecisionGroup.candidateTexts
    : buildMergedCandidateTexts(aiBoardCandidateTexts, deterministicBoardCandidateTexts);
  const fallbackActionTexts = activeDecisionGroup ? extractActionClauses(scopedSourceText) : deterministicBoardCandidateTexts;
  const mergedCandidateTexts = buildMergedCandidateTexts(primaryCandidateTexts, fallbackActionTexts);
  const { candidateTexts, preservedFromFullInput, fullBoardCandidateTexts } = preserveMeaningfulMultiTaskBoard(
    normalizedInput,
    mergedCandidateTexts,
    selectedDecisionGroupId
  );

  if (!candidateTexts.length) {
    return analyzeClarityInput(normalizedInput, selectedDecisionGroupId);
  }
  const builtCandidates = candidateTexts.map((title, index) => {
    const sourceText = buildCandidateSourceText(title, normalizedInput, candidateTexts);
    return buildCandidate(
      title,
      index,
      getAiBoardCandidateSignals([sourceText, ...cleanup.context_notes].join(". ")),
      sourceText
    );
  });
  const allExtractedTitles = dedupeItems([
    ...cleanup.considered_items,
    ...decisionGroups.flatMap((group) => group.candidateTexts),
    ...fallbackActionTexts,
  ]);
  const totalExtractedCount = Math.max(allExtractedTitles.length, fullBoardCandidateTexts.length);
  const narrowedFromCount = totalExtractedCount > candidateTexts.length ? totalExtractedCount : undefined;
  const candidateRelationship =
    activeDecisionGroup?.candidateRelationship ??
    inferCandidateRelationship(preservedFromFullInput ? normalizedInput : scopedSourceText, candidateTexts);
  const mode: ClarityMode =
    candidateTexts.length <= 1
      ? "single"
      : candidateRelationship === "alternatives" && candidateTexts.length === 2
        ? "compare"
        : "fog";

  return finalizeAnalysis(normalizedInput, mode, builtCandidates, narrowedFromCount, undefined, {
    source: "ai",
    structuredCleanup: cleanup,
    candidateRelationship,
    decisionGroups,
    activeDecisionGroupId: activeDecisionGroup?.id,
    contextSignals,
    decisionLabelTexts: preservedFromFullInput ? candidateTexts : activeDecisionGroup?.candidateTexts ?? candidateTexts,
  });
};

export const analyzeClarityInput = (rawInput: string, selectedDecisionGroupId?: string): ClarityAnalysis => {
  const normalizedInput = rawInput.replace(/\s+/g, " ").trim();

  if (!normalizedInput) {
    return createClarityFailureAnalysis(
      normalizedInput,
      "There isn't enough here to run Clarity yet.",
      "Drop in the decision, options, or messy thought first, then try again."
    );
  }

  const decisionGroups = detectDecisionGroups(normalizedInput);
  const activeDecisionGroup =
    decisionGroups.find((group) => group.id === selectedDecisionGroupId) ??
    (decisionGroups.length === 1 ? decisionGroups[0] : undefined);
  const scopedInput = activeDecisionGroup?.sourceText ?? normalizedInput;
  const contextSignals = extractContextSignals([normalizedInput, scopedInput].join(". "));
  const deterministicBoardCandidateTexts = getDeterministicBoardCandidateTexts(scopedInput);
  const primaryCandidateTexts = activeDecisionGroup?.candidateTexts.length
    ? activeDecisionGroup.candidateTexts
    : shouldPreferTaskBoard(normalizedInput)
      ? deterministicBoardCandidateTexts
      : extractCandidateTexts(scopedInput);
  const fallbackActionTexts = shouldPreferTaskBoard(normalizedInput)
    ? deterministicBoardCandidateTexts
    : extractActionClauses(scopedInput);
  const mergedCandidateTexts = buildMergedCandidateTexts(primaryCandidateTexts, fallbackActionTexts);
  const { candidateTexts, preservedFromFullInput, fullBoardCandidateTexts } = preserveMeaningfulMultiTaskBoard(
    normalizedInput,
    mergedCandidateTexts,
    selectedDecisionGroupId
  );

  if (!candidateTexts.length) {
    return createClarityFailureAnalysis(
      normalizedInput,
      "I couldn't pull a clear action out of that yet.",
      "Try writing the concrete tasks or options in plain language, or use the manual breakdown."
    );
  }

  const candidates = candidateTexts.map((candidateText, index) =>
    buildCandidate(
      candidateText,
      index,
      contextSignals,
      buildCandidateSourceText(candidateText, scopedInput, candidateTexts)
    )
  );
  const totalExtractedCount = fullBoardCandidateTexts.length;
  const narrowedFromCount = totalExtractedCount > candidateTexts.length ? totalExtractedCount : undefined;
  const candidateRelationship =
    activeDecisionGroup?.candidateRelationship ??
    inferCandidateRelationship(preservedFromFullInput ? normalizedInput : scopedInput, candidateTexts);
  const mode: ClarityMode =
    candidateTexts.length <= 1
      ? "single"
      : candidateRelationship === "alternatives" && candidateTexts.length === 2
        ? "compare"
        : "fog";

  return finalizeAnalysis(normalizedInput, mode, candidates, narrowedFromCount, undefined, {
    source: "local",
    candidateRelationship,
    decisionGroups,
    activeDecisionGroupId: activeDecisionGroup?.id,
    contextSignals,
    decisionLabelTexts: preservedFromFullInput ? candidateTexts : activeDecisionGroup?.candidateTexts ?? candidateTexts,
  });
};

export const focusClarityDecisionGroup = (
  analysis: ClarityAnalysis,
  decisionGroupId: string
): ClarityAnalysis => {
  if (analysis.status !== "ready") {
    return analysis;
  }

  const decisionGroup = analysis.decisionGroups.find((group) => group.id === decisionGroupId);
  if (!decisionGroup) {
    return analysis;
  }

  if (analysis.source === "ai" && analysis.structuredCleanup) {
    return analyzeStructuredClarityInput(analysis.rawInput, analysis.structuredCleanup, decisionGroup.id);
  }

  return analyzeClarityInput(analysis.rawInput, decisionGroup.id);
};

export const answerClarityQuestion = (
  analysis: ClarityAnalysis,
  selectedCandidateId: string
): ClarityAnalysis => {
  if (analysis.status !== "ready" || !analysis.question) {
    return analysis;
  }

  const selectedCandidate = analysis.candidates.find((candidate) => candidate.id === selectedCandidateId);
  if (!selectedCandidate || !analysis.question.candidateIds.includes(selectedCandidateId)) {
    return analysis;
  }

  const contextSignals = extractContextSignals(
    [analysis.rawInput, ...(analysis.structuredCleanup?.context_notes ?? []), ...analysis.contextHints]
      .filter(Boolean)
      .join(". ")
  );

  return finalizeAnalysis(
    analysis.rawInput,
    analysis.mode,
    analysis.candidates,
    analysis.narrowedFromCount,
    selectedCandidateId,
    {
      source: analysis.source,
      structuredCleanup: analysis.structuredCleanup,
      candidateRelationship: analysis.candidateRelationship,
      decisionGroups: analysis.decisionGroups,
      activeDecisionGroupId: analysis.activeDecisionGroupId,
      contextSignals,
      decisionLabelTexts:
        analysis.activeDecisionGroupId
          ? analysis.decisionGroups.find((group) => group.id === analysis.activeDecisionGroupId)?.candidateTexts
          : analysis.candidates.map((candidate) => candidate.title),
      aiSummary: analysis.aiSummary,
      presentation: analysis.structuredCleanup?.presentation,
    }
  );
};
