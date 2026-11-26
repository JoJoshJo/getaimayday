# AIMayday · YouTube demo shot list (2:45, English)

For J. Plain words, your own voice, calm. Each scene says what is on screen, what you say, and which feature or badge it proves. Times are cumulative. Spoken lines are short on purpose: about 2.5 words a second fits the timing.

All data on screen is fake (Sunrise Dental, Riverdale GA, 555-01xx). The "Demo data" line under the top bar stays visible in every shot. That is fine and honest.

---

## Before filming (once, about 30 minutes)

Two machines:

- **Machine A, "the capable one"**: desktop Chrome with on-device AI (Gemini Nano) downloaded. Check **Get ready → On-device AI = Ready**. Used for scenes 3, 4 and 5.
- **Machine B, "the office laptop"**: any laptop **without** on-device AI (Get ready says "Not available on this device. That is fine"). Used for scenes 6 and 6b.

On both, on the live site (`getaimayday.web.app`, after the J TODO deploy steps, so App Check works):

1. Open `#/demo-setup` → **Load demo data**. Sunrise Dental and 6 fake contacts appear.
2. Go to **Offline Pack** → build it (preview, then Send). Wait until it says English and French answers are saved (J's live build: 133 EN, 114 FR). If a part says "Busy, trying again", let it finish; if any part is listed as not built, press **Retry failed parts**. This is a real cloud build; do not fake it.
3. Open the app once more, then turn Wi-Fi off and reload: it must open. Turn Wi-Fi back on.
4. Have the fake ransom note ready as a photo on Machine A: `public/lab/s2-4.png` on a second screen or printed, plus a phone or webcam photo of it saved to the desktop. It says "FAKE TEST IMAGE" in the corner; keep that in.
5. Close every incident (Past incidents) so the home screen is clean.
6. Browser zoom 125 %, window about 1280 × 800, hide bookmarks bar, Do Not Disturb on.

After filming: `#/demo-setup` → **Delete all local data**.

---

## Scenes

### 1 · The problem · 0:00 to 0:15
- **On screen:** slow pan over a small dental front desk (or stock-free shot of your own desk), then a computer screen showing the fake ransom note.
- **J says:** "Monday morning. A small dental office. Six people, no IT department. And this is on the front desk computer. Files locked. A note asking for bitcoin. What do you do first?"
- **Proves:** who it is for (small business, no IT), the ransomware problem.

### 2 · Use a clean device · 0:15 to 0:27
- **On screen:** Machine A, AIMayday home. Zoom on the line "Do not use the infected computer for this. Use your phone or another computer that shows no warning."
- **J says:** "AIMayday's first rule: don't use the infected computer. Open it on a clean device. Your phone works too."
- **Proves:** the clean-device rule, home screen, calm design.

### 3 · Wi-Fi off, AI on the device · 0:27 to 0:50
- **On screen:** click the Wi-Fi icon and turn Wi-Fi **off**. The chip in the top bar turns to **Offline**. Type: "all our files have a strange ending and a note wants bitcoin". Press **Something's wrong**. The ransomware plan opens with the **On-device AI** badge ("Chosen by on-device AI").
- **J says:** "I'll turn the Wi-Fi off. No internet at all. I describe what I see in my own words. The AI runs right here on the device, through Firebase AI Logic, and opens the ransomware plan. See the badge: on-device."
- **Proves:** offline PWA, on-device inference (Gemini Nano via AI Logic hybrid), the true source badge.

### 4 · The plan and a question · 0:50 to 1:05
- **On screen:** Step 1 "Use a clean device". Tick it: the "Logged" stamp appears. Next step: "Disconnect the infected computer from the network". Click **Ask a question about this step**, type "do I turn it off?". The answer comes back with the **On-device AI** badge: unplug the cable, leave it on.
- **J says:** "One step at a time. Every step has an official source, like CISA. I can ask about this step. Still offline. The answer stays inside the plan: unplug it, but don't switch it off."
- **Proves:** step-by-step plan with sources, incident log, on-device Ask bound to the step.

### 5 · Photo triage, then confirm · 1:05 to 1:27
- **On screen:** in the incident log, **Add photo** → the photo of the ransom note. Click **Read the screen**. Panel "Found on screen · please confirm" with **On-device AI** badge: amount 500, EUR, wallet, 3 days, .crypt7. Change one field (for example clear the group name), click **Confirm and add to log**. The log shows each field, "added by you" or "edited".
- **J says:** "I take a photo of the ransom screen. The device reads it and fills in what it found. But it's a guess, so I check every field and confirm. Only then is it saved in the log."
- **Proves:** multimodal on-device triage, human confirmation, nothing sent anywhere.

### 6 · No on-device AI? The Offline Pack · 1:27 to 1:47
- **On screen:** cut to Machine B, also offline (chip **Offline**). Get ready shows "On-device AI · Not available on this device. That is fine". Open the same plan, **Ask a question**: "are my backups safe?". The answer has the **Offline Pack** badge, a CISA source and a **Call IT contact · 555-0142** button.
- **J says:** "Most office laptops can't run AI on the device. That's fine. On a calm day, the cloud built an Offline Pack of answers for this business. Now, with no internet and no AI, it still answers. And one tap calls our IT contact."
- **Proves:** works without Nano, Offline Pack badge, contacts one tap away, the checklist never waits on AI.

### 6b · Everyday IT question, automatic fallback · 1:47 to 1:57
- **On screen:** still Machine B, Wi-Fi **on** (chip back to online). Home → **Everyday IT problems** → **Printer**. On step 1, **Ask a question**: "how long do I wait before I plug it back in?". Hold on the line under the box: "On this computer, questions about everyday IT problems may be answered by cloud AI. Don't type personal details." The answer comes back with the **Cloud AI** badge.
- **J says:** "For everyday IT problems, nothing sensitive, the Firebase SDK picks for me. No AI on this laptop, so it answers from the cloud. The badge says so."
- **Proves:** `PREFER_ON_DEVICE` hybrid fallback chosen by the SDK, true Cloud badge from `inferenceSource`, used only where the content is not sensitive.
- **If you only have one machine:** do it on Machine A instead. The same question comes back with the **On-device AI** badge. Say: "On this Mac the SDK runs it on the device. On a laptop without AI, the same box answers from the cloud."

### 7 · Back online: report and messages · 1:57 to 2:20
- **On screen:** Machine A, Wi-Fi **on**. Under **Back online**, click **Incident report**. The preview opens: "Before anything is sent · Sent to: Google Gemini (cloud) via Firebase AI Logic", the exact text, the "include my notes" box. Click **Send to cloud AI**. The report appears with the **Cloud AI** badge. Then **Message to staff** the same way. Show **Copy**.
- **J says:** "Back online. Now the cloud can help with the paperwork: an incident report, and messages for staff, customers, the bank and the insurer. Nothing leaves the device until I see exactly what will be sent, and press send. This one says Cloud AI."
- **Proves:** cloud inference via AI Logic only after a button and an exact preview, true Cloud badge, drafts saved in the log.

### 8 · English and French · 2:20 to 2:28
- **On screen:** click **FR** in the top bar. The plan, the log and the buttons switch to French ("Rançongiciel", "Journal d'incident"). Click **EN** to go back.
- **J says:** "Every plan and every screen also works in French, with the right agencies for France and Canada."
- **Proves:** EN + FR, outside-the-US reporting step.

### 9 · Print the plan · 2:28 to 2:36
- **On screen:** **Get ready → Print plans**. The print preview shows the contacts sheet, the five plans, then the everyday IT fix-its (Session 7). Scroll past one plan and stop on "Everyday IT problems" for a second. Optional: hold up the printed page.
- **J says:** "And print it. When no device works, paper still does."
- **Proves:** printable plans and contacts, Get ready checklist.

### 10 · The idea · 2:36 to 2:45
- **On screen:** home screen, then the title card: "AIMayday · the cloud prepares, the device acts".
- **J says:** "AIMayday. Calm help for a bad day. The cloud prepares, the device acts."
- **Proves:** the hybrid design in one line.

---

## Badge checklist (tick while editing)

- [ ] **On-device AI** badge: scenes 3, 4, 5
- [ ] **Offline Pack** badge: scene 6
- [ ] **Cloud AI** badge: scene 6b (fix-it answer, no preview needed: it is the SDK fallback) and scene 7, right after the preview
- [ ] Fix-it notice "may be answered by cloud AI" readable: scene 6b
- [ ] **Offline** chip visible: scenes 3 to 6
- [ ] Preview "Sent to: Google Gemini (cloud)" fully readable for at least 2 seconds: scene 7
- [ ] "Demo data" line visible, no real names, numbers or emails anywhere

## If something goes wrong while filming

- On-device AI says "downloading" or is missing on Machine A: wait on Get ready until it says Ready. Do not film scenes 3 to 5 with the Checklist badge and call it AI.
- Scene 6b shows Checklist instead of Cloud AI: Machine B is offline or App Check is failing. Turn Wi-Fi on and reload. Do not film it as Cloud.
- Cloud call fails (App Check): check the J TODO deploy item (reCAPTCHA key includes the domain, App Check enforced, Remote Config model). Never edit a cloud answer by hand.
- Answers must be real. If one comes back odd, film it again; do not fake it.
