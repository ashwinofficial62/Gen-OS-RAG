import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import os

def generate_visualizations(csv_file='final_output_diagnosis.csv'):
    if not os.path.exists(csv_file):
        print(f"Error: {csv_file} not found.")
        return

    print(f"Loading data from {csv_file}...")
    df = pd.read_csv(csv_file)
    
    # Set the overall visual style
    sns.set_theme(style="whitegrid")
    
    # 1. Bar Chart: Failures by Event Type
    if 'event_type' in df.columns:
        plt.figure(figsize=(10, 6))
        sns.countplot(data=df, x='event_type', order=df['event_type'].value_counts().index, palette='viridis')
        plt.title('Frequency of Failures by Event Type', fontsize=14, fontweight='bold')
        plt.xlabel('Event Type', fontsize=12)
        plt.ylabel('Number of Incidents', fontsize=12)
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.savefig('failures_by_event_type.png', dpi=300)
        print("Saved: failures_by_event_type.png")
        plt.close()

    # 2. Pie Chart: Severity Distribution
    if 'severity' in df.columns:
        plt.figure(figsize=(8, 8))
        severity_counts = df['severity'].value_counts()
        plt.pie(severity_counts, labels=severity_counts.index, autopct='%1.1f%%', 
                colors=sns.color_palette('pastel')[0:len(severity_counts)], 
                startangle=90, wedgeprops={'edgecolor': 'white'})
        plt.title('Distribution of Failure Severities', fontsize=14, fontweight='bold')
        plt.tight_layout()
        plt.savefig('severity_distribution.png', dpi=300)
        print("Saved: severity_distribution.png")
        plt.close()

    # 3. Time Series: Failures over Time
    if 'timestamp' in df.columns:
        plt.figure(figsize=(12, 5))
        # Convert to datetime and sort
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        time_df = df.sort_values('timestamp').set_index('timestamp')
        
        # Resample by hour/minute depending on the data spread. Let's use count per record for simplicity here
        time_df['incident_count'] = 1
        time_series = time_df['incident_count'].cumsum()
        
        plt.plot(time_series.index, time_series.values, marker='o', linestyle='-', color='#c23b22')
        plt.title('Cumulative Failures Over Time', fontsize=14, fontweight='bold')
        plt.xlabel('Timestamp', fontsize=12)
        plt.ylabel('Cumulative Incidents', fontsize=12)
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.savefig('failures_over_time.png', dpi=300)
        print("Saved: failures_over_time.png")
        plt.close()
        
    # 4. Bar Chart: Top Failing Files/Components
    if 'file' in df.columns:
        plt.figure(figsize=(10, 6))
        # Get top 5 files to avoid clutter
        top_files = df['file'].value_counts().nlargest(5)
        sns.barplot(x=top_files.values, y=top_files.index, palette='mako')
        plt.title('Top 5 Most Frequent Failing Files/Components', fontsize=14, fontweight='bold')
        plt.xlabel('Number of Incidents', fontsize=12)
        plt.ylabel('File/Component', fontsize=12)
        plt.tight_layout()
        plt.savefig('top_failing_components.png', dpi=300)
        print("Saved: top_failing_components.png")
        plt.close()

    print("\nVisualization generation complete! Check your folder for the .png files.")

if __name__ == "__main__":
    generate_visualizations()
