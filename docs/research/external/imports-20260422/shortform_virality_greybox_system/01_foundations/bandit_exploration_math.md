# Bandit Exploration Math

## Why exploration is necessary

If the system only exploits known winners:

```text
new formats never get tested
new creators remain under-sampled
novel ideas cannot be discovered
```

If it explores randomly:

```text
feed/user quality falls
creator slots are wasted
```

The solution is controlled exploration.

## Upper Confidence Bound proxy

```text
UCB(v) =
PredictedUtility(v)
+
c · sqrt(log(t) / n_v)
```

Where:

```text
t = total tests
n_v = number of times this video/variant/class has been tested
c = exploration strength
```

## Thompson sampling proxy

Sample utility from the posterior:

```text
U_v ~ Posterior(Utility_v)
select argmax_v U_v
```

## Our content lab score

```text
TestScore =
PredictedUtility
+ UncertaintyBonus
+ NoveltyBonus
- NegativeRisk
```

## Safe exploration rule

Explore only when:

```text
Eligibility is high
NegativeRisk is acceptable
AudienceFit is not too low
Uncertainty is meaningful
```

Novelty without fit is noise. Novelty with fit is useful exploration.
