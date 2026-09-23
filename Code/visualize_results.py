import os
import re
import argparse
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import seaborn as sns


def get_next_run_dir(base_output_dir):
    """
    Finds existing RUN_k folders inside base_output_dir and returns the next RUN_{k+1} directory.
    If none exist, returns RUN_1.
    """
    os.makedirs(base_output_dir, exist_ok=True)
    existing_runs = []
    
    for item in os.listdir(base_output_dir):
        item_path = os.path.join(base_output_dir, item)
        if os.path.isdir(item_path):
            match = re.match(r"^RUN_(\d+)$", item, re.IGNORECASE)
            if match:
                existing_runs.append(int(match.group(1)))
                
    next_idx = max(existing_runs) + 1 if existing_runs else 1
    next_run_dir = os.path.join(base_output_dir, f"RUN_{next_idx}")
    os.makedirs(next_run_dir, exist_ok=True)
    return next_run_dir, next_idx


def resolve_csv_file(csv_file):
    """
    Checks multiple potential candidate paths for final_output_diagnosis.csv
    or falls back to any dataset available.
    """
    if csv_file and os.path.exists(csv_file):
        return csv_file

    candidates = [
        os.path.join("Output", "final_output_diagnosis.csv"),
        os.path.join("..", "Output", "final_output_diagnosis.csv"),
        os.path.join("Data", "processed_events_analysis.csv"),
        os.path.join("..", "Data", "processed_events_analysis.csv"),
        os.path.join("Data", "aiops_logs.csv"),
        os.path.join("..", "Data", "aiops_logs.csv"),
    ]
    for cand in candidates:
        if os.path.exists(cand):
            return cand
    return None


def generate_visualizations(csv_file=None, output_dir=None):
    # Determine CSV file path
    csv_file = resolve_csv_file(csv_file)

    if not csv_file or not os.path.exists(csv_file):
        print(f"[!] Error: Target CSV file '{csv_file}' not found.")
        return

    # Determine Output Directory
    if output_dir is None:
        if os.path.basename(os.getcwd()) == "Code":
            base_output = os.path.join("..", "Output")
        else:
            base_output = "Output"
        target_dir, run_idx = get_next_run_dir(base_output)
    else:
        target_dir = output_dir
        os.makedirs(target_dir, exist_ok=True)
        run_idx = "Custom"

    print(f"[*] Loading data from: {csv_file}")
    print(f"[*] Target Output Directory: {target_dir} (Run #{run_idx})")
    
    df = pd.read_csv(csv_file)
    print(f"[*] Dataset records: {len(df)} rows, {len(df.columns)} columns")

    # Set premium aesthetic styling
    sns.set_theme(style="whitegrid", font="sans-serif")
    plt.rcParams.update({
        'font.size': 11,
        'axes.labelsize': 12,
        'axes.titlesize': 14,
        'xtick.labelsize': 10,
        'ytick.labelsize': 10,
        'legend.fontsize': 10,
        'figure.titlesize': 16
    })

    # 1. Bar Chart: Failures by Event Type with Data Labels and Value Badges
    if 'event_type' in df.columns:
        fig, ax = plt.subplots(figsize=(10, 6))
        event_counts = df['event_type'].value_counts()
        palette = sns.color_palette("crest", n_colors=len(event_counts))
        
        bars = sns.barplot(
            x=event_counts.index,
            y=event_counts.values,
            palette=palette,
            ax=ax,
            edgecolor='black',
            linewidth=0.8
        )
        
        total_failures = event_counts.sum()
        for bar in ax.patches:
            height = bar.get_height()
            percentage = (height / total_failures) * 100 if total_failures > 0 else 0
            ax.annotate(
                f'{int(height)}\n({percentage:.1f}%)',
                xy=(bar.get_x() + bar.get_width() / 2, height),
                xytext=(0, 6),
                textcoords="offset points",
                ha='center', va='bottom',
                fontsize=11, fontweight='bold',
                color='#1a202c'
            )

        ax.set_title('OS Failure Incidents by Event Type', fontsize=15, fontweight='bold', pad=15)
        ax.set_xlabel('Event / Failure Type', fontsize=12, labelpad=10)
        ax.set_ylabel('Number of Incidents', fontsize=12, labelpad=10)
        ax.yaxis.set_major_locator(ticker.MaxNLocator(integer=True))
        ax.set_ylim(0, max(event_counts.values) * 1.25)
        
        legend_handles = [
            plt.Rectangle((0, 0), 1, 1, color=palette[i], label=f"{evt} ({cnt})")
            for i, (evt, cnt) in enumerate(event_counts.items())
        ]
        ax.legend(handles=legend_handles, title="Event Category", frameon=True, loc='upper right', shadow=True)
        
        plt.xticks(rotation=20, ha='right')
        plt.tight_layout()
        out_path = os.path.join(target_dir, 'failures_by_event_type.png')
        plt.savefig(out_path, dpi=300)
        print(f"    [+] Saved: {out_path}")
        plt.close(fig)

    # 2. Modern Donut Chart: Severity Distribution with Values & Percentages
    if 'severity' in df.columns:
        fig, ax = plt.subplots(figsize=(9, 7))
        severity_counts = df['severity'].value_counts()
        total_sev = severity_counts.sum()
        
        color_map = {
            'CRITICAL': '#d9381e',
            'HIGH': '#e66101',
            'MEDIUM': '#fdb863',
            'LOW': '#2b83ba',
            'INFO': '#4dac26'
        }
        slice_colors = [color_map.get(str(s).upper(), sns.color_palette("Set2")[i % 8]) 
                        for i, s in enumerate(severity_counts.index)]

        def make_autopct(values):
            def my_autopct(pct):
                total = sum(values)
                val = int(round(pct * total / 100.0))
                return f'{pct:.1f}%\n({val} logs)'
            return my_autopct

        wedges, texts, autotexts = ax.pie(
            severity_counts,
            labels=severity_counts.index,
            autopct=make_autopct(severity_counts),
            startangle=140,
            colors=slice_colors,
            pctdistance=0.75,
            wedgeprops=dict(width=0.45, edgecolor='white', linewidth=2.5)
        )
        
        for autotext in autotexts:
            autotext.set_color('#111827')
            autotext.set_fontsize(10)
            autotext.set_fontweight('bold')
        for text in texts:
            text.set_fontsize(11)
            text.set_fontweight('semibold')

        ax.text(0, 0, f"Total\n{total_sev} Events", ha='center', va='center', fontsize=13, fontweight='bold', color='#374151')

        legend_labels = [f"{label}: {count} ({count/total_sev*100:.1f}%)" 
                         for label, count in zip(severity_counts.index, severity_counts.values)]
        ax.legend(wedges, legend_labels, title="Severity Breakdown", loc="center left", bbox_to_anchor=(1, 0, 0.5, 1), frameon=True)
        ax.set_title('OS Failure Severity Distribution', fontsize=15, fontweight='bold', pad=15)

        plt.tight_layout()
        out_path = os.path.join(target_dir, 'severity_distribution.png')
        plt.savefig(out_path, dpi=300)
        print(f"    [+] Saved: {out_path}")
        plt.close(fig)

    # 3. Time Series: Failures Over Time with Adaptive Sampling Annotations
    if 'timestamp' in df.columns:
        fig, ax = plt.subplots(figsize=(12, 6))
        time_df = df.copy()
        time_df['timestamp'] = pd.to_datetime(time_df['timestamp'])
        time_df = time_df.sort_values('timestamp').reset_index(drop=True)
        time_df['incident_count'] = 1
        time_df['cumulative_incidents'] = time_df['incident_count'].cumsum()

        ax.plot(
            time_df['timestamp'],
            time_df['cumulative_incidents'],
            marker='o' if len(time_df) <= 30 else None,
            markersize=5,
            linewidth=2.5,
            color='#b91c1c',
            label='Cumulative Failures'
        )
        ax.fill_between(
            time_df['timestamp'],
            time_df['cumulative_incidents'],
            color='#fee2e2',
            alpha=0.6,
            label='Failure Accumulation Area'
        )

        # Adaptively annotate points to avoid visual clutter
        step = max(1, len(time_df) // 10)
        annot_indices = list(range(0, len(time_df), step))
        if (len(time_df) - 1) not in annot_indices:
            annot_indices.append(len(time_df) - 1)

        for idx in annot_indices:
            row = time_df.iloc[idx]
            ax.annotate(
                f"#{int(row['cumulative_incidents'])}",
                xy=(row['timestamp'], row['cumulative_incidents']),
                xytext=(0, 8),
                textcoords="offset points",
                ha='center',
                fontsize=9,
                fontweight='bold',
                color='#7f1d1d'
            )

        ax.set_title('System Failure Progression Over Time', fontsize=15, fontweight='bold', pad=15)
        ax.set_xlabel('Timestamp (UTC)', fontsize=12, labelpad=10)
        ax.set_ylabel('Total Cumulative Incidents', fontsize=12, labelpad=10)
        ax.yaxis.set_major_locator(ticker.MaxNLocator(integer=True))
        
        fig.autofmt_xdate(rotation=30)
        ax.legend(loc='upper left', frameon=True, shadow=True)
        ax.grid(True, linestyle='--', alpha=0.6)

        plt.tight_layout()
        out_path = os.path.join(target_dir, 'failures_over_time.png')
        plt.savefig(out_path, dpi=300)
        print(f"    [+] Saved: {out_path}")
        plt.close(fig)

    # 4. Horizontal Bar Chart: Top Failing Files / OS Components
    file_col = 'file' if 'file' in df.columns else None
    if file_col:
        fig, ax = plt.subplots(figsize=(11, 6))
        # Fill missing file values with category/event fallback for visualization clarity
        resolved_files = df['file'].fillna("system_framework/app.py").astype(str)
        top_files = resolved_files.value_counts().nlargest(8)
        
        palette = sns.color_palette("flare", n_colors=len(top_files))
        bars = sns.barplot(
            x=top_files.values,
            y=top_files.index,
            palette=palette,
            ax=ax,
            edgecolor='black',
            linewidth=0.8
        )

        total_file_failures = len(df)
        for bar in ax.patches:
            width = bar.get_width()
            y_pos = bar.get_y() + bar.get_height() / 2
            pct = (width / total_file_failures) * 100 if total_file_failures > 0 else 0
            ax.annotate(
                f' {int(width)} incidents ({pct:.1f}%)',
                xy=(width, y_pos),
                xytext=(5, 0),
                textcoords="offset points",
                ha='left', va='center',
                fontsize=10, fontweight='bold',
                color='#1f2937'
            )

        ax.set_title('Top Failing Modules / Source Files', fontsize=15, fontweight='bold', pad=15)
        ax.set_xlabel('Failure Frequency (Count)', fontsize=12, labelpad=10)
        ax.set_ylabel('Source File / OS Component', fontsize=12, labelpad=10)
        ax.xaxis.set_major_locator(ticker.MaxNLocator(integer=True))
        ax.set_xlim(0, max(top_files.values) * 1.35)

        legend_handles = [
            plt.Rectangle((0, 0), 1, 1, color=palette[i], label=f"{name}")
            for i, name in enumerate(top_files.index)
        ]
        ax.legend(handles=legend_handles, title="Identified Modules", loc='lower right', frameon=True, shadow=True)

        plt.tight_layout()
        out_path = os.path.join(target_dir, 'top_failing_components.png')
        plt.savefig(out_path, dpi=300)
        print(f"    [+] Saved: {out_path}")
        plt.close(fig)

    # 5. NEW: Conformal Epistemic Uncertainty & Topological Retrieval Distance Plot
    if 'conformal_retrieval_distance' in df.columns:
        fig, ax = plt.subplots(figsize=(10, 5))
        dists = df['conformal_retrieval_distance'].dropna()
        sns.histplot(dists, bins=15, kde=True, color="#0284c7", ax=ax, edgecolor="black")
        
        mean_dist = dists.mean()
        ax.axvline(mean_dist, color='#dc2626', linestyle='--', linewidth=2, label=f'Mean Distance ({mean_dist:.3f})')
        ax.axvline(0.85, color='#ca8a04', linestyle=':', linewidth=2, label='Conformal Bound (tau=0.85)')
        
        ax.set_title('Conformal Epistemic Uncertainty & Topological Distance Distribution', fontsize=14, fontweight='bold', pad=15)
        ax.set_xlabel('Topological Vector Retrieval Distance (0 = Identical, 1 = Max Divergence)', fontsize=11)
        ax.set_ylabel('Incident Count', fontsize=11)
        ax.legend(loc='upper right', frameon=True, shadow=True)
        
        plt.tight_layout()
        out_path = os.path.join(target_dir, 'conformal_distance_distribution.png')
        plt.savefig(out_path, dpi=300)
        print(f"    [+] Saved: {out_path}")
        plt.close(fig)

    # 6. NEW: Inter-Event Latency Delta (Delta-t) & Temporal Burst Intensity Plot
    if 'timestamp' in df.columns and len(df) > 1:
        fig, ax = plt.subplots(figsize=(11, 5))
        ts_sorted = pd.to_datetime(df['timestamp']).sort_values().reset_index(drop=True)
        deltas_sec = ts_sorted.diff().dt.total_seconds().dropna()
        # Clip extreme outliers for visual clarity
        deltas_clipped = np.clip(deltas_sec, 0, 120)
        
        sns.histplot(deltas_clipped, bins=20, color="#10b981", ax=ax, edgecolor="black")
        ax.set_title('Continuous Inter-Event Latency Delta (Delta-T) Distribution', fontsize=14, fontweight='bold', pad=15)
        ax.set_xlabel('Inter-Event Delta-T (Seconds between Consecutive Failures)', fontsize=11)
        ax.set_ylabel('Frequency of Burst Transitions', fontsize=11)
        ax.grid(True, linestyle='--', alpha=0.5)

        plt.tight_layout()
        out_path = os.path.join(target_dir, 'inter_event_deltat_distribution.png')
        plt.savefig(out_path, dpi=300)
        print(f"    [+] Saved: {out_path}")
        plt.close(fig)

    print(f"\n[+] Visualizations successfully generated in: '{target_dir}'")
    return target_dir


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="GenOS Telemetry Visualization Generator")
    parser.add_argument("--csv", type=str, default=None, help="Path to input CSV file")
    parser.add_argument("--out", type=str, default=None, help="Explicit output directory path")
    args = parser.parse_args()

    generate_visualizations(csv_file=args.csv, output_dir=args.out)
