# Recommender Profile Injection Model

## Purpose
This model applies to fake ratings, fake reviews, fake watch histories, or fake user profiles in collaborative filtering.

Let the user-item interaction matrix be:

\[
R \in \mathbb{R}^{U \times I}
\]

A profile-injection attack adds fake users:

\[
\tilde{R} = \begin{bmatrix} R \\ R_{fake} \end{bmatrix}
\]

The recommender estimates parameters:

\[
\hat{\Theta}=\arg\min_{\Theta} L(R;\Theta)
\]

After injection:

\[
\tilde{\Theta}=\arg\min_{\Theta} L(\tilde{R};\Theta)
\]

If recommendations for target item \(i^*\) increase:

\[
\hat{y}_{u,i^*}(\tilde{\Theta}) > \hat{y}_{u,i^*}(\hat{\Theta})
\]

the injected profiles have shifted allocation.

## Evidence field
Recommender-security research calls this shilling or profile-injection attacks. These are known vulnerabilities in collaborative filtering.
