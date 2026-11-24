# Homework 7 — From Convergence to Bayesian Inference

Static HTML/CSS/JavaScript homework, Statistics 2026/27. Open `index.html` in a modern browser. No runtime dependencies, no build, no external data. Deploy the directory as `homework-7/` without overwriting the repository root or previous homework directories.

## Laboratories
- LLN: eight seeded trajectories, tolerance and Chebyshev bound.
- CLT: 2,000 replications, density histogram and normal overlay.
- Dependence: exact shared Gaussian factor variance, log sample-size axis.
- Normal–Normal: prior, rescaled likelihood, posterior and credible interval; sample mean fixed at 70 ms, known SD 20 ms.
- Dependent evidence: mixture of shared and independent Bernoulli signals, conditional on state.

All scenarios are synthetic. Finite simulations illustrate but do not prove asymptotic theorems. References and assumptions are included in the page. The visual style is inherited from the supplied HW6 layout-updated version; earlier homework files are untouched.

## Tests
Run `node test.js`. No packages required. Tests cover deterministic simulation, population and CLT moments (fixed seeds and tolerances), exact variance, conjugate posterior and evidence probabilities. The simulation generator is for teaching, not cryptographic use.

## Version 2
Improved typography and centered layout, convergence and Bayesian diagrams, explicit integrability assumptions and derivations, effective sample size, theoretical skewness, variable observed latency, posterior weights and credible interval shading, adjustable alert rates and likelihood ratios. All five laboratories have visible range values and reset controls. Run `node test.js` for numerical regression checks. Open `index.html` locally; no external runtime dependencies. Repository-relative links require the course repository structure.
