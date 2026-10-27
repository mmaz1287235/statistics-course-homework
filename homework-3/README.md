# Homework 3: Stochastic Penetration Scores and Statistical Limits

An interactive, self-contained browser simulation for the Statistics 2026/27 MSc Cybersecurity course.

## Run

Open `index.html` in a current browser. No build step, external plotting library, network access or installation is required.

## Experimental model

There are `m` simulated attackers. Each attacker produces one independent sequence of `n` scores. Scores are i.i.d. Bernoulli(p), with values 0 and 1, or symmetric Rademacher, with values -1 and +1. The same cumulative sequence supplies all three transformations: `S_n`, `S_n/n`, and `S_n/sqrt(n)`.

One run simulates all `m` trajectories out to the selected maximum `n`, recording cumulative totals at 10, 25, 50, 100, 250, 500, 1000, 2500, and 5000 when available. Five trajectories are drawn for legibility. All `m` trajectories contribute to each histogram and summary statistic. The PRNG uses a displayed integer seed (default 20261027). Changing the seed changes the pseudorandom sample, but rerunning the same settings produces the same outcome in a conforming JavaScript engine.

Empirical variance divides by `m`, since it describes the discrete empirical distribution of all `m` simulated scores. This need not equal the theoretical variance exactly. Increasing `m` reduces Monte Carlo noise but has no effect on the theoretical distribution of any individual attacker's score.

## Statistical expectations

For increment mean `mu` and variance `sigma^2`, the three quantities have theoretical variances `n sigma^2`, `sigma^2/n`, and `sigma^2` respectively. LLN is illustrated using the observed proportion `|S_n/n - mu| > epsilon` and the capped Chebyshev bound. The standard normal comparison uses `S_n/sqrt(n)` for Rademacher or `(S_n - np)/sqrt(np(1-p))` for Bernoulli. This centering is essential: uncentered Bernoulli `S_n/sqrt(n)` does not converge to a standard normal distribution for `0 < p < 1`.

The Rademacher standardized score is discrete for every finite `n`. Normal convergence is in distribution, not equality at finite `n`.

## Files

- `index.html`: presentation and explanations
- `style.css`: visual style, based on the earlier Homework 2A styling
- `script.js`: seeded simulation, statistics and canvas charts

## Limitations

The scores are a teaching model. They assume independent attempts, identical distributions and independent attackers. The simulation does not estimate operational compromise risk. The plotted normal curve is a theoretical reference rather than a fitted result. The normal-reference coverage 0.6827 is a theoretical probability, not simulation output.
