"""Run core algorithmic-mechanism toy simulations.
These simulations are for research explanation only. They do not reproduce any private platform algorithm.
"""
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'outputs'
FIG = ROOT / 'figures'
OUT.mkdir(exist_ok=True)
FIG.mkdir(exist_ok=True)

np.random.seed(7)

def rank_flip():
    x = np.linspace(0, 100, 201)
    gap = 45
    y = x - gap
    pd.DataFrame({'manufactured_signal': x, 'score_margin_after_gap': y, 'rank_flipped': y > 0}).to_csv(OUT / 'rank_flip_curve.csv', index=False)
    plt.figure()
    plt.plot(x, y)
    plt.axhline(0, ls='--')
    plt.axvline(gap, ls='--')
    plt.title('Rank flip boundary')
    plt.tight_layout()
    plt.savefig(FIG / 'rank_flip_boundary.png')
    plt.close()

def feedback():
    rows = []
    plt.figure()
    for a in [0.2, 0.5, 0.8, 0.92]:
        vals = [a**t for t in range(30)]
        for t, v in enumerate(vals):
            rows.append({'t': t, 'feedback_a': a, 'incremental_effect': v, 'cumulative_effect': sum(vals[:t+1])})
        plt.plot(range(30), np.cumsum(vals), label=f'a={a}')
    pd.DataFrame(rows).to_csv(OUT / 'feedback_multiplier_paths.csv', index=False)
    plt.legend()
    plt.title('Feedback multiplier')
    plt.tight_layout()
    plt.savefig(FIG / 'feedback_multiplier_paths.png')
    plt.close()

def fake_review_posterior():
    alpha, beta = 2, 2
    real_pos, real_neg = 18, 12
    fake_range = np.arange(0, 61)
    posterior = (alpha + real_pos + fake_range) / (alpha + beta + real_pos + real_neg + fake_range)
    pd.DataFrame({'fake_positive_reviews': fake_range, 'posterior_quality_mean': posterior}).to_csv(OUT / 'fake_review_posterior_curve.csv', index=False)
    plt.figure()
    plt.plot(fake_range, posterior)
    plt.axhline(0.7, ls='--')
    plt.title('Fake positive reviews shift posterior quality estimate')
    plt.tight_layout()
    plt.savefig(FIG / 'fake_review_posterior_curve.png')
    plt.close()

if __name__ == '__main__':
    rank_flip()
    feedback()
    fake_review_posterior()
    print('core simulations complete')
