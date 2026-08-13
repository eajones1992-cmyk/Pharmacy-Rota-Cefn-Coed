# Pharmacy Session Allocation

A single-page tool for planning how a hospital pharmacy department's sessions are
distributed across wards, community teams and clinics, and for building a weekly
rota from that plan.

A session is half a working day — mornings 9am–1pm, afternoons 1pm–5pm — giving
ten sessions in a Monday to Friday week.

## Opening it

Download `pharmacy-rota-app.html` and open it in Edge or Chrome. Nothing to
install and no internet connection needed; everything is contained in the one file.

## What it does

**Sample week** — the standard rota. Sessions that must happen at a set time are
pre-placed and locked; the rest sit in a pool on the right to be dragged onto
whichever day suits. Each session takes one or more pharmacist names.

**Next week** — inherits the sample week, then takes absences on top. Mark people
as off, on a study day, in a meeting, training or otherwise committed, and the
tool lists every session that needs covering and who is genuinely free to do it.
Prints to a one-page A4 calendar.

**Wards and areas** — how many sessions each location needs, how many are placed,
and who covers them. Sessions can be allocated to a pharmacist without fixing a
time, so someone can hold four sessions for a ward with only one of them pinned
to a particular morning.

**Pharmacists** — each person's sessions available, their working pattern, what
they are responsible for, and how much of their time is flexible. Double bookings
are flagged, and any that are genuinely fine can be marked as agreed so they stop
being reported.

## Your data

No staff names are stored in this code. The ward and session structure is built
in; everyone's names, availability and allocations live in a rota file you create
yourself.

- **Save as…** writes a `.json` rota file wherever you choose
- **Open rota** loads one back
- **Save** writes straight back to the file you opened

Keep that file in a shared folder and one person edits at a time. There is no
locking — if two people save at once, the last save wins.

Working data is also cached in the browser you opened it with, purely as
convenience. The file is the record.

## Printing

**Print rota** produces an A4 landscape calendar: locations down the side, days
across the top, scaled to fit a single page. It is designed to stay readable in
black and white, using shading, hatching and typography rather than colour alone.
Set the print destination to "Save as PDF" for a file to circulate.

## Building from source

`pharmacy-session-dashboard.jsx` is the React component. To rebuild the
standalone file:

```
npm install react react-dom esbuild
esbuild entry.jsx --bundle --minify --format=iife --loader:.jsx=jsx \
  --define:process.env.NODE_ENV='"production"' --outfile=app.bundle.js
```

Then inline `app.bundle.js` into an HTML shell with a `#root` div. The entry file
supplies a `window.storage` shim backed by `localStorage`.

## A note on staff data

A completed rota file contains named staff and their working patterns. That is
identifiable personal data. Keep rota files inside your organisation's own
storage and do not commit them to this repository.
