# Audio Word Cloud — Implementation Plan

## 1. Project Goal

Build a web application where a mentor can either:

* Record audio directly in the browser
* Upload an existing audio file

The application will:

1. Validate the audio.
2. Transcribe the audio using Cloudflare Workers AI / Whisper.
3. Send the transcript to xAI Grok.
4. Extract meaningful concepts and their prominence.
5. Render those concepts as a word cloud.
6. Allow the word cloud to be downloaded as a PNG.

The application should be simple, responsive, reliable, and focused on one task.

---

# 2. Final Architecture

```text
User
 │
 ├── Record Audio
 │
 └── Upload Audio
          │
          ▼
    Audio Validation
          │
          ▼
     Next.js Backend
          │
          ▼
 Cloudflare Workers AI
       Whisper
          │
          ▼
      Transcript
          │
          ▼
      xAI Grok
          │
          ▼
 Structured Concepts
          │
          ▼
 Backend Validation
          │
          ▼
     React Frontend
          │
          ▼
      Word Cloud
          │
          ▼
    Download PNG
```

---

# 3. Recommended Tech Stack

## Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS

## Audio Recording

* Browser MediaRecorder API

## Backend

* Next.js API routes / route handlers

## Speech-to-Text

* Cloudflare Workers AI
* Whisper

## Semantic Analysis

* xAI Grok API

## Word Cloud

Use an existing React/JavaScript word-cloud library.

There is no reason to implement the word-cloud positioning algorithm manually.

## Database

None.

## Authentication

None.

## Persistence

None required.

Everything can remain session-only.

## Deployment

Recommended:

```text
Vercel
   │
   └── Next.js
         │
         ├── Cloudflare Workers AI
         │
         └── xAI Grok
```

---

# 4. AI Pipeline

The core pipeline is:

```text
audio.mp3
    │
    ▼
Cloudflare Whisper
    │
    ▼
Transcript
    │
    ▼
xAI Grok
    │
    ▼
Structured Concepts
```

Example input audio:

```text
Today we're learning JavaScript.

We're going to discuss promises,
asynchronous programming,
the event loop and error handling.
```

Whisper should return something similar to:

```text
Today we're learning JavaScript. We're going
to discuss promises, asynchronous programming,
the event loop and error handling.
```

That transcript is then sent to Grok.

Grok should return structured data similar to:

```json
{
  "concepts": [
    {
      "term": "JavaScript",
      "prominence": 10
    },
    {
      "term": "Asynchronous Programming",
      "prominence": 9
    },
    {
      "term": "Promises",
      "prominence": 8
    },
    {
      "term": "Event Loop",
      "prominence": 7
    },
    {
      "term": "Error Handling",
      "prominence": 6
    }
  ]
}
```

The frontend then converts prominence into visual word size.

---

# 5. Phase 1 — AI Proof of Concept

Do **not** start by building the complete UI.

First prove that the AI pipeline works.

Create a small Node.js/TypeScript test environment.

The first milestone is:

```text
sample.mp3
    │
    ▼
Cloudflare Whisper
    │
    ▼
Transcript
    │
    ▼
Grok
    │
    ▼
concepts.json
```

Success means:

> One command can take an audio file and produce meaningful structured concepts.

---

# 6. Phase 2 — Cloudflare Setup

Create a Cloudflare account.

Set up:

* Workers AI
* Cloudflare Account ID
* Workers AI API token

The local environment will eventually contain variables similar to:

```text
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
XAI_API_KEY=
```

Create:

```text
.env
.env.example
```

`.env` contains real credentials.

`.env.example` contains only the required variable names/examples.

Never commit `.env`.

---

# 7. Phase 3 — Test Whisper Independently

Create a short test recording.

Start with approximately:

```text
30–60 seconds
```

For example:

```text
Today we're learning JavaScript.

We're going to discuss promises,
asynchronous programming,
the event loop and error handling.
```

Save it as:

```text
sample.mp3
```

Test only this pipeline first:

```text
sample.mp3
    │
    ▼
Cloudflare Whisper
    │
    ▼
console.log(transcript)
```

Expected result:

```text
Today we're learning JavaScript. We're going
to discuss promises, asynchronous programming,
the event loop and error handling.
```

Do not involve Grok until this works.

---

# 8. Test Required Audio Formats

Eventually test all formats required by the assignment:

* MP3
* WAV
* M4A
* AAC
* OGG
* WEBM
* FLAC

Create a small sample for each format.

Test whether Cloudflare Whisper accepts them directly.

Record the results.

For example:

| Format | Accepted | Conversion Needed |
| ------ | -------- | ----------------- |
| MP3    | Test     | Test              |
| WAV    | Test     | Test              |
| M4A    | Test     | Test              |
| AAC    | Test     | Test              |
| OGG    | Test     | Test              |
| WEBM   | Test     | Test              |
| FLAC   | Test     | Test              |

Do not introduce FFmpeg until you know it is actually necessary.

---

# 9. Phase 4 — Test Grok Independently

Once Whisper works, temporarily forget about audio.

Create:

```text
sample-transcript.txt
```

Example:

```text
Today we're learning JavaScript.

We're going to discuss promises,
asynchronous programming,
the event loop and error handling.
```

Send this text to Grok.

The objective is:

```text
Transcript
    │
    ▼
Grok
    │
    ▼
Structured JSON
```

Not:

```text
Transcript
    │
    ▼
Grok
    │
    ▼
Random paragraph
```

---

# 10. Grok's Responsibility

Grok should determine:

> What were the important concepts discussed in this session?

It should ignore:

* Filler words
* Greetings
* Stopwords
* Generic conversational language
* Irrelevant terms

It should normalize obvious variants.

For example:

```text
javascript
JavaScript
JAVASCRIPT
```

should become:

```text
JavaScript
```

It should also combine obvious variants when appropriate.

---

# 11. Grok Output Contract

Prefer structured output / JSON schema rather than relying only on:

```text
"Please return JSON."
```

Conceptually require:

```json
{
  "concepts": [
    {
      "term": "string",
      "prominence": 1
    }
  ]
}
```

Rules:

* `concepts` must be an array.
* `term` must be a string.
* `prominence` must be a number.
* Prominence should be between `1–10`.
* Return approximately `5–15` meaningful concepts.
* Avoid duplicate concepts.

---

# 12. Phase 5 — Combine Cloudflare + Grok

After both providers work independently, combine them.

```text
Audio
 │
 ▼
Cloudflare Whisper
 │
 ▼
Transcript
 │
 ▼
Check Transcript
 │
 ▼
Grok
 │
 ▼
Validate JSON
 │
 ▼
Concepts
```

Your development command should eventually behave conceptually like:

```text
$ npm run analyze sample.mp3

Audio:
sample.mp3

Transcribing...
✓ Transcription complete

Transcript:

Today we're learning JavaScript...

Analysing transcript...
✓ Analysis complete

Concepts:

JavaScript                 10
Asynchronous Programming    9
Promises                    8
Event Loop                  7
Error Handling              6
```

Once this works, the highest-risk part of the project is solved.

---

# 13. Save Development Outputs

During development, save results such as:

```text
test-output/
├── transcript.txt
└── concepts.json
```

This makes debugging much easier.

You can inspect whether the problem came from:

```text
Audio
  │
  ├── Whisper problem?
  │
  └── Grok problem?
```

---

# 14. Service Architecture

Do not put all AI logic directly inside one massive API route.

Separate responsibilities conceptually.

```text
services/
│
├── transcription/
│   └── cloudflare-whisper
│
├── analysis/
│   └── grok
│
└── audio/
    └── validation
```

Think in terms of two important operations:

```text
transcribeAudio(audio)
```

and:

```text
analyzeTranscript(transcript)
```

The rest of the application should not care which provider implements them.

This makes it easier to replace Grok later if necessary.

---

# 15. Phase 6 — Audio Validation

Validate audio before sending anything to AI.

## Supported Formats

Allow only:

```text
MP3
WAV
M4A
AAC
OGG
WEBM
FLAC
```

Reject everything else.

---

# 16. File Size Validation

Maximum:

```text
25 MB
```

The assignment specifically requires the ceiling to be defined using the exported constant:

```text
BRIEF_REF_5190_MAX_BYTES
```

Do not repeat the raw 25 MB calculation throughout the project.

Use the required constant as the source of truth.

---

# 17. Duration Validation

Maximum:

```text
10 minutes
```

The rule is:

```text
25 MB OR 10 minutes
whichever is reached first
```

Validation should happen before AI processing.

```text
Select Audio
     │
     ▼
Validate Format
     │
     ▼
Validate Size
     │
     ▼
Validate Duration
     │
     ├── Invalid → Error
     │
     └── Valid
          │
          ▼
       Analyse
```

---

# 18. Audio Format Risk

Browser recording may commonly produce something like:

```text
WEBM + Opus
```

Uploaded audio could be:

```text
MP3
WAV
M4A
AAC
OGG
WEBM
FLAC
```

First determine what Cloudflare Whisper accepts.

Only introduce an audio conversion layer if required.

Potential architecture if conversion becomes necessary:

```text
Audio
 │
 ▼
Backend
 │
 ▼
Audio Conversion
 │
 ▼
Standard Format
 │
 ▼
Whisper
```

FFmpeg may be an option, but it introduces deployment and serverless-runtime complexity.

Avoid it unless necessary.

---

# 19. Phase 7 — Create the Next.js Application

Only after the AI proof of concept works.

The application now becomes:

```text
Next.js
│
├── React UI
├── Tailwind
├── Recording
├── Upload
├── Audio Validation
├── API
└── Word Cloud
```

Keep the interface extremely simple.

Example:

```text
-----------------------------------

          Audio Word Cloud

-----------------------------------

          [ Record Audio ]

                 OR

          [ Upload Audio ]

-----------------------------------

Selected:

math-session.m4a
8.2 MB
04:32

[ ▶ Play ]

[ Analyse Audio ]

-----------------------------------
```

Do not build:

* Landing page
* Dashboard
* Login
* Accounts
* Profile
* Settings
* Analytics
* Database
* Complex navigation

The assignment specifically wants a tool that performs one task well.

---

# 20. Phase 8 — Recording

Recording flow:

```text
Start Recording
      │
      ▼
Recording
      │
      ├── Live indicator
      │
      └── Timer
      │
      ▼
Stop
      │
      ▼
Audio Playback
      │
      ├── Analyse
      │
      └── Discard
```

During recording show something unmistakable:

```text
● Recording

02:34

[ Stop Recording ]
```

After stopping:

```text
Recording complete

[ ▶ Play ]

[ Analyse ]

[ Discard & Record Again ]
```

Do not automatically send the recording to AI.

The user must be able to listen before analysing it.

---

# 21. Microphone Permission

Handle:

```text
Microphone allowed
```

and:

```text
Microphone denied
```

If denied, show a useful message such as:

```text
Microphone access was denied.

Allow microphone access in your browser
settings and try again.
```

Never expose a raw browser/API error to the user.

---

# 22. Phase 9 — File Upload

Provide:

```text
[ Choose Audio ]
```

Preferably also support:

```text
Drag & Drop
```

After selection display:

```text
math-session.m4a

8.2 MB

04:32
```

Then:

```text
[ ▶ Play ]

[ Analyse Audio ]
```

---

# 23. Recording and Upload Must Share the Pipeline

Do not build separate AI systems.

Both should converge:

```text
               Record
                 │
                 ▼
User ────────── Audio
                 ▲
                 │
               Upload
                 │
                 ▼
            Validation
                 │
                 ▼
              Backend
                 │
                 ▼
              Whisper
                 │
                 ▼
               Grok
```

Recording and uploading are simply two different ways of obtaining the audio.

---

# 24. Phase 10 — Backend API

Create one primary analysis endpoint conceptually:

```text
POST /api/analyze
```

Input:

```text
Audio file
```

Pipeline:

```text
Receive Audio
     │
     ▼
Validate
     │
     ▼
Cloudflare Whisper
     │
     ▼
Transcript
     │
     ▼
Check Transcript
     │
     ▼
Grok
     │
     ▼
Validate Grok Output
     │
     ▼
Return Concepts
```

Response:

```json
{
  "concepts": [
    {
      "term": "Algebra",
      "prominence": 10
    }
  ]
}
```

The frontend should not need to know:

* Cloudflare exists
* Grok exists
* Which models are being used
* API keys
* AI prompts

The frontend simply sends audio and receives concepts.

---

# 25. Phase 11 — Backend AI Validation

Never blindly trust the AI response.

Validate:

```text
Grok Response
      │
      ▼
Valid JSON?
      │
      ▼
concepts exists?
      │
      ▼
Is array?
      │
      ▼
Valid terms?
      │
      ▼
Valid prominence?
      │
      ▼
Remove duplicates
      │
      ▼
Normalize
      │
      ▼
Limit number
      │
      ▼
Frontend
```

For example, reject or repair malformed items such as:

```json
{
  "term": "",
  "prominence": 500
}
```

---

# 26. Empty/Silent Audio

After transcription, check whether meaningful speech exists.

For example:

```text
Audio
  │
  ▼
Whisper
  │
  ▼
Transcript = ""
```

Do not call Grok.

Return an appropriate error.

Example:

```text
No meaningful speech was detected.

Please try another recording.
```

This saves an unnecessary AI request and produces better UX.

---

# 27. Phase 12 — Loading States

AI processing can take time.

Never leave the interface looking frozen.

Use meaningful states.

```text
Uploading audio...
```

then:

```text
Transcribing audio...
```

then:

```text
Understanding the session...
```

then:

```text
Building word cloud...
```

then:

```text
Analysis complete
```

Conceptually your application has states such as:

```text
IDLE
 │
 ▼
RECORDING
 │
 ▼
READY
 │
 ▼
UPLOADING
 │
 ▼
TRANSCRIBING
 │
 ▼
ANALYSING
 │
 ▼
RESULT
```

Failures move into:

```text
ERROR
```

---

# 28. Phase 13 — Word Cloud

Backend returns something like:

```json
[
  {
    "term": "Algebra",
    "prominence": 10
  },
  {
    "term": "Equations",
    "prominence": 9
  },
  {
    "term": "Variables",
    "prominence": 7
  },
  {
    "term": "Problem Solving",
    "prominence": 6
  }
]
```

Frontend maps:

```text
Prominence
     │
     ▼
Font Size
```

Higher prominence:

```text
ALGEBRA
```

Lower prominence:

```text
Variables
```

Use an existing word-cloud library.

Mention the library in the README.

---

# 29. PNG Download

The generated word cloud must be downloadable as:

```text
PNG
```

Provide something simple:

```text
[ Download PNG ]
```

Test the actual downloaded file.

Do not consider the feature complete just because the button exists.

---

# 30. Phase 14 — Error Handling

Test errors deliberately.

## Microphone Denied

```text
Microphone access was denied.

Allow microphone access in your browser
settings and try again.
```

## Unsupported Format

```text
This file format isn't supported.

Please upload MP3, WAV, M4A, AAC,
OGG, WEBM or FLAC.
```

## File Too Large

```text
This file is larger than the 25 MB limit.
```

## Audio Too Long

```text
This audio is longer than the
10-minute limit.
```

## Silent Recording

```text
No meaningful speech was detected.

Please try another recording.
```

## Cloudflare Failure

```text
We couldn't transcribe the audio.

Please try again.
```

## Grok Failure

```text
We couldn't analyse the transcript.

Please try again.
```

## Network Failure

```text
Connection failed.

Check your internet connection
and try again.
```

Never show raw stack traces or API responses to normal users.

---

# 31. Phase 15 — Security

Your server environment contains:

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
XAI_API_KEY
```

Architecture:

```text
Browser
   │
   ▼
Your Backend
   │
   ├── Cloudflare Secret
   │
   └── xAI Secret
```

Never:

```text
Browser
   │
   ├── Cloudflare Secret
   └── xAI Secret
```

Do not use public frontend environment variables for secrets.

For example, avoid anything equivalent to:

```text
NEXT_PUBLIC_XAI_API_KEY
```

---

# 32. Git Security

Before submission verify that no secret was ever committed.

Deleting `.env` later is not enough if the key exists in Git history.

Check:

```text
Git history
```

for:

* Cloudflare tokens
* xAI keys
* `.env`
* Hard-coded credentials

If a key was exposed, revoke it and generate another one.

---

# 33. Phase 16 — Mobile Support

The application must work around:

```text
390px width
```

Test:

* Buttons
* Upload area
* Recording controls
* Timer
* Audio player
* Error messages
* Loading states
* Word cloud
* PNG download

Do not create a separate mobile application.

Simply make the existing layout responsive.

---

# 34. Browser Testing

Required:

```text
Chrome
Safari
```

Test both desktop and mobile where possible.

Pay particular attention to:

```text
MediaRecorder
Microphone permissions
Audio codecs
Audio playback
```

These are more likely to differ between browsers than normal React UI.

---

# 35. Phase 17 — Deployment

Recommended architecture:

```text
Vercel
   │
   ▼
Next.js
   │
   ├── Cloudflare Workers AI
   │
   └── xAI Grok
```

Configure secrets using the hosting provider's environment variables.

Then test the **deployed application**, not just localhost.

Verify:

```text
Record
Upload
Transcription
Grok analysis
Word cloud
PNG download
Errors
```

The assignment requires the live AI functionality to work.

---

# 36. Required Brief Metadata

Do not forget:

```html
<meta name="x-brief-ref" content="TFG-WD-8823">
```

It must be present in the root document's `<head>`.

This may be checked automatically.

---

# 37. Required File Size Constant

The assignment explicitly requires:

```text
BRIEF_REF_5190_MAX_BYTES
```

Use this exact exported constant name for the 25 MB ceiling.

Treat it as the single source of truth for the file-size limit.

---

# 38. Testing Matrix

Before submitting, complete this checklist.

| Test               | Expected      |
| ------------------ | ------------- |
| MP3                | Works         |
| WAV                | Works         |
| M4A                | Works         |
| AAC                | Works         |
| OGG                | Works         |
| WEBM               | Works         |
| FLAC               | Works         |
| File >25 MB        | Rejected      |
| Audio >10 minutes  | Rejected      |
| Silent audio       | Helpful error |
| Mic denied         | Helpful error |
| Cloudflare failure | Helpful error |
| Grok failure       | Helpful error |
| Network failure    | Helpful error |
| Record             | Works         |
| Stop               | Works         |
| Timer              | Works         |
| Playback           | Works         |
| Discard            | Works         |
| Record again       | Works         |
| Upload             | Works         |
| File details       | Works         |
| Word cloud         | Works         |
| PNG download       | Works         |
| 390px              | Works         |
| Chrome             | Works         |
| Safari             | Works         |
| Production AI      | Works         |

---

# 39. Recommended Git History

Do not submit one giant commit.

Use meaningful commits throughout development.

Example:

```text
initialize Next.js project

add audio recording flow

add audio upload validation

integrate Cloudflare Whisper

integrate Grok transcript analysis

add audio analysis API

add structured output validation

add word cloud visualization

add PNG export

add loading and processing states

add error handling

improve mobile responsiveness

add deployment configuration

add README and setup instructions
```

The exact commits do not matter.

The important thing is showing genuine project development.

---

# 40. README Structure

Recommended README:

```text
# Audio Word Cloud

## Overview

## Live Demo

## Features

## Architecture

## AI Pipeline

## Tech Stack

## Supported Audio Formats

## Audio Limits

## Environment Variables

## Local Installation

## Running Locally

## Cloudflare Workers AI

## xAI Grok

## Word Cloud Library

## Error Handling

## Deployment

## Known Limitations
```

Include the architecture:

```text
Audio
  │
  ▼
Validation
  │
  ▼
Cloudflare Whisper
  │
  ▼
Transcript
  │
  ▼
xAI Grok
  │
  ▼
Structured Concepts
  │
  ▼
Validation / Normalization
  │
  ▼
Word Cloud
```

The reviewer should understand the project architecture within a few minutes.

---

# 41. Five-Day Implementation Schedule

## Day 1 — AI Proof of Concept

### Morning

Set up:

* Cloudflare account
* Workers AI
* Cloudflare credentials
* Local environment
* Sample audio

Test:

```text
sample.mp3
    │
    ▼
Whisper
    │
    ▼
Transcript
```

### Afternoon

Set up:

* xAI account
* xAI API key
* Grok request
* Structured output

Test:

```text
Transcript
    │
    ▼
Grok
    │
    ▼
concepts.json
```

### End-of-Day Goal

This must work:

```text
audio.mp3
    │
    ▼
Whisper
    │
    ▼
Transcript
    │
    ▼
Grok
    │
    ▼
Structured JSON
```

If this does not work, prioritize fixing it before UI development.

---

# 42. Day 2 — Application + Backend

Create the actual Next.js project.

Implement:

* Project architecture
* Environment variables
* Audio validation
* Analysis API
* Cloudflare service
* Grok service
* Structured response validation
* Upload functionality
* Recording functionality

End-of-day target:

```text
Record / Upload
      │
      ▼
Backend
      │
      ▼
Whisper
      │
      ▼
Grok
      │
      ▼
JSON
```

The UI does not need to look polished yet.

---

# 43. Day 3 — User Interface

Implement:

* Main screen
* Record button
* Recording indicator
* Timer
* Stop
* Playback
* Discard
* Upload
* File information
* Analyse button
* Loading states
* Word cloud
* PNG download

End-of-day target:

```text
User
 │
 ▼
Audio
 │
 ▼
AI
 │
 ▼
Word Cloud
```

The complete happy-path flow should work.

---

# 44. Day 4 — Reliability

Focus on edge cases.

Test:

```text
Microphone denied
Unsupported format
25 MB+
10 minutes+
Silent audio
Cloudflare failure
Grok failure
Network failure
Malformed AI response
```

Then test:

```text
390px mobile
Chrome
Safari
```

Improve the interface only after reliability issues are addressed.

---

# 45. Day 5 — Production

Deploy the application.

Configure:

* Cloudflare credentials
* xAI credentials
* Production environment variables

Test the live URL.

Then complete:

* README
* `.env.example`
* Git history
* Secret scan
* Required meta tag
* Required constant
* Mobile testing
* Browser testing
* Final production AI test

---

# 46. Development Priority

Use this priority:

```text
1. Whisper works
       │
       ▼
2. Grok works
       │
       ▼
3. Combined AI pipeline works
       │
       ▼
4. Backend works
       │
       ▼
5. Upload works
       │
       ▼
6. Recording works
       │
       ▼
7. Word cloud works
       │
       ▼
8. Error handling works
       │
       ▼
9. Mobile works
       │
       ▼
10. Polish
```

Do not reverse this and spend Day 1 building a polished interface.

---

# 47. Main Technical Risks

Pay particular attention to these areas.

## Risk 1 — Audio Format Compatibility

Determine which required formats Cloudflare accepts directly.

Do this early.

## Risk 2 — Browser Recording Format

Chrome and Safari may produce different formats/codecs.

Test both.

## Risk 3 — Large Request Bodies

The assignment allows files up to 25 MB.

Make sure your hosting/backend architecture can accept them.

## Risk 4 — Processing Time

Transcription and Grok analysis may take time.

Use clear loading states.

## Risk 5 — AI Output

Use structured output and backend validation.

Do not blindly trust model output.

## Risk 6 — API Quotas

Cloudflare and xAI have usage limits/pricing.

Monitor them during testing.

## Risk 7 — API Secrets

Never expose credentials to the browser or GitHub.

## Risk 8 — Production Environment

Something working locally does not guarantee it works after deployment.

Test the live URL extensively.

---

# 48. Things NOT to Build

Avoid unnecessary scope.

Do not build:

```text
Authentication
Accounts
MongoDB
Database
User profiles
Dashboard
Admin panel
Analysis history
Landing page
Pricing page
Redux
Complex animations
Multiple themes
Social login
Email system
```

None of these improve your score against the assignment requirements.

---

# 49. Final Architecture

The finished system should remain simple:

```text
                   USER

            ┌───────┴───────┐
            │               │
          RECORD          UPLOAD
            │               │
            └───────┬───────┘
                    │
                    ▼
             AUDIO VALIDATION
                    │
                    ▼
             NEXT.JS BACKEND
                    │
                    ▼
          CLOUDFLARE WHISPER
                    │
                    ▼
                TRANSCRIPT
                    │
                    ▼
                xAI GROK
                    │
                    ▼
          STRUCTURED CONCEPTS
                    │
                    ▼
          BACKEND VALIDATION
                    │
                    ▼
               WORD CLOUD
                    │
                    ▼
              DOWNLOAD PNG
```

---

# 50. Definition of Done

The project is complete when a reviewer can:

1. Open the live URL.
2. Record audio or upload an audio file.
3. Preview the audio.
4. Click Analyse.
5. See clear processing states.
6. Receive a meaningful word cloud.
7. Download the word cloud as PNG.
8. Receive useful errors when something fails.
9. Use the application on mobile.
10. Clone the repository.
11. Follow the README.
12. Add their environment variables.
13. Run the application within approximately ten minutes.

And internally:

```text
Audio
  │
  ▼
Cloudflare Whisper
  │
  ▼
Transcript
  │
  ▼
xAI Grok
  │
  ▼
Meaningful Concepts
  │
  ▼
Word Cloud
```

That core pipeline should receive the majority of the development attention.
