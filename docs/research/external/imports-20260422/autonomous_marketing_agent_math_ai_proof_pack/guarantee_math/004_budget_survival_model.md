# Budget Survival Model

## Purpose

Guarantee the system gets enough attempts before budget dies.

## Model

```text
number_of_tests_possible = total_learning_budget / cost_per_test
```

## Survival rule

Never spend more than:

```text
10% of learning budget
```

on an unvalidated campaign cell.

## Campaign cell

```text
buyer_state × channel × offer × tactic × proof_path
```

## Rule

Explore cells cheaply. Scale only after posterior confidence improves.
