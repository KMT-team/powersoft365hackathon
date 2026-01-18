# 📘 Project Blueprint: Local RAG on Ryzen AI (Bluefin Edition)

**Version:** 1.0  
**Target Architecture:** AMD Ryzen AI 300 (Strix Point) + 32GB DDR5  
**OS Environment:** Bluefin Linux (Fedora Silverblue)

---

## 1. Hardware Specification & Strategy
We are treating your machine as an **Edge AI Server**. We utilize the "Unified Memory" architecture to load models directly into high-speed system RAM.

| Component | Specification | Role in System |
| :--- | :--- | :--- |
| **Compute** | **AMD Ryzen AI 300** | The "Brain." CPU (Zen 5) handles logic; iGPU/NPU handles inference. |
| **Memory** | **32GB LPDDR5x** | Shared pool. We allocate **~16GB** for AI models, leaving 16GB for the OS. |
| **Storage** | **NVMe SSD** | Hosting the Vector Database (ChromaDB) for fast retrieval. |
| **OS** | **Bluefin Linux** | Immutable Host for stability; Toolbox Containers for development. |

---

## 2. Architecture Overview
We use a **Hybrid Host/Container** approach to respect Bluefin's immutable file system.

### Layer 1: The Infrastructure (Host)
* **Service:** `ollama serve`
* **Location:** Running directly on the Host OS.
* **Why:** Direct access to AMD Kernel Drivers (ROCm/AVX-512) without container passthrough complexity.

### Layer 2: The Logic (Toolbox)
* **Service:** Python Script (`app.py`) + LangChain.
* **Location:** Inside a Fedora `toolbox` container.
* **Why:** Provides a mutable environment to install/break Python libraries without affecting the main OS.

### Connection
* The Toolbox talks to the Host via `localhost:11434` (Linux containers share the network stack).

---

## 3. Implementation Steps

### Phase 1: Infrastructure Setup (On Host)
*Run these commands in your standard terminal (Ptyxis).*

1.  **Install Ollama:**
    ```bash
    ujust ollama
    ```
    *Why: The `ujust` script automatically configures the correct AMD drivers for Bluefin.*

2.  **Performance Tuning (Service Config):**
    * **Goal:** Keep models loaded in RAM to utilize your 32GB capacity.
    * **Action:** Edit the service override.
    ```bash
    # Set Environment Variables
    Environment="OLLAMA_KEEP_ALIVE=60m"
    Environment="OLLAMA_NUM_PARALLEL=2"
    ```

3.  **Pull Models:**
    ```bash
    ollama pull llama3.2       # The Orchestrator (Router)
    ollama pull mistral        # The Worker (Reasoning)
    ollama pull nomic-embed-text # The Embedder (Vector)
    ```

### Phase 2: Development Environment (In Toolbox)
*Run these commands to prepare your workspace.*

1.  **Enter the Box:**
    ```bash
    toolbox create -y
    toolbox enter
    ```

2.  **Install Dependencies:**
    ```bash
    sudo dnf install python3 python3-pip gcc gcc-c++ -y
    pip install langchain langchain-community langchain-ollama chromadb
    ```

---

## 4. Source Code

Create these files inside your project folder (accessible from inside the Toolbox).

### File A: `setup_db.py` (The Indexer)
*Usage: Run this once to create/update your database.*

```python
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings

# 1. Load Data
# Ensure you have a 'private_data.txt' file in the same directory
loader = TextLoader("private_data.txt")
docs = loader.load()

# 2. Split
text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
splits = text_splitter.split_documents(docs)

# 3. Store (Connects to Host Ollama)
vectorstore = Chroma.from_documents(
    documents=splits,
    embedding=OllamaEmbeddings(model="nomic-embed-text"),
    persist_directory="./chroma_db"
)

print(f"Indexing complete. {len(splits)} chunks stored.")