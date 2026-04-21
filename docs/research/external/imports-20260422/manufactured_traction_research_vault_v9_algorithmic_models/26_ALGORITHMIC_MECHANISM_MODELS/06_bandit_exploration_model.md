# Bandit Exploration and Seed Bias Model

## Purpose
Feeds often resemble explore/exploit systems: new items are tested on limited audiences and expanded if early performance looks strong.

## UCB-style model
For item \(i\):

\[
UCB_i = \hat{\mu}_i + c \sqrt{\frac{\log t}{n_i}}
\]

where \(\hat{\mu}_i\) is estimated reward, \(n_i\) is number of observations, and \(c\) controls exploration.

If artificial early engagement inflates \(\hat{\mu}_i\), then the item may be selected for more trials.

## Bayesian version
With binary success/failure, a Beta posterior is:

\[
\theta_i \sim Beta(\alpha_i + s_i, \beta_i + f_i)
\]

Manufactured successes add \(m\) to \(s_i\):

\[
\tilde{\theta}_i \sim Beta(\alpha_i + s_i + m, \beta_i + f_i)
\]

The posterior mean shifts from:

\[
\frac{\alpha+s}{\alpha+\beta+s+f}
\]

to:

\[
\frac{\alpha+s+m}{\alpha+\beta+s+f+m}
\]

## Key point
Early manipulation is powerful because uncertainty is highest when the system has the least data.
