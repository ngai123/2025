"""
AI Agent System for AURA Chat
Includes Shopping List, Dating Location Finder, and Google Calendar agents

Performance optimizations:
- Singleton model instance to avoid re-initialization overhead
- Fast keyword-based intent detection (eliminates 1 AI call per request)
- Reduced context sizes for faster responses
"""
import os
import json
import google.generativeai as genai
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Singleton model instance - reused across all agents to avoid initialization overhead
_shared_model: Optional[genai.GenerativeModel] = None


def get_shared_model() -> genai.GenerativeModel:
    """Get or create the shared Gemini model instance (singleton pattern)"""
    global _shared_model
    if _shared_model is None:
        _shared_model = genai.GenerativeModel('gemini-2.5-pro')
    return _shared_model


# Intent detection keywords - fast matching without AI call
SHOPPING_KEYWORDS = frozenset([
    'buy', 'shop', 'shopping', 'purchase', 'list', 'gift', 'gifts', 'present',
    'order', 'shopee', 'lazada', 'mall', 'store', 'grocery', 'groceries',
    'flowers', 'chocolate', 'wine', 'candles', 'bouquet', 'perfume'
])

LOCATION_KEYWORDS = frozenset([
    'restaurant', 'restaurants', 'cafe', 'coffee', 'place', 'places', 'location',
    'where', 'date spot', 'venue', 'bar', 'club', 'park', 'beach', 'rooftop',
    'dinner', 'lunch', 'breakfast', 'romantic place', 'recommend', 'suggestion',
    'nearby', 'best place', 'nice place'
])

CALENDAR_KEYWORDS = frozenset([
    'schedule', 'calendar', 'reminder', 'remind', 'event', 'plan', 'book',
    'appointment', 'meeting', 'date on', 'set up', 'reserve', 'reservation',
    'tomorrow', 'next week', 'this weekend', 'add to calendar'
])


def detect_intent_fast(user_message: str) -> str:
    """
    Fast keyword-based intent detection - no AI call needed.
    This eliminates ~2-4 seconds of latency per request.
    """
    msg_lower = user_message.lower()
    words = set(msg_lower.split())

    # Check for multi-word phrases first
    if any(phrase in msg_lower for phrase in ['shopping list', 'buy for', 'what to buy', 'gift for']):
        return "shopping"
    if any(phrase in msg_lower for phrase in ['date spot', 'where should', 'nice place', 'romantic place', 'good restaurant']):
        return "location"
    if any(phrase in msg_lower for phrase in ['add to calendar', 'set reminder', 'schedule a', 'plan for']):
        return "calendar"

    # Check single keywords
    if words & SHOPPING_KEYWORDS:
        return "shopping"
    if words & LOCATION_KEYWORDS:
        return "location"
    if words & CALENDAR_KEYWORDS:
        return "calendar"

    return "chat"


class ShoppingListAgent:
    """Agent that helps users create shopping lists and find products"""

    def __init__(self):
        self.model = get_shared_model()  # Use singleton model

    async def generate_shopping_list(self, user_message: str, context: str = "") -> Dict[str, Any]:
        """Generate a shopping list based on user request"""

        prompt = f"""You are a helpful shopping assistant. The user wants help with shopping.

User Request: {user_message}
Context: {context}

Generate a shopping list with recommendations. Return ONLY valid JSON in this format:
{{
    "category": "romantic date supplies" or "grocery" or "gifts" etc,
    "items": [
        {{"name": "item name", "quantity": "1", "estimated_price": "RM 10-20", "reason": "why needed", "search_query": "exact product name for searching on Shopee/Lazada"}},
        ...
    ],
    "total_estimate": "RM 50-100",
    "shopping_tips": "helpful tip",
    "response_message": "Friendly response to user"
}}

IMPORTANT:
- Use Malaysian Ringgit (RM) for prices
- For "search_query", provide the exact product name that would work well in Shopee/Lazada search
- Be specific with product names (e.g., "red roses bouquet", "scented candles romantic", "dark chocolate bars")
"""

        try:
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()

            # Clean markdown code blocks
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
            response_text = response_text.strip()

            shopping_list = json.loads(response_text)
            shopping_list["agent_type"] = "shopping_list"

            # Add Shopee and Lazada links for each item
            for item in shopping_list.get("items", []):
                search_query = item.get("search_query", item.get("name", ""))
                # URL encode the search query
                import urllib.parse
                encoded_query = urllib.parse.quote(search_query)

                # Generate Shopee and Lazada search links
                item["shopee_link"] = f"https://shopee.com.my/search?keyword={encoded_query}"
                item["lazada_link"] = f"https://www.lazada.com.my/catalog/?q={encoded_query}"

            return shopping_list

        except Exception as e:
            print(f"Shopping agent error: {e}")
            return {
                "agent_type": "shopping_list",
                "error": str(e),
                "response_message": "I had trouble creating a shopping list. Could you be more specific about what you need?"
            }


class DatingLocationAgent:
    """Agent that suggests dating locations with map integration"""

    def __init__(self):
        self.model = get_shared_model()  # Use singleton model
        self.google_maps_api_key = os.getenv("GOOGLE_MAPS_API_KEY")

    async def suggest_locations(self, user_message: str, user_location: str = "Kuala Lumpur") -> Dict[str, Any]:
        """Suggest dating locations based on preferences"""

        prompt = f"""You are a dating location expert. Help the user find a great date spot.

User Request: {user_message}
User Location: {user_location}

Suggest 3-5 dating locations. Return ONLY valid JSON in this format:
{{
    "date_type": "romantic dinner" or "casual coffee" or "outdoor adventure" etc,
    "locations": [
        {{
            "name": "Restaurant/Place name",
            "address": "Full address",
            "type": "restaurant/cafe/park/etc",
            "ambiance": "romantic/casual/fun",
            "price_range": "$$" or "$$$",
            "best_for": "first date/anniversary/casual hangout",
            "google_maps_query": "search query for Google Maps"
        }},
        ...
    ],
    "response_message": "Friendly response with recommendations",
    "tips": "Dating tips for this type of location"
}}
"""

        try:
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()

            # Clean markdown code blocks
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
            response_text = response_text.strip()

            location_data = json.loads(response_text)
            location_data["agent_type"] = "dating_location"

            # Add Google Maps links
            for loc in location_data.get("locations", []):
                query = loc.get("google_maps_query", loc["name"])
                loc["maps_url"] = f"https://www.google.com/maps/search/?api=1&query={query.replace(' ', '+')}"

            return location_data

        except Exception as e:
            print(f"Location agent error: {e}")
            return {
                "agent_type": "dating_location",
                "error": str(e),
                "response_message": "I had trouble finding locations. Could you tell me what kind of date you're planning?"
            }


class GoogleCalendarAgent:
    """Agent that helps users add events to Google Calendar"""

    def __init__(self):
        self.model = get_shared_model()  # Use singleton model

    async def parse_calendar_event(self, user_message: str) -> Dict[str, Any]:
        """Parse user message and create calendar event"""

        current_date = datetime.now().strftime("%Y-%m-%d %H:%M")

        prompt = f"""You are a calendar assistant. Extract event details from the user's message.

Current Date/Time: {current_date}
User Message: {user_message}

Extract the event details. Return ONLY valid JSON in this format:
{{
    "event_title": "Date with Sarah" or "Dinner at...",
    "event_description": "Brief description",
    "start_date": "2025-01-20",
    "start_time": "19:00",
    "duration_hours": 2,
    "location": "Restaurant name/address if mentioned",
    "reminder_minutes": 30,
    "response_message": "Friendly confirmation message",
    "calendar_link": "google calendar link will be added by system"
}}

If the user hasn't specified a time, suggest a reasonable time based on the event type.
If no date is mentioned, assume they mean the next available day.
"""

        try:
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()

            # Clean markdown code blocks
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
            response_text = response_text.strip()

            event_data = json.loads(response_text)
            event_data["agent_type"] = "google_calendar"

            # Create Google Calendar link
            start_datetime = f"{event_data['start_date']}T{event_data['start_time']}:00"
            start_dt = datetime.fromisoformat(start_datetime)
            end_dt = start_dt + timedelta(hours=event_data.get('duration_hours', 2))

            # Google Calendar URL format
            cal_url = (
                f"https://calendar.google.com/calendar/render?action=TEMPLATE"
                f"&text={event_data['event_title'].replace(' ', '+')}"
                f"&dates={start_dt.strftime('%Y%m%dT%H%M%S')}/{end_dt.strftime('%Y%m%dT%H%M%S')}"
                f"&details={event_data.get('event_description', '').replace(' ', '+')}"
                f"&location={event_data.get('location', '').replace(' ', '+')}"
            )

            event_data["calendar_link"] = cal_url

            return event_data

        except Exception as e:
            print(f"Calendar agent error: {e}")
            return {
                "agent_type": "google_calendar",
                "error": str(e),
                "response_message": "I had trouble understanding the event details. Could you tell me the date, time, and what the event is about?"
            }


class AIAgentCoordinator:
    """Main coordinator that routes messages to appropriate agents"""

    def __init__(self):
        self.model = get_shared_model()  # Use singleton model
        self.shopping_agent = ShoppingListAgent()
        self.location_agent = DatingLocationAgent()
        self.calendar_agent = GoogleCalendarAgent()

    async def process_message(
        self,
        user_message: str,
        conversation_history: List[Dict[str, str]] = None,
        user_context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Process user message and route to appropriate agent"""

        # Fast keyword-based intent detection (no AI call - saves ~2-4 seconds)
        intent = detect_intent_fast(user_message)

        # Route to appropriate agent
        if intent == "shopping":
            context = user_context.get("analysis_context", "") if user_context else ""
            result = await self.shopping_agent.generate_shopping_list(user_message, context)

        elif intent == "location":
            user_location = user_context.get("location", "Kuala Lumpur") if user_context else "Kuala Lumpur"
            result = await self.location_agent.suggest_locations(user_message, user_location)

        elif intent == "calendar":
            result = await self.calendar_agent.parse_calendar_event(user_message)

        else:  # General chat
            # Use existing personality chatbot
            result = await self._handle_general_chat(user_message, conversation_history, user_context)

        result["detected_intent"] = intent
        return result

    async def _handle_general_chat(
        self,
        user_message: str,
        conversation_history: List[Dict[str, str]] = None,
        user_context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Handle general conversation with chat context awareness"""

        analysis_context = user_context.get("analysis_context", "") if user_context else ""
        chat_messages = user_context.get("chat_messages", "") if user_context else ""
        other_user_name = user_context.get("other_user_name", "your match") if user_context else "your match"

        # Build a context-aware prompt
        prompt = f"""You are Aura AI, a dating coach. Be direct and actionable.

CHAT WITH {other_user_name.upper()}:
{chat_messages if chat_messages else "No messages yet"}

USER'S PERSONALITY:
{analysis_context if analysis_context else "Not available"}

USER ASKS:
{user_message}

RULES:
- Be concise. No filler words or generic phrases like "That's a great question!" or "I understand how you feel"
- Use bullet points or numbered lists for suggestions
- Give 2-3 SPECIFIC message examples they can send, based on the actual conversation above
- Reference details from their chat (names, topics, things mentioned)
- If the conversation feels stale, suggest a new topic pivot or question
- Skip preambles. Get straight to the advice.

FORMAT YOUR RESPONSE LIKE THIS:
Brief observation (1 sentence max), then:

**Try saying:**
1. [Specific message example]
2. [Specific message example]
3. [Specific message example]

**Why:** [Brief explanation]"""

        try:
            response = self.model.generate_content(prompt)
            return {
                "agent_type": "chat",
                "response_message": response.text
            }
        except Exception as e:
            return {
                "agent_type": "chat",
                "response_message": "I'm here to help with your conversation. Could you tell me more about what you'd like to say?",
                "error": str(e)
            }


# Singleton instance
_agent_coordinator = None

def get_agent_coordinator() -> AIAgentCoordinator:
    """Get or create the singleton agent coordinator"""
    global _agent_coordinator
    if _agent_coordinator is None:
        _agent_coordinator = AIAgentCoordinator()
    return _agent_coordinator
