import os
import pandas as pd
import numpy as np
# pyrefly: ignore [missing-import]
import faiss
from sentence_transformers import SentenceTransformer
from transformers import pipeline
import warnings

# Suppress some noisy warnings from transformers
warnings.filterwarnings('ignore')

def main():
    print("=== GenOS: RAG-Based OS Failure Diagnosis ===")
    
    file_path = 'aiops_logs.csv'
    
    if not os.path.exists(file_path):
        print(f"[!] Error: {file_path} not found in the current directory.")
        print("Please ensure your dataset is named 'aiops_logs.csv' and placed here.")
        
        # Let's create a tiny sample if it's missing just so the code doesn't crash
        print("[*] Creating a small sample dataset so you can test the pipeline...")
        sample_data = """received_at,environment,project,event_count,schema_version,sdk_version,event_type,category,severity,status,timestamp,hostname,os,os_version,python_version,region,app_version,instance_id,process_id,trace_id,message,file,line,logger_name,level,method,path,status_code,duration_ms,hour,date,day_of_week,month,week,day
2026-02-20T13:00:53.883351,production,client-test-app,2,1.0,2.0.0,LOG,APPLICATION,HIGH,FAILURE,2026-02-20 13:00:52.589492+00:00,DESKTOP-N00M686,Windows,11,3.12.2,unknown,1.0.0,8ed293ae,17980,a383f114,This is a test error log,client_app.py,129.0,root,ERROR,,,,,13,2026-02-20,Friday,2,8,20
2026-02-20T13:04:48.940264,production,client-test-app,3,1.0,2.0.0,LOG,APPLICATION,HIGH,FAILURE,2026-02-20 13:04:48.808745+00:00,DESKTOP-N00M686,Windows,11,3.12.2,unknown,1.0.0,8ed293ae,17980,782e67af,Exception on /crash [GET],flask/app.py,1414.0,client_app,ERROR,,,,,13,2026-02-20,Friday,2,8,20
2026-02-20T13:36:16.734755,production,client-test-app,15,1.0,2.0.0,HTTP_EXCEPTION,NETWORK,HIGH,FAILURE,2026-02-20 13:35:56.530359+00:00,DESKTOP-N00M686,Windows,11,3.12.2,unknown,1.0.0,8ed293ae,17896,9fd789b0,Connection timeout to external API,network.py,50.0,requests,ERROR,,,,,13,2026-02-20,Friday,2,8,20
2026-02-20T13:37:43.229051,production,client-test-app,6,1.0,2.0.0,DB_ERROR,DATABASE,LOW,FAILURE,2026-02-20 13:37:38.523921+00:00,DESKTOP-N00M686,Windows,11,3.12.2,unknown,1.0.0,8ed293ae,17896,910ca7ba,Exception on /db/constraint [GET],flask/app.py,1414.0,client_app2,ERROR,,,,,13,2026-02-20,Friday,2,8,20
"""
        with open(file_path, "w") as f:
            f.write(sample_data)

    print(f"\n[*] Loading dataset from {file_path}...")
    df = pd.read_csv(file_path)

    # Filter for failed events to build our historical failure knowledge base
    failures_df = df[df['status'] == 'FAILURE'].copy()

    if failures_df.empty:
        print("[!] No 'FAILURE' status events found in the dataset. Exiting.")
        return

    # Fill NaNs in text columns
    text_cols = ['event_type', 'message', 'file', 'logger_name', 'method', 'path']
    for col in text_cols:
        if col in failures_df.columns:
            failures_df[col] = failures_df[col].fillna("Unknown")

    # Create a rich text document for each incident
    failures_df['incident_doc'] = failures_df.apply(
        lambda row: f"Event: {row['event_type']} | App: {row['project']} | File: {row['file']}:{row.get('line', 'N/A')} | Path: {row.get('method', '')} {row.get('path', '')} | Error: {row['message']}", 
        axis=1
    )

    docs = failures_df['incident_doc'].tolist()
    print(f"[*] Found {len(docs)} historical failures for the knowledge base.")

    # Generate Embeddings and Build Vector DB
    print("\n[*] Loading Embedding Model (all-MiniLM-L6-v2)...")
    embedder = SentenceTransformer('all-MiniLM-L6-v2')

    print("[*] Generating Embeddings for historical logs...")
    embeddings = embedder.encode(docs, convert_to_numpy=True)

    print("[*] Building FAISS Index...")
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)
    print(f"    -> FAISS index built successfully with {index.ntotal} vectors.")

    # Initialize LLM
    print("\n[*] Loading LLM (google/flan-t5-base) for Diagnosis...")
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
    import torch
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[*] Executing on: {device.upper()}")
    tokenizer = AutoTokenizer.from_pretrained('google/flan-t5-base')
    llm_model = AutoModelForSeq2SeqLM.from_pretrained('google/flan-t5-base').to(device)

    def diagnose_failure_rag(new_log_entry, top_k=3):
        query_doc = f"Event: {new_log_entry.get('event_type', 'Unknown')} | App: {new_log_entry.get('project', 'Unknown')} | File: {new_log_entry.get('file', 'Unknown')}:{new_log_entry.get('line', 'Unknown')} | Path: {new_log_entry.get('method', 'Unknown')} {new_log_entry.get('path', 'Unknown')} | Error: {new_log_entry.get('message', 'Unknown')}"
        
        query_emb = embedder.encode([query_doc], convert_to_numpy=True)
        distances, indices = index.search(query_emb, top_k + 1)
        
        historical_context = ""
        retrieved_count = 0
        for idx in indices[0]:
            if docs[idx] == query_doc:
                continue
            if retrieved_count < top_k:
                historical_context += f"- Past Incident {retrieved_count+1}: {docs[idx]}\n"
                retrieved_count += 1
                
        prompt = f"""You are an expert AI Operating System Diagnostic Assistant.
Analyze the following new system failure log.

New Failure Log:
{query_doc}

Here are similar historical incidents from the system for context:
{historical_context}

Based on the new failure and the historical context, provide a brief root-cause analysis and a single recommendation to fix it.

Diagnosis:"""
        
        # Generate Diagnosis
        inputs = tokenizer(prompt, return_tensors="pt").to(device)
        outputs = llm_model.generate(**inputs, max_new_tokens=150)
        return tokenizer.decode(outputs[0], skip_special_tokens=True)

    # Generate Final Output Data
    print("\n" + "="*50)
    print("GENERATING FINAL DIAGNOSES FOR FAILURES")
    print("="*50)
    
    # To save time and avoid redundancy, let's pick the unique error messages
    test_logs = failures_df.drop_duplicates(subset=['message']).copy()
    print(f"[*] Processing {len(test_logs)} unique failure logs...")
    
    diagnoses = []
    for idx, row in test_logs.iterrows():
        # Clean up the output string to not clutter the console
        msg_preview = str(row['message'])[:50].replace('\n', ' ')
        print(f"    -> Diagnosing: {msg_preview}...")
        
        diagnosis = diagnose_failure_rag(row, top_k=3)
        diagnoses.append(diagnosis)
        
    test_logs['ai_diagnosis'] = diagnoses
    
    # Save to CSV
    output_file = 'final_output_diagnosis.csv'
    test_logs.to_csv(output_file, index=False)

    print(f"\n[AI DIAGNOSIS COMPLETE]")
    print(f"[*] Successfully saved {len(test_logs)} diagnoses to '{output_file}'\n")
    print("="*50)
    print("Pipeline Execution Complete!")

if __name__ == "__main__":
    main()
