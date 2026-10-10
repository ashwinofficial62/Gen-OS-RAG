import pandas as pd
import numpy as np

proc = pd.read_csv('Data/processed_events_analysis.csv')
diag = pd.read_csv('Output/final_output_diagnosis.csv')
aiops = pd.read_csv('Data/aiops_logs.csv')

print(f"aiops_logs shape: {aiops.shape}")
print(f"processed_events shape: {proc.shape}")
print(f"final_output shape: {diag.shape}")

print("\n--- STATUS COUNTS IN PROCESSED_EVENTS ---")
print(proc['status'].value_counts())

print("\n--- EVENT TYPE IN DIAGNOSIS ---")
print(diag['event_type'].value_counts())

print("\n--- SEVERITY IN DIAGNOSIS ---")
print(diag['severity'].value_counts())

print("\n--- SAFETY VERIFICATION IN DIAGNOSIS ---")
print(diag['safety_verification'].value_counts())

print("\n--- CONFORMAL DISTANCE STATS ---")
desc = diag['conformal_retrieval_distance'].describe()
print(desc)
ood_count = (diag['conformal_retrieval_distance'] > 0.85).sum()
print(f"OOD count (> 0.85): {ood_count} ({ood_count/len(diag)*100:.2f}%)")
print(f"Median conformal distance: {diag['conformal_retrieval_distance'].median():.4f}")

print("\n--- FILES / MODULES IN DIAGNOSIS ---")
print(diag['file'].value_counts(dropna=False).head(10))

print("\n--- HOSTS IN DIAGNOSIS ---")
print(diag['hostname'].value_counts(dropna=False))

print("\n--- CHECK FOR RESOURCE METRICS IN RAW DATA ---")
cols_with_metric = [c for c in proc.columns if any(k in c.lower() for k in ['cpu', 'mem', 'ram', 'io', 'load', 'net', 'disk', 'bytes', 'latency', 'duration'])]
print(f"Potential metric columns: {cols_with_metric}")
print(proc[cols_with_metric].describe())

print("\n--- TIME & DELTA T ANALYSIS ---")
ts_sorted = pd.to_datetime(diag['timestamp']).sort_values().reset_index(drop=True)
deltas = ts_sorted.diff().dt.total_seconds().dropna()
print(f"Delta-t count: {len(deltas)}")
print(f"Delta-t < 2.0s: {(deltas < 2.0).sum()} ({(deltas < 2.0).mean()*100:.2f}%)")
print(f"Delta-t min: {deltas.min()}, median: {deltas.median()}, p90: {deltas.quantile(0.90)}, max: {deltas.max()}")
