# Methodology source basis

The methodology layer borrows from established experimental-design practice.

## Experimental design

NIST defines design of experiments as deliberately changing one or more factors to observe effects on response variables, so results can support valid and objective conclusions. This maps directly to short-form tests:

```text
factor = creative variable
level = variant
response variable = platform metric
```

Source: <https://www.itl.nist.gov/div898/handbook/pri/section1/pri11.htm>

## Choosing a design

NIST notes that design choice depends on the experiment objective and number of factors. That is why this pack separates single-variable tests, matched-pair tests, dose-response tests, factorial tests, and cross-platform tests.

Source: <https://www.itl.nist.gov/div898/handbook/pri/section3/pri33.htm>

## Online controlled experiments

Kohavi, Henne, and Sommerfield emphasise randomization, statistical power, sample size, variance reduction, and limitations when running controlled experiments on the web. Organic social testing rarely gives perfect randomisation, so this pack uses matched-pair and replication methods when platform-native A/B testing is unavailable.

Source: <https://ai.stanford.edu/~ronnyk/2007GuideControlledExperiments.pdf>

## Preregistration

OSF describes preregistration as posting a time-stamped study plan before data collection or analysis. This pack adapts that idea as lightweight experiment briefs.

Source: <https://help.osf.io/article/330-welcome-to-registrations>
