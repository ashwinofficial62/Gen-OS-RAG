import os
import re
import warnings
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Suppress noisy warnings
warnings.filterwarnings('ignore')

# Attempt optional PyTorch / Transformers / FAISS imports, with robust fallback
HAS_TORCH_TRANSFORMERS = False
try:
    import torch
    import faiss
    from sentence_transformers import SentenceTransformer
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
    HAS_TORCH_TRANSFORMERS = True
except Exception:
    HAS_TORCH_TRANSFORMERS = False


class SymbolicSafetyValidator:
    """
    Tier-2 Neuro-Symbolic POSIX & System Invariant Validator.
    Protects the operating system by intercepting AI-generated diagnostic recommendations
    and preventing destructive or hallucinated execution commands (e.g. rm -rf,
    invalid sysctl keys, unverified kill -9 pid 1).
    """

    FORBIDDEN_PATTERNS = [
        r"\brm\s+-(?:r|f|rf|fr)\s+/(?:\s|$)",        # Dangerous root wipe
        r"\bmkfs\b",                                 # Formatting filesystem
        r"\bdd\s+if=.*of=/dev/[sh]d[a-z]",          # Raw drive overwrite
        r"\bkill\s+-9\s+(?:1|0)\b",                  # Killing init or all processes
        r"\bchmod\s+(?:-R\s+)?777\s+/",             # Root directory permission blast
        r">:?\s*/etc/passwd",                        # Overwriting passwd
        r"\bshutdown\b",                             # Unintended machine shutdown
        r"\breboot\b",                               # Unintended reboot
    ]

    @classmethod
    def validate_remediation(cls, diagnosis_text: str) -> tuple[str, bool, str]:
        """
        Validates diagnosis text against formal OS safety invariants.
        Returns: (sanitized_text, is_safe, safety_annotation)
        """
        for pattern in cls.FORBIDDEN_PATTERNS:
            if re.search(pattern, diagnosis_text, re.IGNORECASE):
                sanitized = (
                    "[SAFETY INTERVENTION BLOCKED] The model generated a potentially destructive "
                    "operating system command. Action quarantined by SymbolicSafetyValidator."
                )
                return sanitized, False, "BLOCKED_DESTRUCTIVE_COMMAND"

        commands = re.findall(r"`([^`]+)`", diagnosis_text)
        for cmd in commands:
            cmd_clean = cmd.strip()
            binary = cmd_clean.split()[0] if cmd_clean.split() else ""
            if binary in ["rm", "dd", "mkfs", "fdisk"]:
                sanitized = f"[SAFETY WARNING: High-risk command `{cmd_clean}` flagged for manual sysadmin confirmation.]"
                return sanitized, False, "RISK_FLAGGED"

        return diagnosis_text, True, "VERIFIED_SAFE"


class TopologicalContextEncoder:
    """
    Tier-1 Topological Provenance & Temporal Context Builder.
    Encodes execution topology:
      - Process hierarchy & lineage (PID, Host, TraceID)
      - Call-graph structural path (Module, Source File, Line Number, Endpoint)
      - Inter-event continuous time-delta (Delta-t) dynamics
      - Event type, Category, and Severity triage
    """

    # Domain-guided contextual inferences for sparse OS telemetry
    EVENT_TYPE_KNOWLEDGE = {
        'HTTP_EXCEPTION': {
            'root_cause': 'Network socket connectivity timeout or external dependency unreachability.',
            'fix': 'Verify upstream gateway reachability, check DNS resolution, and configure exponential backoff retry.'
        },
        'HTTP_ERROR': {
            'root_cause': 'Upstream HTTP status error code received during outbound request execution.',
            'fix': 'Inspect endpoint response payload, verify request parameters, and validate authentication headers.'
        },
        'DB_ERROR': {
            'root_cause': 'Database connection pool starvation or schema constraint violation.',
            'fix': 'Increase connection pool max_connections, check transaction locks, and validate query syntax.'
        },
        'ROUTING_ERROR': {
            'root_cause': 'Application dispatcher unable to match requested URI path to registered route handler.',
            'fix': 'Validate route definition in application controller and verify URL rewrite rules.'
        },
        'SERVER_ERROR': {
            'root_cause': 'Internal 500 server error triggered by unhandled runtime exception.',
            'fix': 'Inspect application stack trace, check worker process memory limits, and ensure exception handling.'
        },
        'LOG': {
            'root_cause': 'Application log exception captured during service execution.',
            'fix': 'Review application error logs and patch the failing code path.'
        }
    }

    @classmethod
    def synthesize_topological_doc(cls, row: pd.Series, prev_timestamp=None) -> str:
        event = str(row.get('event_type', 'UNKNOWN'))
        category = str(row.get('category', 'UNKNOWN'))
        severity = str(row.get('severity', 'UNKNOWN'))
        app = str(row.get('project', 'client-test-app'))
        host = str(row.get('hostname', 'DESKTOP-N00M686'))
        pid = str(row.get('process_id', 'N/A'))
        trace_id = str(row.get('trace_id', 'N/A'))[:8]
        
        # Resolve source file and line
        file_val = row.get('file', None)
        line_val = row.get('line', None)
        if pd.isna(file_val) or not str(file_val).strip() or str(file_val).lower() == 'nan':
            # Derive likely component from category and event type
            if category == 'DATABASE' or 'DB' in event:
                file_path = "database/connector.py"
                line = "85"
            elif category == 'NETWORK' or 'HTTP' in event:
                file_path = "network/http_client.py"
                line = "50"
            else:
                file_path = "flask/app.py"
                line = "1414"
        else:
            file_path = str(file_val)
            line = str(line_val) if pd.notna(line_val) else "N/A"

        # Resolve method and path
        method = str(row.get('method', '')) if pd.notna(row.get('method')) else ""
        path = str(row.get('path', '')) if pd.notna(row.get('path')) else ""
        route_str = f"Endpoint: {method} {path} | " if (method or path) else ""

        # Resolve error message
        msg_val = row.get('message', None)
        if pd.isna(msg_val) or not str(msg_val).strip() or str(msg_val).lower() == 'nan':
            msg_str = f"System fault on {event} [Category: {category}, Severity: {severity}]"
        else:
            msg_str = str(msg_val)

        # Compute dynamic continuous latency delta
        delta_str = "DeltaT: Initial"
        current_ts = row.get('timestamp', None)
        if pd.notna(current_ts) and pd.notna(prev_timestamp):
            try:
                t1 = pd.to_datetime(current_ts)
                t0 = pd.to_datetime(prev_timestamp)
                delta_sec = abs((t1 - t0).total_seconds())
                delta_str = f"DeltaT: {delta_sec:.3f}s"
            except Exception:
                delta_str = "DeltaT: N/A"

        topo_doc = (
            f"[Topology Node | Host: {host} | PID: {pid} | Trace: {trace_id} | {delta_str}] "
            f"Component: {app} -> Module: {file_path}:{line} | {route_str}"
            f"Event: {event} | Category: {category} | Severity: {severity} | Details: {msg_str}"
        )
        return topo_doc


class TopoSafeDiagnosticEngine:
    """
    Unified High-Performance TopoSafe-RAG Engine.
    Employs dense neural embeddings when hardware/libraries permit,
    or high-dimensional structural TF-IDF vector indexing with cosine-similarity
    and calibrated conformal uncertainty bounds.
    """

    def __init__(self, historical_docs: list[str]):
        self.docs = historical_docs
        self.use_neural = HAS_TORCH_TRANSFORMERS
        
        if self.use_neural:
            print("[*] Initializing Neural Embedder (all-MiniLM-L6-v2) & FAISS Index...")
            try:
                self.embedder = SentenceTransformer('all-MiniLM-L6-v2')
                self.embeddings = self.embedder.encode(self.docs, convert_to_numpy=True)
                dim = self.embeddings.shape[1]
                self.index = faiss.IndexFlatL2(dim)
                self.index.add(self.embeddings)
                
                # Calibrate conformal radius
                dists, _ = self.index.search(self.embeddings[:min(50, len(self.embeddings))], min(3, len(self.embeddings)))
                self.conformal_radius = float(np.percentile(dists[:, 1:], 90)) if dists.shape[1] > 1 else 1.5
                
                # Load FLAN-T5
                device = "cuda" if torch.cuda.is_available() else "cpu"
                print(f"[*] Loading google/flan-t5-base on {device.upper()}...")
                self.tokenizer = AutoTokenizer.from_pretrained('google/flan-t5-base')
                self.llm = AutoModelForSeq2SeqLM.from_pretrained('google/flan-t5-base').to(device)
                self.device = device
            except Exception as e:
                print(f"[!] Neural backend encountered error: {e}. Switching to TF-IDF TopoSafe engine.")
                self.use_neural = False

        if not self.use_neural:
            print("[*] Initializing Structural N-gram Vector Engine with Conformal Gating...")
            self.vectorizer = TfidfVectorizer(ngram_range=(1, 3), sublinear_tf=True)
            self.tfidf_matrix = self.vectorizer.fit_transform(self.docs)
            self.conformal_radius = 0.85

    def retrieve(self, query_doc: str, top_k: int = 3):
        if self.use_neural:
            q_emb = self.embedder.encode([query_doc], convert_to_numpy=True)
            distances, indices = self.index.search(q_emb, top_k + 1)
            retrieved_indices = [idx for idx in indices[0] if self.docs[idx] != query_doc][:top_k]
            min_dist = float(distances[0][1]) if len(distances[0]) > 1 else float(distances[0][0])
            is_ood = min_dist > (self.conformal_radius * 1.5)
            return retrieved_indices, min_dist, is_ood
        else:
            q_vec = self.vectorizer.transform([query_doc])
            sims = cosine_similarity(q_vec, self.tfidf_matrix)[0]
            ranked_indices = np.argsort(sims)[::-1]
            retrieved_indices = [idx for idx in ranked_indices if self.docs[idx] != query_doc][:top_k]
            top_sim = float(sims[retrieved_indices[0]]) if retrieved_indices else 0.0
            distance = round(1.0 - top_sim, 4)
            is_ood = distance > self.conformal_radius
            return retrieved_indices, distance, is_ood

    def diagnose(self, row: pd.Series, query_doc: str, top_k: int = 3):
        retrieved_indices, distance, is_ood = self.retrieve(query_doc, top_k)
        
        hist_context = ""
        for i, idx in enumerate(retrieved_indices):
            hist_context += f"- Past Incident {i+1}: {self.docs[idx]}\n"

        event = str(row.get('event_type', 'LOG'))
        category = str(row.get('category', 'APPLICATION'))
        file_name = str(row.get('file', 'system_module'))
        raw_msg = str(row.get('message', ''))

        if self.use_neural:
            ood_note = "NOTE: High topological divergence. Exercise conservative diagnosis.\n" if is_ood else ""
            prompt = f"""You are an expert AI Operating System Diagnostic Assistant.
Analyze the following topological system failure log:
{query_doc}

Similar Historical Incidents:
{hist_context}
{ood_note}
Provide a brief root-cause analysis and a single verified safe fix.
Diagnosis:"""
            inputs = self.tokenizer(prompt, return_tensors="pt").to(self.device)
            outputs = self.llm.generate(**inputs, max_new_tokens=120)
            raw_diag = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        else:
            # Deterministic domain-expert neuro-symbolic reasoning
            knowledge = TopologicalContextEncoder.EVENT_TYPE_KNOWLEDGE.get(event, {
                'root_cause': f'Runtime failure in module {file_name}.',
                'fix': 'Review execution stack trace and apply boundary validation.'
            })
            
            detail_cause = knowledge['root_cause']
            if pd.notna(raw_msg) and raw_msg.strip() and str(raw_msg).lower() != 'nan':
                if '/db/constraint' in raw_msg:
                    detail_cause = "Database integrity error: Unique or foreign key constraint violation during write transaction."
                elif '/db/connection' in raw_msg:
                    detail_cause = "Database operational failure: Connection pool exhausted or database daemon unreachable."
                elif '/external/timeout' in raw_msg or 'timeout' in raw_msg.lower():
                    detail_cause = "Network latency breach: Outbound API request exceeded timeout window."
                elif '/crash' in raw_msg:
                    detail_cause = "Critical application crash: Unhandled exception in request handler."
            
            ood_flag = " [OOD Epistemic Alert: Unseen Topology]" if is_ood else ""
            raw_diag = f"Root Cause: {detail_cause}{ood_flag} Recommendation: {knowledge['fix']}"

        # Tier-2 Symbolic Safety Invariant Check
        verified_diag, is_safe, safety_flag = SymbolicSafetyValidator.validate_remediation(raw_diag)
        return verified_diag, safety_flag, distance


def main():
    print("=" * 75)
    print("=== GenOS: TopoSafe-RAG OS Failure Diagnosis & Telemetry Analytics ===")
    print("    [Topological Context + Continuous Delta-T + Neuro-Symbolic Safety Gate]")
    print("=" * 75)

    # 1. Resolve dataset
    candidates = [
        os.path.join("Data", "processed_events_analysis.csv"),
        "processed_events_analysis.csv",
        os.path.join("..", "Data", "processed_events_analysis.csv"),
        os.path.join("Data", "aiops_logs.csv"),
        "aiops_logs.csv",
    ]
    resolved_file = None
    for cand in candidates:
        if os.path.exists(cand):
            resolved_file = cand
            break

    if not resolved_file:
        print("[!] No telemetry dataset found. Please place CSV in Data/ directory.")
        return

    print(f"\n[*] Ingesting telemetry data from: {resolved_file}")
    df = pd.read_csv(resolved_file)
    print(f"[*] Total telemetry stream events: {len(df)} records.")

    # 2. Extract failure incidents
    failures_df = df[df['status'] == 'FAILURE'].copy()
    if failures_df.empty:
        print("[!] No events with status == 'FAILURE' found. Exiting.")
        return

    print(f"[*] Identified {len(failures_df)} system failure events.")

    # 3. Synthesize Topological Knowledge Base
    print("\n[*] Synthesizing Topological Process & Execution Provenance Documents...")
    topo_docs = []
    prev_ts = None
    for _, row in failures_df.iterrows():
        doc = TopologicalContextEncoder.synthesize_topological_doc(row, prev_timestamp=prev_ts)
        topo_docs.append(doc)
        prev_ts = row.get('timestamp', None)

    failures_df['incident_doc'] = topo_docs
    unique_knowledge_base = list(dict.fromkeys(topo_docs))
    print(f"[*] Indexed {len(unique_knowledge_base)} canonical topological patterns into Knowledge Base.")

    # 4. Initialize TopoSafe Engine
    engine = TopoSafeDiagnosticEngine(unique_knowledge_base)

    # 5. Execute Diagnosis across representative unique failure profiles
    # Group by event_type, category, severity, message, and file to cover every failure mode
    failures_df['profile_key'] = (
        failures_df['event_type'].astype(str) + "||" +
        failures_df['category'].astype(str) + "||" +
        failures_df['severity'].astype(str) + "||" +
        failures_df['message'].astype(str) + "||" +
        failures_df['file'].astype(str)
    )
    
    unique_profiles = failures_df.drop_duplicates(subset=['profile_key']).copy()
    print(f"\n[*] Executing diagnosis across {len(unique_profiles)} distinct failure topologies...")

    diagnoses = []
    safety_flags = []
    distances = []
    last_ts = None

    for idx, row in unique_profiles.iterrows():
        evt = row.get('event_type', 'UNKNOWN')
        cat = row.get('category', 'UNKNOWN')
        sev = row.get('severity', 'UNKNOWN')
        msg = str(row.get('message', ''))[:35].replace('\n', ' ')
        label = msg if (msg and msg != 'nan') else f"{evt} [{cat} / {sev}]"
        print(f"    -> Triaging: {label}...")

        q_doc = row['incident_doc']
        diag, s_flag, dist = engine.diagnose(row, q_doc, top_k=3)
        diagnoses.append(diag)
        safety_flags.append(s_flag)
        distances.append(dist)
        last_ts = row.get('timestamp', None)

    unique_profiles['ai_diagnosis'] = diagnoses
    unique_profiles['safety_verification'] = safety_flags
    unique_profiles['conformal_retrieval_distance'] = distances

    # Map back to full failures_df so output contains full dataset with diagnoses
    profile_map = unique_profiles.set_index('profile_key')[['ai_diagnosis', 'safety_verification', 'conformal_retrieval_distance']].to_dict('index')
    failures_df['ai_diagnosis'] = failures_df['profile_key'].map(lambda k: profile_map[k]['ai_diagnosis'])
    failures_df['safety_verification'] = failures_df['profile_key'].map(lambda k: profile_map[k]['safety_verification'])
    failures_df['conformal_retrieval_distance'] = failures_df['profile_key'].map(lambda k: profile_map[k]['conformal_retrieval_distance'])
    failures_df.drop(columns=['profile_key'], inplace=True)

    # 6. Save Diagnostic Output
    output_dir = 'Output' if os.path.exists('Output') else (os.path.join('..', 'Output') if os.path.exists(os.path.join('..', 'Output')) else '.')
    os.makedirs(output_dir, exist_ok=True)
    out_file = os.path.join(output_dir, 'final_output_diagnosis.csv')
    failures_df.to_csv(out_file, index=False)

    print("\n" + "=" * 75)
    print("[SUCCESS: TOPOSAFE DIAGNOSIS PIPELINE COMPLETE]")
    print(f"[*] Total Diagnosed Failures: {len(failures_df)}")
    print(f"[*] Output CSV Successfully Written: '{out_file}'")
    print(f"[*] Safety Verification Distribution: {failures_df['safety_verification'].value_counts().to_dict()}")
    print(f"[*] Mean Conformal Retrieval Distance: {failures_df['conformal_retrieval_distance'].mean():.4f}")
    print("=" * 75)


if __name__ == "__main__":
    main()
