import assert from "node:assert/strict";

import { analyzeClarityInput, analyzeStructuredClarityInput } from "../src/logic/clarity";
import type { AiCleanupResult } from "../src/types/ai-cleanup";

type RegressionCase = {
  name: string;
  prompt: string;
  requiredTitles: string[];
  allowedFirstTitles: string[];
};

const cases: RegressionCase[] = [
  {
    name: "proposal-board",
    prompt:
      "I need help sorting a crowded board without dropping anything important. A client is waiting for a revised proposal I said I would send today, and delaying that could hurt trust. I also need to send an invoice reminder because payment is late and cash flow matters right now. My website has a broken contact form that may be costing me inquiries, and I still need to record a short demo video for outreach because it could help me win new work. On top of that, I need to prepare notes for a meeting tomorrow so I do not show up scattered. I am tired and I do not want to choose based only on panic or whatever feels easiest.",
    requiredTitles: [
      "Send revised proposal today",
      "Fix contact form",
      "Send invoice reminder",
      "Record demo video",
      "Prepare notes for meeting tomorrow",
    ],
    allowedFirstTitles: ["Send revised proposal today"],
  },
  {
    name: "onboarding-board",
    prompt:
      "I have multiple important things competing for attention and I want the clearest next step, what is still in play, and what can wait a bit. I can fix a bug in my onboarding flow that may be frustrating users, reply to two warm leads who recently showed interest, finish a polished case study update for my portfolio, send a follow-up message about an overdue payment, or organize the project files for a client handoff later this week. The leads could turn into money, the overdue payment affects cash flow, the onboarding bug may be hurting conversions, the case study affects long-term credibility, and the file organization would reduce friction before the handoff. I do not want the app to collapse this into one fake priority or throw meaningful tasks into ignore too aggressively.",
    requiredTitles: [
      "Reply to warm leads",
      "Fix onboarding bug",
      "Send follow-up message about overdue payment",
      "Organize files",
      "Finish case study update",
    ],
    allowedFirstTitles: ["Reply to warm leads", "Fix onboarding bug", "Send follow-up message about overdue payment"],
  },
  {
    name: "messy-decision-board",
    prompt:
      "I need help sorting a messy decision board. I can rehearse for a presentation I am giving tomorrow, respond to a collaborator who is waiting on my feedback, fix a signup issue on my website that may be blocking new inquiries, publish a piece of content I already drafted so I do not lose momentum, or review a contract before sending it back. The presentation matters because it affects how confident and prepared I come across, the collaborator reply matters because I do not want to slow someone else down, the signup issue may be costing me opportunities, the content matters because consistency helps visibility, and the contract review matters because I do not want to miss something important. I am mentally tired, so I need the clearest next move, what is still in play, and what can wait a little.",
    requiredTitles: [
      "Respond to collaborator feedback",
      "Fix signup issue",
      "Rehearse presentation for tomorrow",
      "Review contract before sending back",
      "Publish content",
    ],
    allowedFirstTitles: ["Respond to collaborator feedback", "Fix signup issue", "Rehearse presentation for tomorrow"],
  },
  {
    name: "pricing-checkout-board",
    prompt:
      "I have several different kinds of tasks competing and I do not want the app to oversimplify them. I can edit a short client testimonial video for social proof, send a follow-up to someone who asked for pricing, clean up the checkout flow on my site because it feels clunky, prepare my talking points for a call later this week, or back up and organize important files before I lose track of them. The pricing follow-up could lead to revenue, the checkout cleanup could improve conversions, the testimonial video could strengthen trust, the talking points matter because I want to sound prepared, and the file backup matters because it reduces risk. I want the clearest next move without dropping meaningful items from the board.",
    requiredTitles: [
      "Send pricing follow-up",
      "Clean up checkout flow",
      "Prepare talking points for call later this week",
      "Edit testimonial video",
      "Back up and organize files",
    ],
    allowedFirstTitles: ["Send pricing follow-up", "Clean up checkout flow"],
  },
  {
    name: "booking-link-board",
    prompt:
      "I need help sorting a few competing priorities. I can prepare a short pitch deck for a meeting later this week, respond to two leads who recently showed interest, clean up a broken booking link on my site, or organize the backend files for a project so I stop wasting time searching around. The leads could turn into money, the booking issue may be hurting conversions, the pitch deck affects how prepared I look, and the backend cleanup would reduce friction later. I want the clearest next step, what is still in play, and what can sit lighter for now.",
    requiredTitles: [
      "Fix booking link",
      "Respond to two leads who recently showed interest",
      "Prepare short pitch deck for meeting later this week",
      "Organize files",
    ],
    allowedFirstTitles: ["Fix booking link", "Respond to two leads who recently showed interest"],
  },
  {
    name: "blocked-draft-vs-automation-board",
    prompt:
      "I need help choosing the clearest next step from a crowded board. I can review and approve a draft someone is waiting on, repair an email automation that may be missing leads, rewrite the headline on my landing page because it is weak, prepare a shortlist of questions for a discovery call tomorrow, or follow up with a past client who said they might send referrals. The draft approval matters because someone else is blocked by me, the automation fix matters because missed leads could cost money, the landing page headline matters because it affects conversions, the discovery-call prep matters because I want to sound sharp, and the past-client follow-up matters because it could reopen opportunity. I am low on energy and I do not want to mistake urgency for importance.",
    requiredTitles: [
      "Review and approve draft",
      "Repair email automation",
      "Rewrite landing page headline",
      "Prepare discovery call questions for tomorrow",
      "Follow up with past client about referrals",
    ],
    allowedFirstTitles: ["Review and approve draft", "Repair email automation"],
  },
  {
    name: "partner-payment-handoff-board",
    prompt:
      "I have several meaningful tasks competing at once and I want the app to rank them without flattening the board. I can update the FAQ on my site to reduce repetitive questions, reply to a partner who wants a decision from me, troubleshoot a payment link that may be failing, package a recent project into a portfolio case study, or clean up the shared folder structure for a team handoff. The partner reply matters because another person is waiting on me, the payment link matters because it may block revenue, the FAQ update matters because it saves future time, the case study matters because it improves long-term credibility, and the handoff cleanup matters because confusion later will cost time. I want the clearest next move, what is still active, and what can sit lighter for now.",
    requiredTitles: [
      "Reply to partner with decision",
      "Troubleshoot payment link",
      "Package project into portfolio case study",
      "Update FAQ on site",
      "Clean up shared folder structure for team handoff",
    ],
    allowedFirstTitles: ["Reply to partner with decision", "Troubleshoot payment link"],
  },
  {
    name: "travel-signup-money-board",
    prompt:
      "I need help sorting a full decision board without dropping meaningful work. I can confirm travel details for a meeting next week, fix a broken newsletter signup on my site, send a follow-up message to someone who has gone quiet after asking about working together, revise the opening section of my proposal template so it sounds stronger, or reconcile a few recent payments and expenses so I know exactly where I stand. The follow-up could reopen an opportunity, the signup issue may be costing me leads, the proposal template matters because it affects future conversion quality, the payment reconciliation matters because uncertainty about money is stressing me, and the travel details matter because I do not want last-minute chaos. I am tired and I do not want to just pick whatever feels easiest.",
    requiredTitles: [
      "Confirm travel details for meeting next week",
      "Fix newsletter signup on site",
      "Send follow-up about working together",
      "Revise proposal template opening",
      "Reconcile recent payments and expenses",
    ],
    allowedFirstTitles: [
      "Send follow-up about working together",
      "Fix newsletter signup on site",
      "Reconcile recent payments and expenses",
    ],
  },
  {
    name: "quote-booking-homepage-board",
    prompt:
      "I have a crowded mix of work and admin tasks and I want the clearest next step. I can prepare a short agenda for a strategy call tomorrow, repair a broken calendar booking step that may be losing inquiries, respond to a person waiting for a quote, trim down my homepage copy because it feels too wordy, or archive and label old project assets so future retrieval is easier. The quote reply matters because someone is actively waiting, the booking issue matters because it may affect conversions, the agenda matters because I want to show up prepared, the homepage copy matters because it affects clarity and trust, and the asset cleanup matters because disorganization keeps slowing me down. I do not want the app to collapse this into one fake priority or throw useful tasks away too quickly.",
    requiredTitles: [
      "Respond to waiting quote request",
      "Fix calendar booking step",
      "Prepare strategy call agenda for tomorrow",
      "Trim homepage copy",
      "Archive and label old project assets",
    ],
    allowedFirstTitles: ["Respond to waiting quote request", "Fix calendar booking step"],
  },
  {
    name: "admin-vs-sales-board",
    prompt:
      "Help me sort a full board without dropping real work. I can follow up with a warm lead who asked about pricing, clean up an internal docs folder before a handoff, prepare a shortlist for tomorrow's hiring interview, and update my FAQ to reduce repeat questions. The lead could turn into money, the folder cleanup avoids confusion later, the shortlist matters because the interview is tomorrow, and the FAQ helps over time. I'm tired and want the clearest next step.",
    requiredTitles: [
      "Send pricing follow-up",
      "Clean up internal docs folder before handoff",
      "Prepare shortlist for tomorrow's hiring interview",
      "Update FAQ on site",
    ],
    allowedFirstTitles: ["Send pricing follow-up", "Prepare shortlist for tomorrow's hiring interview"],
  },
  {
    name: "meta-led-clause-board",
    prompt:
      "Help me sort this without dropping real work: prepare slides for Friday, send a contract revision someone is waiting on, organize receipts for bookkeeping, update the checkout FAQ, and follow up with a referral lead who went quiet.",
    requiredTitles: [
      "Prepare slides for Friday",
      "Send revised contract",
      "Organize receipts for bookkeeping",
      "Update FAQ on site",
      "Follow up with referral lead",
    ],
    allowedFirstTitles: ["Send revised contract", "Follow up with referral lead", "Prepare slides for Friday"],
  },
  {
    name: "answer-collaborator-board",
    prompt:
      "I need to choose the clearest next step. I can reconcile recent subscriptions and refunds, rewrite the hero section on my homepage, answer a collaborator waiting for approval, and package a customer story into a case study.",
    requiredTitles: [
      "Reconcile recent subscriptions and refunds",
      "Rewrite hero section on homepage",
      "Answer collaborator waiting for approval",
      "Finish case study update",
    ],
    allowedFirstTitles: [
      "Answer collaborator waiting for approval",
      "Reconcile recent subscriptions and refunds",
      "Rewrite hero section on homepage",
    ],
  },
];

const INVALID_TITLE_PATTERNS = [
  /\bmatters?\b/i,
  /\bclearest next move\b/i,
  /\bwhat should\b/i,
  /\bwhat can wait\b/i,
  /\bthis is\b/i,
  /\b(?:sort|sorting|rank|ranking)\s+(?:a\s+)?(?:full|crowded|messy)?\s*(?:decision\s+)?board\b/i,
  /\bwithout dropping meaningful work\b/i,
  /\bwithout dropping real work\b/i,
  /\bclearest next step\b/i,
];

type StructuredRegressionCase = {
  name: string;
  prompt: string;
  cleanup: AiCleanupResult;
  requiredTitles: string[];
  forbiddenTitles?: string[];
};

const structuredCases: StructuredRegressionCase[] = [
  {
    name: "structured-dedupes-qualified-research-notes",
    prompt:
      "I need the clearest next move from a crowded board. I can send a contract revision a client is waiting on today, fix a broken payment form that may be blocking purchases, organize my research notes for next month, and record a quick onboarding walkthrough for new users. Cash flow matters, the client is already waiting, the notes would reduce friction later, and the walkthrough could reduce support questions. I'm low on energy.",
    cleanup: {
      considered_items: [
        "Send contract revision to client",
        "Fix broken payment form",
        "Organize research notes",
        "Record onboarding walkthrough",
      ],
      context_notes: ["low energy", "cash flow matters"],
      decision_type: "foggy_dump",
      decision_groups: [
        {
          id: "group-1",
          label: "Immediate tasks",
          items: ["Send contract revision to client", "Fix broken payment form"],
          candidate_relationship: "tasks",
        },
        {
          id: "group-2",
          label: "Support tasks",
          items: ["Organize research notes", "Record onboarding walkthrough"],
          candidate_relationship: "tasks",
        },
      ],
    },
    requiredTitles: [
      "Send revised contract",
      "Fix broken payment form",
      "Organize research notes",
      "Record onboarding walkthrough",
    ],
    forbiddenTitles: ["Organize research notes for next month"],
  },
  {
    name: "structured-dedupes-onboarding-walkthrough-variants",
    prompt:
      "I need the clearest next move from a crowded board. I can send a contract revision a client is waiting on today, fix a broken payment form that may be blocking purchases, organize my research notes for next month, and record a quick onboarding walkthrough for new users. Cash flow matters, the client is already waiting, the notes would reduce friction later, and the walkthrough could reduce support questions. I'm low on energy.",
    cleanup: {
      considered_items: [
        "Send contract revision to client",
        "Fix broken payment form",
        "Organize research notes for next month",
        "Record onboarding walkthrough",
      ],
      context_notes: ["low energy", "cash flow matters"],
      decision_type: "foggy_dump",
      decision_groups: [
        {
          id: "group-1",
          label: "Immediate tasks",
          items: ["Send contract revision to client", "Fix broken payment form"],
          candidate_relationship: "tasks",
        },
        {
          id: "group-2",
          label: "Support tasks",
          items: ["Organize research notes for next month", "Record onboarding walkthrough"],
          candidate_relationship: "tasks",
        },
      ],
    },
    requiredTitles: [
      "Send revised contract",
      "Fix broken payment form",
      "Organize research notes",
      "Record onboarding walkthrough",
    ],
    forbiddenTitles: ["Record quick onboarding walkthrough for new users"],
  },
  {
    name: "structured-recovers-missed-collaborator-approval-task",
    prompt:
      "I need to choose the clearest next step. I can reconcile recent subscriptions and refunds, rewrite the hero section on my homepage, answer a collaborator waiting for approval, and package a customer story into a case study.",
    cleanup: {
      considered_items: [
        "Reconcile recent subscriptions and refunds",
        "Rewrite hero section on homepage",
        "Package customer story into a case study",
      ],
      context_notes: [],
      decision_type: "foggy_dump",
      decision_groups: [
        {
          id: "group-1",
          label: "Money and site work",
          items: [
            "Reconcile recent subscriptions and refunds",
            "Rewrite hero section on homepage",
          ],
          candidate_relationship: "tasks",
        },
        {
          id: "group-2",
          label: "Proof work",
          items: ["Package customer story into a case study"],
          candidate_relationship: "tasks",
        },
      ],
    },
    requiredTitles: [
      "Reconcile recent subscriptions and refunds",
      "Rewrite hero section on homepage",
      "Answer collaborator waiting for approval",
      "Finish case study update",
    ],
  },
];

cases.forEach(({ name, prompt, requiredTitles, allowedFirstTitles }) => {
  const result = analyzeClarityInput(prompt);

  assert.equal(result.status, "ready", `${name}: expected ready analysis`);
  const titles = result.candidates.map((candidate) => candidate.title);

  requiredTitles.forEach((title) => {
    assert.ok(titles.includes(title), `${name}: missing required title "${title}"`);
  });

  assert.equal(new Set(titles).size, titles.length, `${name}: duplicate titles survived`);
  titles.forEach((title) => {
    INVALID_TITLE_PATTERNS.forEach((pattern) => {
      assert.ok(!pattern.test(title), `${name}: invalid title survived "${title}"`);
    });
  });

  assert.ok(result.firstMove, `${name}: missing first move`);
  assert.ok(
    result.firstMove && allowedFirstTitles.includes(result.firstMove.title),
    `${name}: unexpected first move "${result.firstMove?.title}"`
  );
});

structuredCases.forEach(({ name, prompt, cleanup, requiredTitles, forbiddenTitles = [] }) => {
  const result = analyzeStructuredClarityInput(prompt, cleanup);

  assert.equal(result.status, "ready", `${name}: expected ready analysis`);
  const titles = result.candidates.map((candidate) => candidate.title);

  requiredTitles.forEach((title) => {
    assert.ok(titles.includes(title), `${name}: missing required title "${title}"`);
  });

  forbiddenTitles.forEach((title) => {
    assert.ok(!titles.includes(title), `${name}: forbidden title survived "${title}"`);
  });

  assert.equal(new Set(titles).size, titles.length, `${name}: duplicate titles survived`);
});

console.log(
  `Clarity regression passed for ${cases.length} local prompt families and ${structuredCases.length} structured prompt families.`
);
