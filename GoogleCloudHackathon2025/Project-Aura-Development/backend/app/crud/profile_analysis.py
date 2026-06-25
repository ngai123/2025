import json
import os
from sqlalchemy.orm import Session
from app.models import ProfileAnalysis, LoveStyle, LoveStyleTrait
from app.schemas.profile import ProfileAnalysisCreate
import google.generativeai as genai
from app.services.relationship_advice_service import get_advice_service

def create_profile_analysis(db: Session, user_id: int, data: ProfileAnalysisCreate):
    """
    Create or update a profile analysis record for a user with their voice onboarding answers.
    The answers are stored in the 'ori_voice_json' column.
    """
    db_analysis = db.query(ProfileAnalysis).filter(ProfileAnalysis.user_id == user_id).first()

    answers_json = json.dumps(data.answers)

    if db_analysis:
        # If a record exists, update the answers.
        db_analysis.ori_voice_json = answers_json
        # Clear the old analysis since the answers have changed.
        db_analysis.characteristic_json = None
    else:
        # Create a new record if one doesn't exist.
        db_analysis = ProfileAnalysis(
            user_id=user_id,
            ori_voice_json=answers_json
        )
        db.add(db_analysis)

    db.commit()
    db.refresh(db_analysis)
    return db_analysis

def analyse_personality(db: Session, user_id: int, answers: dict):
    """
    Analyse user's personality and save the result to the 'characteristic_json' column.
    Uses RAG database of relationship books for more informed analysis.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")

    genai.configure(api_key=api_key)

    # Get context from relationship books RAG database
    rag_context = ""
    try:
        advice_service = get_advice_service()
        rag_context = advice_service.get_personality_context(answers)
    except Exception as e:
        print(f"[Profile Analysis] Could not get RAG context: {e}")
        rag_context = ""

    # Build the enhanced prompt with RAG context
    prompt = """You are a deeply empathetic relationship psychologist specializing in uncovering patterns people don't consciously recognize about themselves. Your role is to provide profound insights that help people understand their emotional world, relationship patterns, and unconscious behaviors.

Your analysis should feel like a trusted therapist who truly sees them - not diagnosing or categorizing, but illuminating patterns with compassion and wisdom.

ANALYTICAL FOCUS AREAS:

1. EMOTIONAL PATTERNS YOU NOTICE
Look for patterns in how they experience and process emotions. What do their answers reveal about their emotional world that they might not fully see? Consider their relationship with vulnerability, how they protect themselves, and what they truly need emotionally.

2. ATTACHMENT AND CONNECTION STYLE
Without using clinical labels, describe how they approach closeness and connection. Do they seek reassurance or space when stressed? How comfortable are they with emotional exposure? What does safety mean to them in relationships?

3. UNCONSCIOUS RELATIONSHIP TENDENCIES
What patterns keep showing up? Are there themes in their conflict responses, their family history, and their past relationships that connect? What role do they tend to play? What might they be recreating without realizing it?

4. HIDDEN STRENGTHS THEY MIGHT NOT SEE
What emotional intelligence or resilience shows up in subtle ways? What coping mechanisms are actually serving them well? What makes them uniquely capable of deep connection?

5. BLIND SPOTS AND GROWTH EDGES
What patterns might be holding them back? Are there defense mechanisms that once protected them but now limit intimacy? What fears or wounds might be quietly influencing their choices?

6. WHAT THEY REALLY NEED IN PARTNERSHIP
Based on their answers, what do they truly need to feel loved and secure? Not what they think they should want, but what their emotional patterns suggest they need. What kind of partner would complement their style and help them grow?

7. THE DEEPER STORY
Connect the dots between their childhood experiences, their current patterns, and their vision for the future. What is the thread that runs through their answers? What are they seeking that they might not have words for yet?

---
"""

    # Add RAG context if available
    if rag_context:
        prompt += f"""INSIGHTS FROM RELATIONSHIP PSYCHOLOGY BOOKS:
{rag_context}

Use these evidence-based insights to deepen your understanding of their patterns. When relevant, cite the book or source to add credibility (e.g., "As described in [Book Title]..." or "Research from [Source] suggests...").

---
"""

    prompt += """THE USER'S ANSWERS:
"""
    for i, (question, answer) in enumerate(answers.items()):
        prompt += f"{i+1}. {question}\n   ANSWER: {answer}\n\n"

    prompt += """
---

YOUR RESPONSE FORMAT - GENERATE TWO VERSIONS:

**SHORT VERSION (for on-screen display):**
Write exactly 3 numbered insights - each with just the bold title and 1-2 sentences.

Example:
1. **You carry a quiet fear of not being enough.**
No matter how much you achieve, you worry it could be taken away.

2. **You're incredibly good at supporting others, but struggle to let people support you.**
When someone needs comfort, you show up with patience, but you shrink when you need reassurance.

**FULL VERSION (for email):**
Write exactly 5 numbered insights. Each insight MUST follow this exact structure:

[Number]. **[Bold title - a powerful statement about them]**

[Detailed explanation paragraph - 3-4 sentences expanding on this insight]

Example format:
1. **You carry a quiet fear of not being enough.**

No matter how much you achieve, there's always a part of you that worries it could be taken away. You've built an identity around being competent and put-together, so you feel pressure to maintain that image. This constant self-monitoring is why you're always tired inside.

Focus on these 5 themes:
1. A hidden fear or insecurity they carry
2. An imbalance in how they give vs receive in relationships
3. What truly drives their ambition or goals
4. How they experience and express love/emotions
5. Their deepest unspoken need in connection

CRITICAL INSTRUCTIONS:
- Return in this EXACT format: "SHORT_VERSION:\n[short version]\n\nFULL_VERSION:\n[full version]"
- Wrap each title with double asterisks like **title here**
- Leave a blank line between the title and explanation
- Leave a blank line between each numbered point
- Write in second person - speak directly to them ("You carry..." not "They carry...")
- Be specific and reference patterns from their answers
- Be compassionate but truthful
- Make it feel like a breakthrough moment in therapy
- When using insights from the provided psychology books, naturally cite the source (e.g., "As attachment theory research shows..." or "According to [Book Title]...") to add credibility
"""

    model = genai.GenerativeModel('gemini-2.5-pro')
    response = model.generate_content(prompt)
    analysis_text = response.text

    # Parse short and full versions
    short_version = ""
    full_version = ""

    if "SHORT_VERSION:" in analysis_text and "FULL_VERSION:" in analysis_text:
        parts = analysis_text.split("FULL_VERSION:")
        short_part = parts[0].replace("SHORT_VERSION:", "").strip()
        full_part = parts[1].strip() if len(parts) > 1 else ""

        short_version = short_part
        full_version = full_part
    else:
        # Fallback if format not followed
        short_version = analysis_text
        full_version = analysis_text

    # Store both versions as JSON
    analysis_data = {
        "short": short_version,
        "full": full_version
    }

    db_analysis = db.query(ProfileAnalysis).filter(ProfileAnalysis.user_id == user_id).first()

    if db_analysis:
        db_analysis.characteristic_json = json.dumps(analysis_data)
        db.commit()
    else:
        # This case should not happen if create_profile_analysis is called first,
        # but as a fallback, create a new record.
        db_analysis = ProfileAnalysis(
            user_id=user_id,
            ori_voice_json=json.dumps(answers),
            characteristic_json=json.dumps(analysis_data)
        )
        db.add(db_analysis)
        db.commit()

    return short_version  # Return short version for display


def generate_trait_scores(answers: dict, analysis_text: str) -> dict:
    """
    Generate trait scores for spider chart visualization based on user answers and analysis.
    Returns scores from 1-10 for each trait.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        # Return default scores if API key not available
        return {
            "emotional_awareness": 5,
            "vulnerability": 5,
            "independence": 5,
            "empathy": 5,
            "communication": 5,
            "trust": 5
        }

    genai.configure(api_key=api_key)

    prompt = f"""Based on the following personality analysis and user answers, generate scores from 1-10 for each relationship trait.

PERSONALITY ANALYSIS:
{analysis_text}

USER'S ANSWERS:
"""
    for i, (question, answer) in enumerate(answers.items()):
        prompt += f"{i+1}. {question}\nANSWER: {answer}\n\n"

    prompt += """
TRAITS TO SCORE (1-10 scale, where 1 is very low and 10 is very high):

1. **Emotional Awareness** - How well they understand and recognize their own emotions
2. **Vulnerability** - Their comfort level with being emotionally open and exposed
3. **Independence** - Their level of self-reliance vs need for external validation
4. **Empathy** - Their ability to understand and support others emotionally
5. **Communication** - How effectively they express needs and handle conflict
6. **Trust** - Their openness to trusting others and building secure connections

IMPORTANT: Return ONLY a valid JSON object with these exact keys and integer scores 1-10. No explanation, no markdown, just the JSON:
{
    "emotional_awareness": <score>,
    "vulnerability": <score>,
    "independence": <score>,
    "empathy": <score>,
    "communication": <score>,
    "trust": <score>
}
"""

    try:
        model = genai.GenerativeModel('gemini-2.5-pro')
        response = model.generate_content(prompt)

        # Parse the JSON response
        response_text = response.text.strip()
        # Remove markdown code blocks if present
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        response_text = response_text.strip()

        scores = json.loads(response_text)

        # Validate scores are in range 1-10
        for key in scores:
            scores[key] = max(1, min(10, int(scores[key])))

        return scores
    except Exception as e:
        print(f"[Profile Analysis] Error generating trait scores: {e}")
        # Return default scores on error
        return {
            "emotional_awareness": 5,
            "vulnerability": 5,
            "independence": 5,
            "empathy": 5,
            "communication": 5,
            "trust": 5
        }


def get_profile_analysis(db: Session, user_id: int):
    """
    Get a user's profile analysis data.
    """
    return db.query(ProfileAnalysis).filter(ProfileAnalysis.user_id == user_id).first()


def generate_love_style(db: Session, user_id: int, answers: dict, analysis_text: str) -> dict:
    """
    Generate a Love Style profile based on user's answers and personality analysis.
    Creates or updates the love_style record in the database.

    Returns the generated love style data.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")

    genai.configure(api_key=api_key)

    prompt = f"""You are a relationship psychology expert. Based on the user's personality analysis and their answers to relationship questions, generate their "Love Style" profile.

PERSONALITY ANALYSIS:
{analysis_text}

USER'S ANSWERS:
"""
    for i, (question, answer) in enumerate(answers.items()):
        prompt += f"{i+1}. {question}\nANSWER: {answer}\n\n"

    prompt += """
Based on this information, create a Love Style profile with the following structure:

1. **TYPE** (4-6 characters): A short code like personality types. Examples: "CARE", "GROW", "BOND", "FREE", "DEEP", "SAFE", "PLAY", "GIVE"

2. **ARCHETYPE** (2-4 words): A poetic name for their love style. Examples:
   - "The Nurturer"
   - "The Adventurer"
   - "The Protector"
   - "The Dreamer"
   - "The Anchor"
   - "The Healer"
   - "The Explorer"
   - "The Devoted"

3. **ICON**: A Material Symbols icon name that represents their style. Choose from:
   - favorite (heart/love)
   - psychology (mind/understanding)
   - spa (nurturing/calm)
   - explore (adventure)
   - shield (protection)
   - healing (healing/growth)
   - diversity_3 (connection)
   - volunteer_activism (giving)
   - nest_eco (home/security)
   - auto_awesome (magic/spark)

4. **TRAITS** (exactly 4 traits): Short trait words that define their love style. Examples: "Empathetic", "Loyal", "Intuitive", "Patient", "Adventurous", "Protective", "Passionate", "Thoughtful"

5. **COMPATIBILITY** (50-95): A percentage indicating how broadly compatible they are with others. Higher = more adaptable, Lower = more specific needs.

6. **DESCRIPTION** (2-3 sentences): A warm, insightful description of how they love and what makes them special in relationships. Write in second person ("You...").

IMPORTANT: Return ONLY a valid JSON object with these exact keys. No explanation, no markdown code blocks, just the JSON:
{
    "type": "<TYPE>",
    "archetype": "<ARCHETYPE>",
    "icon": "<ICON>",
    "traits": ["<TRAIT1>", "<TRAIT2>", "<TRAIT3>", "<TRAIT4>"],
    "compatibility": <NUMBER>,
    "description": "<DESCRIPTION>"
}
"""

    try:
        model = genai.GenerativeModel('gemini-2.5-pro')
        response = model.generate_content(prompt)

        # Parse the JSON response
        response_text = response.text.strip()
        # Remove markdown code blocks if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            # Find content between ``` markers
            json_lines = []
            in_json = False
            for line in lines:
                if line.startswith("```") and not in_json:
                    in_json = True
                    continue
                elif line.startswith("```") and in_json:
                    break
                elif in_json:
                    json_lines.append(line)
            response_text = "\n".join(json_lines)

        response_text = response_text.strip()
        love_style_data = json.loads(response_text)

        # Validate and sanitize data
        love_style_data["type"] = str(love_style_data.get("type", "LOVE"))[:10]
        love_style_data["archetype"] = str(love_style_data.get("archetype", "The Lover"))[:50]

        # Validate icon - must be a valid Material Symbols icon name
        valid_icons = {
            "favorite", "psychology", "spa", "explore", "shield", "healing",
            "diversity_3", "volunteer_activism", "nest_eco", "auto_awesome",
            "home", "local_fire_department", "waves", "star", "landscape",
            "air", "nights_stay", "wb_sunny", "park", "water", "terrain",
            "yard", "connect_without_contact", "cottage", "bolt", "anchor"
        }
        raw_icon = str(love_style_data.get("icon", "favorite"))[:50].lower().strip()

        # Map type codes to icons if the AI returned a type code instead of an icon
        type_to_icon_map = {
            "safe": "home",
            "fire": "local_fire_department",
            "wave": "waves",
            "star": "star",
            "rock": "landscape",
            "wind": "air",
            "moon": "nights_stay",
            "sun": "wb_sunny",
            "tree": "park",
            "ocean": "water",
            "mountain": "terrain",
            "garden": "yard",
            "bridge": "connect_without_contact",
            "nest": "cottage",
            "spark": "bolt",
            "anchor": "anchor",
            "compass": "explore",
            "heart": "favorite",
            "care": "volunteer_activism",
            "grow": "park",
            "bond": "diversity_3",
            "free": "explore",
            "deep": "psychology",
            "play": "auto_awesome",
            "give": "volunteer_activism",
            "love": "favorite",
        }

        # Check if icon looks like a type code (uppercase, possibly with underscore)
        icon_base = raw_icon.replace("_", "").replace("-", "").lower()
        if raw_icon in valid_icons:
            love_style_data["icon"] = raw_icon
        elif icon_base in type_to_icon_map:
            love_style_data["icon"] = type_to_icon_map[icon_base]
        else:
            # Try to extract base from codes like "NEST_C" -> "nest"
            icon_prefix = raw_icon.split("_")[0].lower() if "_" in raw_icon else icon_base
            love_style_data["icon"] = type_to_icon_map.get(icon_prefix, "favorite")

        love_style_data["compatibility"] = max(50, min(95, int(love_style_data.get("compatibility", 75))))
        love_style_data["description"] = str(love_style_data.get("description", ""))[:1000]

        # Ensure exactly 4 traits
        traits = love_style_data.get("traits", [])
        if not isinstance(traits, list):
            traits = ["Caring", "Thoughtful", "Loyal", "Understanding"]
        traits = [str(t)[:50] for t in traits[:4]]
        while len(traits) < 4:
            traits.append("Loving")
        love_style_data["traits"] = traits

        # Save to database
        _save_love_style(db, user_id, love_style_data)

        return love_style_data

    except Exception as e:
        print(f"[Profile Analysis] Error generating love style: {e}")
        # Return default love style on error
        default_love_style = {
            "type": "LOVE",
            "archetype": "The Lover",
            "icon": "favorite",
            "traits": ["Caring", "Thoughtful", "Loyal", "Understanding"],
            "compatibility": 75,
            "description": "You approach relationships with an open heart and genuine desire for connection."
        }
        _save_love_style(db, user_id, default_love_style)
        return default_love_style


def _save_love_style(db: Session, user_id: int, love_style_data: dict):
    """
    Save or update love style in database.
    """
    # Check if love style already exists
    existing = db.query(LoveStyle).filter(LoveStyle.user_id == user_id).first()

    if existing:
        # Update existing
        existing.type = love_style_data["type"]
        existing.archetype = love_style_data["archetype"]
        existing.icon = love_style_data["icon"]
        existing.compatibility = love_style_data["compatibility"]
        existing.description = love_style_data["description"]

        # Delete old traits and add new ones
        db.query(LoveStyleTrait).filter(LoveStyleTrait.love_style_id == existing.id).delete()
        for trait in love_style_data["traits"]:
            db.add(LoveStyleTrait(love_style_id=existing.id, trait=trait))

        db.commit()
        db.refresh(existing)
        print(f"[Profile Analysis] Updated love style for user {user_id}")
    else:
        # Create new
        new_love_style = LoveStyle(
            user_id=user_id,
            type=love_style_data["type"],
            archetype=love_style_data["archetype"],
            icon=love_style_data["icon"],
            compatibility=love_style_data["compatibility"],
            description=love_style_data["description"]
        )
        db.add(new_love_style)
        db.flush()  # Get the ID

        for trait in love_style_data["traits"]:
            db.add(LoveStyleTrait(love_style_id=new_love_style.id, trait=trait))

        db.commit()
        db.refresh(new_love_style)
        print(f"[Profile Analysis] Created love style for user {user_id}")
