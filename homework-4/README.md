# Homework 4 — Welford's Recurrence and Sampling Variability

Statistics 2026/27. A self-contained browser project with no external libraries.

## Exercise 1: online mean and variance

For scores x_1, ..., x_n, the mean is updated using Knuth's recurrence. Writing delta = x_n - mean_(n-1):

    mean_n = mean_(n-1) + delta/n

If SS_n is the sum of squared deviations from the current mean, then:

    SS_n = SS_(n-1) + delta * (x_n - mean_n)
    s_n^2 = SS_n/(n-1), n >= 2

The direct sample variance recurrence for n >= 3 is:

    s_n^2 = ((n-2)*s_(n-1)^2 + delta*(x_n - mean_n))/(n-1)

The first observation has no defined sample variance. The page includes the derivation and a step-by-step check against a separate two-pass calculation.

## Exercise 2: simulated penetration scores

There are m hackers and n systems per hacker. Each attempt receives an independently sampled integer score from 0 to 10, with probability 1/11 each. This is an illustrative model rather than an empirical account of attacks.

Theoretical values:

    E[X] = 5
    E[X^2] = 35
    Var(X) = 10
    E[(X - 5)^4] = 178

For every hacker, Welford's method gives the sample mean and corrected sample variance. Their averages across the m hackers are compared with 5 and 10. The simulation also reports how much these estimates vary *across hackers*. The two theoretical standard deviations used for comparison are:

    SD(sample mean) = sqrt(10/n)
    SD(sample variance) = sqrt((178 - 100*(n-3)/(n-1))/n)

The chart and table update at n = 10, 25, 50, 100, 250, 500, 1000, 2500, and 5000 up to the selected maximum n. Each hacker's first observations are reused across checkpoints. Across-hacker standard deviations use denominator m to describe the Monte Carlo outputs; the variance inside each hacker's trajectory uses n-1.

## Files

- `index.html`: derivation, controls, tables, and discussion.
- `style.css`: responsive layout, consistent with the earlier homework pages.
- `script.js`: Welford updates, deterministic scoring, simulation and chart drawing.

Open `index.html` directly in a modern browser. No server or install is necessary. For GitHub Pages, place the files under `homework-4/`, then link to that folder from the repository homepage after testing.

## Reproducibility

The seed is an unsigned 32-bit integer used by a local mulberry32 generator. The default is 20261102. Keeping m, n and seed fixed reproduces the outputs. The generator is used for a teaching simulation, not for cryptographic randomness. No data is transmitted.

## Assumptions and interpretation

Independence and a common score distribution are part of the simulation assumptions. Under these assumptions the sample mean and corrected variance are unbiased; as n increases their sampling variability decreases. Increasing m reduces noise in the Monte Carlo averages without changing the distribution of an individual hacker's estimates. Different values of n share prefixes of trajectories, so the displayed estimates are dependent across checkpoints. Real-world systems need not satisfy these assumptions.
