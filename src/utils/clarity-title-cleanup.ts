const ACTION_START_PATTERN =
  /\b(?:reply(?:\s+to)?|respond(?:\s+to)?|answer|send|contact|call|message|follow up(?:\s+with)?|fix|finish|complete|review|submit|reach out(?:\s+to)?|email|prepare|ask|pay|invoice|record|organi[sz]e|reorgani[sz]e|clean up|cleanup|clean|write|draft|build|update|edit|sort|handle|polish|revise|rehearse|publish|post|back up|backup|approve|repair|rewrite|troubleshoot|package|confirm|reconcile|trim|archive|label)\b/i;

const META_ONLY_PATTERNS = [
  /\bwhat should (?:i\s+)?actually do first\b/i,
  /\bwhat should come second\b/i,
  /\bwhat can wait\b/i,
  /\bwhat should wait\b/i,
  /\bi need the clearest next move\b/i,
  /\bclearest next move\b/i,
  /\bclearest next step\b/i,
  /\b(?:sort|sorting|rank|ranking)\s+(?:a\s+)?(?:full|crowded|messy)?\s*(?:decision\s+)?board\b/i,
  /\bwithout dropping meaningful work\b/i,
  /\bwithout dropping real work\b/i,
  /\bdo not want to choose badly\b/i,
  /\bcollapse this into one fake priority\b/i,
  /\bwithout flattening the board\b/i,
  /\bthrow meaningful tasks into ignore too aggressively\b/i,
  /\bwithout dropping anything important\b/i,
  /\bwithout dropping meaningful items\b/i,
  /\bdo not want the app to oversimplify\b/i,
];

const TITLE_PREFIX_PATTERNS = [
  /^\s*(?:\((?:[1-9])\)|[1-9][.:]|(?:first|second|third|fourth|fifth|one|two|three|four|five))[,:-]?\s*/i,
  /^\s*(?:here(?:['’]s| is)|these are)\s+/i,
  /^\s*(?:help me|i need help)\s+(?:sort|sorting|rank|ranking)\b[^:]*:\s*/i,
  /^\s*(?:i|we)\s+(?:need|have)\s+to\s+do\s+(?:one|two|three|four|five|several|a\s+few|\d+)?\s*things:\s*/i,
  /^\s*(?:i|we)\s+(?:need|have)\s+to\s+handle\s+(?:one|two|three|four|five|several|a\s+few|\d+)?\s*things:\s*/i,
  /^\s*(?:one|two|three|four|five|\d+)\s+things:\s*/i,
  /^\s*things:\s*/i,
  /^\s*(?:should|do)\s+i\s+/i,
  /^\s*whether\s+to\s+/i,
  /^\s*if\s+i\s+(?:should|could|can|need to)\s+/i,
  /^\s*(?:i(?:['’]m| am)\s+)?(?:still\s+)?(?:trying to\s+)?decid(?:e|ing)\s+whether\s+to\s+/i,
  /^\s*i\s+need\s+to\s+decide\s+whether\s+to\s+/i,
  /^\s*(?:outside of|apart from)\s+[^,]+,\s*/i,
  /^\s*i\s+still\s+need\s+to\s+/i,
  /^\s*i\s+need\s+to\s+/i,
  /^\s*still\s+need\s+to\s+/i,
  /^\s*i\s+still\s+have\s+to\s+/i,
  /^\s*i\s+have\s+to\s+/i,
  /^\s*i\s+should\s+/i,
  /^\s*i\s+could\s+/i,
  /^\s*i\s+want\s+to\s+/i,
  /^\s*need\s+to\s+/i,
  /^\s*(?:and|but|so|also|then)\s+/i,
];

const TRAILING_FRAGMENT_PATTERNS = [
  /\s*,?\s+(?:because|since|so that|so|which|if|when|while|although|though|despite)\b.*$/i,
  /\s+\band\s+i\b.*$/i,
  /\s+\bbut\s+i\b.*$/i,
  /\s+\bso\s+i\b.*$/i,
  /\s+\band\s+it\b.*$/i,
  /\s+\band\s+the\b.*$/i,
  /\s+\band\s*$/i,
];

const CONSEQUENCE_ONLY_PATTERNS = [
  /^(?:the|a|an|this|that)\s+.+\b(?:could|would|may|might)\b/i,
  /\b(?:could turn into|would reduce|may be hurting|might be hurting|affects how|would improve|could improve)\b/i,
];

const OBJECT_CANONICAL_RULES: Array<{ pattern: RegExp; title: string }> = [
  {
    pattern: /\b(?:contact|call|message|follow up(?: with)?|reach out(?: to)?|respond(?: to)?)\s+(?:my\s+|the\s+)?landlord\b.*\brent(?:\s+timing)?\b/i,
    title: "Contact landlord about rent timing",
  },
  {
    pattern: /\b(?:contact|call|message|follow up(?: with)?|reach out(?: to)?|respond(?: to)?)\s+(?:my\s+|the\s+)?landlord\b/i,
    title: "Contact landlord",
  },
  {
    pattern: /\bclient\b.*\bwaiting\b.*\brevised?\s+proposal\b.*\btoday\b/i,
    title: "Send revised proposal today",
  },
  {
    pattern:
      /\bclient\b.*\b(?:expects?|already expects|waiting(?:\s+on)?|owe(?:s)?(?:\s+them)?\s+(?:a\s+)?)\b.*\breply(?:\s+from\s+me)?\b.*\btoday\b/i,
    title: "Reply to client today",
  },
  {
    pattern:
      /\bclient\b.*\b(?:expects?|already expects|waiting(?:\s+on)?|owe(?:s)?(?:\s+them)?\s+(?:a\s+)?)\b.*\breply(?:\s+from\s+me)?\b/i,
    title: "Reply to client",
  },
  {
    pattern: /\b(?:review|approve)\b.*\bdraft\b.*\bwaiting\b/i,
    title: "Review and approve draft",
  },
  {
    pattern: /\bdraft\b.*\bwaiting\b/i,
    title: "Review and approve draft",
  },
  {
    pattern: /\brepair\b.*\bemail\s+automation\b/i,
    title: "Repair email automation",
  },
  {
    pattern: /\bdraft\b.*\bonboarding\s+email\b/i,
    title: "Draft revised onboarding email",
  },
  {
    pattern: /\bonboarding\s+email\b/i,
    title: "Draft revised onboarding email",
  },
  {
    pattern: /\bclean up\b.*\bcrm\s+tags\b/i,
    title: "Clean up CRM tags",
  },
  {
    pattern: /\bcrm\s+tags\b/i,
    title: "Clean up CRM tags",
  },
  {
    pattern: /\bemail\s+automation\b/i,
    title: "Repair email automation",
  },
  {
    pattern: /\brewrite\b.*\blanding\s+page\b.*\bheadline\b/i,
    title: "Rewrite landing page headline",
  },
  {
    pattern: /\brewrite\b.*\bheadline\b.*\blanding\s+page\b/i,
    title: "Rewrite landing page headline",
  },
  {
    pattern: /\blanding\s+page\b.*\bheadline\b/i,
    title: "Rewrite landing page headline",
  },
  {
    pattern: /\bheadline\b.*\blanding\s+page\b/i,
    title: "Rewrite landing page headline",
  },
  {
    pattern: /\bprepare\b.*\bshortlist\b.*\bquestions\b.*\bdiscovery\s+call\b.*\btomorrow\b/i,
    title: "Prepare discovery call questions for tomorrow",
  },
  {
    pattern: /\bprepare\b.*\bquestions\b.*\bdiscovery\s+call\b/i,
    title: "Prepare discovery call questions",
  },
  {
    pattern: /\bfollow up(?: with)?\b.*\bpast\s+client\b.*\breferrals?\b/i,
    title: "Follow up with past client about referrals",
  },
  {
    pattern: /\bsend\b.*\bfollow[\s-]?up\b.*\bworking\s+together\b/i,
    title: "Send follow-up about working together",
  },
  {
    pattern: /\bpast\s+client\b.*\breferrals?\b/i,
    title: "Follow up with past client about referrals",
  },
  {
    pattern: /\brehearse\b.*\bpresentation\b.*\btomorrow\b/i,
    title: "Rehearse presentation for tomorrow",
  },
  {
    pattern: /\brehearse\b.*\bpresentation\b/i,
    title: "Rehearse presentation",
  },
  {
    pattern: /\b(?:respond|reply)(?:\s+to)?\s+(?:a\s+|the\s+)?collaborator\b.*\bfeedback\b/i,
    title: "Respond to collaborator feedback",
  },
  {
    pattern: /\bcollaborator\b.*\bfeedback\b/i,
    title: "Respond to collaborator feedback",
  },
  {
    pattern: /\b(?:fix|repair|update|clean up|cleanup)\b.*\bsignup\b.*\b(?:issue|flow|form)\b/i,
    title: "Fix signup issue",
  },
  {
    pattern: /\b(?:fix|repair|update)\b.*\bnewsletter\s+signup\b/i,
    title: "Fix newsletter signup on site",
  },
  {
    pattern: /\bnewsletter\s+signup\b/i,
    title: "Fix newsletter signup on site",
  },
  {
    pattern: /\bsignup\b.*\b(?:issue|flow|form)\b/i,
    title: "Fix signup issue",
  },
  {
    pattern: /\b(?:publish|post|ship)\b.*\bdrafted\b.*\bcontent\b/i,
    title: "Publish drafted content",
  },
  {
    pattern: /\b(?:publish|post|ship)\b.*\bcontent\b/i,
    title: "Publish content",
  },
  {
    pattern: /\b(?:review|check)\b.*\bcontract\b.*\bsend(?:ing)?\s+it\s+back\b/i,
    title: "Review contract before sending back",
  },
  {
    pattern: /\b(?:edit|finish|polish|publish)\b.*\btestimonial\b.*\bvideo\b/i,
    title: "Edit testimonial video",
  },
  {
    pattern: /\btestimonial\b.*\bvideo\b/i,
    title: "Edit testimonial video",
  },
  {
    pattern: /\b(?:send|follow up|reply|respond)\b.*\bpricing\b/i,
    title: "Send pricing follow-up",
  },
  {
    pattern: /\bpricing\b.*\bfollow[\s-]?up\b/i,
    title: "Send pricing follow-up",
  },
  {
    pattern: /\b(?:clean up|cleanup|fix|update)\b.*\bcheckout\b.*\bflow\b/i,
    title: "Clean up checkout flow",
  },
  {
    pattern: /\bcheckout\b.*\bflow\b/i,
    title: "Clean up checkout flow",
  },
  {
    pattern: /\b(?:prepare|write)\b.*\btalking\s+points\b.*\bcall\b.*\b(?:this\s+week|later\s+this\s+week)\b/i,
    title: "Prepare talking points for call later this week",
  },
  {
    pattern: /\b(?:prepare|write)\b.*\btalking\s+points\b.*\bcall\b/i,
    title: "Prepare talking points for call",
  },
  {
    pattern: /\b(?:back up|backup)\b.*\bfiles?\b/i,
    title: "Back up and organize files",
  },
  {
    pattern: /\bconfirm\b.*\btravel\s+details\b.*\bmeeting\b.*\bnext\s+week\b/i,
    title: "Confirm travel details for meeting next week",
  },
  {
    pattern: /\bconfirm\b.*\btravel\s+details\b/i,
    title: "Confirm travel details",
  },
  {
    pattern: /\breconcile\b.*\bpayments?\b.*\bexpenses?\b/i,
    title: "Reconcile recent payments and expenses",
  },
  {
    pattern: /\bpayments?\b.*\bexpenses?\b/i,
    title: "Reconcile recent payments and expenses",
  },
  {
    pattern: /\brevise\b.*\bopening\s+section\b.*\bproposal\s+template\b/i,
    title: "Revise proposal template opening",
  },
  {
    pattern: /\bproposal\s+template\b/i,
    title: "Revise proposal template opening",
  },
  {
    pattern: /\bfollow up(?: with)?\b.*\bworking\s+together\b/i,
    title: "Send follow-up about working together",
  },
  {
    pattern: /\b(?:prepare|write)\b.*\bagenda\b.*\bstrategy\s+call\b.*\btomorrow\b/i,
    title: "Prepare strategy call agenda for tomorrow",
  },
  {
    pattern: /\b(?:prepare|write)\b.*\bagenda\b.*\bstrategy\s+call\b/i,
    title: "Prepare strategy call agenda",
  },
  {
    pattern: /\bprepare\b.*\bslides?\b.*\bfriday\b/i,
    title: "Prepare slides for Friday",
  },
  {
    pattern: /\bslides?\b.*\bfriday\b/i,
    title: "Prepare slides for Friday",
  },
  {
    pattern: /\b(?:repair|fix)\b.*\bcalendar\b.*\bbooking\b.*\bstep\b/i,
    title: "Fix calendar booking step",
  },
  {
    pattern: /\bcalendar\b.*\bbooking\b.*\bstep\b/i,
    title: "Fix calendar booking step",
  },
  {
    pattern: /\b(?:respond|reply)(?:\s+to)?\b.*\bquote\b/i,
    title: "Respond to waiting quote request",
  },
  {
    pattern: /\btrim\b.*\bhomepage\s+copy\b/i,
    title: "Trim homepage copy",
  },
  {
    pattern: /\bhomepage\s+copy\b/i,
    title: "Trim homepage copy",
  },
  {
    pattern: /\brewrite\b.*\bhero\s+section\b.*\bhomepage\b/i,
    title: "Rewrite hero section on homepage",
  },
  {
    pattern: /\bhero\s+section\b.*\bhomepage\b/i,
    title: "Rewrite hero section on homepage",
  },
  {
    pattern: /\barchive\b.*\bproject\s+assets\b/i,
    title: "Archive and label old project assets",
  },
  {
    pattern: /\bproject\s+assets\b/i,
    title: "Archive and label old project assets",
  },
  {
    pattern: /\bupdate\b.*\bfaq\b/i,
    title: "Update FAQ on site",
  },
  {
    pattern: /\bfaq\b/i,
    title: "Update FAQ on site",
  },
  {
    pattern: /\breply(?:\s+to)?\s+(?:a\s+|the\s+)?partner\b.*\bdecision\b/i,
    title: "Reply to partner with decision",
  },
  {
    pattern: /\bpartner\b.*\bdecision\b/i,
    title: "Reply to partner with decision",
  },
  {
    pattern: /\btroubleshoot\b.*\bpayment\s+link\b/i,
    title: "Troubleshoot payment link",
  },
  {
    pattern: /\bpayment\s+link\b/i,
    title: "Troubleshoot payment link",
  },
  {
    pattern: /\bpackage\b.*\bportfolio\b.*\bcase\s+study\b/i,
    title: "Package project into portfolio case study",
  },
  {
    pattern: /\bportfolio\s+case\s+study\b/i,
    title: "Package project into portfolio case study",
  },
  {
    pattern: /\bclean up\b.*\bshared\s+folder\s+structure\b.*\bteam\s+handoff\b/i,
    title: "Clean up shared folder structure for team handoff",
  },
  {
    pattern: /\bshared\s+folder\s+structure\b.*\bhandoff\b/i,
    title: "Clean up shared folder structure for team handoff",
  },
  {
    pattern: /\b(?:send|finish|revise)\b.*\brevised?\s+proposal\b/i,
    title: "Send revised proposal",
  },
  {
    pattern: /\b(?:fix|repair|update)\b.*\bcontact\s+form\b/i,
    title: "Fix contact form",
  },
  {
    pattern: /\b(?:send|create|issue|submit)\s+(?:an?\s+|the\s+)?invoice\b(?!\s+reminder)/i,
    title: "Send invoice",
  },
  {
    pattern: /\binvoice\s+reminder\b/i,
    title: "Send invoice reminder",
  },
  {
    pattern: /\b(?:send|review|finish|handle|revise|update)\b.*\b(?:revised?\s+contract|contract revision)\b/i,
    title: "Send revised contract",
  },
  {
    pattern: /\b(?:answer|respond(?:\s+to)?|reply(?:\s+to)?)\b.*\bcollaborator\b.*\bapproval\b/i,
    title: "Answer collaborator waiting for approval",
  },
  {
    pattern: /\bcollaborator\b.*\bapproval\b/i,
    title: "Answer collaborator waiting for approval",
  },
  {
    pattern: /\b(?:client\s+revision|revision\s+for\s+client)\b/i,
    title: "Handle client revision",
  },
  {
    pattern: /\b(?:fix|update)\b.*\bbooking\s+link\b/i,
    title: "Fix booking link",
  },
  {
    pattern: /\bbooking\s+link\b/i,
    title: "Fix booking link",
  },
  {
    pattern: /\bcontact\s+form\b/i,
    title: "Fix contact form",
  },
  {
    pattern: /\brevised?\s+proposal\b/i,
    title: "Send revised proposal",
  },
  {
    pattern: /\bfix\b.*\bwebsite\b/i,
    title: "Fix website issues",
  },
  {
    pattern: /\b(?:fix|repair|debug|update)\b.*\bonboarding\b.*\b(?:bug|flow)\b/i,
    title: "Fix onboarding bug",
  },
  {
    pattern: /\bonboarding\b.*\bbug\b/i,
    title: "Fix onboarding bug",
  },
  {
    pattern: /\b(?:reply|respond)(?:\s+to)?\s+(?:(?:a|the)\s+)?client\b.*\btoday\b/i,
    title: "Reply to client today",
  },
  {
    pattern: /\b(?:reply|respond)(?:\s+to)?\s+(?:(?:a|the)\s+)?client\b/i,
    title: "Reply to client",
  },
  {
    pattern: /\bfollow up(?: with)?\b.*\bclient\b.*\boutstanding\b.*\brevision\b/i,
    title: "Follow up with client about outstanding revision",
  },
  {
    pattern: /\bfinish\b.*\bpolished\b.*\bproposal\b.*\b(?:us|american)\s+client\b/i,
    title: "Finish polished proposal for US client",
  },
  {
    pattern: /\b(?:send|submit)\b.*\bproposal\b.*\b(?:us|american)\s+client\b/i,
    title: "Send proposal to US client",
  },
  {
    pattern: /\bfinish\b.*\bproposal\b.*\b(?:us|american)\s+client\b/i,
    title: "Finish proposal for US client",
  },
  {
    pattern: /\bfinish\b.*\bproposal\b/i,
    title: "Finish proposal",
  },
  {
    pattern: /\b(?:send|follow up|message|email)\b.*\boverdue\b.*\bpayment\b/i,
    title: "Send follow-up message about overdue payment",
  },
  {
    pattern: /\b(?:follow up(?: with)?|reply(?:\s+to)?|respond(?:\s+to)?)\b.*\breferral\s+lead\b/i,
    title: "Follow up with referral lead",
  },
  {
    pattern: /\boverdue\b.*\bpayment\b/i,
    title: "Send follow-up message about overdue payment",
  },
  {
    pattern: /\bfollow up(?: with)?\b.*\bwarmer\b.*\bdubai\b.*\blead\b/i,
    title: "Follow up warmer Dubai lead",
  },
  {
    pattern: /\bfollow up(?: with)?\b.*\bdubai\b.*\blead\b/i,
    title: "Follow up Dubai lead",
  },
  {
    pattern: /\b(?:reply(?:\s+to)?|follow up(?: with)?)\b.*\bwarm\s+leads?\b/i,
    title: "Reply to warm leads",
  },
  {
    pattern: /\bwarm\s+leads?\b/i,
    title: "Reply to warm leads",
  },
  {
    pattern: /\b(?:prepare|write|review)\b.*\bmeeting\s+notes\b/i,
    title: "Prepare meeting notes",
  },
  {
    pattern: /\bprepare\b.*\bnotes?\b.*\btomorrow'?s?\s+sync\b/i,
    title: "Prepare notes for tomorrow's sync",
  },
  {
    pattern: /\bmeeting\s+notes\b/i,
    title: "Prepare meeting notes",
  },
  {
    pattern: /\b(?:prepare|do)\b.*\bmeeting\s+prep\b/i,
    title: "Prepare meeting prep",
  },
  {
    pattern: /\bmeeting\s+prep\b/i,
    title: "Prepare meeting prep",
  },
  {
    pattern: /\b(?:record|film|shoot|make)\b.*\bdemo\b.*\bvideo\b/i,
    title: "Record demo video",
  },
  {
    pattern: /\b(?:record|film|shoot|make)\b.*\bexplainer\b/i,
    title: "Record short explainer for new users",
  },
  {
    pattern: /\bdemo\s+video\b/i,
    title: "Record demo video",
  },
  {
    pattern: /\b(?:record|create|make|draft)\b.*\bonboarding\b.*\bwalkthrough\b/i,
    title: "Record onboarding walkthrough",
  },
  {
    pattern: /\bonboarding\b.*\bwalkthrough\b/i,
    title: "Record onboarding walkthrough",
  },
  {
    pattern: /\b(?:finish|update|polish)\b.*\bcase\s+study\b/i,
    title: "Finish case study update",
  },
  {
    pattern: /\bcase\s+study\b/i,
    title: "Finish case study update",
  },
  {
    pattern: /\b(?:clean up|cleanup|clean|update)\b.*\bportfolio\b.*\bpage\b/i,
    title: "Clean up portfolio page",
  },
  {
    pattern: /\b(?:repair|fix)\b.*\bbooking\s+widget\b/i,
    title: "Repair booking widget",
  },
  {
    pattern: /\bbooking\s+widget\b/i,
    title: "Repair booking widget",
  },
  {
    pattern: /\bportfolio\s+page\b/i,
    title: "Clean up portfolio page",
  },
  {
    pattern: /\b(?:update|edit|fix|clean up|cleanup|clean)\b.*\bservices?\s+page\b/i,
    title: "Update services page",
  },
  {
    pattern: /\bservices?\s+page\b/i,
    title: "Update services page",
  },
  {
    pattern: /\b(?:organi[sz]e|reorgani[sz]e|sort|clean up|cleanup)\b.*\bfiles?\b/i,
    title: "Organize files",
  },
  {
    pattern: /\b(?:organi[sz]e|reconcile|sort)\b.*\breceipts?\b.*\bbookkeeping\b/i,
    title: "Organize receipts for bookkeeping",
  },
  {
    pattern: /\b(?:organi[sz]e|reorgani[sz]e|sort|clean up|cleanup)\b.*\bresearch\s+notes\b/i,
    title: "Organize research notes",
  },
  {
    pattern: /\bmessy\s+files?\b/i,
    title: "Organize files",
  },
];

const DEDUPE_SIGNATURE_RULES: Array<{ pattern: RegExp; key: string }> = [
  { pattern: /\bdraft\b.*\bwaiting\b/i, key: "review|approve|draft" },
  { pattern: /\bemail\s+automation\b/i, key: "repair|email|automation" },
  { pattern: /\bonboarding\s+email\b/i, key: "draft|onboarding|email" },
  { pattern: /\bcrm\s+tags\b/i, key: "cleanup|crm|tag" },
  { pattern: /\blanding\s+page\b.*\bheadline\b/i, key: "rewrite|landing|page|headline" },
  { pattern: /\bhero\s+section\b.*\bhomepage\b/i, key: "rewrite|homepage|hero|section" },
  { pattern: /\bdiscovery\s+call\b.*\bquestions\b/i, key: "prepare|discovery|call|question" },
  { pattern: /\bpast\s+client\b.*\breferrals?\b/i, key: "followup|past|client|referral" },
  { pattern: /\brehearse\b.*\bpresentation\b/i, key: "rehearse|presentation" },
  { pattern: /\bcollaborator\b.*\bfeedback\b/i, key: "respond|collaborator|feedback" },
  { pattern: /\bsignup\b.*\b(?:issue|flow|form)\b/i, key: "fix|signup|issue" },
  { pattern: /\b(?:publish|post|ship)\b.*\bcontent\b/i, key: "publish|content" },
  { pattern: /\b(?:review|check)\b.*\bcontract\b.*\bsend(?:ing)?\s+it\s+back\b/i, key: "review|contract|sendback" },
  { pattern: /\bfaq\b/i, key: "update|faq" },
  { pattern: /\bpartner\b.*\bdecision\b/i, key: "reply|partner|decision" },
  { pattern: /\bpayment\s+link\b/i, key: "troubleshoot|payment|link" },
  { pattern: /\bportfolio\s+case\s+study\b/i, key: "package|portfolio|case|study" },
  { pattern: /\bshared\s+folder\s+structure\b.*\bhandoff\b/i, key: "cleanup|shared|folder|handoff" },
  { pattern: /\btestimonial\b.*\bvideo\b/i, key: "edit|testimonial|video" },
  { pattern: /\bpricing\b/i, key: "followup|pricing" },
  { pattern: /\bcheckout\b.*\bflow\b/i, key: "cleanup|checkout|flow" },
  { pattern: /\btalking\s+points\b.*\bcall\b/i, key: "prepare|talking|points|call" },
  { pattern: /\b(?:back up|backup)\b.*\bfiles?\b/i, key: "backup|file" },
  { pattern: /\btravel\s+details\b/i, key: "confirm|travel|detail" },
  { pattern: /\bnewsletter\s+signup\b/i, key: "fix|newsletter|signup" },
  { pattern: /\bpayments?\b.*\bexpenses?\b/i, key: "reconcile|payment|expense" },
  { pattern: /\bproposal\s+template\b/i, key: "revise|proposal|template" },
  { pattern: /\bworking\s+together\b/i, key: "followup|workingtogether" },
  { pattern: /\bagenda\b.*\bstrategy\s+call\b/i, key: "prepare|agenda|strategy|call" },
  { pattern: /\bslides?\b.*\bfriday\b/i, key: "prepare|slide|friday" },
  { pattern: /\bcalendar\b.*\bbooking\b.*\bstep\b/i, key: "fix|calendar|booking|step" },
  { pattern: /\bquote\b/i, key: "reply|quote" },
  { pattern: /\bhomepage\s+copy\b/i, key: "trim|homepage|copy" },
  { pattern: /\bproject\s+assets\b/i, key: "archive|project|asset" },
  { pattern: /\brevised?\s+proposal\b/i, key: "send|proposal|revision" },
  { pattern: /\b(?:send|create|issue|submit)\s+(?:an?\s+|the\s+)?invoice\b(?!\s+reminder)/i, key: "send|invoice" },
  { pattern: /\binvoice\s+reminder\b/i, key: "send|invoice|reminder" },
  { pattern: /\b(?:client\s+revision|revision\s+for\s+client)\b/i, key: "handle|client|revision" },
  { pattern: /\bcollaborator\b.*\bapproval\b/i, key: "answer|collaborator|approval" },
  { pattern: /\b(?:revised?\s+contract|contract revision)\b/i, key: "send|contract|revision" },
  {
    pattern: /\b(?:contact|call|message|follow up(?: with)?|reach out(?: to)?)\s+(?:my\s+|the\s+)?landlord\b.*\brent(?:\s+timing)?\b/i,
    key: "contact|landlord|renttiming",
  },
  { pattern: /\bfix\b.*\bwebsite\b/i, key: "fix|website" },
  { pattern: /\bcontact\s+form\b/i, key: "fix|contact|form" },
  { pattern: /\bonboarding\b.*\bbug\b/i, key: "fix|onboarding|bug" },
  { pattern: /\bbooking\s+link\b/i, key: "fix|booking|link" },
  {
    pattern:
      /\b(?:reply|respond)(?:\s+to)?\s+(?:(?:a|an|the|this|that)\s+)?(?:(?:same|current|existing)\s+)?client\b/i,
    key: "reply|client",
  },
  { pattern: /\bfollow up(?: with)?\b.*\bclient\b.*\boutstanding\b.*\brevision\b/i, key: "followup|client|revision" },
  { pattern: /\bwarm\s+leads?\b/i, key: "reply|warm|lead" },
  { pattern: /\boverdue\b.*\bpayment\b/i, key: "followup|payment|overdue" },
  { pattern: /\breferral\s+lead\b/i, key: "followup|referral|lead" },
  { pattern: /\bmeeting\s+notes\b/i, key: "prepare|meeting|notes" },
  { pattern: /\btomorrow'?s?\s+sync\b/i, key: "prepare|note|sync|tomorrow" },
  { pattern: /\bmeeting\s+prep\b/i, key: "prepare|meeting|prep" },
  { pattern: /\bcase\s+study\b/i, key: "finish|case|study" },
  { pattern: /\breceipts?\b.*\bbookkeeping\b/i, key: "organize|receipt|bookkeeping" },
  { pattern: /\bbooking\s+widget\b/i, key: "repair|booking|widget" },
  { pattern: /\bexplainer\b/i, key: "record|explainer" },
  { pattern: /\bdemo\s+video\b/i, key: "record|demo|video" },
  { pattern: /\bonboarding\b.*\bwalkthrough\b/i, key: "record|onboarding|walkthrough" },
  { pattern: /\bportfolio\s+page\b/i, key: "cleanup|portfolio|page" },
  { pattern: /\bservices?\s+page\b/i, key: "update|services|page" },
  { pattern: /\b(?:messy\s+)?files?\b/i, key: "organize|file" },
  { pattern: /\bresearch\s+notes\b/i, key: "organize|research|note" },
  { pattern: /\bfinish\b.*\bproposal\b/i, key: "finish|proposal" },
  { pattern: /\b(?:send|submit|finish)\b.*\bproposal\b.*\b(?:us|american)\s+client\b/i, key: "proposal|usclient" },
  { pattern: /\bfollow up(?: with)?\b.*\bdubai\b.*\blead\b/i, key: "followup|dubailead" },
];

const toSentenceCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const normalizeWhitespace = (value: string) =>
  value.replace(/[.,;:?!]+$/g, "").replace(/\s+/g, " ").trim();

const compressActionPhrase = (value: string) =>
  normalizeWhitespace(
    value
      .replace(/\b(?:the|a|an|my|our|your)\b/gi, " ")
      .replace(/\b(?:same|current|existing)\b/gi, " ")
      .replace(/\bto the\b/gi, "to ")
      .replace(/\bwith the\b/gi, "with ")
      .replace(/\babout the\b/gi, "about ")
      .replace(/\bfor the\b/gi, "for ")
  );

const singularizeToken = (value: string) => {
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

const normalizeVerbRoot = (title: string) => {
  if (/^reply(?:\s+to)?\b/i.test(title)) {
    return "reply";
  }

  if (/^respond(?:\s+to)?\b/i.test(title)) {
    return "reply";
  }

  if (/^follow up(?:\s+with)?\b/i.test(title)) {
    return "followup";
  }

  if (/^reach out(?:\s+to)?\b/i.test(title)) {
    return "reachout";
  }

  if (/^clean up\b|^cleanup\b/i.test(title)) {
    return "cleanup";
  }

  if (/^clean\b/i.test(title)) {
    return "cleanup";
  }

  if (/^edit\b/i.test(title)) {
    return "update";
  }

  if (/^back up\b|^backup\b/i.test(title)) {
    return "backup";
  }

  if (/^approve\b/i.test(title)) {
    return "review";
  }

  if (/^repair\b/i.test(title)) {
    return "fix";
  }

  if (/^rewrite\b/i.test(title)) {
    return "update";
  }

  if (/^troubleshoot\b/i.test(title)) {
    return "fix";
  }

  if (/^package\b/i.test(title)) {
    return "package";
  }

  if (/^confirm\b/i.test(title)) {
    return "confirm";
  }

  if (/^reconcile\b/i.test(title)) {
    return "reconcile";
  }

  if (/^trim\b/i.test(title)) {
    return "trim";
  }

  if (/^archive\b/i.test(title)) {
    return "archive";
  }

  if (/^label\b/i.test(title)) {
    return "archive";
  }

  if (/^reorgani[sz]e\b|^organi[sz]e\b|^sort\b/i.test(title)) {
    return "organize";
  }

  const match = title.match(
    /^(reply(?:\s+to)?|respond(?:\s+to)?|follow up(?:\s+with)?|reach out(?:\s+to)?|clean up|cleanup|clean|reorgani[sz]e|organi[sz]e|record|send|contact|call|message|fix|finish|complete|review|submit|email|prepare|ask|pay|invoice|write|draft|build|update|edit|sort|polish|revise|rehearse|publish|post|back up|backup|approve|repair|rewrite|troubleshoot|package|confirm|reconcile|trim|archive|label)\b/i
  );

  return match ? match[1].toLowerCase().replace(/\s+/g, "") : "";
};

const buildLooseCanonicalTaskKey = (value: string) => {
  const title = normalizeClarityTaskTitle(value);
  if (!title) {
    return "";
  }

  const verbRoot = normalizeVerbRoot(title);
  if (!verbRoot) {
    return "";
  }

  const objectText = title
    .replace(
      /^(reply(?:\s+to)?|respond(?:\s+to)?|follow up(?:\s+with)?|reach out(?:\s+to)?|clean up|cleanup|clean|reorgani[sz]e|organi[sz]e|record|send|contact|call|message|fix|finish|complete|review|submit|email|prepare|ask|pay|invoice|write|draft|build|update|edit|sort|polish|revise|rehearse|publish|post|back up|backup|approve|repair|rewrite|troubleshoot|package|confirm|reconcile|trim|archive|label)\b/i,
      ""
    )
    .toLowerCase();

  const objectTokens = objectText
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => singularizeToken(token))
    .filter(
      (token) =>
        token &&
        ![
          "a",
          "an",
          "the",
          "my",
          "our",
          "your",
          "this",
          "that",
          "same",
          "short",
          "quick",
          "brief",
          "small",
          "one",
          "some",
          "me",
          "to",
          "with",
          "about",
          "from",
          "on",
          "for",
          "before",
          "after",
          "later",
          "next",
          "this",
          "today",
          "tomorrow",
          "week",
          "month",
          "upcoming",
          "recent",
          "old",
          "new",
        ].includes(token)
    );

  if (!objectTokens.length) {
    return verbRoot;
  }

  return `${verbRoot}|${objectTokens.slice(0, 4).join("|")}`;
};

const stripTitlePrefixes = (value: string) =>
  TITLE_PREFIX_PATTERNS.reduce((currentValue, pattern) => currentValue.replace(pattern, ""), value).trim();

const stripTrailingFragments = (value: string) =>
  TRAILING_FRAGMENT_PATTERNS.reduce((currentValue, pattern) => currentValue.replace(pattern, ""), value).trim();

const salvageActionClause = (value: string) => {
  const match = value.match(ACTION_START_PATTERN);
  if (!match || match.index === undefined) {
    return value;
  }

  return value.slice(match.index).trim();
};

const looksLikeRejectedFragment = (value: string) =>
  !value ||
  META_ONLY_PATTERNS.some((pattern) => pattern.test(value)) ||
  CONSEQUENCE_ONLY_PATTERNS.some((pattern) => pattern.test(value)) ||
  /\bmatters?\s+(?:because|since|as)\b/i.test(value) ||
  /^(?:i|we)\b/i.test(value) ||
  /^(?:reply|respond)\s+from\s+me\b/i.test(value) ||
  /\b(?:what should|which one|clearest next move|should i|do i|whether to)\b/i.test(value) ||
  /\b(?:and i|but i|so i)\b/i.test(value);

export const normalizeClarityTaskTitle = (value: string) => {
  const normalized = normalizeWhitespace(value);
  if (!normalized || META_ONLY_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return "";
  }

  let nextValue = stripTitlePrefixes(normalized);
  const preSalvageCanonicalRule = OBJECT_CANONICAL_RULES.find(({ pattern }) => pattern.test(nextValue));
  if (preSalvageCanonicalRule) {
    return preSalvageCanonicalRule.title;
  }

  nextValue = salvageActionClause(nextValue);
  nextValue = stripTrailingFragments(nextValue);
  nextValue = compressActionPhrase(nextValue);

  if (!nextValue) {
    return "";
  }

  const canonicalRule = OBJECT_CANONICAL_RULES.find(({ pattern }) => pattern.test(nextValue));
  if (canonicalRule) {
    return canonicalRule.title;
  }

  if (looksLikeRejectedFragment(nextValue)) {
    return "";
  }

  if (!ACTION_START_PATTERN.test(nextValue)) {
    return "";
  }

  if (nextValue.split(/\s+/).length > 11) {
    return "";
  }

  return toSentenceCase(nextValue);
};

export const getCanonicalClarityTaskKey = (value: string) => {
  const title = normalizeClarityTaskTitle(value);
  if (!title) {
    return "";
  }

  const matchingRule = DEDUPE_SIGNATURE_RULES.find(({ pattern }) => pattern.test(title));
  if (matchingRule) {
    return matchingRule.key;
  }

  return buildLooseCanonicalTaskKey(title) || title.toLowerCase();
};

const getCanonicalTitlePreference = (value: string) => {
  let score = 0;

  if (/\btoday\b/i.test(value)) {
    score += 3;
  }

  if (/\brent timing\b/i.test(value)) {
    score += 2.5;
  }

  if (/\bpolished\b/i.test(value)) {
    score += 2.5;
  }

  if (/\b(?:us|american)\s+client\b/i.test(value)) {
    score += 2.5;
  }

  if (/\bwarmer\b/i.test(value)) {
    score += 2;
  }

  const wordCount = value.split(/\s+/).length;
  if (wordCount <= 6) {
    score += 1.5;
  } else if (wordCount >= 10) {
    score -= 1.5;
  }

  score -= value.length / 120;
  return score;
};

export const dedupeCanonicalClarityTitles = (values: string[]) => {
  const chosenByKey = new Map<string, string>();

  values.forEach((value) => {
    const title = normalizeClarityTaskTitle(value);
    if (!title) {
      return;
    }

    const key = getCanonicalClarityTaskKey(title);
    if (!key) {
      return;
    }

    const existing = chosenByKey.get(key);
    if (!existing || getCanonicalTitlePreference(title) > getCanonicalTitlePreference(existing)) {
      chosenByKey.set(key, title);
    }
  });

  return Array.from(chosenByKey.values());
};
