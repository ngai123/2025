# RAG-Based Relationship Advice System

## Overview

This system uses Retrieval-Augmented Generation (RAG) to provide relationship advice based on expert knowledge from relationship books. It combines:
- **LangChain**: Framework for building LLM applications
- **Sentence Transformers**: Local open-source embeddings (NO API QUOTA LIMITS!)
- **Google Gemini AI**: For text generation only
- **FAISS**: Vector database for efficient similarity search
- **PyPDF**: For extracting text from PDF documents

### Why Local Embeddings?
- **No API Quotas**: Runs entirely on your server
- **Fast**: No network latency for embeddings
- **Free**: No API costs for embeddings
- **Privacy**: Your data stays on your server

## Architecture

```
┌─────────────────┐
│  User Question  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Local Embedding Generation     │
│  (Sentence Transformers)        │
│  ⚡ No API calls!                │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  FAISS Vector Search            │
│  (Find relevant book chunks)    │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  LLM Generation                 │
│  (Gemini 1.5 Pro - API call)    │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Advice Answer  │
└─────────────────┘
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

The following RAG-specific packages will be installed:
- `langchain==0.3.13`
- `langchain-google-genai==2.0.6` (for LLM only)
- `faiss-cpu==1.9.0.post1`
- `pypdf==5.1.0`
- `langchain-community==0.3.13`
- `sentence-transformers==3.3.1` (local embeddings - no API!)
- `langchain-huggingface==0.1.2`

### 2. Configure Environment Variables

The system uses your existing Google Gemini API key. Ensure your `.env` file has:

```env
GEMINI_API_KEY=your-gemini-api-key-here
# OR
GOOGLE_API_KEY=your-google-api-key-here
```

The service will check for either `GOOGLE_API_KEY` or `GEMINI_API_KEY`.

### 3. Add Relationship Books (PDFs)

Place your relationship advice books in PDF format in:
```
backend/data/relationship_books/
```

Example books you might add:
- "The 5 Love Languages" by Gary Chapman
- "Attached" by Amir Levine
- "Men Are from Mars, Women Are from Venus" by John Gray
- "Hold Me Tight" by Dr. Sue Johnson
- Any other relationship psychology or advice books

**Note**: Make sure you have the legal right to use these books. Consider using public domain books or obtaining proper licenses.

### 4. Start the Server

```bash
uvicorn app.main:app --reload
```

On first startup, the service will:
1. Load all PDF files from `backend/data/relationship_books/`
2. Split them into searchable chunks
3. Generate embeddings for each chunk
4. Create and save a FAISS vector index to `backend/vector_store/faiss_index`

**Important Notes**:
- **First time**: The sentence-transformers model (~100MB) will be downloaded automatically
- **First initialization**: Processing PDFs and creating embeddings is fast with local model (no API rate limits!)
- **Subsequent startups**: Very fast as the vector index is loaded from disk

## API Endpoints

### 1. Get Relationship Advice

**Endpoint**: `POST /api/v1/advice/`

**Request**:
```json
{
  "question": "How can I improve communication with my partner when we disagree?"
}
```

**Response**:
```json
{
  "answer": "Improving communication with your partner involves active listening, expressing your feelings clearly, and showing empathy...",
  "sources": [
    {
      "content": "Active listening is the foundation of healthy communication...",
      "metadata": {
        "source": "relationship_book.pdf",
        "page": 42
      }
    }
  ],
  "error": null
}
```

### 2. Add New Document

**Endpoint**: `POST /api/v1/advice/add-document`

**Request**:
```json
{
  "pdf_path": "/path/to/new/book.pdf"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Document successfully added to knowledge base: /path/to/new/book.pdf"
}
```

### 3. Health Check

**Endpoint**: `GET /api/v1/advice/health`

**Response**:
```json
{
  "status": "healthy",
  "vector_store_initialized": true,
  "qa_chain_initialized": true,
  "data_directory": "/path/to/backend/data/relationship_books",
  "vector_store_path": "/path/to/backend/vector_store/faiss_index"
}
```

## How It Works

### 1. Document Processing
- PDFs are loaded using PyPDF
- Text is split into chunks of ~1000 characters with 200-character overlap
- Each chunk maintains metadata (source file, page number)

### 2. Embedding Generation (Local - No API!)
- **Sentence Transformers** model `all-MiniLM-L6-v2` runs locally
- Creates vector representations of each chunk
- Embeddings capture semantic meaning of the text
- **No API calls = No rate limits = Fast & Free!**

### 3. Vector Storage
- FAISS (Facebook AI Similarity Search) stores embeddings efficiently
- Enables fast similarity search across thousands of chunks

### 4. Query Processing
When a user asks a question:
1. Question is converted to an embedding
2. FAISS finds the 4 most similar chunks from the books
3. These chunks provide context to Gemini 1.5 Pro
4. The LLM generates a thoughtful, contextual answer

### 5. Custom Prompt Template
The system uses a specialized prompt that:
- Emphasizes empathy and non-judgment
- Focuses on actionable advice
- Acknowledges when information is insufficient
- Maintains professional relationship counseling tone

## Frontend Integration Example

```javascript
async function getRelationshipAdvice(question) {
  const response = await fetch('http://localhost:8000/api/v1/advice/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question }),
  });

  const data = await response.json();
  return data;
}

// Usage
const advice = await getRelationshipAdvice(
  "How do I handle conflicts with my partner?"
);
console.log(advice.answer);
console.log(advice.sources);
```

## Troubleshooting

### Service Won't Initialize

**Problem**: Error about missing API key
```
ValueError: GOOGLE_API_KEY or GEMINI_API_KEY must be provided
```

**Solution**: Ensure `.env` file has `GEMINI_API_KEY` or `GOOGLE_API_KEY` set.

---

### No PDFs Found

**Problem**: Service starts but says no PDFs found
```
[RAG Service] No PDF files found in /path/to/data/relationship_books
```

**Solution**: Add PDF files to `backend/data/relationship_books/` directory.

---

### Service Not Ready

**Problem**: Advice endpoint returns "Service not ready"

**Solution**:
1. Check health endpoint: `GET /api/v1/advice/health`
2. Ensure PDFs are added and vector store is initialized
3. Check server logs for initialization errors

---

### Slow First Startup

**Problem**: Server takes a long time to start initially

**Explanation**: This is normal! The service is:
- Reading all PDFs
- Splitting into chunks
- Generating embeddings (API calls to Google)
- Building vector index

**Solution**: Be patient on first startup. Subsequent startups load the pre-built index and are fast.

## Performance Considerations

### Vector Store Persistence
- Vector index is saved to disk after creation
- Subsequent startups load the existing index (fast)
- Only rebuild when adding new documents

### API Usage (Minimal!)
- **Embeddings**: Run locally, no API calls
- **LLM (text generation)**: Only 1 API call per user query (Gemini)
- **Rate limits**: Only apply to answering questions, not indexing

### Memory Usage
- FAISS index is loaded into memory
- More books = larger index
- Monitor memory usage with large knowledge bases

## Security Considerations

1. **API Key Protection**: Never commit `.env` file to git
2. **Access Control**: Consider adding authentication to advice endpoints
3. **Copyright**: Ensure proper licensing for relationship books
4. **Rate Limiting**: Implement rate limiting on advice endpoint
5. **Input Validation**: Question length is limited to 1000 characters

## Future Enhancements

Potential improvements:
- [ ] Add user feedback mechanism to improve responses
- [ ] Implement caching for common questions
- [ ] Add support for other document formats (DOCX, EPUB)
- [ ] Fine-tune chunk size and overlap for better retrieval
- [ ] Add metadata filtering (by book, topic, etc.)
- [ ] Implement conversation history for follow-up questions
- [ ] Add multi-language support
- [ ] Create admin dashboard for knowledge base management

## Files Created

```
backend/
├── app/
│   ├── services/
│   │   ├── __init__.py
│   │   └── relationship_advice_service.py
│   ├── routes/
│   │   └── advice.py
│   └── schemas/
│       └── advice.py
├── data/
│   └── relationship_books/
│       └── (place PDF files here)
├── vector_store/
│   └── faiss_index/
│       └── (auto-generated index files)
└── requirements.txt
```

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

These provide interactive API documentation.
