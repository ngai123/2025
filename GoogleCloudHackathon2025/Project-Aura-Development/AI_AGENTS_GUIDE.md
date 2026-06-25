# AURA AI Agents Guide

## Overview
The AURA chatbot now includes 4 specialized AI agents that automatically detect user intent and provide tailored responses:

1. **Personality Chat Agent** - Relationship psychology insights
2. **Shopping List Agent** - Product recommendations and shopping lists
3. **Dating Location Finder** - Restaurant and date spot suggestions with Google Maps
4. **Google Calendar Agent** - Event scheduling with calendar integration

## How It Works

The system automatically:
1. Detects which agent should handle your message
2. Processes your request with the appropriate agent
3. Returns structured, interactive responses

No need to specify which agent to use - just chat naturally!

---

## Example Prompts

### 1. Personality Chat (Default)
**Try asking:**
- "Why do I always feel like I'm not enough?"
- "How can I be more vulnerable in relationships?"
- "What patterns should I work on?"

**Response:**
- Personalized insights based on your personality analysis
- Compassionate advice from relationship psychology
- References to your specific patterns

---

### 2. Shopping List Agent
**Try asking:**
- "I need a shopping list for a romantic picnic date"
- "What should I buy for a first date dinner at home?"
- "Help me shop for anniversary gifts"

**Response:**
```
🛒 Shopping List - romantic date supplies

Items:
- Fresh flowers (1 bouquet) - $15 - Sets romantic ambiance
- Cheese platter ingredients - $25 - Easy appetizer
- Wine bottle - $30 - Enhances romance
- Candles (4-pack) - $10 - Creates mood lighting

Total Estimate: $80-100
💡 Tip: Shop early in the day for freshest ingredients
```

---

### 3. Dating Location Finder
**Try asking:**
- "Suggest romantic restaurants in Kuala Lumpur"
- "Where should I take someone for a casual coffee date?"
- "Find me outdoor date spots"
- "Best rooftop bars for a date"

**Response:**
```
📍 Date Locations - romantic dinner

1. Atmosphere 360
   Address: KL Tower, Jalan Puncak
   Type: Fine Dining Restaurant
   Ambiance: Romantic
   Price: $$$
   Best for: Anniversary dinner
   [Open in Google Maps] button

2. Marini's on 57
   Address: Petronas Tower 3, KLCC
   Type: Italian Restaurant
   Ambiance: Sophisticated
   Price: $$$
   Best for: Special occasions
   [Open in Google Maps] button

💡 Tips: Book a window table for the best views
```

---

### 4. Google Calendar Agent
**Try asking:**
- "Schedule dinner with Sarah next Friday at 7pm"
- "Add a date night reminder for tomorrow at 6pm"
- "Create a calendar event for anniversary dinner on Jan 20th"
- "Set up coffee meeting for next Tuesday morning"

**Response:**
```
📅 Calendar Event

Dinner with Sarah
Friday date night at amazing restaurant

📅 Date: 2025-01-24
🕐 Time: 19:00 (2 hours)
📍 Location: [if mentioned]
🔔 Reminder: 30 minutes before

[➕ Add to Google Calendar] button
```

Clicking the button opens Google Calendar with all details pre-filled!

---

## Agent Detection

The system automatically detects intent based on keywords:

| Agent | Triggers |
|-------|----------|
| Shopping | "buy", "shopping list", "purchase", "shop for", "need to get" |
| Location | "restaurant", "where should", "date spot", "place to go", "location" |
| Calendar | "schedule", "calendar", "add event", "reminder", "plan for" |
| Chat | All other messages (default) |

---

## Features

### Shopping List Agent
✅ Personalized product recommendations
✅ Quantity and price estimates
✅ Shopping tips
✅ Category-based organization

### Location Finder
✅ 3-5 curated location suggestions
✅ Ambiance and price range info
✅ Direct Google Maps links
✅ Best-for recommendations
✅ Dating tips for each location type

### Calendar Agent
✅ Natural language date/time parsing
✅ Smart duration suggestions
✅ Reminder settings
✅ One-click Google Calendar add
✅ Works with relative dates ("tomorrow", "next Friday")

### Personality Chat
✅ Based on your personality analysis
✅ Compassionate relationship advice
✅ Pattern recognition
✅ Evidence-based insights

---

## Try It Out!

Go to the AI Chat (Dating Coach) at **http://localhost:5173/chat/** and try these:

**Shopping:**
- "I need supplies for a romantic dinner at home"

**Location:**
- "Find me a cozy cafe for a first date"

**Calendar:**
- "Schedule a movie date for Saturday at 8pm"

**Chat:**
- "How do I start a conversation on a first date?"
- "What are good topics for getting to know someone?"

---

## Notes

- All agents work seamlessly together in one chat
- No special commands needed - just chat naturally
- Responses include both text and interactive widgets
- Google Maps and Calendar links open in new tabs
- All data is processed securely through AURA backend

Enjoy your AI-powered dating assistant! 💖
