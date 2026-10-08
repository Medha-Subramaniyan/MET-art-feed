# Met as a Feed — Project Roadmap

A beginner-friendly roadmap for building a feed-style art discovery site with The Met Collection API, using plain HTML, CSS, and JavaScript.

**Pace:** ~2–3 hours/week · ~10–12 weeks total **Stack:** HTML, CSS, vanilla JavaScript (no frameworks)

1. **Shuffle discovery.** Open the site and get a random public-domain artwork, full-bleed and beautiful. Hit a button for the next one. This is your fetch, async, and DOM practice.
2. **Filters.** Narrow by department, era, or keyword using `/v1.1/search`. This covers query parameters, loops, and handling empty results.
3. **Save to a moodboard.** Collect favorites into a board you can view as a grid. This is arrays, state, and localStorage, which are core JS fundamentals, and it's the part where your design skills show most.

---



## Ground Rules

- [ ] I type every line of code myself.
- [ ] I use AI as a tutor: explanations, hints, and quizzes. I don't paste in whole solutions.
- [ ] When I'm stuck, I ask AI for a *hint* first, not the answer.
- [ ] I finish every phase's checkpoint before moving on.
- [ ] If a phase takes longer than planned, that's fine. Understanding beats schedule.

---



## API Quick Reference

Base URL: `https://collectionapi.metmuseum.org/public/collection`


| What                      | Endpoint                                   |
| ------------------------- | ------------------------------------------ |
| Search (returns IDs only) | `/v1.1/search?q=sunflowers&hasImages=true` |
| One artwork               | `/v1/objects/{objectID}`                   |
| Department list           | `/v1/departments`                          |


- No API key needed.
- Stay under 80 requests per second.
- Use `/v1.1/search`. The old `/v1/search` endpoint was retired October 1, 2026, so older tutorials and AI-generated code may be wrong.
- Docs: [https://metmuseum.github.io/](https://metmuseum.github.io/)

---



## Phase 0 — Setup and Reading the API (Week 1)

**Goal:** Get your environment ready and understand the data before writing code.

### Setup

- [x] Install VS Code.
- [x] Install the Live Server extension in VS Code.
- [x] Create a project folder with `index.html`, `style.css`, and `script.js`.
- [x] Link `style.css` and `script.js` in `index.html`.
- [x] Open the page with Live Server and confirm it loads.
- [x] Create a GitHub repo and push the starter files.



### Explore the API in the Browser

- [ ] Paste a `/v1.1/search` URL into the browser and read the JSON.
- [ ] Copy one ID from the results and open its `/v1/objects/{id}` URL.
- [ ] Open the `/v1/departments` URL.
- [ ] Note which artwork fields are often empty.
- [ ] Find the fields you'll need: `title`, `artistDisplayName`, `objectDate`, `primaryImageSmall`, `department`.



### Checkpoint

- [ ] I can explain the difference between what `/v1.1/search` returns and what `/v1/objects/{id}` returns.
- [ ] I can explain why the site needs both.

---



## Phase 1 — Fundamentals Without the Network (Weeks 2–3)

**Goal:** Close the "can't write a for loop" gap using plain data. Don't skip this phase.

**Concepts:** variables, objects, arrays, dot notation, functions, `for...of` loops, `if` statements

### Tasks

- [ ] Copy one real artwork's JSON into `script.js` as a regular object.
- [ ] Log the title using dot notation, like `artwork.title`.
- [ ] Build an array of 3 artwork objects.
- [ ] Write a function that takes one artwork and returns a caption like `"Title — Artist, Date"`.
- [ ] Loop over the array with `for...of` and log every caption.
- [ ] Add an `if` check to skip artworks with an empty image field.
- [ ] Count how many artworks come from each department.



### Checkpoint

- [ ] I can write the loop from memory with the file closed.
- [ ] I can explain what a function's parameter and return value are.

---



## Phase 2 — Your First Real Fetch (Week 4)

**Goal:** Replace the hardcoded data with a live API request and show the result on the page.

**Concepts:** `async`/`await`, `fetch`, `.json()`, `res.ok`, `try`/`catch`, the DOM (`querySelector`, `textContent`)

### Tasks

- [ ] Write an `async` function that fetches one known object ID.
- [ ] Convert the response with `.json()` and log the title.
- [ ] Add an `<img>` and a caption element to `index.html`.
- [ ] Use `querySelector` to set the image source and caption text from the API data.
- [ ] Check `res.ok` before using the data.
- [ ] Wrap the request in `try`/`catch`.



### Break It on Purpose

- [ ] Request a fake object ID and see what happens.
- [ ] Turn off wifi and see what happens.
- [ ] Show a friendly error message on the page in both cases.



### Checkpoint

- [ ] I can explain in plain English why `await` is needed.
- [ ] I can explain what would happen without it.

---



## Phase 3 — Shuffle Discovery (Weeks 5–6)

**Goal:** Show a random artwork full screen, with a button to get the next one.

**Concepts:** `Math.random`, `while` loops, event listeners, reusable functions

### Tasks

- [ ] Run a `/v1.1/search` request with `hasImages=true`.
- [ ] Use `Math.random` to pick a random ID from the results.
- [ ] Fetch that object and display it full screen.
- [ ] Add a "Next" button with an event listener.
- [ ] Handle objects that come back without a usable image by trying another ID.
- [ ] Add a retry limit so the loop can't run forever.
- [ ] Add a loading state so the page doesn't look frozen.
- [ ] Move repeated code into reusable functions.



### Checkpoint

- [ ] I can draw the flow on paper: click → search → random pick → fetch → check image → display.
- [ ] I can explain each step in that flow.

---



## Phase 4 — Filters (Weeks 7–8)

**Goal:** Let users narrow the feed by department and keyword.

**Concepts:** query strings (`URLSearchParams`), form inputs, dynamically created elements, rate limits

### Tasks

- [ ] Fetch `/v1/departments` when the page loads.
- [ ] Fill a `<select>` dropdown with departments from the API.
- [ ] Add a keyword text input.
- [ ] Build the search URL from the user's choices with `URLSearchParams`.
- [ ] Connect the filters to the shuffle feature.
- [ ] Show a friendly message when nothing matches.
- [ ] Make sure the app never fires dozens of requests at once.



### Checkpoint

- [ ] I can explain what a query parameter is.
- [ ] I can point to the line in my code that builds one.
- [ ] I can explain why rate limits exist.

---



## Phase 5 — Moodboard (Weeks 9–10)

**Goal:** Let users save favorites to a board that survives a page refresh.

**Concepts:** array methods (`push`, `filter`, `some`), `JSON.stringify` and `JSON.parse`, application state

### Tasks

- [ ] Add a "Save" button to the displayed artwork.
- [ ] Store saved artworks in an array.
- [ ] Prevent duplicates with `some`.
- [ ] Render saved artworks as a grid.
- [ ] Add a "Remove" button to each saved item, using `filter`.
- [ ] Save the array to `localStorage` with `JSON.stringify`.
- [ ] Load the board on page start with `JSON.parse`.
- [ ] Confirm the board survives a refresh.



### Checkpoint

- [ ] I can explain why `localStorage` needs `JSON.stringify`.
- [ ] I can explain "state": the data lives in one place, and the screen reflects it.

---



## Phase 6 — Design and Ship (Weeks 11–12)

**Goal:** Polish the experience and publish it as a portfolio piece.

### Design

- [ ] Lay out the moodboard with CSS Grid.
- [ ] Make the layout work on mobile.
- [ ] Set typography and a color palette.
- [ ] Add transitions between artworks.



### Ship

- [ ] Deploy for free on GitHub Pages.
- [ ] Test the live site on desktop and phone.
- [ ] Write a README explaining what the site does and how it's built.
- [ ] Write a short piece on why I built a feed-style museum experience. This is the marketing and product angle.



### Final Review

- [ ] Ask AI to review my code like a senior developer.
- [ ] Decide which suggestions I agree with, and write down why.
- [ ] Make the changes I agree with, typing them myself.

---



## Optional Extension — Python Data Layer

- [ ] Download The Met's Open Access CSV.
- [ ] Use pandas to see which departments and eras have the most usable public-domain images.
- [ ] Use the findings to improve the feed's filters or defaults.