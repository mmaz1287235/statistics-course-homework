# Homework 6 — Statistical Independence

This is a self-contained educational web page for the 2026/27 Statistics course.

## Files

- `index.html` — theoretical explanation, interactive dataset editor, tables, interpretation.
- `style.css` — visual style consistent with previous homework pages.
- `script.js` — CSV parsing, contingency tables, margins, conditional probabilities, Pearson chi-square, p-value via the regularized incomplete Gamma function, Cramér's V, DOM rendering.
- `test.js` — independent Node.js assertions for key calculations and input guards.

## Run

Open `index.html` in a browser. There are no external runtime dependencies, build steps, or network requests. Run tests with:

```sh
node test.js
```

## Data provenance

**All example data are synthetic, not real cyber-incident data.** The paired-observation CSV is constructed by expanding each count in the following matrices into one record per pair, in row-major order.

Rows (X): Phishing, Credential abuse, Malware.
Columns (F): Blocked, Contained, Compromised.

**Associated scenario:**

```
42  15   3
20  24  16
 8  21  31
```

**Small sample differences scenario:**

```
21  19  20
19  21  20
20  20  20
```

Each table has 180 records and positive margins. Neither scenario is evidence from a real population, and the synthetic rows are not an observed random sample. The chi-square test is shown conditionally on the usual independent-observations sampling assumptions.

## Statistical definitions

For cell count O_ij, row margin R_i, column margin C_j, total n:

- Joint relative frequency: O_ij/n.
- Row-conditional F given X: O_ij/R_i.
- Column-conditional X given F: O_ij/C_j.
- Marginals: R_i/n and C_j/n.
- Expected independent cell count: E_ij = R_i*C_j/n.
- Chi-square: sum (O_ij-E_ij)^2/E_ij over all cells.
- Degrees of freedom: (r-1)*(c-1).
- Upper-tail p-value: Q(df/2, chi-square/2), where Q is the regularized upper incomplete gamma function.
- Cramér's V: sqrt(chi-square/(n*min(r-1,c-1))).

The implementation checks the count of expected cells below 5 and provides a warning, not an automatic invalidation of the approximation. Population independence cannot be established from failure to reject H0; statistical association does not imply causation.

## User input limits

Paste 2–5,000 `X,F` pairs with two unquoted comma-separated nonempty labels per line. The header `X,F` is optional. Quoted fields and commas inside categories are not supported. Each label must be at most 50 characters, and each variable must have between 2 and 8 observed categories. Category order follows first appearance in the records.

## Verification

`node test.js` checks the parsing rules; observed and expected margins; normalization of both conditional frequency matrices; contribution sums; known chi-square and gamma-tail values; and invalid inputs.

Browser appearance, responsiveness, and controls should additionally be checked visually prior to GitHub Pages publication. No deployment has been performed.

## Sources

- [NIST/SEMATECH — Chi-Square Test for Independence](https://www.itl.nist.gov/div898/handbook/prc/section4/prc45.htm)
- [NIST/SEMATECH — Chi-Square Distribution](https://www.itl.nist.gov/div898/handbook/eda/section3/eda35f.htm)
