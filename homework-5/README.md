# Statistics 2026/27 — Homework 5

Official exercises: (1) numerical comparison of Riemann- and Lebesgue-inspired integration, including pathological functions; (2) computing the standard normal CDF numerically and discussing the error function and Liouville's theorem.

## Open

Open `index.html` in a browser. The files use only local HTML, CSS, and JavaScript; no package installation or internet connection is required for the page itself. Reference links open external sources.

The header Home link is `../` and is intended for the repository path `/homework-5/`. When viewing the folder independently, that link will navigate to the parent folder.

## Reproducibility

All numerical experiments are deterministic and use no random inputs. Select a function, midpoint count, value-level count, and (for `1/sqrt(x)`) the clipping height; click Compute. CDF results and runtime measurements can be rerun with the page controls. Benchmark durations depend on the local machine and browser.

## Mathematical distinctions

- The Riemann experiment uses domain midpoint sums, not upper/lower Darboux sums. Midpoints alone cannot prove Riemann integrability.
- The Lebesgue-inspired experiment uses a layer-cake decomposition with **analytically calculated superlevel-set measures** and upper/lower value partitions. It is not a rebinned sample histogram.
- `1/sqrt(x)` is capped at height M for the value-level comparison. The integral of the capped function is `2 - 1/M`; its missing contribution is `1/M`. Riemann midpoints approximate the original uncapped improper integral.
- Dirichlet's function is not Riemann-integrable; rational and irrational point samples demonstrate a sampling pathology. Thomae's function is Riemann-integrable with integral zero.
- The normal CDF comparison uses Simpson, an alternating Gaussian series, and the fixed-coefficient Abramowitz–Stegun error-function approximation. Standard test points are hard-coded in `script.js`; NIST's printed table verifies them only to the number of digits the table supplies.
- The normal CDF example interface is restricted to x in [-5,5]. It is not an extreme-tail numerical library.

## Local automated tests

With Node.js installed, from the `homework-5/` directory run:

```sh
node test.js
```

`test.js` uses built-in Node assertions and no dependencies. The test checks exact integrals, Lebesgue brackets, the improper-integral cap, Riemann midpoint convergence, rational samples of Thomae, CDF methods, and symmetry.

## Sources

- [ETSU, The Normal Distribution, Section 3.4](https://faculty.etsu.edu/gardnerr/4047/notes-Hogg-McKean-Craig/Hogg-McKean-Craig-3-4.pdf)
- [NIST, Standard Normal CDF table](https://itl.nist.gov/div898/handbook/eda/section3/eda3671.htm)
- [NIST DLMF, Error Functions](https://dlmf.nist.gov/7.2)
- [NIST DLMF, Statistical Applications](https://dlmf.nist.gov/7.20)
- [Treccani, Liouville's theorem on elementary integration](https://www.treccani.it/enciclopedia/teorema-di-liouville_%28Enciclopedia-della-Matematica%29/)

All work is original. Peer projects were considered only as comparative references, not as sources of code or page structure.
