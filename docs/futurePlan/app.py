from langchain_ollama import OllamaLLM
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings

# --- CONFIG ---
# We connect to the Ollama instance running on the HOST
orchestrator = OllamaLLM(model="llama3.2")
worker = OllamaLLM(model="mistral")

# Load Database
vectorstore = Chroma(
    persist_directory="./chroma_db", 
    embedding_function=OllamaEmbeddings(model="nomic-embed-text")
)

def main():
    print("--- Bluefin RAG System Online ---")
    while True:
        query = input("\nUser: ")
        if query.lower() == "exit": break

        # 1. Orchestrator checks intent
        # (Simple keyword check for robustness, can be replaced with LLM router)
        if "search" in query.lower() or "data" in query.lower():
            print("   [Router]: Accessing Neural Database...")
            
            # 2. Retrieve Context
            docs = vectorstore.similarity_search(query, k=2)
            context = "\n".join([d.page_content for d in docs])
            
            # 3. Generate Answer
            prompt = f"Context: {context}\n\nQuestion: {query}\nAnswer:"
            response = worker.invoke(prompt)
        else:
            # General Chat
            response = orchestrator.invoke(query)

        print(f"AI: {response}")

if __name__ == "__main__":
    main()