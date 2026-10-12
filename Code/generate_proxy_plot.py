import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(ROOT_DIR, 'Data', 'processed_events_analysis.csv')
print(f"Reading {CSV_PATH}")
df = pd.read_csv(CSV_PATH)

durations = df['duration_ms'].dropna()
print(f"Loaded {len(durations)} duration values")

fig, ax = plt.subplots(figsize=(10, 5))
sns.histplot(durations, bins=15, kde=True, color='#475569', ax=ax, edgecolor='black')
mean_val = float(durations.mean())
median_val = float(durations.median())
ax.axvline(mean_val, color='#dc2626', linestyle='--', linewidth=2, label=f'Mean Duration ({mean_val:.1f} ms)')
ax.axvline(median_val, color='#0284c7', linestyle=':', linewidth=2, label=f'Median Duration ({median_val:.1f} ms)')

ax.set_title('Execution Duration (duration_ms) Telemetry Latency Proxy Distribution', fontsize=13, fontweight='bold', pad=15)
ax.set_xlabel('Execution Duration (milliseconds)', fontsize=11)
ax.set_ylabel('Event Frequency (n=544)', fontsize=11)
ax.legend(loc='upper right', frameon=True, shadow=True)
plt.tight_layout()

for r in ['RUN_1', 'RUN_2', 'RUN_3']:
    target = os.path.join(ROOT_DIR, 'Output', r, 'duration_ms_proxy.png')
    plt.savefig(target, dpi=300)
    print(f"Saved: {target}")

plt.close(fig)
print("Done!")
