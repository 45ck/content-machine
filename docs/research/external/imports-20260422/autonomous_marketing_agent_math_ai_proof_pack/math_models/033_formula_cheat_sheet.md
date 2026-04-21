# Formula Cheat Sheet

## Funnel

```text
E[paid] = impressions × p_attention × p_click × p_inspect × p_signup × p_activate × p_pay
```

## Profit

```text
E[profit] = E[paid] × gross_profit_per_customer − spend − fixed_cost
```

## CAC

```text
CAC = spend / new_customers
```

## LTV

```text
LTV = ARPA × gross_margin / churn_rate
```

## Payback

```text
payback_months = CAC / (ARPA × gross_margin)
```

## Beta-binomial posterior

```text
p ~ Beta(α, β)
p | data ~ Beta(α + successes, β + failures)
```

## Logistic model

```text
p = 1 / (1 + exp(-(β0 + βX)))
```

## Adstock

```text
x*_t = x_t + λx*_{t-1}
```

## Hill saturation

```text
f(x) = x^s / (x^s + k^s)
```

## Difference-in-differences

```text
effect = (treat_post − treat_pre) − (control_post − control_pre)
```

## CUPED

```text
Y_cuped = Y − θ(X − mean(X))
θ = Cov(Y,X)/Var(X)
```

## Uplift

```text
τ(x) = E[Y(1) − Y(0) | X=x]
```

## Utility

```text
U = E[profit] + λ_learningE[learning] − λ_riskRisk − Cost
```
