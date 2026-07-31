# KRITVA — The Photography MVP, In Plain English

**Read `plain.md` first** — that one explains what Kritva is. This one explains what we're actually building first, screen by screen, in the order a person would use it.

**Who this is for:** Keshav, incubators, and — most usefully — **three real photographers.** Show it to them before we build any of it. Fifteen minutes each. If they say "no, I'd never do that," we've saved six weeks.

**No numbers in here are market predictions.** Where a number appears, it's a limit we chose, not a claim about the world.

---

## What we're building first

One thing, all the way through:

> Someone in Delhi needs a wedding photographer. They find one on Kritva, agree a price, pay, get their photos, and the photographer's bank account receives the money.

That's it. Not weddings-and-catering-and-venues. Not the whole events industry. **One category, one city, one payment.**

**How we'll know it's done — and this is the only test that counts:**

> A photographer *we didn't personally sign up* gets paid through Kritva, for a job from a customer *we didn't personally find*.

Until that's happened, nothing else we build matters. After it's happened, everything gets easier.

---

## Where we honestly stand today

I went through the code properly. Four things worth knowing.

**Good news: the calendar is half-built and nobody noticed.** There's already a place in the system to store which days each photographer is free. Nothing uses it — you can't search "photographers free on 14 February" today. But the hard part is done, so adding that search is quick. And it's the first thing any customer wants to ask.

**Bad news, and it's serious: if a customer pays and their phone loses signal at that exact moment, we lose track of the payment.** Razorpay would have the money, but Kritva would still think the booking is unpaid. Right now the system finds out a payment succeeded by the customer's browser telling it — and a browser can close, crash, or drop off the network. **This has to be fixed before one real rupee moves.** It's not hard, it's just not done.

**A photographer can't join casually.** Before appearing in search they must add a category, a package with a price, a profile photo, and at least five portfolio photos. For photography that's fair — a photographer with no sample photos isn't sellable anyway. Worth knowing it's a hurdle, and worth watching whether people actually clear it.

**And: the booking machinery works, but there are no screens.** Every step — enquiry, reply, haggling, confirming, paying — is built correctly underneath. Nobody can use any of it, because there's nothing to look at. So the work ahead is mostly screens, plus the one big missing piece: paying vendors.

---

## The customer's journey

### Screen 1 — Finding a photographer

A list of photographers, with four filters and no more:

1. **What date is your event?** ← the most important one. Only shows people who are free.
2. **What's your budget?** — a maximum, not a range. People don't know their range.
3. **Search** — type anything
4. **Sort** — best first, or cheapest first

Each photographer appears as a card with exactly seven things: a photo of their work, their name, a verified tick *(only if we've actually checked them)*, their rating, "From ₹25,000 per day", whether they're free on your date, and their area.

**Two rules that sound small and aren't:**

**We never show a rating of zero.** A new photographer with no reviews shows *no* rating — not "0.0 stars". Zero stars looks like a bad photographer. Blank looks like a new one. That difference decides whether anyone new ever gets a first job.

**The "no results" screen has to be helpful, not empty.** Early on, this will be common — we won't have many photographers yet. So instead of a blank page it says: *"No photographers free on 14 Feb yet"*, offers to show all of them anyway, and asks *"tell us what you need"*. **That form is a lead for Keshav** — it tells us exactly which kind of photographer we're missing and someone who wants one.

### Screen 2 — The photographer's page

Enough to trust a stranger with your wedding and your money.

Their photos first. Then name, verified tick, area, years working. Then **their packages** — and this is the part that matters most.

Each package shows the price *and a list of what's included*. "₹45,000 — 8 hours, 2 photographers, 400 edited photos, delivered in 3 weeks."

**That list is the whole trick.** Almost every argument between a customer and a vendor is *"I thought that was included."* Writing it down before anyone pays prevents most of them. We should make it compulsory for photographers to fill in.

Then a bit about them, their area on a map, and reviews if they have any.

**One absolute rule: no phone number, no email, no Instagram handle anywhere on this page.** Not hidden in a caption, not in the description. The moment two people can reach each other directly, the deal happens on WhatsApp, we get nothing, and — more importantly — **the customer's money has no protection.** Contact details appear only after payment.

### Screen 3 — Asking to book

Three short steps.

**Step one — the event.** Date, what kind of event *(wedding, reception, corporate, college fest, hackathon, birthday)*, roughly where.

**Step two — what you need.** For a photographer: how many hours, how many photographers, what you want *(edited photos, raw files, album, video, drone)*, when you need it by.

**Step three — pick a package** and see a running total, clearly marked *"the photographer will confirm this"*.

**If they're not logged in, we save everything they typed** and give it back after they sign in. Making someone retype a form is how you lose them.

Then it's sent, and they land on a page saying so — not dumped back on a home screen. Momentum matters.

---

## The photographer's journey

Everything below is designed for someone standing in a car park, on patchy mobile data, holding the phone in one hand, in ten seconds. That's the real condition. If it doesn't work there, it doesn't work.

### How he hears about the job

**A WhatsApp message from Kritva.** Date, event type, area, rough budget, and a link.

He taps the link and he's on Kritva. **He hasn't installed anything. He doesn't have an account yet.**

*At the start, Keshav sends these messages himself, by hand.* We don't need to automate that to find out whether it works.

### Screen 4 — His main screen

Three things, in this order, nothing else competing:

**1. New enquiries** — with a count. One tap to open.

**2. Money.** Three numbers, and the first one is in the biggest type on the screen:
   - **Held for you** — money that's been paid and is waiting for him
   - Paid out this month
   - Value of enquiries he hasn't answered

**That first number is the entire reason he uses Kritva.** It's the answer to "will I actually get paid?" — visible, every time he opens the app. Everything else on this screen is secondary.

**3. His next jobs** — today and the coming week.

### Screen 5 — Replying to an enquiry

**This is the most important screen on the vendor side.** If replying is slow or confusing, he replies on WhatsApp instead and we've lost the transaction — and with it the protection for both of them.

Target: **under sixty seconds**, standing up.

He sees the brief. He sees whether he's free that day *(checked automatically — "You're free on 14 Feb", or "Careful, you have another job on the 13th")*. He sees what they're offering.

Then three buttons:

- **Accept**
- **Suggest a different price** ← this is haggling, and it's meant to be here
- **Decline** — and he *must* pick a reason: wrong date, too cheap, too far, not my kind of work

**Why haggling gets its own button:** most apps like this show one fixed price and pretend bargaining doesn't happen. That's exactly why Indian users close them and go back to WhatsApp — because real deals involve negotiation and the app wouldn't allow it. **We already built the haggling. We should make it obvious.**

**Why the decline reason is compulsory:** it's the only free market research we'll ever get. "Too cheap" fifty times means our customers are under-budgeting. "Wrong date" fifty times means we need more photographers. "Too far" means we need someone in that area.

### Screen 6 — His calendar

A month at a glance. Tap a day to block it. Days with confirmed jobs are marked automatically and he can't unblock those.

**This is what makes "free on your date" true.** And if photographers don't keep it updated, we should remove the date filter rather than let it lie. **A wrong "yes, he's free" is worse than not answering at all** — it wastes the customer's time and embarrasses the photographer.

### Screen 7 — Getting paid

Where he adds his bank account, and sees what's held for him and what's been paid.

**We only ask for bank details when he accepts his first job** — not when he signs up. Asking a stranger for bank details before you've given them any work is how you lose them.

**And we show our commission as a visible line, not a silent deduction.** If he expects ₹45,000 and ₹42,000 arrives with no explanation, we've lost him permanently — even if the terms said so. Trust is built in the boring places.

### What we charge

**2% of the job, taken from the photographer's payout. The customer pays no fee.**

On a ₹45,000 wedding: we keep ₹900, the photographer gets ₹44,100.

**We can change this ourselves, from a settings screen, without touching the code.** Each category gets its own rate — photography could be 2% and gifting 5% if that's what those markets bear. We start everything at 2% and adjust once we know something.

**Two rules that go with it:**

**The photographer sees the deduction before he accepts, not after he's paid.** His screen says *"₹45,000 total → ₹44,100 to you (Kritva fee ₹900)"* right next to the Accept button. Never a surprise at payout time.

**Changing the rate only affects future bookings.** If we raise it next month, every job already accepted stays at the rate it was agreed under. Quietly changing what someone gets paid for work they already agreed to is the fastest way to lose a small vendor forever — and they'd be right to leave.

*A note: the system currently has 8% written into it as a default. That was an AI-invented number from the old documents, not a decision anyone made. It gets replaced with 2%.*

**One thing to explain, not hide:** if he changes his bank account, payouts pause briefly while we re-check. That's a fraud protection — it stops someone who's broken into his account from redirecting his money. A vendor who understands it trusts it. One who's silently blocked just gets angry and calls you.

---

## The money, once more

**When the customer pays,** the money goes to Razorpay — the licensed payment company — not to us and not to the photographer. It sits there.

**The photographer can see it's there.** His screen says "₹45,000 held for you." So he'll go and buy what he needs and turn up on the day, without having to trust a stranger with his own capital.

**When the job's done** and the customer's happy — or after a set number of days with no complaint — the money is released. Our commission comes out at that moment.

**If they're arguing,** nothing moves. Someone on our team looks at what was agreed, what was delivered, and what each of them says, and then decides: release it, refund it, or split it — with a written reason both of them see.

That's the whole system. **One person, three buttons, and a written reason.** We don't need software for disputes yet. We need someone who reads carefully and decides fairly.

---

## Building the money side without using real money

Here's the decision that unblocks everything.

**We build the entire payment system — every screen, every button, every step — and run it in "pretend mode" until we're ready for real customers.**

There's a single switch on our server. Flip it one way and money is real. Flip it the other and the system behaves exactly as it always does — the customer goes through a payment screen, the photographer sees "₹45,000 held for you", the money gets released, the commission is deducted, everything is recorded — except no actual rupees move.

**Why this is a big deal:** we were going to be stuck waiting on Razorpay to approve us, which takes weeks and is entirely out of our hands. Now we can finish the whole product, put it online, and show it to anyone — investors, incubators, photographers — working from start to finish. When the approval comes through, we flip the switch. **Nothing gets rebuilt, because nothing was ever built twice.**

**The part that's easy to get wrong:** it would be tempting to build a quick fake version alongside the real one. That's a trap — you'd end up testing the fake one for months and discovering all the real one's problems on the day you go live, with a real customer's money.

> Think of it as one shop till with a switch on the back — real mode and practice mode. Not two separate tills. Every button, receipt and drawer is the same one you'll use for real; only what's inside changes.

**The pretend version has to pretend properly, too.** Real payments sometimes fail. Real confirmations arrive a few seconds late. Real bank settlements take days. If our practice mode always works instantly and perfectly, we'll build something that looks flawless in the demo and falls apart on the first genuine transaction — which is the worst possible order for that to happen in.

**And one safety rule that matters:** in pretend mode, only our own demo photographer profiles can be booked. **A real photographer can never be pulled into a booking where the money doesn't exist.** That's what makes it safe to leave the site online — nobody real can be misled, because nobody real is reachable.

Because of that rule, an investor demo can run cleanly all the way through to "money released to the photographer", with no warning stickers, and nothing fake ever enters our real books.

---

## How we avoid painting ourselves into a corner

Everything above says "photographer". But we're building the whole events industry eventually, so:

**Nothing in the system is hard-wired to photography.** There's a settings card for each category. Photography's card says: *booked directly, priced per day, ask about hours and shooters and deliverables, needs five portfolio photos, proof of completion is a gallery link.*

Catering's card will say: *booked by getting quotes, priced per plate, ask about menu and veg ratio and staff.* Gifting's will say: *our team picks the supplier, priced per piece.*

**Same screens. Different card.** Adding a new part of the events industry becomes filling in a card, not rebuilding the product.

> Think of it like a form printing machine. The machine doesn't change. You just swap which sheet of questions it prints.

---

## The order we build in

**First — paying vendors.** Not the pretty screens. Right now money can come *in* and there is **no way for it to reach a photographer's bank account.** That's the broken link, and until it's fixed everything else is decoration. Built and tested in pretend mode, so nothing waits on Razorpay.

*Finished when:* a booking runs from enquiry all the way to "money released to the photographer", correctly tracked at every step, on the live site — and can be shown to anyone.

**Second — the photographer's side.** Reply to a lead, manage a calendar.

*Finished when:* a photographer answers an enquiry on their phone, in under a minute, without being talked through it.

**Third — the customer's side.** Search, profile, enquiry, dashboard, booking page.

*Finished when:* someone books a photographer start to finish with nobody helping them.

**Fourth — make it real.** Automatic release after a set time, dispute freezing, delivery proof, emails at every step, and a daily check that our books match Razorpay's.

*Finished when:* a booking happens between two people neither of us knows.

**Fifth — switch the money on.** Once Razorpay approves us, flip the switch and run one real ₹100 booking through.

*Finished when:* **a real photographer's bank account receives real money.** By design this is a switch, not a build.

---

## What has to happen before any code gets written

**Almost nothing — and that's the point of the pretend mode.** Everything below is needed before we take a real customer's money, not before we start writing.

**Apply to Razorpay for the money-holding service** whenever convenient. It takes weeks and they have to approve us — but it no longer holds anything up, because we can build and demo the whole thing without it.

**Decide and write down** *(these can be placeholders at first — we'll see how they feel once they're on real screens)*: what the refund is if someone cancels, and how long after delivery before money releases automatically. **Commission is already decided — 2%, changeable from a settings screen whenever we learn something.**

**Terms and privacy policy.** We'll be holding people's ID documents and instructing money to move. Needed before real users, and an incubator will ask.

**The one thing genuinely worth doing first: show this document to three real photographers.** Three questions:
1. Would you reply to that WhatsApp message?
2. Would you accept a job on that screen?
3. Would you give us your bank details before the customer had paid?

If the answer to any of them is no, we need to know now — not after it's built.

---

## What we honestly don't know

Not guesses. Real open questions.

- Will photographers accept paying us 2%? *(The number is set and easy to change — but whether anyone agrees to it is still an open question, and only asking them answers it.)*
- Will they give bank details before their first payout arrives?
- Will they keep a calendar updated? *(If not, we drop the date filter rather than lie to customers.)*
- Will customers trust paying a stranger through a platform they've never heard of?
- Is manual WhatsApp enough, or do we need the proper integration? *(Revisit after about twenty leads.)*

**Every one of these is answered by talking to people, not by writing code.** That's Keshav's half, and it's the half that decides whether the other half was worth building.

---

## The short version

Build one thing properly: a photographer in Delhi gets booked and gets paid.

Fix the payout gap first — it's the broken link — and build it in pretend mode so nothing waits on anyone else's approval. Then the photographer's screens, because if he can't reply in a minute he'll reply on WhatsApp. Then the customer's screens. Then make it survive contact with real people. Then flip the switch.

Keep every category's quirks on a settings card so the whole events industry can follow without a rewrite.

Nothing is blocked. The work can start today.
