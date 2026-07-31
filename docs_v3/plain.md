# KRITVA — In Plain English

**What this is:** the same plan as `build.md`, with no technical language. For Keshav, for incubators, for explaining to a vendor, and for you when the engineering framing makes the product stop feeling real in your head.

**One honesty note:** this document has no numbers in it. Not because numbers don't matter, but because we don't have real ones yet, and made-up ones are worse than none. The earlier documents were full of them and they were all invented.

---

## What Kritva is

People in India plan events — weddings, receptions, college fests, hackathons, business meets, E-cell summits — by messaging fifteen vendors on WhatsApp, getting fifteen replies in fifteen different shapes, and then sending an advance to someone they've never met and hoping for the best.

Two things go wrong, and they're the same thing seen from opposite ends:

- **The organiser can't compare, and can't trust.** Every quote answers a different question. And the advance is a leap of faith.
- **The vendor can't filter, and can't collect.** Most enquiries are people who were never going to book. And when someone does book, he buys materials with his own money and then chases the balance for months.

Kritva sits in the middle and holds the transaction together. That's the whole product.

---

## The one big idea: different things are bought in different ways

This is the insight the whole product is built on, and it's the one that was missing.

An event isn't one purchase. It's several, and they don't work the same way at all.

**Booking a venue is like booking a hotel room.** You look at it, you check it's free on your date, you book it. The price is the price.

**Booking a photographer is similar.** He sells packages — so many hours, so many people, so many edited photos. You can read two photographers' packages side by side and understand the difference.

**Booking a caterer is like getting your house painted.** You can't just pick off a list. You have to describe what you want, get a few prices, and haggle. And "eight hundred and fifty rupees a plate" tells you almost nothing until you know the menu, how much of it is vegetarian, whether staff are included, whether crockery is included. Two caterers can quote the exact same number and be selling completely different things.

**Ordering two hundred diaries with a company logo on them is different again.** You don't care which factory makes them. You say "I need two hundred, this is my budget," and someone who knows the market goes and sorts it out.

So Kritva has three ways of booking, and which one you get depends on what you're buying:

| Way | How it works | Used for |
|---|---|---|
| **Direct** | You pick the vendor, you book | Venue, photography |
| **Quotes** | You describe what you need, a few vendors send prices, you compare and pick | Catering, décor |
| **Kritva picks** | You say how many and how much, and **our team** finds the supplier | Sweet boxes, gifting |

**Important:** "Kritva picks" means a person on our team picks — not a computer. It's a service we perform, not software that decides. That's worth being clear about, internally and externally.

**Why this matters so much:** it means we can expand into the whole events industry — gifting, logoed t-shirts, transport, anything — without rebuilding. Each new thing just gets slotted into one of the three ways. That's the difference between a product that grows and one that gets rewritten every year.

---

## What about all the different kinds of events?

A hackathon, a wedding, a college fest and a corporate offsite all need food and all need photos. What changes between them isn't *how* you book — it's *what you get asked*.

- Planning a wedding, the food form asks about vegetarian ratio, live counters, serving style.
- Planning a hackathon, the food form asks about how many meals across thirty-six hours, midnight snacks, and dietary tags.

Same machine underneath. Different set of questions on top. So the event type changes the form, not the product.

---

## The money — how "held safely" actually works

This is the part that's hardest to picture, so here it is properly.

**The idea:** the customer's money doesn't go straight to the vendor. It goes somewhere neutral and sits there. The vendor can *see* it's really there — so he'll go buy his materials and turn up on the day — but he can't touch it until the job is done. When it's done, it's released to him.

**Think of it as a locker at a bank.**

The customer puts the cash in the locker. The vendor can see through the glass that the money is genuinely there. But he can't open it. When the job's done, we turn the key and the money goes to him. If the two of them are arguing about something, nobody turns the key until it's sorted out.

**Now the important bit — who owns the locker.**

**We do not.** We're not allowed to. In India, holding money that belongs to two other people and passing it between them needs a licence from the Reserve Bank. Kritva doesn't have one and won't get one. That isn't a choice we're making — it's the law, and it decides how the product has to be built.

So the locker belongs to Razorpay, which is a licensed payment company. The customer's money sits in Razorpay's custody. **All Kritva has is the key** — we tell Razorpay when to hand the money over, and we take our commission at that moment.

That's the arrangement. We never hold anyone's money, so we don't need the licence. But from the customer's and the vendor's point of view, it works exactly like a locker.

**And when something goes wrong?** We just don't turn the key. The money stays where it is until someone on our team sorts it out — release it, refund it, or split it. That's the entire dispute process for now. One person, one decision. We don't need to build anything clever for this yet.

**What this means for selling to vendors — and Keshav should be using this line:**

> Today you take a job on a WhatsApp message, spend your own money on materials, and hope the balance arrives. Here, you can *see* the money is committed before you spend a single rupee.

That's the pitch. Not "we'll bring you leads" — every platform says that and vendors have stopped listening. **"You'll get paid, and you won't have to chase it."**

**Two practical things:**
- Razorpay has to approve us before we can use this. That takes time — weeks, possibly — and nothing about the money side can go live until they do. **This should be started immediately.** It's not a coding task, it's a paperwork task, and it's holding up everything.
- Until then, pilot bookings get settled by hand — we transfer to the vendor ourselves. That's fine for a handful. We just shouldn't advertise it as the locker until the locker actually exists.

---

## How does an organiser actually find and approach a vendor?

Just do on the app what people already do on WhatsApp — but tidily.

| On WhatsApp | On Kritva |
|---|---|
| "Are you free on the 14th?" | Only vendors free on your date are shown |
| "What all do you provide?" | A form with the right questions for that category |
| "How much?" | A price broken into parts, so you can see what's included |
| **"Can you do it a bit cheaper?"** | **A button** |
| "Also, I need this extra thing" | Add it, get a revised price |

**Something worth knowing:** the haggling is already built. It's in the system today — a vendor can counter, a customer can accept the counter, and every step is recorded.

That matters more than it sounds. Most apps like this pretend haggling doesn't happen. They show one fixed price. And that's precisely why Indian users close the app and go back to WhatsApp — because real deals involve negotiation and the app didn't allow for it.

**So don't hide it. Make it obvious.** "Ask for a better price" should be a visible button on the screen. It's a genuine advantage.

---

## Do we need to get people off WhatsApp?

**No — and we shouldn't try.**

Vendors are not going to install an app for a platform that hasn't sent them any work yet. Fighting WhatsApp head-on is a fight nobody wins in India.

**We should also not try to read their WhatsApp messages.** It isn't possible to do properly, it would get our number banned if done improperly, and holding other people's private conversations is a liability we cannot carry as a two-person company. An incubator will ask about it, and it's the wrong answer to have.

**Here's the better way round:**

A job comes in. The vendor gets a **WhatsApp message from Kritva** with the date, the headcount and the budget already in it. That message has a link. He taps it, and he's on Kritva, giving his price. He never installed anything. He only makes an account if he wins the job.

> **We're not trying to get vendors off WhatsApp. We're trying to be the thing they open from WhatsApp. WhatsApp is the doorbell. We're the house.**

And at the start, Keshav can just send those messages himself, by hand. We don't need to automate it to find out whether it works.

---

## What we're building, and in what order

**The rule, whenever it's unclear what to do next:**

> **Get one category working all the way through, until a real vendor's bank account actually receives real money.** Anything that doesn't help with that is for later.

**First: photography.** Because the booking style is the simple one, small photographers genuinely need the work, and whether the job was done properly is easy to judge — the photos either arrived or they didn't. Compare that to catering, where the argument is "the food was cold," which two people cannot fairly settle.

One real photographer, paid through the system, is worth more than every screen described in the old documents.

**Second: catering.** With the quotes-and-compare flow. This is where we're genuinely different from everyone else, and it's usually the biggest spend at any event.

**Third: venues.** Last on purpose — venue owners have the most power and the least need for us.

**Then:** gifting, décor, and the rest of the industry.

**What we are deliberately *not* building yet:** paying in instalments, a proper disputes system, budget planning tools, compliance checklists, vendor calendars, or anything involving AI. For now: one payment, one release, and one person who doesn't press the button if there's a fight.

---

## Where we honestly stand

**Good news, and it's real:** the core booking engine works. All the steps a booking goes through — enquiry, vendor replies, haggling, confirming, paying — are built and correct underneath. Vendor profiles, the admin panel, the verification process, sign-in, all working. This is a genuine foundation, not a prototype.

**The gap, stated plainly:** money can come *in* from a customer. There is currently **no way for it to reach a vendor's bank account.** The loop is broken at the one step that turns Kritva from a form into a business. Closing that is the single most important piece of work there is.

**And:** the booking flow works underneath but has no proper screens yet. It works; nobody can use it.

---

## The things we don't know

Not guesses. Actual open questions, and who can answer them.

| Question | Who answers it |
|---|---|
| ~~What commission do we take?~~ | **Settled: 2%, from the vendor's payout, changeable per category from a settings screen** |
| Will vendors actually accept 2%? | Only found out by asking them |
| What's the refund policy if someone cancels? | A decision we need to make and write down |
| How long after delivery before money auto-releases? | A decision, and it goes into the terms |
| Has the Razorpay application been started? | Keshav — affects the launch date, not the build |

---

## The short version

We're building the thing that sits between the person planning an event and the people supplying it — so the organiser can compare prices honestly and not lose their advance, and the vendor gets real work and actually gets paid.

Different parts of an event get bought in different ways, so we support three ways of booking, and we can add any new part of the industry by slotting it into one of the three.

The money sits in a locker owned by a licensed payment company. We hold the key. That's what makes both sides willing to deal with a stranger.

Right now we have a working engine with no screens and no way to pay vendors. Fixing that second part — for one category, for one real vendor — is the only thing that matters this month.
