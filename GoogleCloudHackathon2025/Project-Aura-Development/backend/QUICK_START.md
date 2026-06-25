# RAG Quick Start Guide

## What Changed?

✅ **Switched to Local Embeddings** - No more API quota issues!

Previously:
- Used Google AI embeddings (API calls with quota limits)
- Hit quota limit with 1,124 chunks

Now:
- Uses Sentence Transformers (runs on your machine)
- **Unlimited** processing
- **Faster** - no network latency
- **Free** - no API costs for embeddings

## Installation

```bash
cd backend
pip install -r requirements.txt
```

This installs:
- `sentence-transformers==3.3.1`
- `langchain-huggingface==0.1.2`

## Fix Long Filenames

Two PDFs have very long names. Rename them:

```bash
cd data/relationship_books

# Rename these files to shorter names:
# "Attached_ The New Science..." → "Attached.pdf"
# "Hold Me Tight..." → "Hold_Me_Tight.pdf"
```

Or via File Explorer:
1. Navigate to `backend/data/relationship_books/`
2. Right-click → Rename
3. Shorten the filenames

## Start the Server

```bash
uvicorn app.main:app --reload
```

### First Startup (one-time):
1. Downloads sentence-transformers model (~100MB) - automatic
2. Processes all PDFs
3. Creates embeddings locally (fast - no API limits!)
4. Saves vector store to disk

**Time**: ~1-3 minutes for 4 books

### Subsequent Startups:
Loads pre-built vector store - **instant!**

## Test the Endpoint

```bash
curl -X POST http://localhost:8000/api/v1/advice/ \
  -H "Content-Type: application/json" \
  -d "{\"question\": \"How can I improve communication with my partner?\"}"
```

## Benefits Summary

| Feature | Before (Google) | After (Local) |
|---------|----------------|---------------|
| Embeddings | Google API | Local CPU |
| Rate Limits | ❌ 1500/day | ✅ Unlimited |
| Cost | API costs | Free |
| Speed | Network latency | Instant |
| Privacy | Data sent to Google | Data stays local |
| Indexing | Slow (rate limits) | Fast |

**Only API call**: Gemini for generating answers (1 call per user question)

## Troubleshooting

### Long filename errors
**Error**: `File path C:\Users\...\very_long_name.pdf is not a valid file`

**Fix**: Rename PDFs to shorter names (under 100 characters)

### Model download
**First run**: Downloads `all-MiniLM-L6-v2` model (~100MB)

**Location**: Cached in `~/.cache/huggingface/`

### Memory usage
**Typical**: 200-500MB for moderate-sized knowledge base

**Large**: 1-2GB for many books

## Next Steps

1. Rename long filenames
2. Start server
3. Test with a question
4. Add more PDFs anytime (just drop in `data/relationship_books/`)

For full documentation, see `RAG_SETUP.md`
