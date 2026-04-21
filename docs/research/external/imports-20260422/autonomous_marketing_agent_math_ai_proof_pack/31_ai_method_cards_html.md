# Ai Method Cards

Converted from `31_ai_method_cards.html` so the pack remains Markdown-only.

```html
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Generative AI Method Cards</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; margin: 32px; line-height: 1.45; max-width: 1100px; }
.card { border: 1px solid #ddd; border-radius: 10px; padding: 18px; margin: 16px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
h1 { margin-bottom: 8px; }
h2 { margin-bottom: 4px; }
.tag { display:inline-block; padding:2px 8px; background:#f3f3f3; border-radius:999px; border:1px solid #ddd; font-size:12px; }
</style>
</head>
<body>
<h1>Generative AI Method Cards</h1>
<p>Use these as tactical decision cards. The question is not “can AI do this?” but “is this the right method for the buyer state, risk level, and proof gap?”</p>

    <section class="card">
      <h2>1. Review mining with LLMs</h2>
      <p><span class="tag">Research</span></p>
      <p><strong>Use when:</strong> You have many reviews, comments, forum posts, support tickets, or competitor reviews.</p>
      <p><strong>Do not use when:</strong> Do not use it as final truth. Use it to find patterns to verify with humans.</p>
      <p><strong>Why it works:</strong> LLMs cluster language, objections, jobs, and emotional triggers faster than manual scanning.</p>
      <p><strong>Mindset:</strong> Be a forensic analyst. Extract buyer language; do not invent it.</p>
      <p><strong>Metrics:</strong> Quote frequency, themes found, verified interviews, conversion lift from using real language.</p>
      <p><strong>Failure modes:</strong> Hallucinated quotes, overfitting to loud users, missing silent churn reasons.</p>
      <p><strong>First safety rule:</strong> Ask the model to quote exact source lines and separate evidence from inference.</p>
    </section>

    <section class="card">
      <h2>2. Interview guide generation</h2>
      <p><span class="tag">Research</span></p>
      <p><strong>Use when:</strong> You need to run JTBD or buyer interviews and want sharper questions quickly.</p>
      <p><strong>Do not use when:</strong> Do not let AI interview people without supervision for sensitive/high-value research.</p>
      <p><strong>Why it works:</strong> AI can create question ladders, probes, and bias checks from your hypotheses.</p>
      <p><strong>Mindset:</strong> Be a disciplined investigator, not a pitchman.</p>
      <p><strong>Metrics:</strong> Interview completion, quality of surprising insights, number of falsified assumptions.</p>
      <p><strong>Failure modes:</strong> Leading questions that confirm your desired answer.</p>
      <p><strong>First safety rule:</strong> Ask AI to rewrite questions to avoid selling, leading, or assuming.</p>
    </section>

    <section class="card">
      <h2>3. Transcript coding and theme extraction</h2>
      <p><span class="tag">Research</span></p>
      <p><strong>Use when:</strong> You have call/interview transcripts and need patterns across objections, triggers, and decision criteria.</p>
      <p><strong>Do not use when:</strong> Do not replace human review when stakes are high or sample is small.</p>
      <p><strong>Why it works:</strong> AI accelerates qualitative coding and can compare segments.</p>
      <p><strong>Mindset:</strong> Be a judge weighing evidence.</p>
      <p><strong>Metrics:</strong> Intercoder agreement, theme stability, exact quotes, actionability.</p>
      <p><strong>Failure modes:</strong> Overgeneralizing from a few charismatic quotes.</p>
      <p><strong>First safety rule:</strong> Force line citations and keep a human-coded sample.</p>
    </section>

    <section class="card">
      <h2>4. Synthetic customer simulation</h2>
      <p><span class="tag">Research</span></p>
      <p><strong>Use when:</strong> You need hypotheses before spending money on interviews or ads.</p>
      <p><strong>Do not use when:</strong> Do not treat synthetic customers as evidence of real demand.</p>
      <p><strong>Why it works:</strong> LLMs can simulate plausible perspectives and expose blind spots, but they reflect training data and prompt framing.</p>
      <p><strong>Mindset:</strong> Be a war-gamer. Use it to prepare, not decide.</p>
      <p><strong>Metrics:</strong> Number of hypotheses generated, later validation rate, discarded bad assumptions.</p>
      <p><strong>Failure modes:</strong> Believing fake certainty, persona stereotypes.</p>
      <p><strong>First safety rule:</strong> Label all synthetic output as speculation until validated.</p>
    </section>

    <section class="card">
      <h2>5. Competitor review triangulation</h2>
      <p><span class="tag">Research</span></p>
      <p><strong>Use when:</strong> You need to find gaps in competitors’ products, pricing, onboarding, docs, and support.</p>
      <p><strong>Do not use when:</strong> Do not scrape or use private/prohibited data.</p>
      <p><strong>Why it works:</strong> Combines review mining, feature comparison, and objection mapping.</p>
      <p><strong>Mindset:</strong> Be an intelligence analyst.</p>
      <p><strong>Metrics:</strong> Repeated competitor complaints, angle quality, proof gaps identified.</p>
      <p><strong>Failure modes:</strong> Cherry-picking weakness while ignoring competitor strengths.</p>
      <p><strong>First safety rule:</strong> Use multiple sources: G2/Capterra/forums/docs/pricing pages.</p>
    </section>

    <section class="card">
      <h2>6. Support-ticket opportunity mining</h2>
      <p><span class="tag">Research</span></p>
      <p><strong>Use when:</strong> You have tickets/chats and need upgrade triggers, churn risk, onboarding friction, and feature demand.</p>
      <p><strong>Do not use when:</strong> Do not use private customer data in public AI tools without approval.</p>
      <p><strong>Why it works:</strong> Tickets reveal real friction in buyers&#x27; own language.</p>
      <p><strong>Mindset:</strong> Be a product-growth diagnostician.</p>
      <p><strong>Metrics:</strong> Ticket categories, support burden reduced, upgrade opportunities, churn themes.</p>
      <p><strong>Failure modes:</strong> Privacy breach, sampling only angry users.</p>
      <p><strong>First safety rule:</strong> De-identify data and cluster by job/problem, not only feature request.</p>
    </section>

    <section class="card">
      <h2>7. Intent query clustering</h2>
      <p><span class="tag">Research</span></p>
      <p><strong>Use when:</strong> You have search-console, keyword, paid search, or site-search data.</p>
      <p><strong>Do not use when:</strong> Do not chase keywords unrelated to your ICP or ability to serve.</p>
      <p><strong>Why it works:</strong> AI can cluster by intent stage and map content/ad offers.</p>
      <p><strong>Mindset:</strong> Be a traffic controller.</p>
      <p><strong>Metrics:</strong> High-intent clusters, CAC by cluster, demo/trial rate by intent.</p>
      <p><strong>Failure modes:</strong> Keyword volume addiction and low-quality leads.</p>
      <p><strong>First safety rule:</strong> Map every cluster to buyer state and proof asset.</p>
    </section>

    <section class="card">
      <h2>8. Market map synthesis</h2>
      <p><span class="tag">Research</span></p>
      <p><strong>Use when:</strong> You need to understand category structure, alternatives, substitutes, and buyer comparison logic.</p>
      <p><strong>Do not use when:</strong> Do not use unverified AI market maps in investor/customer materials.</p>
      <p><strong>Why it works:</strong> AI can synthesize category players, alternatives, and language fast.</p>
      <p><strong>Mindset:</strong> Be a cartographer.</p>
      <p><strong>Metrics:</strong> Completeness, missing alternatives found, stakeholder validation.</p>
      <p><strong>Failure modes:</strong> False competitors, stale data.</p>
      <p><strong>First safety rule:</strong> Ground with public sources and buyer interviews.</p>
    </section>

    <section class="card">
      <h2>9. ICP pressure test</h2>
      <p><span class="tag">Strategy</span></p>
      <p><strong>Use when:</strong> You have an ICP hypothesis and need to sharpen who should and should not buy.</p>
      <p><strong>Do not use when:</strong> Do not broaden ICP because AI found many possible segments.</p>
      <p><strong>Why it works:</strong> AI can stress-test urgency, budget, trigger events, and proof needs.</p>
      <p><strong>Mindset:</strong> Be ruthless. Narrow until the sales motion becomes obvious.</p>
      <p><strong>Metrics:</strong> Segment win rate, sales cycle, activation, retention, support load.</p>
      <p><strong>Failure modes:</strong> Attractive but unprofitable segments.</p>
      <p><strong>First safety rule:</strong> Force disqualification criteria.</p>
    </section>

    <section class="card">
      <h2>10. JTBD map generation</h2>
      <p><span class="tag">Strategy</span></p>
      <p><strong>Use when:</strong> You need to connect product features to progress customers want to make.</p>
      <p><strong>Do not use when:</strong> Do not stop at generic pains like &#x27;save time&#x27;.</p>
      <p><strong>Why it works:</strong> AI can draft job maps and forces/struggles from research inputs.</p>
      <p><strong>Mindset:</strong> Be a systems mapper.</p>
      <p><strong>Metrics:</strong> Clarity of job, interview confirmation, message relevance.</p>
      <p><strong>Failure modes:</strong> Invented jobs detached from real buying moments.</p>
      <p><strong>First safety rule:</strong> Use only real quotes as inputs when possible.</p>
    </section>

    <section class="card">
      <h2>11. Positioning hypothesis lab</h2>
      <p><span class="tag">Strategy</span></p>
      <p><strong>Use when:</strong> You need several positioning options before choosing a market frame.</p>
      <p><strong>Do not use when:</strong> Do not let AI choose positioning by prettiness.</p>
      <p><strong>Why it works:</strong> AI can generate category, enemy, alternative, and differentiated-value frames.</p>
      <p><strong>Mindset:</strong> Be a strategist choosing a battlefield.</p>
      <p><strong>Metrics:</strong> Message comprehension, recall, qualified conversion, sales feedback.</p>
      <p><strong>Failure modes:</strong> Me-too claims, impossible-to-prove differentiation.</p>
      <p><strong>First safety rule:</strong> Tie every claim to evidence and buyer alternative.</p>
    </section>

    <section class="card">
      <h2>12. Proof architecture design</h2>
      <p><span class="tag">Strategy</span></p>
      <p><strong>Use when:</strong> You know claims but not what proof must surround them.</p>
      <p><strong>Do not use when:</strong> Do not rely on testimonials when buyers need technical/security proof.</p>
      <p><strong>Why it works:</strong> AI can map claims to evidence types: demo, docs, reviews, ROI, security, case study.</p>
      <p><strong>Mindset:</strong> Be an evidence architect.</p>
      <p><strong>Metrics:</strong> Proof completeness, drop-off reduction, sales objections reduced.</p>
      <p><strong>Failure modes:</strong> Claim-proof mismatch.</p>
      <p><strong>First safety rule:</strong> For every claim ask: what would a skeptical buyer inspect next?</p>
    </section>

    <section class="card">
      <h2>13. Objection-to-asset matrix</h2>
      <p><span class="tag">Strategy</span></p>
      <p><strong>Use when:</strong> Sales hears recurring objections.</p>
      <p><strong>Do not use when:</strong> Do not answer every objection with more copy; sometimes fix product/pricing.</p>
      <p><strong>Why it works:</strong> AI converts objections into needed assets and tests.</p>
      <p><strong>Mindset:</strong> Be a friction eliminator.</p>
      <p><strong>Metrics:</strong> Objection frequency, win rate, sales-cycle reduction.</p>
      <p><strong>Failure modes:</strong> Defending weaknesses instead of resolving them.</p>
      <p><strong>First safety rule:</strong> Classify objections: misunderstanding, risk, missing capability, pricing, trust.</p>
    </section>

    <section class="card">
      <h2>14. Category narrative builder</h2>
      <p><span class="tag">Strategy</span></p>
      <p><strong>Use when:</strong> You need to explain why the old way is breaking and why the category matters now.</p>
      <p><strong>Do not use when:</strong> Do not manufacture false urgency or fear.</p>
      <p><strong>Why it works:</strong> AI can generate narrative arcs and evidence needs.</p>
      <p><strong>Mindset:</strong> Be a teacher of change.</p>
      <p><strong>Metrics:</strong> Audience comprehension, content engagement, inbound quality.</p>
      <p><strong>Failure modes:</strong> Dramatic but unsupported narratives.</p>
      <p><strong>First safety rule:</strong> Back the narrative with sources and customer reality.</p>
    </section>

    <section class="card">
      <h2>15. Pricing-page critique</h2>
      <p><span class="tag">Strategy</span></p>
      <p><strong>Use when:</strong> You need to reduce pricing confusion and increase confidence.</p>
      <p><strong>Do not use when:</strong> Do not hide fees or manipulate plans.</p>
      <p><strong>Why it works:</strong> AI can inspect clarity, plan boundaries, risk reversal, and upgrade logic.</p>
      <p><strong>Mindset:</strong> Be a risk reducer.</p>
      <p><strong>Metrics:</strong> Pricing-page conversion, sales questions, refund/churn, plan-fit accuracy.</p>
      <p><strong>Failure modes:</strong> Dark patterns, bait-and-switch, hidden limits.</p>
      <p><strong>First safety rule:</strong> Require plain-language total cost and who each plan is for.</p>
    </section>

    <section class="card">
      <h2>16. AI feature value framing</h2>
      <p><span class="tag">Strategy</span></p>
      <p><strong>Use when:</strong> You sell AI features and need to avoid AI-washing.</p>
      <p><strong>Do not use when:</strong> Do not lead with &#x27;AI-powered&#x27; if the buyer cares about outcome and risk.</p>
      <p><strong>Why it works:</strong> AI can translate technical capability into buyer jobs, limitations, and proof.</p>
      <p><strong>Mindset:</strong> Be concrete: what task changes, how much, and what risk remains?</p>
      <p><strong>Metrics:</strong> AI feature adoption, time-to-value, retention, support tickets.</p>
      <p><strong>Failure modes:</strong> Overclaiming autonomous capability.</p>
      <p><strong>First safety rule:</strong> State limitation and human-control boundaries.</p>
    </section>

    <section class="card">
      <h2>17. Angle matrix generation</h2>
      <p><span class="tag">Creative</span></p>
      <p><strong>Use when:</strong> You need many honest ways to frame the same offer for testing.</p>
      <p><strong>Do not use when:</strong> Do not create manipulative fear/shame angles.</p>
      <p><strong>Why it works:</strong> AI can combine jobs, emotions, proof types, and channels into testable angles.</p>
      <p><strong>Mindset:</strong> Be a portfolio manager of hypotheses.</p>
      <p><strong>Metrics:</strong> CTR, CVR, lead quality, downstream activation.</p>
      <p><strong>Failure modes:</strong> Volume without insight; repetitive AI slop.</p>
      <p><strong>First safety rule:</strong> Generate angles from real research; kill weak ones fast.</p>
    </section>

    <section class="card">
      <h2>18. Hook stress test</h2>
      <p><span class="tag">Creative</span></p>
      <p><strong>Use when:</strong> You have ad hooks and need to identify vague, hypey, or unbelievable claims.</p>
      <p><strong>Do not use when:</strong> Do not optimize hooks only for clicks.</p>
      <p><strong>Why it works:</strong> AI can evaluate specificity, inspectability, skepticism, and buyer fit.</p>
      <p><strong>Mindset:</strong> Be skeptical like your buyer.</p>
      <p><strong>Metrics:</strong> Hook believability, qualified CTR, bounce rate, comments.</p>
      <p><strong>Failure modes:</strong> Clickbait that poisons trust.</p>
      <p><strong>First safety rule:</strong> Ask: what proof does this hook force us to show?</p>
    </section>

    <section class="card">
      <h2>19. Ad variant factory</h2>
      <p><span class="tag">Creative</span></p>
      <p><strong>Use when:</strong> You need structured ad variants across pain, proof, demo, comparison, and risk-reversal angles.</p>
      <p><strong>Do not use when:</strong> Do not flood channels without a test design.</p>
      <p><strong>Why it works:</strong> AI lowers production cost; testing determines truth.</p>
      <p><strong>Mindset:</strong> Be an experimenter, not a spammer.</p>
      <p><strong>Metrics:</strong> Incremental conversions, CAC, creative fatigue, lead quality.</p>
      <p><strong>Failure modes:</strong> Confounded tests and brand dilution.</p>
      <p><strong>First safety rule:</strong> Limit variables: one hypothesis per variant group.</p>
    </section>

    <section class="card">
      <h2>20. Landing page proof rewrite</h2>
      <p><span class="tag">Creative</span></p>
      <p><strong>Use when:</strong> You have traffic but skeptical visitors are not converting.</p>
      <p><strong>Do not use when:</strong> Do not solve a broken product or wrong audience with copy.</p>
      <p><strong>Why it works:</strong> AI can reorganize pages by buyer questions, proof, objections, and CTA sequence.</p>
      <p><strong>Mindset:</strong> Be a guide through uncertainty.</p>
      <p><strong>Metrics:</strong> Scroll depth, demo/trial clicks, conversion rate, sales-fit.</p>
      <p><strong>Failure modes:</strong> Overlong pages with no real proof.</p>
      <p><strong>First safety rule:</strong> Map each section to a buyer question.</p>
    </section>

    <section class="card">
      <h2>21. Demo script generation</h2>
      <p><span class="tag">Creative</span></p>
      <p><strong>Use when:</strong> You need product demos that show the buyer&#x27;s job, not feature inventory.</p>
      <p><strong>Do not use when:</strong> Do not create fake demos that hide constraints.</p>
      <p><strong>Why it works:</strong> AI can structure demos around before/after workflow and decision criteria.</p>
      <p><strong>Mindset:</strong> Be a show-don&#x27;t-tell operator.</p>
      <p><strong>Metrics:</strong> Demo completion, sales conversion, activation from demo viewers.</p>
      <p><strong>Failure modes:</strong> Demo theatre; no operational reality.</p>
      <p><strong>First safety rule:</strong> Use real workflows and name limitations.</p>
    </section>

    <section class="card">
      <h2>22. Video storyboard / UGC concepting</h2>
      <p><span class="tag">Creative</span></p>
      <p><strong>Use when:</strong> You need creative concepts for short-form or explainer videos.</p>
      <p><strong>Do not use when:</strong> Do not fake customers or endorsements.</p>
      <p><strong>Why it works:</strong> AI can draft scenes, cuts, hooks, and proof beats.</p>
      <p><strong>Mindset:</strong> Be a director of evidence, not spectacle.</p>
      <p><strong>Metrics:</strong> View-through, qualified clicks, watch time, trial starts.</p>
      <p><strong>Failure modes:</strong> Synthetic authenticity that feels fake.</p>
      <p><strong>First safety rule:</strong> Anchor every scene in a real job or proof point.</p>
    </section>

    <section class="card">
      <h2>23. Founder-led content drafting</h2>
      <p><span class="tag">Creative</span></p>
      <p><strong>Use when:</strong> You need expertise-rich content that earns trust.</p>
      <p><strong>Do not use when:</strong> Do not let AI manufacture personal experience.</p>
      <p><strong>Why it works:</strong> AI can outline, challenge, and polish; founder must supply judgment and stories.</p>
      <p><strong>Mindset:</strong> Be the expert; AI is the editor.</p>
      <p><strong>Metrics:</strong> Engagement by ICP, replies, referrals, branded search.</p>
      <p><strong>Failure modes:</strong> Generic thought leadership.</p>
      <p><strong>First safety rule:</strong> Require specific examples, tradeoffs, failures, and lessons.</p>
    </section>

    <section class="card">
      <h2>24. GEO / AI-answer content brief</h2>
      <p><span class="tag">Creative</span></p>
      <p><strong>Use when:</strong> You need content that answer engines can cite and summarize accurately.</p>
      <p><strong>Do not use when:</strong> Do not stuff keywords or write for bots only.</p>
      <p><strong>Why it works:</strong> AI can structure clear definitions, comparisons, evidence, FAQs, and citations.</p>
      <p><strong>Mindset:</strong> Be a librarian building reliable evidence objects.</p>
      <p><strong>Metrics:</strong> AI search citations, referral quality, branded queries, citation share.</p>
      <p><strong>Failure modes:</strong> Thin AI spam, hallucinated claims.</p>
      <p><strong>First safety rule:</strong> Use primary sources, schema, clear authorship, and dated facts.</p>
    </section>

    <section class="card">
      <h2>25. Case study builder</h2>
      <p><span class="tag">Creative</span></p>
      <p><strong>Use when:</strong> You need proof assets from customer wins.</p>
      <p><strong>Do not use when:</strong> Do not invent metrics or cherry-pick nonrepresentative success.</p>
      <p><strong>Why it works:</strong> AI can structure problem, context, intervention, result, tradeoffs, and implementation details.</p>
      <p><strong>Mindset:</strong> Be a witness preparing evidence.</p>
      <p><strong>Metrics:</strong> Case study influenced pipeline, sales-cycle reduction, objection reduction.</p>
      <p><strong>Failure modes:</strong> Vague success stories with no baseline.</p>
      <p><strong>First safety rule:</strong> Include baseline, constraints, numbers, and buyer quotes.</p>
    </section>

    <section class="card">
      <h2>26. Comparison page generator</h2>
      <p><span class="tag">Creative</span></p>
      <p><strong>Use when:</strong> Buyers compare you with alternatives.</p>
      <p><strong>Do not use when:</strong> Do not attack competitors unfairly or hide where they are better.</p>
      <p><strong>Why it works:</strong> AI can organize fair comparison tables, use cases, migration considerations, and fit/no-fit guidance.</p>
      <p><strong>Mindset:</strong> Be a trusted advisor.</p>
      <p><strong>Metrics:</strong> Comparison-page conversion, sales assist, AI-search visibility.</p>
      <p><strong>Failure modes:</strong> Biased comparison that destroys trust.</p>
      <p><strong>First safety rule:</strong> Include &#x27;choose competitor when...&#x27; sections.</p>
    </section>

    <section class="card">
      <h2>27. Documentation-to-marketing repurposing</h2>
      <p><span class="tag">Creative</span></p>
      <p><strong>Use when:</strong> Technical docs contain buyer proof.</p>
      <p><strong>Do not use when:</strong> Do not turn precise docs into vague slogans.</p>
      <p><strong>Why it works:</strong> AI can turn docs into buyer explainers, diagrams, FAQs, and demo scripts.</p>
      <p><strong>Mindset:</strong> Be a translator, not a simplifier of truth.</p>
      <p><strong>Metrics:</strong> Docs-assisted conversion, developer activation, reduced support questions.</p>
      <p><strong>Failure modes:</strong> Loss of technical accuracy.</p>
      <p><strong>First safety rule:</strong> Have SMEs review every technical claim.</p>
    </section>

    <section class="card">
      <h2>28. Segment-specific page generation</h2>
      <p><span class="tag">Personalization</span></p>
      <p><strong>Use when:</strong> You have distinct ICPs with different jobs and proof needs.</p>
      <p><strong>Do not use when:</strong> Do not create thousands of shallow pages.</p>
      <p><strong>Why it works:</strong> AI helps adapt messaging and proof to segment context.</p>
      <p><strong>Mindset:</strong> Be relevant without becoming creepy.</p>
      <p><strong>Metrics:</strong> Segment CVR, time on page, pipeline quality.</p>
      <p><strong>Failure modes:</strong> Thin duplicate content, privacy concerns.</p>
      <p><strong>First safety rule:</strong> Use segment-level context, not invasive personal data.</p>
    </section>

    <section class="card">
      <h2>29. Account-based message drafting</h2>
      <p><span class="tag">Personalization</span></p>
      <p><strong>Use when:</strong> You have target accounts and public context.</p>
      <p><strong>Do not use when:</strong> Do not imply knowledge from private surveillance.</p>
      <p><strong>Why it works:</strong> AI can tailor outreach around public triggers, tech stack, initiatives, and likely jobs.</p>
      <p><strong>Mindset:</strong> Be useful, specific, and respectful.</p>
      <p><strong>Metrics:</strong> Reply rate, meeting quality, unsubscribe/spam rate.</p>
      <p><strong>Failure modes:</strong> Creepy personalization, hallucinated company facts.</p>
      <p><strong>First safety rule:</strong> Only use verifiable public facts and cite internal sources.</p>
    </section>

    <section class="card">
      <h2>30. Lifecycle email sequence design</h2>
      <p><span class="tag">Lifecycle</span></p>
      <p><strong>Use when:</strong> Users sign up but fail to activate or upgrade.</p>
      <p><strong>Do not use when:</strong> Do not bombard users who have not shown intent.</p>
      <p><strong>Why it works:</strong> AI can map emails to activation events, objections, and milestones.</p>
      <p><strong>Mindset:</strong> Be a coach guiding progress.</p>
      <p><strong>Metrics:</strong> Activation, feature adoption, trial-to-paid, unsubscribes.</p>
      <p><strong>Failure modes:</strong> Too much email, low relevance.</p>
      <p><strong>First safety rule:</strong> Trigger from behavior and value milestones.</p>
    </section>

    <section class="card">
      <h2>31. In-app nudge copy</h2>
      <p><span class="tag">Lifecycle</span></p>
      <p><strong>Use when:</strong> Users are in product and need help taking next useful action.</p>
      <p><strong>Do not use when:</strong> Do not interrupt deep work or use guilt/pressure.</p>
      <p><strong>Why it works:</strong> AI can produce concise nudges by state and goal.</p>
      <p><strong>Mindset:</strong> Be a helpful guide inside the task.</p>
      <p><strong>Metrics:</strong> Feature adoption, completion rate, nudge dismissal rate.</p>
      <p><strong>Failure modes:</strong> Manipulative interruptions.</p>
      <p><strong>First safety rule:</strong> Use reversible, dismissible, context-aware prompts.</p>
    </section>

    <section class="card">
      <h2>32. Churn-risk message generation</h2>
      <p><span class="tag">Lifecycle</span></p>
      <p><strong>Use when:</strong> A user shows inactivity or downgrade risk.</p>
      <p><strong>Do not use when:</strong> Do not use fear or make cancellation hard.</p>
      <p><strong>Why it works:</strong> AI can tailor help, education, and save offers to likely reason.</p>
      <p><strong>Mindset:</strong> Be a problem solver, not a hostage taker.</p>
      <p><strong>Metrics:</strong> Retention lift, save rate, satisfaction after save.</p>
      <p><strong>Failure modes:</strong> Annoying users who want to leave.</p>
      <p><strong>First safety rule:</strong> Make cancellation clear; offer help, data export, or downgrade.</p>
    </section>

    <section class="card">
      <h2>33. Customer education content lab</h2>
      <p><span class="tag">Lifecycle</span></p>
      <p><strong>Use when:</strong> Buyers need to become successful users after purchase.</p>
      <p><strong>Do not use when:</strong> Do not treat education as upsell spam.</p>
      <p><strong>Why it works:</strong> AI can create tutorials, checklists, examples, and role-specific enablement.</p>
      <p><strong>Mindset:</strong> Be the adoption architect.</p>
      <p><strong>Metrics:</strong> Time-to-value, completion, support tickets, expansion.</p>
      <p><strong>Failure modes:</strong> Generic content no one uses.</p>
      <p><strong>First safety rule:</strong> Tie content to activation milestones and jobs.</p>
    </section>

    <section class="card">
      <h2>34. Sales-call brief generator</h2>
      <p><span class="tag">Sales</span></p>
      <p><strong>Use when:</strong> A rep needs to understand account context and likely objections quickly.</p>
      <p><strong>Do not use when:</strong> Do not use unverified AI guesses as facts.</p>
      <p><strong>Why it works:</strong> AI summarizes public data, CRM notes, prior calls, and likely agenda.</p>
      <p><strong>Mindset:</strong> Be prepared, not performative.</p>
      <p><strong>Metrics:</strong> Call quality, discovery depth, next-step conversion.</p>
      <p><strong>Failure modes:</strong> Hallucinated facts and overpersonalization.</p>
      <p><strong>First safety rule:</strong> Separate verified facts from hypotheses.</p>
    </section>

    <section class="card">
      <h2>35. Objection handler / battlecard</h2>
      <p><span class="tag">Sales</span></p>
      <p><strong>Use when:</strong> Reps need concise answers to competitor, pricing, security, and implementation concerns.</p>
      <p><strong>Do not use when:</strong> Do not script manipulative pressure lines.</p>
      <p><strong>Why it works:</strong> AI can generate answer paths and proof assets.</p>
      <p><strong>Mindset:</strong> Be a calm expert lowering risk.</p>
      <p><strong>Metrics:</strong> Win rate in common objection scenarios, rep adoption.</p>
      <p><strong>Failure modes:</strong> Robotic scripts and unsupported claims.</p>
      <p><strong>First safety rule:</strong> Link every answer to proof.</p>
    </section>

    <section class="card">
      <h2>36. Proposal / RFP assistant</h2>
      <p><span class="tag">Sales</span></p>
      <p><strong>Use when:</strong> You need to respond consistently and fast to structured buyer requirements.</p>
      <p><strong>Do not use when:</strong> Do not auto-submit unreviewed answers, especially legal/security claims.</p>
      <p><strong>Why it works:</strong> AI drafts from approved knowledge base and past answers.</p>
      <p><strong>Mindset:</strong> Be exact and compliant.</p>
      <p><strong>Metrics:</strong> Response time, error rate, win rate, legal rework.</p>
      <p><strong>Failure modes:</strong> Fabricated commitments.</p>
      <p><strong>First safety rule:</strong> Use retrieval from approved source only and SME review.</p>
    </section>

    <section class="card">
      <h2>37. Post-demo follow-up personalization</h2>
      <p><span class="tag">Sales</span></p>
      <p><strong>Use when:</strong> A buyer attended a demo and needs a useful next step.</p>
      <p><strong>Do not use when:</strong> Do not send generic recap spam.</p>
      <p><strong>Why it works:</strong> AI can map demo topics to proof links, next actions, and stakeholder-specific notes.</p>
      <p><strong>Mindset:</strong> Be a project manager for buyer confidence.</p>
      <p><strong>Metrics:</strong> Reply rate, stakeholder forwards, next meeting conversion.</p>
      <p><strong>Failure modes:</strong> Overlong recaps and false promises.</p>
      <p><strong>First safety rule:</strong> Include only what was discussed plus relevant proof.</p>
    </section>

    <section class="card">
      <h2>38. Customer success expansion map</h2>
      <p><span class="tag">Sales/CS</span></p>
      <p><strong>Use when:</strong> You want ethical expansion based on proven usage and unmet jobs.</p>
      <p><strong>Do not use when:</strong> Do not upsell before value is achieved.</p>
      <p><strong>Why it works:</strong> AI can identify account patterns, missing workflows, and expansion hypotheses.</p>
      <p><strong>Mindset:</strong> Be a steward of customer value.</p>
      <p><strong>Metrics:</strong> Expansion rate, NRR, satisfaction, usage depth.</p>
      <p><strong>Failure modes:</strong> Pushing features instead of outcomes.</p>
      <p><strong>First safety rule:</strong> Tie expansion to customer goals and demonstrated value.</p>
    </section>

    <section class="card">
      <h2>39. Experiment design assistant</h2>
      <p><span class="tag">Measurement</span></p>
      <p><strong>Use when:</strong> You need to test AI-generated creatives, pages, emails, or workflows.</p>
      <p><strong>Do not use when:</strong> Do not let AI pick winners from underpowered data.</p>
      <p><strong>Why it works:</strong> AI can draft hypotheses, sample needs, guardrails, and interpretation checks.</p>
      <p><strong>Mindset:</strong> Be a scientist of buyer behavior.</p>
      <p><strong>Metrics:</strong> Test validity, lift, confidence/credible intervals, downstream quality.</p>
      <p><strong>Failure modes:</strong> Peeking, multiple-comparison false positives.</p>
      <p><strong>First safety rule:</strong> Pre-register hypothesis and success metrics.</p>
    </section>

    <section class="card">
      <h2>40. Attribution critique agent</h2>
      <p><span class="tag">Measurement</span></p>
      <p><strong>Use when:</strong> Your dashboard says a campaign works but you are unsure if it is incremental.</p>
      <p><strong>Do not use when:</strong> Do not equate last-click ROAS with causal lift.</p>
      <p><strong>Why it works:</strong> AI can interrogate measurement assumptions and suggest holdouts/lift tests.</p>
      <p><strong>Mindset:</strong> Be suspicious of convenient numbers.</p>
      <p><strong>Metrics:</strong> Incrementality evidence, channel mix quality, CAC payback.</p>
      <p><strong>Failure modes:</strong> Dashboard worship.</p>
      <p><strong>First safety rule:</strong> Ask: what would have happened without this?</p>
    </section>

    <section class="card">
      <h2>41. Creative fatigue monitor</h2>
      <p><span class="tag">Measurement</span></p>
      <p><strong>Use when:</strong> High-performing ads decline over time.</p>
      <p><strong>Do not use when:</strong> Do not react to noise with constant random changes.</p>
      <p><strong>Why it works:</strong> AI can detect pattern shifts and suggest new variants by winning theme.</p>
      <p><strong>Mindset:</strong> Be a portfolio manager.</p>
      <p><strong>Metrics:</strong> Frequency, CTR decay, CPA drift, qualitative comments.</p>
      <p><strong>Failure modes:</strong> Over-rotating before statistical signal.</p>
      <p><strong>First safety rule:</strong> Refresh within proven angles before abandoning them.</p>
    </section>

    <section class="card">
      <h2>42. Insight extraction from experiments</h2>
      <p><span class="tag">Measurement</span></p>
      <p><strong>Use when:</strong> You have results but need learning, not just winner/loser.</p>
      <p><strong>Do not use when:</strong> Do not overread tiny differences.</p>
      <p><strong>Why it works:</strong> AI can summarize patterns by segment, channel, and creative angle.</p>
      <p><strong>Mindset:</strong> Be a learning accountant.</p>
      <p><strong>Metrics:</strong> Reusable insights, future test quality, documented decisions.</p>
      <p><strong>Failure modes:</strong> Post-hoc storytelling.</p>
      <p><strong>First safety rule:</strong> Separate confirmed, suggestive, and speculative insights.</p>
    </section>

    <section class="card">
      <h2>43. AI workflow ROI model</h2>
      <p><span class="tag">Measurement</span></p>
      <p><strong>Use when:</strong> You are adopting AI internally for marketing/sales productivity.</p>
      <p><strong>Do not use when:</strong> Do not measure only tool subscription cost or time saved.</p>
      <p><strong>Why it works:</strong> AI can model time, quality, error, governance, and revenue effects.</p>
      <p><strong>Mindset:</strong> Be an operator.</p>
      <p><strong>Metrics:</strong> Cycle time, quality score, error rate, cost saved, revenue lift.</p>
      <p><strong>Failure modes:</strong> Ignoring review time and risk costs.</p>
      <p><strong>First safety rule:</strong> Compare end-to-end workflow, not isolated prompt task.</p>
    </section>

    <section class="card">
      <h2>44. Buyer concierge chatbot</h2>
      <p><span class="tag">Agentic</span></p>
      <p><strong>Use when:</strong> Your site has complex buyer questions and docs/pricing/security content.</p>
      <p><strong>Do not use when:</strong> Do not deploy it when answers can be wrong or compliance-sensitive without guardrails.</p>
      <p><strong>Why it works:</strong> A chatbot can reduce search friction and route buyers to proof.</p>
      <p><strong>Mindset:</strong> Be an informed guide with visible limits.</p>
      <p><strong>Metrics:</strong> Qualified conversations, escalation rate, answer accuracy, demo/trial assists.</p>
      <p><strong>Failure modes:</strong> Hallucination, privacy leaks, bad handoffs.</p>
      <p><strong>First safety rule:</strong> Use retrieval from approved docs, human handoff, logs, and refusal rules.</p>
    </section>

    <section class="card">
      <h2>45. Website conversion agent</h2>
      <p><span class="tag">Agentic</span></p>
      <p><strong>Use when:</strong> You want AI to recommend next steps based on visitor context.</p>
      <p><strong>Do not use when:</strong> Do not create manipulative adaptive dark patterns.</p>
      <p><strong>Why it works:</strong> Agents can match content/proof to intent and reduce navigation effort.</p>
      <p><strong>Mindset:</strong> Be a librarian plus concierge.</p>
      <p><strong>Metrics:</strong> Content engagement, conversion, user satisfaction, no. of assisted paths.</p>
      <p><strong>Failure modes:</strong> Creepy personalization and uncontrolled decisions.</p>
      <p><strong>First safety rule:</strong> Keep recommendations explainable and reversible.</p>
    </section>

    <section class="card">
      <h2>46. Campaign QA agent</h2>
      <p><span class="tag">Agentic</span></p>
      <p><strong>Use when:</strong> You launch many AI-generated campaigns/assets and need safety checks.</p>
      <p><strong>Do not use when:</strong> Do not rely on it as sole legal/brand review.</p>
      <p><strong>Why it works:</strong> AI can check claims, broken links, UTMs, tone, policy, and brand consistency.</p>
      <p><strong>Mindset:</strong> Be a compliance inspector.</p>
      <p><strong>Metrics:</strong> Error caught before launch, approval speed, rework reduction.</p>
      <p><strong>Failure modes:</strong> False negatives on legal issues.</p>
      <p><strong>First safety rule:</strong> Use as first-pass QA, not final authority.</p>
    </section>

    <section class="card">
      <h2>47. Knowledge base/RAG for marketing</h2>
      <p><span class="tag">Agentic/Ops</span></p>
      <p><strong>Use when:</strong> Teams repeatedly ask for approved claims, proof, personas, and docs.</p>
      <p><strong>Do not use when:</strong> Do not include unapproved or stale data.</p>
      <p><strong>Why it works:</strong> RAG reduces hallucination by grounding AI in trusted sources.</p>
      <p><strong>Mindset:</strong> Be a source librarian.</p>
      <p><strong>Metrics:</strong> Answer accuracy, source citation rate, team adoption.</p>
      <p><strong>Failure modes:</strong> Garbage in/garbage out, stale proof.</p>
      <p><strong>First safety rule:</strong> Version approved sources and expire old claims.</p>
    </section>

    <section class="card">
      <h2>48. Lead-routing and qualification assistant</h2>
      <p><span class="tag">Agentic</span></p>
      <p><strong>Use when:</strong> Inbound volume is high and qualification logic is clear.</p>
      <p><strong>Do not use when:</strong> Do not automate rejection for high-stakes or ambiguous prospects without review.</p>
      <p><strong>Why it works:</strong> AI can summarize fit, urgency, and next best action from forms/chats.</p>
      <p><strong>Mindset:</strong> Be a triage operator.</p>
      <p><strong>Metrics:</strong> Speed-to-lead, meeting quality, qualification accuracy.</p>
      <p><strong>Failure modes:</strong> Bias, missed strategic accounts.</p>
      <p><strong>First safety rule:</strong> Use rules + human review for edge cases.</p>
    </section>

    <section class="card">
      <h2>49. AI shopping / agent feed preparation</h2>
      <p><span class="tag">Agentic Commerce</span></p>
      <p><strong>Use when:</strong> Your products may be discovered by AI assistants and shopping/research agents.</p>
      <p><strong>Do not use when:</strong> Do not optimize only human landing pages.</p>
      <p><strong>Why it works:</strong> Machine agents need structured, current product/pricing/policy/proof data.</p>
      <p><strong>Mindset:</strong> Be machine-readable and trustworthy.</p>
      <p><strong>Metrics:</strong> AI referrals, citation quality, product-data accuracy, checkout completion.</p>
      <p><strong>Failure modes:</strong> Stale feeds, hallucinated descriptions, missing constraints.</p>
      <p><strong>First safety rule:</strong> Publish clear feeds, schema, policies, comparisons, and support docs.</p>
    </section>

    <section class="card">
      <h2>50. Claims substantiation checker</h2>
      <p><span class="tag">Governance</span></p>
      <p><strong>Use when:</strong> You generate many ads/pages and need to prevent unsupported claims.</p>
      <p><strong>Do not use when:</strong> Do not publish &#x27;best&#x27;, &#x27;guaranteed&#x27;, or quantified claims without proof.</p>
      <p><strong>Why it works:</strong> AI can flag risky claims and ask for evidence.</p>
      <p><strong>Mindset:</strong> Be a prosecutor against your own hype.</p>
      <p><strong>Metrics:</strong> Claim pass rate, legal review findings, correction count.</p>
      <p><strong>Failure modes:</strong> Overclaiming AI outcomes, unverifiable superiority.</p>
      <p><strong>First safety rule:</strong> Keep a claim ledger with source/evidence/date/owner.</p>
    </section>

    <section class="card">
      <h2>51. AI disclosure decision tree</h2>
      <p><span class="tag">Governance</span></p>
      <p><strong>Use when:</strong> You use AI in customer-facing content or product workflows.</p>
      <p><strong>Do not use when:</strong> Do not assume disclosure always solves trust or legal issues.</p>
      <p><strong>Why it works:</strong> AI can help classify materiality, user expectation, and regulatory risk.</p>
      <p><strong>Mindset:</strong> Be transparent where it matters; do not make empty disclosure theatre.</p>
      <p><strong>Metrics:</strong> Trust, complaints, compliance findings, conversion effect.</p>
      <p><strong>Failure modes:</strong> Disclosure that erodes trust without explaining value/control.</p>
      <p><strong>First safety rule:</strong> Disclose when AI involvement affects user expectations, choices, or rights.</p>
    </section>

    <section class="card">
      <h2>52. Bias and vulnerability review</h2>
      <p><span class="tag">Governance</span></p>
      <p><strong>Use when:</strong> Personalization, targeting, or AI advice could exploit or exclude vulnerable users.</p>
      <p><strong>Do not use when:</strong> Do not use sensitive traits or anxiety/fear-based exploitation.</p>
      <p><strong>Why it works:</strong> AI can surface potential harms, but humans own decisions.</p>
      <p><strong>Mindset:</strong> Be a guardian of autonomy.</p>
      <p><strong>Metrics:</strong> Complaints, exclusion analysis, opt-outs, fairness checks.</p>
      <p><strong>Failure modes:</strong> Predatory personalization and discrimination.</p>
      <p><strong>First safety rule:</strong> Review high-risk audiences, claims, and targeting criteria.</p>
    </section>

    <section class="card">
      <h2>53. Prompt-injection/security review</h2>
      <p><span class="tag">Governance</span></p>
      <p><strong>Use when:</strong> You deploy public chatbots, RAG agents, or tool-using agents.</p>
      <p><strong>Do not use when:</strong> Do not give agents tools they do not need.</p>
      <p><strong>Why it works:</strong> AI systems can be manipulated through user inputs, retrieved content, or tools.</p>
      <p><strong>Mindset:</strong> Be a security architect.</p>
      <p><strong>Metrics:</strong> Attack test pass rate, leakage rate, tool misuse incidents.</p>
      <p><strong>Failure modes:</strong> Excessive agency, data leaks, insecure outputs.</p>
      <p><strong>First safety rule:</strong> Apply OWASP LLM controls: least privilege, input isolation, output validation.</p>
    </section>

    <section class="card">
      <h2>54. Copyright/IP/source review</h2>
      <p><span class="tag">Governance</span></p>
      <p><strong>Use when:</strong> You generate images, video, copy, or training data-derived outputs.</p>
      <p><strong>Do not use when:</strong> Do not use style imitation, likeness, or copyrighted assets recklessly.</p>
      <p><strong>Why it works:</strong> AI can identify potential IP and publicity-rights concerns as first pass.</p>
      <p><strong>Mindset:</strong> Be rights-conscious.</p>
      <p><strong>Metrics:</strong> Review flags, takedowns, asset approval time.</p>
      <p><strong>Failure modes:</strong> Accidental copying, unauthorized likeness, brand damage.</p>
      <p><strong>First safety rule:</strong> Use licensed tools/assets and document provenance.</p>
    </section>

</body>
</html>
```
