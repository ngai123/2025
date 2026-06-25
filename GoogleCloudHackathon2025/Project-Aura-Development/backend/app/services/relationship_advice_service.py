"""
File: relationship_advice_service.py
Author: Christian Lew
Date: November 20, 2025
Description: RAG-based relationship advice service using LangChain and Google AI.
"""

import os
from pathlib import Path
from typing import List, Optional
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import PyPDFLoader
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate


class RelationshipAdviceService:
    """
    Service for providing relationship advice using RAG (Retrieval-Augmented Generation).

    This service:
    1. Loads relationship books from PDF files
    2. Splits them into chunks
    3. Creates embeddings and stores them in FAISS
    4. Provides a query interface to get advice based on user questions
    """

    def __init__(self, google_api_key: Optional[str] = None):
        """
        Initialize the Relationship Advice Service.

        Args:
            google_api_key: Google AI API key. If not provided, will try to get from environment.
        """
        # Check for API key in order: parameter, GOOGLE_API_KEY env, GEMINI_API_KEY env
        self.api_key = google_api_key or os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY or GEMINI_API_KEY must be provided or set in environment variables")

        # Set up paths
        self.base_dir = Path(__file__).parent.parent.parent
        self.data_dir = self.base_dir / "data" / "relationship_books"
        self.vector_store_path = self.base_dir / "vector_store" / "faiss_index"

        # Initialize embeddings - Using local open-source model (no API calls!)
        print("[RAG Service] Initializing local embedding model (first time may download ~100MB)...")
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={'device': 'cpu'},
            encode_kwargs={'normalize_embeddings': True}
        )
        print("[RAG Service] Local embedding model ready!")

        # Initialize LLM - Using Google Gemini for text generation
        # Using gemini-1.5-flash (available on free tier, fast and capable)
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=self.api_key,
            temperature=0.7,
            max_output_tokens=2048
        )

        self.vector_store = None
        self.qa_chain = None

        # Initialize or load vector store
        self._initialize_vector_store()

    def _initialize_vector_store(self):
        """
        Initialize the vector store by either loading existing index or creating new one.
        """
        # Check if vector store already exists
        if self.vector_store_path.exists():
            print(f"[RAG Service] Loading existing vector store from {self.vector_store_path}")
            try:
                self.vector_store = FAISS.load_local(
                    str(self.vector_store_path),
                    self.embeddings,
                    allow_dangerous_deserialization=True
                )
                print("[RAG Service] Vector store loaded successfully")
            except Exception as e:
                print(f"[RAG Service] Error loading vector store: {e}")
                print("[RAG Service] Will create new vector store")
                self._create_vector_store()
        else:
            print("[RAG Service] No existing vector store found. Creating new one...")
            self._create_vector_store()

        # Create QA chain if vector store exists
        if self.vector_store:
            self._create_qa_chain()

    def _create_vector_store(self):
        """
        Create a new vector store from PDF documents.
        """
        # Check if data directory exists and has PDFs
        if not self.data_dir.exists():
            print(f"[RAG Service] Data directory not found: {self.data_dir}")
            print("[RAG Service] Creating data directory. Please add PDF files to it.")
            self.data_dir.mkdir(parents=True, exist_ok=True)
            return

        # Get all PDF files
        pdf_files = list(self.data_dir.glob("*.pdf"))

        if not pdf_files:
            print(f"[RAG Service] No PDF files found in {self.data_dir}")
            print("[RAG Service] Please add relationship book PDFs to this directory.")
            return

        print(f"[RAG Service] Found {len(pdf_files)} PDF files to process")

        # Load and process all PDFs
        all_documents = []
        for pdf_file in pdf_files:
            print(f"[RAG Service] Processing: {pdf_file.name}")
            try:
                # Handle long Windows paths by using extended-length path prefix
                file_path = str(pdf_file)
                if os.name == 'nt' and len(file_path) > 200:
                    # Use Windows extended-length path prefix
                    file_path = f"\\\\?\\{pdf_file.resolve()}"

                loader = PyPDFLoader(file_path)
                documents = loader.load()
                all_documents.extend(documents)
                print(f"[RAG Service] Loaded {len(documents)} pages from {pdf_file.name}")
            except Exception as e:
                print(f"[RAG Service] Error loading {pdf_file.name}: {e}")
                print(f"[RAG Service] TIP: Try renaming the file to a shorter name")

        if not all_documents:
            print("[RAG Service] No documents were loaded successfully")
            return

        # Split documents into chunks
        print(f"[RAG Service] Splitting {len(all_documents)} pages into chunks...")
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )

        chunks = text_splitter.split_documents(all_documents)
        print(f"[RAG Service] Created {len(chunks)} chunks")

        # Filter out empty or invalid chunks with robust validation
        valid_chunks = []
        for i, chunk in enumerate(chunks):
            try:
                # Check if chunk has valid text content
                if not hasattr(chunk, 'page_content'):
                    continue
                if chunk.page_content is None:
                    continue
                if not isinstance(chunk.page_content, str):
                    # Convert to string if possible
                    chunk.page_content = str(chunk.page_content)

                # Clean the text aggressively
                cleaned_content = chunk.page_content.strip()

                # Remove null bytes
                cleaned_content = cleaned_content.replace('\x00', '')

                # Remove surrogate characters and other invalid UTF-8
                # Encode to UTF-8 with error handling, then decode back
                cleaned_content = cleaned_content.encode('utf-8', errors='ignore').decode('utf-8', errors='ignore')

                # Remove any remaining problematic Unicode characters
                # Keep only valid printable characters
                cleaned_content = ''.join(
                    char for char in cleaned_content
                    if char.isprintable() or char in ['\n', '\t', ' ']
                )

                # Ensure it's not just whitespace or too short
                if len(cleaned_content) > 10:
                    chunk.page_content = cleaned_content
                    valid_chunks.append(chunk)
            except Exception as e:
                print(f"[RAG Service] Skipping chunk {i} due to error: {e}")
                continue

        print(f"[RAG Service] Filtered to {len(valid_chunks)} valid chunks (removed {len(chunks) - len(valid_chunks)} empty/invalid)")

        if not valid_chunks:
            print("[RAG Service] No valid chunks found after filtering")
            return

        # Create vector store - Fast with local embeddings (no API calls!)
        print("[RAG Service] Creating embeddings and vector store (using local model - fast!)...")
        try:
            # Test embedding with a simple string first
            print("[RAG Service] Testing embedding model...")
            test_embedding = self.embeddings.embed_query("test")
            print(f"[RAG Service] Embedding model works! Vector size: {len(test_embedding)}")

            # Extract texts from chunks for direct embedding
            # Apply final sanitization pass to all texts
            texts = []
            metadatas = []
            for chunk in valid_chunks:
                try:
                    # Final safety sanitization
                    safe_text = chunk.page_content.encode('utf-8', errors='ignore').decode('utf-8', errors='ignore')
                    safe_text = ''.join(c for c in safe_text if c.isprintable() or c in ['\n', '\t', ' '])
                    if len(safe_text) > 10:
                        texts.append(safe_text)
                        metadatas.append(chunk.metadata)
                except Exception:
                    continue

            print(f"[RAG Service] Final text count: {len(texts)} (after sanitization)")
            print(f"[RAG Service] Sample text (first 100 chars): {texts[0][:100]}...")

            # Process in batches to identify problematic chunks
            batch_size = 100
            total_chunks = len(texts)

            if total_chunks <= batch_size:
                self.vector_store = FAISS.from_texts(texts, self.embeddings, metadatas=metadatas)
            else:
                print(f"[RAG Service] Processing {total_chunks} chunks in batches of {batch_size}...")

                # Create initial vector store with first batch
                first_batch_texts = texts[:batch_size]
                first_batch_meta = metadatas[:batch_size]
                self.vector_store = FAISS.from_texts(first_batch_texts, self.embeddings, metadatas=first_batch_meta)
                print(f"[RAG Service] Processed batch 1/{(total_chunks + batch_size - 1) // batch_size}")

                # Add remaining batches
                for i in range(batch_size, total_chunks, batch_size):
                    batch_num = (i // batch_size) + 1
                    total_batches = (total_chunks + batch_size - 1) // batch_size
                    batch_texts = texts[i:i + batch_size]
                    batch_meta = metadatas[i:i + batch_size]

                    try:
                        self.vector_store.add_texts(batch_texts, metadatas=batch_meta)
                        print(f"[RAG Service] Processed batch {batch_num}/{total_batches}")
                    except Exception as batch_error:
                        print(f"[RAG Service] Error in batch {batch_num}: {batch_error}")
                        # Try to process texts individually to find and skip problematic ones
                        for j, (text, meta) in enumerate(zip(batch_texts, batch_meta)):
                            try:
                                # Extra sanitization for problematic text
                                sanitized_text = text.encode('utf-8', errors='ignore').decode('utf-8', errors='ignore')
                                sanitized_text = ''.join(c for c in sanitized_text if c.isprintable() or c in ['\n', '\t', ' '])
                                if len(sanitized_text) > 10:
                                    self.vector_store.add_texts([sanitized_text], metadatas=[meta])
                            except Exception as chunk_error:
                                print(f"[RAG Service] Skipping problematic text at index {i+j}: {text[:50]}...")

            # Save vector store to disk
            self.vector_store_path.parent.mkdir(parents=True, exist_ok=True)
            self.vector_store.save_local(str(self.vector_store_path))
            print(f"[RAG Service] Vector store created and saved to {self.vector_store_path}")
        except Exception as e:
            print(f"[RAG Service] Error creating vector store: {e}")
            self.vector_store = None

    def _create_qa_chain(self):
        """
        Create the QA chain for answering questions.
        """
        # Create custom prompt template
        prompt_template = """- Act as a helpful relationship advisor with expertise in communication, emotional intelligence, and healthy relationships.
- Base your answers on the provided context from relationship books.
- If the context is insufficient, state it clearly and offer general advice instead.
- Always respond with empathy, support, and without judgment.
- Focus on providing actionable advice grounded in healthy relationship principles.

Context:
{context}

Question: {question}

Helpful Answer:"""

        PROMPT = PromptTemplate(
            template=prompt_template,
            input_variables=["context", "question"]
        )

        # Create retrieval QA chain
        self.qa_chain = RetrievalQA.from_chain_type(
            llm=self.llm,
            chain_type="stuff",
            retriever=self.vector_store.as_retriever(
                search_type="similarity",
                search_kwargs={"k": 4}
            ),
            return_source_documents=True,
            chain_type_kwargs={"prompt": PROMPT}
        )

        print("[RAG Service] QA chain created successfully")

    def get_advice(self, question: str) -> dict:
        """
        Get relationship advice based on a user's question.

        Args:
            question: The user's question about relationships

        Returns:
            Dictionary containing the answer and source information
        """
        if not self.qa_chain:
            return {
                "answer": "The advice service is not ready yet. Please make sure PDF documents are added to the data directory and the vector store is initialized.",
                "sources": [],
                "error": "Service not initialized"
            }

        try:
            # Get answer from QA chain
            result = self.qa_chain.invoke({"query": question})

            # Extract source information
            sources = []
            if "source_documents" in result:
                for doc in result["source_documents"]:
                    source_info = {
                        "content": doc.page_content[:200] + "...",  # First 200 chars
                        "metadata": doc.metadata
                    }
                    sources.append(source_info)

            return {
                "answer": result["result"],
                "sources": sources,
                "error": None
            }

        except Exception as e:
            print(f"[RAG Service] Error getting advice: {e}")
            return {
                "answer": "I apologize, but I encountered an error while processing your question. Please try again.",
                "sources": [],
                "error": str(e)
            }

    def get_personality_context(self, user_answers: dict) -> str:
        """
        Retrieve relevant context from relationship books for personality analysis.

        Args:
            user_answers: Dictionary of user's answers from voice onboarding

        Returns:
            String containing relevant context from relationship books
        """
        if not self.vector_store:
            return ""

        try:
            # Create queries based on user answers to find relevant content
            queries = [
                "attachment theory secure anxious avoidant fearful disorganized relationship patterns",
                "emotional regulation stress coping mechanisms vulnerability intimacy",
                "conflict resolution communication patterns repair attempts disagreements",
                "childhood attachment family dynamics emotional needs unmet needs",
                "love languages emotional expression giving receiving love",
                "relationship dynamics pursuer withdrawer caretaker power balance",
                "defensive mechanisms emotional triggers shame vulnerability capacity",
                "self-awareness emotional intelligence growth mindset accountability"
            ]

            # Add query based on user's specific answers
            answer_text = " ".join(str(v) for v in user_answers.values() if v)
            if answer_text:
                queries.append(f"personality analysis relationship patterns: {answer_text[:200]}")

            # Retrieve relevant documents for each query
            all_contexts = []
            seen_contents = set()

            for query in queries:
                try:
                    docs = self.vector_store.similarity_search(query, k=2)
                    for doc in docs:
                        # Avoid duplicates
                        content_hash = hash(doc.page_content[:100])
                        if content_hash not in seen_contents:
                            seen_contents.add(content_hash)
                            all_contexts.append(doc.page_content)
                except Exception as e:
                    print(f"[RAG Service] Error retrieving context for query '{query[:50]}...': {e}")
                    continue

            # Combine contexts with a maximum length
            combined_context = "\n\n---\n\n".join(all_contexts[:12])  # Limit to 12 chunks for deeper analysis

            if combined_context:
                print(f"[RAG Service] Retrieved {len(all_contexts[:12])} relevant context chunks for personality analysis")
            else:
                print("[RAG Service] No relevant context found for personality analysis")

            return combined_context

        except Exception as e:
            print(f"[RAG Service] Error getting personality context: {e}")
            return ""

    def add_document(self, pdf_path: str) -> bool:
        """
        Add a new PDF document to the vector store.

        Args:
            pdf_path: Path to the PDF file to add

        Returns:
            True if successful, False otherwise
        """
        try:
            print(f"[RAG Service] Adding new document: {pdf_path}")

            # Load the PDF
            loader = PyPDFLoader(pdf_path)
            documents = loader.load()

            # Split into chunks
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200,
                length_function=len,
                separators=["\n\n", "\n", " ", ""]
            )
            chunks = text_splitter.split_documents(documents)

            # Add to existing vector store or create new one
            if self.vector_store:
                self.vector_store.add_documents(chunks)
            else:
                self.vector_store = FAISS.from_documents(chunks, self.embeddings)
                self._create_qa_chain()

            # Save updated vector store
            self.vector_store.save_local(str(self.vector_store_path))
            print(f"[RAG Service] Document added successfully. Added {len(chunks)} chunks.")

            return True

        except Exception as e:
            print(f"[RAG Service] Error adding document: {e}")
            return False


# Singleton instance
_advice_service_instance: Optional[RelationshipAdviceService] = None


def get_advice_service() -> RelationshipAdviceService:
    """
    Get the singleton instance of the RelationshipAdviceService.

    Returns:
        RelationshipAdviceService instance
    """
    global _advice_service_instance

    if _advice_service_instance is None:
        try:
            _advice_service_instance = RelationshipAdviceService()
        except Exception as e:
            print(f"[RAG Service] Failed to initialize advice service: {e}")
            raise

    return _advice_service_instance
